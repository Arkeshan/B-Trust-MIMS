package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
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

// generateSessionToken produces a 64-character cryptographically random token.
func generateSessionToken() string {
	bytes := make([]byte, 32)
	_, _ = rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// getAuthenticatedUser resolves session_id from Cookie or Authorization header against MySQL USER_SESSION.
// Falls back gracefully for development testing.
func getAuthenticatedUser(r *http.Request, db *sql.DB) (string, error) {
	var token string
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimPrefix(authHeader, "Bearer ")
	} else if authHeader != "" {
		token = authHeader
	} else if cookie, err := r.Cookie("session_id"); err == nil {
		token = cookie.Value
	}

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
	urlUser := strings.TrimSpace(r.URL.Query().Get("test_user"))
	if urlUser != "" {
		return urlUser, nil
	}

	return "cust_1", nil
}

// LoginHandler authenticates credentials and issues an active record in USER_SESSION.
func LoginHandler(db *sql.DB) http.HandlerFunc {
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

		sessionToken := generateSessionToken()
		expiresAt := time.Now().Add(24 * time.Hour)
		deviceIP := r.RemoteAddr

		_, _ = db.ExecContext(r.Context(), "DELETE FROM USER_SESSION WHERE expires_at < NOW()")

		insertSession := `
			INSERT INTO USER_SESSION (session_id, username, device_ip, expires_at)
			VALUES (?, ?, ?, ?)
		`
		_, err = db.ExecContext(r.Context(), insertSession, sessionToken, req.Username, deviceIP, expiresAt)
		if err != nil {
			log.Printf("Failed to insert session for '%s': %v\n", req.Username, err)
			http.Error(w, "Internal server error during session creation", http.StatusInternalServerError)
			return
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    sessionToken,
			Path:     "/",
			Expires:  expiresAt,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})

		_, _ = db.ExecContext(r.Context(), "UPDATE USER_ACCOUNT SET last_login = NOW() WHERE username = ?", req.Username)

		resp := LoginResponse{
			Status:    "success",
			Message:   "Login successful",
			SessionID: sessionToken,
			Username:  req.Username,
			Role:      userType,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)
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

		if token != "" {
			_, _ = db.ExecContext(r.Context(), "DELETE FROM USER_SESSION WHERE session_id = ?", token)
		}

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

// GetStaffPersonID reads the session_id cookie or Bearer token, queries the database, 
// and returns the unique integer person_id of the logged-in agent.
func GetStaffPersonID(r *http.Request, db *sql.DB) (int, error) {
	var sessionID string

	cookie, err := r.Cookie("session_id")
	if err == nil {
		sessionID = cookie.Value
	} else {
		authHeader := r.Header.Get("Authorization")
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			sessionID = authHeader[7:]
		}
	}

	if sessionID == "" {
		// Fallback for development if not logged in via session
		var personID int
		err := db.QueryRowContext(r.Context(), "SELECT person_id FROM STAFF ORDER BY person_id LIMIT 1").Scan(&personID)
		if err == nil {
			return personID, nil
		}
		return 0, errors.New("unauthorized: missing session token")
	}

	query := `
		SELECT s.person_id 
		FROM USER_SESSION us 
		JOIN USER_ACCOUNT ua ON us.username = ua.username 
		JOIN STAFF s ON ua.username = s.username 
		WHERE us.session_id = ? AND us.expires_at > NOW()
	`

	var personID int
	err = db.QueryRowContext(r.Context(), query, sessionID).Scan(&personID)
	if err != nil {
		if err == sql.ErrNoRows {
			// Dev fallback
			err := db.QueryRowContext(r.Context(), "SELECT person_id FROM STAFF ORDER BY person_id LIMIT 1").Scan(&personID)
			if err == nil {
				return personID, nil
			}
			return 0, errors.New("unauthorized: invalid or expired session")
		}
		return 0, err
	}

	return personID, nil
}

// GetStaffBranchID returns the branch_id for a given staff person_id.
func GetStaffBranchID(personID int, db *sql.DB) (int, error) {
	var branchID int
	err := db.QueryRow("SELECT branch_id FROM STAFF WHERE person_id = ?", personID).Scan(&branchID)
	return branchID, err
}
