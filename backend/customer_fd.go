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

// FDPlan holds the plan details returned alongside an FD.
type FDPlan struct {
	FDPlanID     int             `json:"fd_plan_id"`
	InterestRate decimal.Decimal `json:"interest_rate"`
	TermMonths   int             `json:"term_months"`
}

// FixedDeposit is the full FD record returned to the client.
type FixedDeposit struct {
	FDAccNo   string `json:"fd_acc_no"`
	AccountNo string `json:"account_no"`
}

// ListFDHandler handles GET /api/fd/list and returns all fixed deposits.
func ListFDHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeFDError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		username, err := getAuthenticatedUser(r, db)
		if err != nil || username == "" {
			writeFDError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		rows, err := db.QueryContext(r.Context(), `
			SELECT v.fd_acc_no, v.account_no
			FROM vw_fd_status AS v
			JOIN ACCOUNT_HOLDER ah ON ah.account_no = v.account_no
			JOIN CUSTOMER c ON c.person_id = ah.person_id
			WHERE c.username = ?
			ORDER BY v.next_payout_date, v.fd_acc_no`, username)
		if err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not fetch fixed deposits")
			return
		}
		defer rows.Close()

		deposits := make([]FixedDeposit, 0)
		for rows.Next() {
			var deposit FixedDeposit
			if err := rows.Scan(
				&deposit.FDAccNo,
				&deposit.AccountNo,
			); err != nil {
				writeFDError(w, http.StatusInternalServerError, "could not read fixed deposit")
				return
			}
			deposits = append(deposits, deposit)
		}
		if err := rows.Err(); err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not read fixed deposits")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(deposits)
	}
}

// CronInterestResponse is returned after the interest run completes.
type CronInterestResponse struct {
	FDsProcessed int       `json:"fds_processed"`
	FDsSkipped   int       `json:"fds_skipped"`
	RunAt        time.Time `json:"run_at"`
	Message      string    `json:"message"`
}

// It calls the MySQL stored procedure ProcessFDInterest() and returns the summary mainly for testing .
func CronInterestHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeFDError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		// Call the stored procedure
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

type FDStatus struct {
	FDAccNo               string          `json:"fd_acc_no"`
	AccountNo             string          `json:"account_no"`
	Investment            decimal.Decimal `json:"investment"`
	StartDate             time.Time       `json:"start_date"`
	DueDate               time.Time       `json:"due_date"`
	ElapsedMonths         int             `json:"elapsed_months"`
	InterestRate          decimal.Decimal `json:"interest_rate"`
	TermMonths            int             `json:"term_months"`
	InterestPaidToDate    decimal.Decimal `json:"interest_paid_to_date"`
	CurrentEarnedInterest decimal.Decimal `json:"current_earned_interest"`
	NextPayoutDate        time.Time       `json:"next_payout_date"`
}

// FDStatusHandler handles GET /api/fd/status/{id}
func FDStatusHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeFDError(w, http.StatusMethodNotAllowed, "Method Not Allowed")
			return
		}

		fdAccNo := strings.TrimPrefix(r.URL.Path, "/api/fd/status/")
		fdAccNo = strings.TrimSuffix(fdAccNo, "/")
		if fdAccNo == "" {
			writeFDError(w, http.StatusBadRequest, "Missing FD Account Number")
			return
		}

		var s FDStatus
		err := db.QueryRowContext(r.Context(), `
		SELECT
		fd_acc_no,
		account_no,
		investment,
		start_date,
		due_date,
		elapsed_months,
		interest_rate,
		term_months,
		interest_paid_to_date,
		current_interest,
		next_payout_date
		FROM vw_fd_status WHERE fd_acc_no = ?`, fdAccNo,
		).Scan(
			&s.FDAccNo,
			&s.AccountNo,
			&s.Investment,
			&s.StartDate,
			&s.DueDate,
			&s.ElapsedMonths,
			&s.InterestRate,
			&s.TermMonths,
			&s.InterestPaidToDate,
			&s.CurrentEarnedInterest,
			&s.NextPayoutDate,
		)
		if errors.Is(err, sql.ErrNoRows) {
			writeFDError(w, http.StatusNotFound, "fixed deposit not found")
			return
		}
		if err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not fetch FD status: "+err.Error())
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(s)
	}
}
