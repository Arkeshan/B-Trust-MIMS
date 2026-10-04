package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// AccountPlan represents a savings account tier from ACCOUNT_PLAN.
type AccountPlan struct {
	PlanID       int             `json:"plan_id"`
	PlanName     string          `json:"plan_name"`
	InterestRate decimal.Decimal `json:"interest_rate"`
	MinBalance   decimal.Decimal `json:"min_balance"`
}

// CustomerSearchResult represents a customer found via NIC or Guardian NIC.
type CustomerSearchResult struct {
	PersonID    int    `json:"person_id"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	NIC         string `json:"nic"`
	Username    string `json:"username"`
	DOB         string `json:"dob"`
	Role        string `json:"role"` // "Primary" or "Dependent"
	GuardianNIC string `json:"guardian_nic,omitempty"`
}

// OpenAccountRequest is the payload sent from the frontend to open an account.
type OpenAccountRequest struct {
	PlanID         int             `json:"plan_id"`
	PersonIDs      []int           `json:"person_ids"`
	InitialDeposit decimal.Decimal `json:"initial_deposit"`
}

// OpenAccountResponse is the response sent after successful account origination.
type OpenAccountResponse struct {
	Status       string          `json:"status"`
	Message      string          `json:"message"`
	AccountNo    string          `json:"account_no"`
	Balance      decimal.Decimal `json:"balance"`
	PlanName     string          `json:"plan_name"`
	HoldersCount int             `json:"holders_count"`
}

// ListAccountPlansHandler returns all active savings plans with interest and minimum balance requirements.
// GET /api/agent/plans
func ListAccountPlansHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Method not allowed"})
			return
		}

		rows, err := db.QueryContext(r.Context(), `
			SELECT plan_id, plan_name, interest_rate, min_balance 
			FROM ACCOUNT_PLAN 
			ORDER BY plan_id ASC`)
		if err != nil {
			log.Printf("Failed to query ACCOUNT_PLAN: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Database error loading account plans"})
			return
		}
		defer rows.Close()

		var plans []AccountPlan
		for rows.Next() {
			var p AccountPlan
			if err := rows.Scan(&p.PlanID, &p.PlanName, &p.InterestRate, &p.MinBalance); err != nil {
				log.Printf("Failed to scan AccountPlan: %v\n", err)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse account plans"})
				return
			}
			plans = append(plans, p)
		}

		if plans == nil {
			plans = []AccountPlan{}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(plans)
	}
}

// SearchCustomerByNICHandler performs a "Guardian-Aware" NIC search.
// It finds individuals matching the NIC directly ('Primary'), as well as minors
// who do not possess an NIC and are registered under a guardian with that NIC ('Dependent').
// GET /api/agent/customer/search?nic=<query>
func SearchCustomerByNICHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Method not allowed"})
			return
		}

		nic := strings.TrimSpace(r.URL.Query().Get("nic"))
		if nic == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]CustomerSearchResult{})
			return
		}

		query := `
			SELECT * FROM (
				-- 1. Direct match on customer's own NIC
				SELECT 
					c.person_id,
					p.first_name,
					p.last_name,
					COALESCE(p.nic, '') AS nic,
					c.username,
					DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob,
					'Primary' AS role,
					COALESCE(g.nic, '') AS guardian_nic
				FROM CUSTOMER c
				JOIN PERSON p ON c.person_id = p.person_id
				LEFT JOIN PERSON g ON c.guardian_person_id = g.person_id
				WHERE p.nic LIKE CONCAT(?, '%')

				UNION

				-- 2. Dependent match via guardian's NIC (for minors without an NIC)
				SELECT 
					c.person_id,
					p.first_name,
					p.last_name,
					COALESCE(p.nic, '') AS nic,
					c.username,
					DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob,
					'Dependent' AS role,
					COALESCE(g.nic, '') AS guardian_nic
				FROM CUSTOMER c
				JOIN PERSON p ON c.person_id = p.person_id
				JOIN PERSON g ON c.guardian_person_id = g.person_id
				WHERE g.nic LIKE CONCAT(?, '%')
			) AS results
			ORDER BY role ASC, first_name ASC
			LIMIT 15`

		rows, err := db.QueryContext(r.Context(), query, nic, nic)
		if err != nil {
			log.Printf("Failed to search customers by NIC: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Database error searching customers"})
			return
		}
		defer rows.Close()

		var results []CustomerSearchResult
		for rows.Next() {
			var res CustomerSearchResult
			if err := rows.Scan(
				&res.PersonID,
				&res.FirstName,
				&res.LastName,
				&res.NIC,
				&res.Username,
				&res.DOB,
				&res.Role,
				&res.GuardianNIC,
			); err != nil {
				log.Printf("Failed to scan customer search result: %v\n", err)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse customer search results"})
				return
			}
			results = append(results, res)
		}

		if results == nil {
			results = []CustomerSearchResult{}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(results)
	}
}

// generateAccountNo generates a sequential 12-character account number within the active transaction.
func generateAccountNo(tx *sql.Tx, ctx context.Context) (string, error) {
	var nextNum int
	err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(CAST(SUBSTRING(account_no, 4) AS UNSIGNED)), 0) + 1 
		FROM SAVINGS_ACCOUNT`).Scan(&nextNum)
	if err != nil {
		return "", err
	}
	// "ACC" (3 chars) + 9 digits = 12 characters (e.g., ACC000000011)
	return fmt.Sprintf("ACC%09d", nextNum), nil
}

// OpenAccountHandler handles Phase 2 Account Origination:
// Validates plan rules, performs strict DOB age checks, verifies minimum balance using decimal.Decimal,
// creates the SAVINGS_ACCOUNT, maps ACCOUNT_HOLDER rows, and deposits the initial funds
// into TRANSACTION (which fires the before_transaction_insert trigger).
// POST /api/agent/account/open
func OpenAccountHandler(db *sql.DB) http.HandlerFunc {
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

		var req OpenAccountRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request payload"})
			return
		}

		// 1. Basic Payload Validation
		if req.PlanID < 1 || req.PlanID > 5 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid plan selected. Plan ID must be between 1 and 5."})
			return
		}
		if len(req.PersonIDs) == 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "At least one customer must be selected as an account holder."})
			return
		}
		if req.InitialDeposit.IsNegative() {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Initial deposit cannot be negative."})
			return
		}

		// Check for duplicate person IDs in request
		seen := make(map[int]bool)
		for _, pid := range req.PersonIDs {
			if seen[pid] {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Duplicate customer selected in account holders list."})
				return
			}
			seen[pid] = true
		}

		// 2. Fetch Plan Details (Name & Minimum Balance)
		var planName string
		var minBalance decimal.Decimal
		err := db.QueryRowContext(r.Context(),
			"SELECT plan_name, min_balance FROM ACCOUNT_PLAN WHERE plan_id = ?",
			req.PlanID,
		).Scan(&planName, &minBalance)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Selected account plan does not exist."})
			return
		}

		// Verify Initial Deposit meets plan minimum balance using exact Decimal comparison
		if req.InitialDeposit.LessThan(minBalance) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{
				Error: fmt.Sprintf("Initial deposit of LKR %s is less than the required minimum balance of LKR %s for the %s plan.",
					req.InitialDeposit.StringFixed(2), minBalance.StringFixed(2), planName),
			})
			return
		}

		// 3. Holder Count & Strict Age Validation
		// SRS Rules:
		// - Children (1): exactly 1 holder, Age < 12
		// - Teen (2): exactly 1 holder, Age 12 to 17
		// - Adult (3): exactly 1 holder, Age 18 to 59
		// - Senior (4): exactly 1 holder, Age >= 60
		// - Joint (5): between 2 and 4 holders, all holders must be Age >= 18
		if req.PlanID == 5 {
			if len(req.PersonIDs) < 2 || len(req.PersonIDs) > 4 {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Joint accounts require between 2 and 4 distinct account holders."})
				return
			}
		} else {
			if len(req.PersonIDs) != 1 {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(ErrorResponse{
					Error: fmt.Sprintf("%s plan accounts must have exactly one account holder.", planName),
				})
				return
			}
		}

		now := time.Now()
		for _, pid := range req.PersonIDs {
			var firstName, lastName, dobStr string
			err := db.QueryRowContext(r.Context(), `
				SELECT p.first_name, p.last_name, DATE_FORMAT(p.dob, '%Y-%m-%d')
				FROM PERSON p
				JOIN CUSTOMER c ON p.person_id = c.person_id
				WHERE p.person_id = ?`, pid,
			).Scan(&firstName, &lastName, &dobStr)
			if err != nil {
				if err == sql.ErrNoRows {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Person ID %d is not a registered customer.", pid),
					})
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Database error retrieving customer details."})
				return
			}

			birthDate, err := time.Parse("2006-01-02", dobStr)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse customer date of birth."})
				return
			}

			// Calculate precise age
			age := now.Year() - birthDate.Year()
			if now.YearDay() < birthDate.YearDay() {
				age--
			}

			// Strict Age Rules Enforcement
			switch req.PlanID {
			case 1: // Children (< 12)
				if age >= 12 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Children plan is restricted to minors under 12 years old. %s %s is %d years old.", firstName, lastName, age),
					})
					return
				}
			case 2: // Teen (12 - 17)
				if age < 12 || age >= 18 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Teen plan is restricted to customers aged 12 to 17 years old. %s %s is %d years old.", firstName, lastName, age),
					})
					return
				}
			case 3: // Adult (18 - 59)
				if age < 18 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Adult plan requires account holder to be at least 18 years old. %s %s is %d years old.", firstName, lastName, age),
					})
					return
				}
				if age >= 60 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Adult plan is restricted to ages 18 to 59. %s %s is %d years old and qualifies for the higher-interest Senior plan.", firstName, lastName, age),
					})
					return
				}
			case 4: // Senior (60+)
				if age < 60 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Senior plan is restricted to customers aged 60 and above. %s %s is %d years old.", firstName, lastName, age),
					})
					return
				}
			case 5: // Joint (All holders 18+)
				if age < 18 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("All holders of a Joint account must be at least 18 years old. %s %s is %d years old.", firstName, lastName, age),
					})
					return
				}
			}
		}

		// 4. Resolve Active Staff & Branch
		staffPersonID, branchID, err := GetStaffPersonID(r, db)
		if err != nil {
			log.Printf("Failed to resolve staff person ID: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Could not identify active staff member."})
			return
		}

		// 5. ACID Database Transaction
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			log.Printf("Failed to begin transaction: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to initialize database transaction."})
			return
		}
		defer tx.Rollback()

		// Step A: Generate unique 12-char account number (e.g. ACC000000011)
		accountNo, err := generateAccountNo(tx, r.Context())
		if err != nil {
			log.Printf("Failed to generate account number: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to allocate account number."})
			return
		}

		// Step B: Insert into SAVINGS_ACCOUNT with starting balance 0.00
		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO SAVINGS_ACCOUNT (account_no, plan_id, branch_id, balance, opened_date, status)
			VALUES (?, ?, ?, 0.00, CURDATE(), 'active')`,
			accountNo, req.PlanID, branchID,
		)
		if err != nil {
			log.Printf("Failed to insert SAVINGS_ACCOUNT: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to create savings account record."})
			return
		}

		// Step C: Link each customer in ACCOUNT_HOLDER junction table
		for _, pid := range req.PersonIDs {
			_, err = tx.ExecContext(r.Context(), `
				INSERT INTO ACCOUNT_HOLDER (person_id, account_no)
				VALUES (?, ?)`,
				pid, accountNo,
			)
			if err != nil {
				log.Printf("Failed to insert ACCOUNT_HOLDER for person %d: %v\n", pid, err)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to associate account holder."})
				return
			}
		}

		// Step D: Insert Initial Deposit into TRANSACTION table using exact Decimal string
		// The MySQL 'before_transaction_insert' trigger catches this,
		// sets NEW.balance_after = current_balance + amount, and updates SAVINGS_ACCOUNT.balance!
		refNo := fmt.Sprintf("INIT-%s", accountNo)
		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO TRANSACTION (account_no, staff_person_id, txn_type, amount, balance_after, reference_no, remarks)
			VALUES (?, ?, 'deposit', ?, 0.00, ?, 'Initial deposit on account opening')`,
			accountNo, staffPersonID, req.InitialDeposit.StringFixed(2), refNo,
		)
		if err != nil {
			log.Printf("Failed to insert initial deposit TRANSACTION: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to process initial deposit transaction."})
			return
		}

		// Step E: Fetch the updated balance directly from SAVINGS_ACCOUNT to verify trigger execution
		var finalBalance decimal.Decimal
		err = tx.QueryRowContext(r.Context(),
			"SELECT balance FROM SAVINGS_ACCOUNT WHERE account_no = ?", accountNo,
		).Scan(&finalBalance)
		if err != nil {
			log.Printf("Failed to verify final balance: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to verify account balance."})
			return
		}

		// Step F: Commit the transaction
		if err := tx.Commit(); err != nil {
			log.Printf("Failed to commit account opening transaction: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Database transaction commit failed."})
			return
		}

		// 6. Return 201 Created Response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(OpenAccountResponse{
			Status:       "success",
			Message:      fmt.Sprintf("Successfully opened %s savings account.", planName),
			AccountNo:    accountNo,
			Balance:      finalBalance,
			PlanName:     planName,
			HoldersCount: len(req.PersonIDs),
		})
	}
}
