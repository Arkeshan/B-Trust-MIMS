package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type RegisterCustomerRequest struct {
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	NIC         string `json:"nic"`
	DOB         string `json:"dob"`
	PhoneNumber string `json:"phone_number"`
	Address     string `json:"address"`
	City        string `json:"city"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	Email       string `json:"email"`
	GuardianNIC string `json:"guardian_nic"`
}

type RegisterCustomerResponse struct {
	Status   string `json:"status"`
	Message  string `json:"message"`
	PersonID int64  `json:"person_id"`
	Username string `json:"username"`
}

func RegisterCustomerHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Method not allowed"})
			return
		}

		var req RegisterCustomerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid input payload"})
			return
		}

		// Basic validation
		req.FirstName = strings.TrimSpace(req.FirstName)
		req.LastName = strings.TrimSpace(req.LastName)
		req.Username = strings.TrimSpace(req.Username)
		req.Password = strings.TrimSpace(req.Password)
		req.NIC = strings.TrimSpace(req.NIC)
		req.GuardianNIC = strings.TrimSpace(req.GuardianNIC)
		req.DOB = strings.TrimSpace(req.DOB)

		if req.FirstName == "" || req.LastName == "" || req.Username == "" || req.Password == "" || req.DOB == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "First Name, Last Name, Username, Password, and DOB are required"})
			return
		}

		// Calculate the age
		birthDate, err := time.Parse("2006-01-02", req.DOB)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid DOB format. Use YYYY-MM-DD"})
			return
		}

		now := time.Now()
		age := now.Year() - birthDate.Year()
		if now.YearDay() < birthDate.YearDay() {
			age--
		}

		// cheack whether that the age>18
		var guardianPersonID *int
		if age < 18 {
			if req.GuardianNIC == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Guardian NIC is required for minors under 18 years old"})
				return
			}
		}

		// If a Guardian NIC is provided, verify they exist in PERSON table
		if req.GuardianNIC != "" {
			var gid int
			err := db.QueryRowContext(r.Context(), "SELECT person_id FROM PERSON WHERE nic = ?", req.GuardianNIC).Scan(&gid)
			if err != nil {
				if err == sql.ErrNoRows {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{Error: fmt.Sprintf("Guardian with NIC '%s' not found. Please register guardian first.", req.GuardianNIC)})
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Database lookup failed for guardian"})
				return
			}
			guardianPersonID = &gid
		}

		// If age > 18,NIC is required
		if age >= 18 && req.NIC == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "NIC is required for adult customers"})
			return
		}

		// if the emai is empty, fall back.
		if req.Email == "" {
			req.Email = fmt.Sprintf("%s@customer.btrust.lk", req.Username)
		}

		// Identify active Agent and Branch
		var agentPersonID, branchID int
		var sessionToken string
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			sessionToken = strings.TrimPrefix(authHeader, "Bearer ")
		} else if authHeader != "" {
			sessionToken = authHeader
		} else if cookie, err := r.Cookie("session_id"); err == nil && cookie.Value != "" {
			sessionToken = cookie.Value
		}

		if sessionToken != "" {
			_ = db.QueryRowContext(r.Context(), `
				SELECT s.person_id, s.branch_id 
				FROM USER_SESSION us 
				JOIN STAFF s ON us.username = s.username 
				WHERE us.session_id = ? AND us.expires_at > NOW()`, sessionToken).Scan(&agentPersonID, &branchID)
		}

		// Fallback for development if not logged in via session
		if agentPersonID == 0 {
			_ = db.QueryRowContext(r.Context(), "SELECT person_id, branch_id FROM STAFF ORDER BY person_id LIMIT 1").Scan(&agentPersonID, &branchID)
		}

		// Hash password with bcrypt
		hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to encrypt password"})
			return
		}

		//database transactions
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			log.Printf("Failed to begin transaction: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Database transaction error"})
			return
		}
		defer tx.Rollback()

		// 1. Insert into USER_ACCOUNT
		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO USER_ACCOUNT (username, password_hash, email, type, status) 
			VALUES (?, ?, ?, 'customer', 'active')`,
			req.Username, string(hashedPwd), req.Email,
		)
		if err != nil {
			log.Printf("Failed to insert USER_ACCOUNT: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Username already exists or invalid"})
			return
		}

		// 2. Insert into PERSON
		var nicVal any = req.NIC
		if req.NIC == "" {
			nicVal = nil // minors can have NULL NIC
		}

		res, err := tx.ExecContext(r.Context(), `
			INSERT INTO PERSON (first_name, last_name, nic, dob, phone_number, address, city) 
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			req.FirstName, req.LastName, nicVal, req.DOB, req.PhoneNumber, req.Address, req.City,
		)
		if err != nil {
			log.Printf("Failed to insert PERSON: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to create person record. Check phone number (10 digits) or duplicate NIC."})
			return
		}

		personID, err := res.LastInsertId()
		if err != nil {
			log.Printf("Failed to fetch personID: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to retrieve person ID"})
			return
		}

		// 3. Insert into CUSTOMER
		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO CUSTOMER (person_id, username, assigned_agent_person_id, guardian_person_id, registered_branch_id) 
			VALUES (?, ?, ?, ?, ?)`,
			personID, req.Username, agentPersonID, guardianPersonID, branchID,
		)
		if err != nil {
			log.Printf("Failed to insert CUSTOMER: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to map customer record"})
			return
		}

		// Commit the transaction
		if err := tx.Commit(); err != nil {
			log.Printf("Failed to commit transaction: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Transaction commit failed"})
			return
		}

		// Return the success message
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(RegisterCustomerResponse{
			Status:   "success",
			Message:  "Customer registered successfully",
			PersonID: personID,
			Username: req.Username,
		})
	}
}
