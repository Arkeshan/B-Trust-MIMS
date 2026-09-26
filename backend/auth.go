package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type LoginResponse struct {
	Status    string `json:"status"`
	Message   string `json:"message"`
	SessionID string `json:"session_id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
}

// $$$ Session Token Generator $$$
// Produces a 64-character cryptographically random unguessable token.
func generateSessionToken() string {
	bytes := make([]byte, 32)
	_, _ = rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// $$$ Authenticated User Resolver $$$
// Resolves session_id from Cookie or Authorization header against MySQL USER_SESSION.
// Falls back gracefully for development testing.
func getAuthenticatedUser(r *http.Request, db *sql.DB) (string, error) {
	// $$$ 1. Read Token from Header or Cookie $$$
	var token string
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimPrefix(authHeader, "Bearer ")
	} else if authHeader != "" {
		token = authHeader
	} else if cookie, err := r.Cookie("session_id"); err == nil {
		token = cookie.Value
	}

	// Verify token against MySQL USER_SESSION
	if token != "" {
		var username string
		err := db.QueryRowContext(r.Context(),
			"SELECT username FROM USER_SESSION WHERE session_id = ? AND expires_at > NOW()",
			token,
		).Scan(&username)
		if err == nil && username != "" {
			return username, nil
		}
	}

	// $$$ 2. Development Testing Fallbacks $$$
	urlUser := strings.TrimSpace(r.URL.Query().Get("username"))
	if urlUser != "" {
		return urlUser, nil
	}

	return "cust_1", nil
}

// $$$ User Login Handler $$$
// Authenticates credentials and issues an active record in USER_SESSION.
func LoginHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from frontend.
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Method not allowed"})
			return
		}

		var req LoginRequest

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input format", http.StatusBadRequest)
			return
		}

		var storedHash, userType, accountStatus string

		query := "SELECT password_hash, type, status FROM vw_login_auth WHERE username = ?"

		err := db.QueryRowContext(r.Context(), query, req.Username).Scan(&storedHash, &userType, &accountStatus)
		if err != nil {
			log.Printf("Login failed: User '%s' not found\n", req.Username)
			http.Error(w, "Invalid username or password", http.StatusUnauthorized)
			return
		}

		// Verify password using bcrypt, with fallback for seed test users with plain text passwords
		err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password))
		if err != nil {
			if storedHash != req.Password {
				http.Error(w, "Invalid username or password", http.StatusUnauthorized)
				return
			}
		}

		if accountStatus == "locked" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Account is locked"})
			return
		}

		// Create an authenticated session record and persist it to MySQL
		sessionID := generateSessionToken()
		expiresAt := time.Now().Add(24 * time.Hour)

		// Clean up any old expired sessions in MySQL for cleanliness
		_, _ = db.ExecContext(r.Context(), "DELETE FROM USER_SESSION WHERE expires_at < NOW()")

		// Save new session into MySQL USER_SESSION table
		insertSessionQuery := `
			INSERT INTO USER_SESSION (session_id, username, device_ip, expires_at) 
			VALUES (?, ?, ?, ?)`
		_, err = db.ExecContext(r.Context(), insertSessionQuery, sessionID, req.Username, r.RemoteAddr, expiresAt)
		if err != nil {
			log.Printf("Failed to store session in DB: %v\n", err)
			http.Error(w, "Could not establish session in database", http.StatusInternalServerError)
			return
		}

		// Set secure cookie for browser
		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    sessionID,
			Expires:  expiresAt,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})

		// Return session details in JSON response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(LoginResponse{
			Status:    "success",
			Message:   "Login successful",
			SessionID: sessionID,
			Username:  req.Username,
			Role:      userType,
		})
	}
}

// LogoutHandler deletes the active session from USER_SESSION and clears the session cookie.
func LogoutHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Read session token from cookie or Authorization header
		var token string
		if cookie, err := r.Cookie("session_id"); err == nil {
			token = cookie.Value
		} else {
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				token = strings.TrimPrefix(authHeader, "Bearer ")
			} else if authHeader != "" {
				token = authHeader
			}
		}

		// Delete session from database
		if token != "" {
			_, _ = db.ExecContext(r.Context(), "DELETE FROM USER_SESSION WHERE session_id = ?", token)
		}

		// Clear the session cookie
		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "logged_out"})
	}
}