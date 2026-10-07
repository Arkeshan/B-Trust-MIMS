package main

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"golang.org/x/crypto/bcrypt"
)
type ChangePasswordRequest struct{
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func ChangePasswordHandler(db *sql.DB) http.HandlerFunc{
	return func(w http.ResponseWriter, r *http.Request){
		if r.Method == http.MethodOptions{
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost{
			http.Error(w, "Method not allowed",http.StatusMethodNotAllowed)
			return
		}
		username, err :=getAuthenticatedUser(r,db)
		if err != nil{
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		var req ChangePasswordRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request format"})
			return
		}
		if req.NewPassword =="" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "New password cannot be empty"})
			return
		}
		// Verify current password
		var storedHash string
		err = db.QueryRowContext(r.Context(),"SELECT password_hash FROM USER_ACCOUNT WHERE username = ?", username).Scan(&storedHash)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch user account"})
			return
		}
		err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.CurrentPassword))
		if err != nil {
			// Transparent fallback for legacy plaintext seed passwords
			if storedHash != req.CurrentPassword {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"error": "Incorrect current password"})
				return
			}
		}
		// Hash new password
		newHash, err :=bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encrypt new password"})
			return
		}
		// Update database
		_, err = db.ExecContext(r.Context(), "UPDATE USER_ACCOUNT SET password_hash = ? WHERE username = ?",string(newHash), username)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update password in database"})
			return
		}
		w.Header().Set("Content-Type","application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message":"Password updated successfully"})
	}
}
