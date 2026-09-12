package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

type CustomerTransferRequest struct {
	FromAccount string          `json:"from_account"`
	ToAccount   string          `json:"to_account"`
	Amount      decimal.Decimal `json:"amount"`
	Remarks     string          `json:"remarks"`
}

type CustomerTransferResponse struct {
	Status           string          `json:"status"`
	Message          string          `json:"message"`
	ReferenceNo      string          `json:"reference_no"`
	FromAccount      string          `json:"from_account"`
	ToAccount        string          `json:"to_account"`
	Amount           decimal.Decimal `json:"amount"`
	SenderNewBalance decimal.Decimal `json:"sender_new_balance"`
	Timestamp        time.Time       `json:"timestamp"`
}

// $$$ Generate Transfer Reference $$$
// Combines timestamp and random hex bytes for a shared tracking reference.
func generateTransferRef() string {
	bytes := make([]byte, 3)
	_, _ = rand.Read(bytes)
	randomHex := strings.ToUpper(hex.EncodeToString(bytes))
	return fmt.Sprintf("TRF%s%s", time.Now().Format("060102150405"), randomHex)
}

// $$$ Customer Transfer Handler $$$
// Executes an atomic fund transfer between two savings accounts.
func CustomerTransferHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()

		if r.Method != http.MethodPost {
			http.Error(w, "Only POST requests are allowed", http.StatusMethodNotAllowed)
			return
		}

		// $$$ 1. Validate Input Payload $$$
		var req CustomerTransferRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Invalid request payload format.",
			})
			return
		}

		req.FromAccount = strings.TrimSpace(req.FromAccount)
		req.ToAccount = strings.TrimSpace(req.ToAccount)
		req.Remarks = strings.TrimSpace(req.Remarks)

		if req.FromAccount == "" || req.ToAccount == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Both source and destination accounts are required.",
			})
			return
		}

		if req.FromAccount == req.ToAccount {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Source and destination accounts cannot be identical.",
			})
			return
		}

		if req.Amount.LessThanOrEqual(decimal.Zero) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Transfer amount must be greater than zero.",
			})
			return
		}

		// $$$ 2. Authenticate User Session $$$
		// Resolves the logged-in username from the active database session.
		authenticatedUser, _ := getAuthenticatedUser(r, db)

		// $$$ 3. Verify Source Account Ownership $$$
		// Confirms the authenticated user actually owns the debit account.
		// Uses generic error to avoid leaking account existence.
		var ownershipCount int
		ownershipQuery := `
			SELECT COUNT(*) 
			FROM ACCOUNT_HOLDER ah
			JOIN CUSTOMER c ON ah.person_id = c.person_id
			WHERE c.username = ? AND ah.account_no = ?`
		err := db.QueryRowContext(r.Context(), ownershipQuery, authenticatedUser, req.FromAccount).Scan(&ownershipCount)
		if err != nil || ownershipCount == 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Invalid source account or insufficient authorization.",
			})
			return
		}

		// $$$ 4. Verify Destination Account $$$
		// Checks destination account exists and is active.
		var toStatus string
		err = db.QueryRowContext(r.Context(),
			"SELECT status FROM SAVINGS_ACCOUNT WHERE account_no = ?", req.ToAccount).Scan(&toStatus)
		if err != nil || toStatus != "active" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Destination account is invalid or cannot receive transfers.",
			})
			return
		}

		// $$$ 5. Begin ACID Transaction $$$
		// All subsequent operations succeed together or rollback on error.
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			http.Error(w, "Server error: could not initiate transaction", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// Lock the source account row for update
		var fromStatus string
		err = tx.QueryRowContext(r.Context(),
			"SELECT status FROM SAVINGS_ACCOUNT WHERE account_no = ? FOR UPDATE", req.FromAccount).Scan(&fromStatus)
		if err != nil || fromStatus != "active" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Source account is inactive and cannot perform transfers.",
			})
			return
		}

		refNo := generateTransferRef()

		// $$$ 6. Debit Source Account $$$
		// Triggers before_transaction_insert to check balance & min_balance rules.
		debitRemarks := req.Remarks
		if debitRemarks == "" {
			debitRemarks = fmt.Sprintf("Transfer to %s", req.ToAccount)
		} else {
			debitRemarks = fmt.Sprintf("Transfer to %s - %s", req.ToAccount, debitRemarks)
		}

		insertDebitQuery := `INSERT INTO TRANSACTION 
			(account_no, staff_person_id, txn_type, amount, balance_after, reference_no, remarks) 
			VALUES (?, NULL, 'withdrawal', ?, 0.00, ?, ?)`

		_, err = tx.ExecContext(r.Context(), insertDebitQuery,
			req.FromAccount, req.Amount.String(), refNo, debitRemarks)
		if err != nil {
			log.Printf("[Customer Transfer] Debit failed for %s: %v", req.FromAccount, err)
			errMsg := "Transaction Denied: Insufficient funds or minimum balance breached."
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": errMsg,
			})
			return
		}

		// $$$ 7. Credit Destination Account $$$
		// Triggers before_transaction_insert to credit recipient savings balance.
		creditRemarks := req.Remarks
		if creditRemarks == "" {
			creditRemarks = fmt.Sprintf("Transfer from %s", req.FromAccount)
		} else {
			creditRemarks = fmt.Sprintf("Transfer from %s - %s", req.FromAccount, creditRemarks)
		}

		insertCreditQuery := `INSERT INTO TRANSACTION 
			(account_no, staff_person_id, txn_type, amount, balance_after, reference_no, remarks) 
			VALUES (?, NULL, 'deposit', ?, 0.00, ?, ?)`

		_, err = tx.ExecContext(r.Context(), insertCreditQuery,
			req.ToAccount, req.Amount.String(), refNo, creditRemarks)
		if err != nil {
			log.Printf("[Customer Transfer] Credit failed for %s: %v", req.ToAccount, err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Transfer failed while crediting destination account.",
			})
			return
		}

		// $$$ 8. Fetch Updated Sender Balance $$$
		var updatedSenderBalance decimal.Decimal
		err = tx.QueryRowContext(r.Context(),
			"SELECT balance FROM SAVINGS_ACCOUNT WHERE account_no = ?", req.FromAccount).Scan(&updatedSenderBalance)
		if err != nil {
			http.Error(w, "Failed to verify new balance", http.StatusInternalServerError)
			return
		}

		// $$$ 9. Commit Transaction & Return Receipt $$$
		if err := tx.Commit(); err != nil {
			log.Printf("[Customer Transfer] Commit failed: %v", err)
			http.Error(w, "Failed to finalize transfer transaction", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(CustomerTransferResponse{
			Status:           "success",
			Message:          fmt.Sprintf("Successfully transferred LKR %s to %s.", req.Amount.StringFixed(2), req.ToAccount),
			ReferenceNo:      refNo,
			FromAccount:      req.FromAccount,
			ToAccount:        req.ToAccount,
			Amount:           req.Amount,
			SenderNewBalance: updatedSenderBalance,
			Timestamp:        time.Now(),
		})
	}
}
