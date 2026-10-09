package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
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

// Rate limiter: in-memory tracking of failed login attempts per IP
var (
	loginAttempts = make(map[string][]time.Time)
	loginMu       sync.Mutex
)

func isRateLimited(ip string) bool {
	loginMu.Lock()
	defer loginMu.Unlock()

	cutoff := time.Now().Add(-15 * time.Minute)
	attempts := loginAttempts[ip]

	valid := attempts[:0]
	for _, t := range attempts {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	loginAttempts[ip] = valid
	return len(valid) >= 5
}

func recordFailedLogin(ip string) {
	loginMu.Lock()
	defer loginMu.Unlock()
	loginAttempts[ip] = append(loginAttempts[ip], time.Now())
}

func resetFailedLogins(ip string) {
	loginMu.Lock()
	defer loginMu.Unlock()
	delete(loginAttempts, ip)
}

func getClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// getAuthenticatedUser resolves session_id from Cookie or Authorization header against MySQL USER_SESSION.
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

	if token == "" {
		return "", errors.New("unauthorized: missing session token")
	}

	var username string
	err := db.QueryRowContext(r.Context(),
		"SELECT username FROM USER_SESSION WHERE session_id = ? AND expires_at > NOW()",
		token,
	).Scan(&username)
	if err != nil || username == "" {
		return "", errors.New("unauthorized: invalid or expired session")
	}

	return username, nil
}

// LoginHandler authenticates credentials and issues an active record in USER_SESSION.
func LoginHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		clientIP := getClientIP(r)
		if isRateLimited(clientIP) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Too many failed login attempts. Please try again in 15 minutes."})
			return
		}

		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid input format"})
			return
		}

		var actualUsername, storedHash, email, userType, accountStatus string
		// Support login via either username or email
		query := "SELECT username, password_hash, email, type, status FROM USER_ACCOUNT WHERE username = ? OR email = ?"
		err := db.QueryRowContext(r.Context(), query, req.Username, req.Username).Scan(&actualUsername, &storedHash, &email, &userType, &accountStatus)
		if err != nil {
			recordFailedLogin(clientIP)
			log.Printf("Login failed: User '%s' not found\n", req.Username)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid username or password"})
			return
		}

		// Verify password using bcrypt
		err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password))
		if err != nil {
			// Transparent migration: if legacy unhashed seed password matches, upgrade it to bcrypt immediately
			if storedHash == req.Password {
				newHash, hashErr := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
				if hashErr == nil {
					_, _ = db.ExecContext(r.Context(), "UPDATE USER_ACCOUNT SET password_hash = ? WHERE username = ?", string(newHash), actualUsername)
				}
			} else {
				recordFailedLogin(clientIP)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid username or password"})
				return
			}
		}

		if accountStatus == "locked" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Account is locked"})
			return
		}

		resetFailedLogins(clientIP)

		// 2FA / OTP Enforcement: If role is Admin, require OTP verification before issuing a session
		if strings.ToLower(userType) == "admin" {
			var existingTokenID string
			var secondsRemaining int
			queryExisting := `
				SELECT token_id, TIMESTAMPDIFF(SECOND, NOW(), expires_at)
				FROM OTP_TOKEN
				WHERE username = ? AND purpose = 'login' AND expires_at > NOW()
				ORDER BY expires_at DESC
				LIMIT 1
			`
			err := db.QueryRowContext(r.Context(), queryExisting, actualUsername).Scan(&existingTokenID, &secondsRemaining)
			if err == nil && existingTokenID != "" && secondsRemaining > 0 {
				log.Printf("[2FA] Active OTP session exists for '%s' (%d seconds remaining). Reusing active verification code.\n", actualUsername, secondsRemaining)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(map[string]any{
					"status":            "otp_required",
					"message":           "Two-factor authentication required. Verification code already sent to email.",
					"temp_token":        existingTokenID,
					"email":             MaskEmail(email),
					"username":          actualUsername,
					"role":              userType,
					"seconds_remaining": secondsRemaining,
				})
				return
			}

			tokenID, plainOTP, err := CreateOTP(db, actualUsername, "login")
			if err != nil {
				log.Printf("Failed to generate OTP for '%s': %v\n", actualUsername, err)
				http.Error(w, "Failed to initiate verification", http.StatusInternalServerError)
				return
			}

			go SendEmailOTP(email, plainOTP)

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":            "otp_required",
				"message":           "Two-factor authentication required. Verification code sent to email.",
				"temp_token":        tokenID,
				"email":             MaskEmail(email),
				"username":          actualUsername,
				"role":              userType,
				"seconds_remaining": 300,
			})
			return
		}

		sessionToken := generateSessionToken()
		expiresAt := time.Now().Add(24 * time.Hour)
		deviceIP := clientIP

		_, _ = db.ExecContext(r.Context(), "DELETE FROM USER_SESSION WHERE expires_at < NOW()")

		insertSession := `
			INSERT INTO USER_SESSION (session_id, username, device_ip, expires_at)
			VALUES (?, ?, ?, ?)
		`
		_, err = db.ExecContext(r.Context(), insertSession, sessionToken, actualUsername, deviceIP, expiresAt)
		if err != nil {
			log.Printf("Failed to insert session for '%s': %v\n", actualUsername, err)
			http.Error(w, "Internal server error during session creation", http.StatusInternalServerError)
			return
		}

		isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" || os.Getenv("COOKIE_SECURE") == "true"
		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    sessionToken,
			Path:     "/",
			Expires:  expiresAt,
			HttpOnly: true,
			Secure:   isSecure,
			SameSite: http.SameSiteLaxMode,
		})

		_, _ = db.ExecContext(r.Context(), "UPDATE USER_ACCOUNT SET last_login = NOW() WHERE username = ?", actualUsername)

		resp := LoginResponse{
			Status:    "success",
			Message:   "Login successful",
			SessionID: sessionToken,
			Username:  actualUsername,
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
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var token string
		if cookie, err := r.Cookie("session_id"); err == nil && cookie.Value != "" {
			token = cookie.Value
		}
		if token == "" {
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

		isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" || os.Getenv("COOKIE_SECURE") == "true"
		http.SetCookie(w, &http.Cookie{
			Name:     "session_id",
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   isSecure,
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
