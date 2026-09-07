package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

// ─────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────

// FDPlan holds the plan details returned alongside an FD.
type FDPlan struct {
	FDPlanID     int     `json:"fd_plan_id"`
	InterestRate float64 `json:"interest_rate"`
	TermMonths   int     `json:"term_months"`
}

// FixedDeposit is the full FD record returned to the client.
type FixedDeposit struct {
	FDAccNo          string    `json:"fd_acc_no"`
	AccountNo        string    `json:"account_no"`
	Plan             FDPlan    `json:"plan"`
	Investment       float64   `json:"investment"`
	StartDate        time.Time `json:"start_date"`
	MaturityDate     time.Time `json:"maturity_date"`
	NextPayoutDate   time.Time `json:"next_payout_date"`
	InterestPaidSoFar float64  `json:"interest_paid_so_far"`
}

// ─────────────────────────────────────────────
// POST /api/fd/open
// ─────────────────────────────────────────────

// OpenFDRequest is the JSON body expected by the open-FD endpoint.
type OpenFDRequest struct {
	AccountNo  string  `json:"account_no"`  // linked savings account
	FDPlanID   int     `json:"fd_plan_id"`  // 1=6mo, 2=12mo, 3=36mo
	Investment float64 `json:"investment"`  // principal amount in LKR
}

// OpenFDResponse is returned on success.
type OpenFDResponse struct {
	FDAccNo        string    `json:"fd_acc_no"`
	AccountNo      string    `json:"account_no"`
	FDPlanID       int       `json:"fd_plan_id"`
	Investment     float64   `json:"investment"`
	StartDate      time.Time `json:"start_date"`
	NextPayoutDate time.Time `json:"next_payout_date"`
	Message        string    `json:"message"`
}

// OpenFDHandler handles POST /api/fd/open.
// It validates the request, enforces business rules, and inserts the FD.
func OpenFDHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeFDError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		// ── 1. Parse request body ────────────────────────────────────────
		var req OpenFDRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeFDError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if req.AccountNo == "" {
			writeFDError(w, http.StatusBadRequest, "account_no is required")
			return
		}
		if req.FDPlanID == 0 {
			writeFDError(w, http.StatusBadRequest, "fd_plan_id is required")
			return
		}
		if req.Investment <= 0 {
			writeFDError(w, http.StatusBadRequest, "investment must be greater than zero")
			return
		}

		// ── 2. Verify the savings account exists and is active ───────────
		var accountStatus string
		err := db.QueryRowContext(r.Context(),
			`SELECT status FROM SAVINGS_ACCOUNT WHERE account_no = ?`,
			req.AccountNo,
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

		// ── 3. Enforce one-FD-per-account rule ──────────────────────────
		// (Also enforced by the trg_one_fd_per_account trigger in MySQL,
		//  but we check here to return a friendly message.)
		var existingFDCount int
		if err := db.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM FIXED_DEPOSIT WHERE account_no = ?`,
			req.AccountNo,
		).Scan(&existingFDCount); err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not check existing FDs")
			return
		}
		if existingFDCount > 0 {
			writeFDError(w, http.StatusConflict,
				"this savings account already has an active fixed deposit")
			return
		}

		// ── 4. Verify the FD plan exists ─────────────────────────────────
		var termMonths int
		if err := db.QueryRowContext(r.Context(),
			`SELECT term_months FROM FD_PLAN WHERE fd_plan_id = ?`,
			req.FDPlanID,
		).Scan(&termMonths); errors.Is(err, sql.ErrNoRows) {
			writeFDError(w, http.StatusBadRequest, "invalid fd_plan_id")
			return
		} else if err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not fetch FD plan")
			return
		}

		// ── 5. Generate FD account number and compute dates ──────────────
		today := time.Now().UTC().Truncate(24 * time.Hour)
		nextPayout := today.AddDate(0, 0, 30)

		// Generate a unique FD account number: FD + 9-digit zero-padded sequence
		var nextSeq int64
		if err := db.QueryRowContext(r.Context(),
			`SELECT COALESCE(MAX(CAST(SUBSTRING(fd_acc_no, 3) AS UNSIGNED)), 0) + 1
			 FROM FIXED_DEPOSIT`,
		).Scan(&nextSeq); err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not generate FD number")
			return
		}
		fdAccNo := fmt.Sprintf("FD%09d", nextSeq)

		// ── 6. Insert the Fixed Deposit ───────────────────────────────────
		_, err = db.ExecContext(r.Context(), `
			INSERT INTO FIXED_DEPOSIT
				(fd_acc_no, account_no, fd_plan_id, investment,
				 start_date, interest_paid_to_date, next_payout_date)
			VALUES (?, ?, ?, ?, ?, 0.00, ?)`,
			fdAccNo,
			req.AccountNo,
			req.FDPlanID,
			req.Investment,
			today.Format("2006-01-02"),
			nextPayout.Format("2006-01-02"),
		)
		if err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not open fixed deposit: "+err.Error())
			return
		}

		// ── 7. Respond ────────────────────────────────────────────────────
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(OpenFDResponse{
			FDAccNo:        fdAccNo,
			AccountNo:      req.AccountNo,
			FDPlanID:       req.FDPlanID,
			Investment:     req.Investment,
			StartDate:      today,
			NextPayoutDate: nextPayout,
			Message:        "Fixed Deposit opened successfully",
		})
	}
}

// ─────────────────────────────────────────────
// POST /api/cron/interest
// ─────────────────────────────────────────────

// CronInterestResponse is returned after the interest run completes.
type CronInterestResponse struct {
	FDsProcessed int       `json:"fds_processed"`
	FDsSkipped   int       `json:"fds_skipped"`
	RunAt        time.Time `json:"run_at"`
	Message      string    `json:"message"`
}

// CronInterestHandler handles POST /api/cron/interest.
// It calls the MySQL stored procedure ProcessFDInterest() and returns the summary.
// In production this endpoint should be protected by a secret header or IP allowlist.
func CronInterestHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeFDError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		// Call the stored procedure — returns one result set row
		rows, err := db.QueryContext(r.Context(), `CALL ProcessFDInterest()`)
		if err != nil {
			writeFDError(w, http.StatusInternalServerError,
				"interest processing failed: "+err.Error())
			return
		}
		defer rows.Close()

		var resp CronInterestResponse
		if rows.Next() {
			if err := rows.Scan(
				&resp.FDsProcessed,
				&resp.FDsSkipped,
				&resp.RunAt,
			); err != nil {
				writeFDError(w, http.StatusInternalServerError,
					"could not read procedure result")
				return
			}
		}
		if err := rows.Err(); err != nil {
			writeFDError(w, http.StatusInternalServerError, err.Error())
			return
		}

		resp.Message = fmt.Sprintf(
			"Interest run complete: %d FD(s) credited, %d skipped",
			resp.FDsProcessed, resp.FDsSkipped,
		)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

// ─────────────────────────────────────────────
// Shared error writer
// ─────────────────────────────────────────────

func writeFDError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
