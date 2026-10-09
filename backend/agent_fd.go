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

// getStaffPersonID -the authenticated username to a staff person_id.

func getStaffPersonID(r *http.Request, db *sql.DB) (int, error) {
	username, err := getAuthenticatedUser(r, db)
	if err != nil || username == "" {
		return 0, errors.New("unauthorized")
	}

	var personID int
	// Query the STAFF table directly using the username

	err = db.QueryRowContext(r.Context(),
		`select person_id from staff where username= ?`,
		username).Scan(&personID)

	if err != nil {
		fmt.Println("DEBUG getStaffPersonID err:", err, "username:", username)
		return 0, errors.New("forbidden: agent access required")
	}
	return personID, nil
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
		if request.AccountNo == "" {
			writeFDError(w, http.StatusBadRequest, "account_no is required")
			return
		}
		if request.FDPlanID == 0 {
			writeFDError(w, http.StatusBadRequest, "fd_plan_id is required")
			return
		}
		if request.Investment.LessThanOrEqual(decimal.Zero) {
			writeFDError(w, http.StatusBadRequest, "investment amount must be  positive")
			return
		}

		// Verify the savings account exists and is active
		var accountStatus string
		err = db.QueryRowContext(r.Context(),
			`select status from savings_account where account_no = ?`,
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

		//  Validate the requested term matches allowed fd_plan_ids
		var termMonths int
		if err := db.QueryRowContext(r.Context(),
			`select term_months from fd_plan where fd_plan_id = ?`,
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
			select balance, min_balance
			from savings_account join account_plan on account_plan.plan_id = savings_account.plan_id
			where account_no = ?
			for update`, request.AccountNo).Scan(&balance, &minimumBalance)
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

		// Agent originates FD -> create withdrawal txn

		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO TRANSACTION (account_no, staff_person_id, txn_type, amount, balance_after)
			VALUES (?, ?, 'withdrawal', ?, 0.00)`,
			request.AccountNo, agentPersonID, request.Investment)
		if err != nil {
			rollback()
			writeFDError(w, http.StatusUnprocessableEntity, "could not reserve FD investment: "+err.Error())
			return
		}

		today := time.Now().UTC().Truncate(24 * time.Hour)
		nextPayout := today.AddDate(0, 0, 30)

		var nextSeq int64
		if err := tx.QueryRowContext(r.Context(),
			`select coalesce(max(cast(substring(fd_acc_no, 3) as unsigned)), 0) + 1
			 from fixed_deposit`,
		).Scan(&nextSeq); err != nil {
			rollback()
			writeFDError(w, http.StatusInternalServerError, "could not generate FD number")
			return
		}
		fdAccNo := fmt.Sprintf("FD%09d", nextSeq)

		_, err = tx.ExecContext(r.Context(), `
			insert into fixed_deposit
				(fd_acc_no, account_no, fd_plan_id, investment,
				 start_date, interest_paid_to_date, next_payout_date)
			values (?, ?, ?, ?, ?, 0.00, ?)`,
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
// 2. Fixed Deposit Origination via Username query param (?username=<term>) -> fetches customer info and eligible savings accounts
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

		// 2. Otherwise, check FD customer search by username
		searchUsername := strings.TrimSpace(r.URL.Query().Get("username"))
		if searchUsername == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "nic or username parameter is required"})
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

		// Fetch customer basic info
		var personID int
		var firstName, lastName, nic string
		err = db.QueryRowContext(r.Context(), `
			select p.person_id, p.first_name, p.last_name, p.nic
			from customer c
			join person p on p.person_id = c.person_id
			where c.username = ?`, searchUsername).Scan(&personID, &firstName, &lastName, &nic)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "customer not found"})
			return
		}

		// Fetch eligible savings accounts (active, no existing FD)
		type EligibleAccount struct {
			AccountNo string  `json:"account_no"`
			Balance   float64 `json:"balance"`
		}
		rows, err := db.QueryContext(r.Context(), `
			select sa.account_no, sa.balance
			from savings_account sa
			join account_holder ah on ah.account_no = sa.account_no
			where ah.person_id = ?
			  and sa.status = 'active'
			  and not exists (
				  select 1 from fixed_deposit fd where fd.account_no = sa.account_no
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
			"nic":        nic,
			"username":   searchUsername,
			"accounts":   accounts,
		})
	}
}
