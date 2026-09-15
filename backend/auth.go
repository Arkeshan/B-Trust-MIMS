package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func LoginHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// Handle browser preflight checks
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		var storedHash, userType, accountStatus string
		query := "SELECT password_hash, type, status FROM USER_ACCOUNT WHERE username = ?"

		err := db.QueryRow(query, req.Username).Scan(&storedHash, &userType, &accountStatus)
		if err != nil {
			log.Printf("Database Error for user '%s': %v\n", req.Username, err)
			http.Error(w, "Invalid username or password", http.StatusUnauthorized)
			return
		}

		err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password))
		if err != nil {
			log.Printf("Password Mismatch Error: %v\n", err)
			http.Error(w, "Invalid username or password", http.StatusUnauthorized)
			return
		}

		if accountStatus == "locked" {
			http.Error(w, "Account is locked", http.StatusForbidden)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Login successful! Role: " + userType))
	}
}
