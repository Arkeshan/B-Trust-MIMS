package main

import (
	"bytes"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type VerifyOTPRequest struct {
	TempToken string `json:"temp_token"`
	OTP       string `json:"otp"`
}

type ResendOTPRequest struct {
	TempToken string `json:"temp_token"`
}

// GenerateSecureOTP creates a cryptographically secure 6-digit verification code.
func GenerateSecureOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

// MaskEmail masks an email address for display (e.g. arkesuje@gmail.com -> a***e@gmail.com).
func MaskEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return email
	}
	name := parts[0]
	domain := parts[1]
	if len(name) <= 2 {
		return name[:1] + "***@" + domain
	}
	return string(name[0]) + "***" + string(name[len(name)-1]) + "@" + domain
}

// SendEmailOTP dispatches the OTP code via SMTP and logs to the server terminal.
func SendEmailOTP(toEmail, otpCode string) error {
	// Always log OTP to server console for development & debugging visibility
	log.Printf("\n======================================================\n"+
		"[2FA OTP NOTIFICATION]\n"+
		"To:        %s\n"+
		"Code:      %s\n"+
		"Expires:   5 Minutes\n"+
		"======================================================\n",
		toEmail, otpCode,
	)

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9FAFB; padding: 24px; color: #111827; }
    .card { max-width: 500px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { color: #06B6D4; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
    .title { color: #001F3F; font-size: 22px; font-weight: bold; margin-bottom: 12px; }
    .code-box { background: #F3F4F6; border: 1px dashed #06B6D4; border-radius: 8px; text-align: center; font-size: 36px; font-weight: 800; letter-spacing: 0.3em; padding: 18px; color: #001F3F; margin: 24px 0; font-family: monospace; }
    .footer { font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 16px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">B-Trust Banking</div>
    <div class="title">Two-Factor Authentication</div>
    <p>You are attempting to sign in to the B-Trust Management Portal. Please use the verification code below to authorize your session:</p>
    <div class="code-box">%s</div>
    <p style="font-size: 13px; color: #4B5563;">This code is valid for <strong>5 minutes</strong>. If you did not initiate this login request, please contact B-Trust Security immediately.</p>
    <div class="footer">
      B-Trust Microbanking & Interest Management System (MIMS)<br/>
      Automated Security Notification &bull; Do not reply to this email
    </div>
  </div>
</body>
</html>
`, otpCode)

	// 1. Check if Resend HTTPS API Key is set (bypasses cloud host SMTP firewall blocks on port 587)
	if resendKey := os.Getenv("RESEND_API_KEY"); resendKey != "" {
		if err := sendViaResend(resendKey, toEmail, otpCode, htmlBody); err != nil {
			log.Printf("[2FA RESEND ERROR] Failed to send email via Resend API: %v\n", err)
		} else {
			return nil
		}
	}

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	smtpFrom := os.Getenv("SMTP_FROM")

	if smtpFrom == "" {
		smtpFrom = smtpUser
	}
	if smtpPort == "" {
		smtpPort = "587"
	}

	// If SMTP credentials are not configured, skip network dispatch without failing
	if smtpHost == "" || smtpUser == "" || smtpPass == "" {
		log.Println("[2FA] SMTP credentials not set in .env; skipping live email dispatch (code logged above).")
		return nil
	}

	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	subject := fmt.Sprintf("Subject: B-Trust MIMS Security Verification Code: %s\r\n", otpCode)
	mimeHeaders := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"

	msg := []byte(subject + mimeHeaders + htmlBody)

	err := smtp.SendMail(addr, auth, smtpFrom, []string{toEmail}, msg)
	if err != nil {
		log.Printf("[2FA SMTP ERROR] Failed to send email to %s: %v\n", toEmail, err)
		return err
	}

	log.Printf("[2FA] Live verification email delivered successfully to %s\n", toEmail)
	return nil
}

type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

// sendViaResend delivers the OTP email over HTTPS (port 443) using the Resend API.
func sendViaResend(apiKey, toEmail, otpCode, htmlBody string) error {
	fromEmail := os.Getenv("RESEND_FROM")
	if fromEmail == "" {
		fromEmail = "B-Trust Banking <onboarding@resend.dev>"
	}

	payload := resendPayload{
		From:    fromEmail,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("B-Trust MIMS Security Verification Code: %s", otpCode),
		HTML:    htmlBody,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode resend payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return fmt.Errorf("failed to create resend http request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("http request to resend failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errData map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&errData)
		return fmt.Errorf("resend API returned error (status %d): %v", resp.StatusCode, errData)
	}

	log.Printf("[2FA] Live verification email delivered successfully via Resend HTTPS API to %s\n", toEmail)
	return nil
}

// CreateOTP generates a 6-digit OTP, saves the hash in OTP_TOKEN, and returns the tracking token.
func CreateOTP(db *sql.DB, username, purpose string) (tokenID string, plainOTP string, err error) {
	// Prune tokens expired more than 30 minutes ago
	_, _ = db.Exec("DELETE FROM OTP_TOKEN WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)")

	plainOTP, err = GenerateSecureOTP()
	if err != nil {
		return "", "", fmt.Errorf("failed to generate secure OTP: %w", err)
	}

	otpHash, err := bcrypt.GenerateFromPassword([]byte(plainOTP), bcrypt.DefaultCost)
	if err != nil {
		return "", "", fmt.Errorf("failed to hash OTP: %w", err)
	}

	tokenBytes := make([]byte, 24)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", "", fmt.Errorf("failed to generate tracking token: %w", err)
	}
	tokenID = hex.EncodeToString(tokenBytes)

	// Clean any previous unused login OTPs for this username
	_, _ = db.Exec("DELETE FROM OTP_TOKEN WHERE username = ? AND purpose = ?", username, purpose)

	query := `
		INSERT INTO OTP_TOKEN (token_id, username, otp_hash, purpose, expires_at)
		VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
	`
	_, err = db.Exec(query, tokenID, username, string(otpHash), purpose)
	if err != nil {
		return "", "", fmt.Errorf("failed to store OTP token: %w", err)
	}

	return tokenID, plainOTP, nil
}

// VerifyOTPHandler processes POST /api/auth/otp/verify
func VerifyOTPHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
			return
		}

		var req VerifyOTPRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Invalid input format"})
			return
		}

		req.TempToken = strings.TrimSpace(req.TempToken)
		req.OTP = strings.TrimSpace(req.OTP)

		if req.TempToken == "" || req.OTP == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Both temp_token and otp are required"})
			return
		}

		var username, otpHash string
		query := `
			SELECT username, otp_hash 
			FROM OTP_TOKEN 
			WHERE token_id = ? AND purpose = 'login' AND expires_at > NOW()
		`
		err := db.QueryRowContext(r.Context(), query, req.TempToken).Scan(&username, &otpHash)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or expired verification session"})
			return
		}

		// Verify OTP with bcrypt
		err = bcrypt.CompareHashAndPassword([]byte(otpHash), []byte(req.OTP))
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Incorrect verification code. Please try again."})
			return
		}

		// Valid OTP -> remove token so it cannot be reused
		_, _ = db.ExecContext(r.Context(), "DELETE FROM OTP_TOKEN WHERE token_id = ?", req.TempToken)

		// Fetch user role
		var userType string
		_ = db.QueryRowContext(r.Context(), "SELECT type FROM USER_ACCOUNT WHERE username = ?", username).Scan(&userType)

		// Issue authentic session
		sessionToken := generateSessionToken()
		expiresAt := time.Now().Add(24 * time.Hour)
		clientIP := getClientIP(r)

		_, _ = db.ExecContext(r.Context(), "DELETE FROM USER_SESSION WHERE expires_at < NOW()")
		insertSession := `
			INSERT INTO USER_SESSION (session_id, username, device_ip, expires_at)
			VALUES (?, ?, ?, ?)
		`
		if _, err := db.ExecContext(r.Context(), insertSession, sessionToken, username, clientIP, expiresAt); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create session"})
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

		_, _ = db.ExecContext(r.Context(), "UPDATE USER_ACCOUNT SET last_login = NOW() WHERE username = ?", username)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(LoginResponse{
			Status:    "success",
			Message:   "Verification successful",
			SessionID: sessionToken,
			Username:  username,
			Role:      userType,
		})
	}
}

// ResendOTPHandler processes POST /api/auth/otp/resend
func ResendOTPHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
			return
		}

		var req ResendOTPRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
			return
		}

		req.TempToken = strings.TrimSpace(req.TempToken)
		if req.TempToken == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "temp_token is required"})
			return
		}

		var username string
		var secondsRemaining int
		query := `
			SELECT username, TIMESTAMPDIFF(SECOND, NOW(), expires_at) 
			FROM OTP_TOKEN 
			WHERE token_id = ? AND purpose = 'login'
		`
		err := db.QueryRowContext(r.Context(), query, req.TempToken).Scan(&username, &secondsRemaining)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Session expired or invalid. Please log in again."})
			return
		}

		// Enforce hard 5-minute cooldown limit
		if secondsRemaining > 0 {
			minutes := secondsRemaining / 60
			seconds := secondsRemaining % 60
			var waitMsg string
			if minutes > 0 {
				waitMsg = fmt.Sprintf("Please wait %d minute(s) and %d second(s) before requesting a new code.", minutes, seconds)
			} else {
				waitMsg = fmt.Sprintf("Please wait %d second(s) before requesting a new code.", seconds)
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"error":             waitMsg,
				"seconds_remaining": secondsRemaining,
			})
			return
		}

		var email string
		_ = db.QueryRowContext(r.Context(), "SELECT email FROM USER_ACCOUNT WHERE username = ?", username).Scan(&email)

		newTokenID, plainOTP, err := CreateOTP(db, username, "login")
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Could not generate new code"})
			return
		}

		_ = SendEmailOTP(email, plainOTP)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status":     "success",
			"message":    "A new verification code has been dispatched.",
			"temp_token": newTokenID,
			"email":      MaskEmail(email),
		})
	}
}
