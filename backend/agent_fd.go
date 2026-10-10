package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// OpenFDRequest is the JSON body expected by the open-FD endpoint.
type OpenFDRequest struct {
	AccountNo  string          `json:"account_no"` // linked savings account
	FDPlanID   int             `json:"fd_plan_id"` // 1=6mo, 2=12mo, 3=36mo
	Investment decimal.Decimal `json:"investment"` // principal amount in LKR
}

// OpenFDResponse is returned on success.
type OpenFDResponse struct {
	FDAccNo        string          `json:"fd_acc_no"`
	AccountNo      string          `json:"account_no"`
	FDPlanID       int             `json:"fd_plan_id"`
	Investment     decimal.Decimal `json:"investment"`
	StartDate      time.Time       `json:"start_date"`
	NextPayoutDate time.Time       `json:"next_payout_date"`
	Message        string          `json:"message"`
}

// getStaffPersonID resolves the authenticated agent's staff person_id using the centralized GetStaffPersonID from auth.go.
func getStaffPersonID(r *http.Request, db *sql.DB) (int, error) {
	personID, err := GetStaffPersonID(r, db)
	if err == nil && personID > 0 {
		return personID, nil
	}

	// Fallback for admin user so administrators can test/originate FDs
	username, authErr := getAuthenticatedUser(r, db)
	if authErr == nil && username != "" {
		var userType string
		_ = db.QueryRowContext(r.Context(), `SELECT type FROM USER_ACCOUNT WHERE username = ?`, username).Scan(&userType)
		if strings.ToLower(userType) == "admin" {
			_ = db.QueryRowContext(r.Context(), `SELECT person_id FROM STAFF ORDER BY person_id LIMIT 1`).Scan(&personID)
			if personID > 0 {
				return personID, nil
			}
		}
	}

	return 0, errors.New("forbidden: agent access required")
}

// AgentOpenFDHandler handles POST /api/fd/open for agents.
func AgentOpenFDHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeFDError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		// 1. Secure it by resolving the agent's identity via getStaffPersonID
		agentPersonID, err := getStaffPersonID(r, db)
		if err != nil {
			writeFDError(w, http.StatusForbidden, err.Error())
			return
		}

		// Parse request body
		var request OpenFDRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			writeFDError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		// 2. Validate input and ensure the investment amount is strictly positive
		request.AccountNo = strings.TrimSpace(request.AccountNo)
		if request.AccountNo == "" {
			writeFDError(w, http.StatusBadRequest, "account_no is required")
			return
		}
		if request.FDPlanID == 0 {
			writeFDError(w, http.StatusBadRequest, "fd_plan_id is required")
			return
		}
		if request.Investment.LessThanOrEqual(decimal.Zero) {
			writeFDError(w, http.StatusBadRequest, "investment amount must be positive")
			return
		}

		// Verify the savings account exists and is active
		var accountStatus string
		err = db.QueryRowContext(r.Context(),
			`SELECT status FROM SAVINGS_ACCOUNT WHERE account_no = ?`,
			request.AccountNo,
		).Scan(&accountStatus)
		if errors.Is(err, sql.ErrNoRows) {
			writeFDError(w, http.StatusNotFound, "savings account not found")
			return
		}
		if err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not verify account")
			return
		}
		if accountStatus != "active" {
			writeFDError(w, http.StatusUnprocessableEntity, "savings account is not active")
			return
		}

		// Validate the requested term matches allowed fd_plan_ids
		var termMonths int
		if err := db.QueryRowContext(r.Context(),
			`SELECT term_months FROM FD_PLAN WHERE fd_plan_id = ?`,
			request.FDPlanID,
		).Scan(&termMonths); errors.Is(err, sql.ErrNoRows) {
			writeFDError(w, http.StatusBadRequest, "invalid fd_plan_id: plan does not exist")
			return
		} else if err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not fetch FD plan")
			return
		}

		// Reserve the investment and create the FD atomically
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not start FD transaction")
			return
		}
		rollback := func() {
			_ = tx.Rollback()
		}

		var balance, minimumBalance decimal.Decimal
		err = tx.QueryRowContext(r.Context(), `
			SELECT balance, min_balance
			FROM SAVINGS_ACCOUNT sa JOIN ACCOUNT_PLAN ap ON ap.plan_id = sa.plan_id
			WHERE sa.account_no = ?
			FOR UPDATE`, request.AccountNo).Scan(&balance, &minimumBalance)
		if err != nil {
			rollback()
			writeFDError(w, http.StatusInternalServerError, "could not lock savings account")
			return
		}

		if balance.Sub(request.Investment).LessThan(minimumBalance) {
			rollback()
			writeFDError(w, http.StatusUnprocessableEntity, "insufficient funds to meet minimum balance")
			return
		}

		today := time.Now().UTC().Truncate(24 * time.Hour)
		nextPayout := today.AddDate(0, 0, 30)

		var nextSeq int64
		if err := tx.QueryRowContext(r.Context(),
			`SELECT COALESCE(MAX(CAST(SUBSTRING(fd_acc_no, 3) AS UNSIGNED)), 0) + 1
			 FROM FIXED_DEPOSIT`,
		).Scan(&nextSeq); err != nil {
			rollback()
			writeFDError(w, http.StatusInternalServerError, "could not generate FD number")
			return
		}
		fdAccNo := fmt.Sprintf("FD%09d", nextSeq)

		// Agent originates FD -> create withdrawal transaction with reference & remarks
		refNo := fmt.Sprintf("FD-INIT-%s", fdAccNo)
		remarks := fmt.Sprintf("Fixed Deposit Investment (%s)", fdAccNo)
		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO TRANSACTION (account_no, staff_person_id, txn_type, amount, balance_after, reference_no, remarks)
			VALUES (?, ?, 'withdrawal', ?, 0.00, ?, ?)`,
			request.AccountNo, agentPersonID, request.Investment, refNo, remarks)
		if err != nil {
			rollback()
			writeFDError(w, http.StatusUnprocessableEntity, "could not reserve FD investment: "+err.Error())
			return
		}

		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO FIXED_DEPOSIT
				(fd_acc_no, account_no, fd_plan_id, investment,
				 start_date, interest_paid_to_date, next_payout_date)
			VALUES (?, ?, ?, ?, ?, 0.00, ?)`,
			fdAccNo,
			request.AccountNo,
			request.FDPlanID,
			request.Investment,
			today.Format("2006-01-02"),
			nextPayout.Format("2006-01-02"),
		)
		// check unique fd constraint
		if err != nil {
			rollback()
			if strings.Contains(err.Error(), "Duplicate entry") || strings.Contains(err.Error(), "uq_fd_account_no") {
				writeFDError(w, http.StatusConflict, "This savings account already has an active FD")
				return
			}
			writeFDError(w, http.StatusInternalServerError, "could not open fixed deposit: "+err.Error())
			return
		}
		if err := tx.Commit(); err != nil {
			rollback()
			writeFDError(w, http.StatusInternalServerError, "could not commit FD opening")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(OpenFDResponse{
			FDAccNo:        fdAccNo,
			AccountNo:      request.AccountNo,
			FDPlanID:       request.FDPlanID,
			Investment:     request.Investment,
			StartDate:      today,
			NextPayoutDate: nextPayout,
			Message:        "Fixed Deposit opened successfully",
		})
	}
}

// AgentCustomerSearchHandler handles customer searches for both:
// 1. Savings Account Origination via NIC query param (?nic=<term>) -> delegates to SearchCustomerByNICHandler
// 2. Fixed Deposit Origination via Account Number (?account_no=<term>) or Username (?username=<term>)
func AgentCustomerSearchHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
			return
		}

		// 1. If 'nic' parameter is present, dispatch to guardian-aware NIC search
		if r.URL.Query().Has("nic") {
			SearchCustomerByNICHandler(db)(w, r)
			return
		}

		// Only agents can use this endpoint for FD origination
		_, err := getStaffPersonID(r, db)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "forbidden: agent access required"})
			return
		}

		searchAccountNo := strings.TrimSpace(r.URL.Query().Get("account_no"))
		searchUsername := strings.TrimSpace(r.URL.Query().Get("username"))

		type EligibleAccount struct {
			AccountNo string  `json:"account_no"`
			Balance   float64 `json:"balance"`
			PlanName  string  `json:"plan_name"`
		}

		if searchAccountNo != "" {
			// A. Verify savings account exists and is active
			var saStatus string
			err := db.QueryRowContext(r.Context(),
				`SELECT status FROM SAVINGS_ACCOUNT WHERE account_no = ?`, searchAccountNo).Scan(&saStatus)
			if errors.Is(err, sql.ErrNoRows) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotFound)
				json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Savings account %s not found", searchAccountNo)})
				return
			} else if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "could not verify account"})
				return
			}
			if saStatus != "active" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Savings account %s is not active (status: %s)", searchAccountNo, saStatus)})
				return
			}

			// B. Check if this specific savings account already has an active FD
			var existingFD string
			_ = db.QueryRowContext(r.Context(),
				`SELECT fd_acc_no FROM FIXED_DEPOSIT WHERE account_no = ?`, searchAccountNo).Scan(&existingFD)
			if existingFD != "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{
					"error": fmt.Sprintf("Account %s already has an active Fixed Deposit (%s). Each savings account is limited to one FD.", searchAccountNo, existingFD),
				})
				return
			}

			// C. Fetch customer basic info via account number
			var personID int
			var firstName, lastName, planName string
			var nic sql.NullString
			err = db.QueryRowContext(r.Context(), `
				SELECT p.person_id, p.first_name, p.last_name, COALESCE(p.nic, g.nic) AS effective_nic, ap.plan_name
				FROM PERSON p
				JOIN ACCOUNT_HOLDER ah ON p.person_id = ah.person_id
				LEFT JOIN CUSTOMER c ON p.person_id = c.person_id
				LEFT JOIN PERSON g ON c.guardian_person_id = g.person_id
				JOIN SAVINGS_ACCOUNT sa ON ah.account_no = sa.account_no
				JOIN ACCOUNT_PLAN ap ON sa.plan_id = ap.plan_id
				WHERE ah.account_no = ?
				LIMIT 1`, searchAccountNo).Scan(&personID, &firstName, &lastName, &nic, &planName)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotFound)
				json.NewEncoder(w).Encode(map[string]string{"error": "customer not found for this account"})
				return
			}

			// D. Fetch eligible savings accounts (active, no existing FD) for this person
			rows, err := db.QueryContext(r.Context(), `
				SELECT sa.account_no, sa.balance, ap.plan_name
				FROM SAVINGS_ACCOUNT sa
				JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
				JOIN ACCOUNT_PLAN ap ON sa.plan_id = ap.plan_id
				WHERE ah.person_id = ?
				  AND sa.status = 'active'
				  AND NOT EXISTS (
					  SELECT 1 FROM FIXED_DEPOSIT fd WHERE fd.account_no = sa.account_no
				  )`, personID)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "could not fetch accounts"})
				return
			}
			defer rows.Close()

			accounts := make([]EligibleAccount, 0)
			for rows.Next() {
				var acc EligibleAccount
				if err := rows.Scan(&acc.AccountNo, &acc.Balance, &acc.PlanName); err == nil {
					accounts = append(accounts, acc)
				}
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{
				"person_id":  personID,
				"first_name": firstName,
				"last_name":  lastName,
				"nic":        nic.String,
				"plan_name":  planName,
				"account_no": searchAccountNo,
				"accounts":   accounts,
			})
			return

		} else if searchUsername != "" {
			// Username search backward compatibility
			var personID int
			var firstName, lastName string
			var nic sql.NullString
			err := db.QueryRowContext(r.Context(), `
				SELECT p.person_id, p.first_name, p.last_name, COALESCE(p.nic, g.nic) AS effective_nic
				FROM CUSTOMER c
				JOIN PERSON p ON p.person_id = c.person_id
				LEFT JOIN PERSON g ON c.guardian_person_id = g.person_id
				WHERE c.username = ?`, searchUsername).Scan(&personID, &firstName, &lastName, &nic)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotFound)
				json.NewEncoder(w).Encode(map[string]string{"error": "customer not found"})
				return
			}

			rows, err := db.QueryContext(r.Context(), `
				SELECT sa.account_no, sa.balance, ap.plan_name
				FROM SAVINGS_ACCOUNT sa
				JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
				JOIN ACCOUNT_PLAN ap ON sa.plan_id = ap.plan_id
				WHERE ah.person_id = ?
				  AND sa.status = 'active'
				  AND NOT EXISTS (
					  SELECT 1 FROM FIXED_DEPOSIT fd WHERE fd.account_no = sa.account_no
				  )`, personID)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"error": "could not fetch accounts"})
				return
			}
			defer rows.Close()

			accounts := make([]EligibleAccount, 0)
			for rows.Next() {
				var acc EligibleAccount
				if err := rows.Scan(&acc.AccountNo, &acc.Balance); err == nil {
					accounts = append(accounts, acc)
				}
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]any{
				"person_id":  personID,
				"first_name": firstName,
				"last_name":  lastName,
				"nic":        nic.String,
				"username":   searchUsername,
				"accounts":   accounts,
			})
			return

		} else {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "nic, account_no, or username parameter is required"})
			return
		}
	}
}
