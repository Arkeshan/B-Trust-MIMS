package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
)

type AgentContactInfo struct {
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
}

func CustomerAgentInfoHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		username, err := getAuthenticatedUser(r, db)
		if err !=nil || username == "" {
			http.Error(w, "Unauthorized access", http.StatusUnauthorized)
			return
		}
		query := `
			SELECT p.first_name, p.last_name, u.email, p.phone_number
			FROM CUSTOMER c
			JOIN STAFF s ON c.assigned_agent_person_id = s.person_id
			JOIN PERSON p ON s.person_id = p.person_id
			JOIN USER_ACCOUNT u ON s.username = u.username
			WHERE c.username = ?
		`
		var agent AgentContactInfo
		var phoneNumber sql.NullString
		err = db.QueryRowContext(r.Context(), query, username).Scan(
			&agent.FirstName,
			&agent.LastName,
			&agent.Email,
			&phoneNumber,
		)
		if err != nil{
			if err == sql.ErrNoRows {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]string{"error": "No assigned agent found"})
				return
			}
			http.Error(w,"Database error", http.StatusInternalServerError)
			return
		}
		if phoneNumber.Valid {
			agent.PhoneNumber = phoneNumber.String
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(agent)
	}
}
