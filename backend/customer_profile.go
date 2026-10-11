package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
)
type CustomerProfile struct{
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func CustomerProfileHandler(db *sql.DB) http.HandlerFunc{
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		username, err := getAuthenticatedUser(r, db)
		if err !=nil || username ==""{
			http.Error(w, "Unauthorized access", http.StatusUnauthorized)
			return
		}

		var profile CustomerProfile
		query := `
			SELECT p.first_name, p.last_name
			FROM PERSON p
			JOIN CUSTOMER c ON p.person_id = c.person_id
			WHERE c.username = ?
		`
		err =db.QueryRowContext(r.Context(), query, username).Scan(&profile.FirstName, &profile.LastName)
		if err != nil {
			http.Error(w, "Profile not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(profile)
	}
}

