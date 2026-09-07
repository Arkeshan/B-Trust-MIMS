package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
	"fmt"
)

type AccountHistory struct {
	AccountNo    string        `json:"account_no"`
	Balance      float64       `json:"balance"`
	Transactions []Transaction `json:"transactions"`
}

type Transaction struct {
	TransactionID   int64     `json:"transaction_id"`
	TransactionType string    `json:"transaction_type"`
	Amount          float64   `json:"amount"`
	BalanceAfter    float64   `json:"balance_after"`
	Timestamp       time.Time `json:"timestamp"`
	ReferenceNo     string    `json:"reference_no"`
}

// AccountHistoryHandler returns a handler with its database dependency supplied by the caller.
func AccountHistoryHandler(db *sql.DB) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet {
			writeAccountError(response, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		accountNo := accountNumberFromPath(request.URL.Path)
		if accountNo == "" {
			writeAccountError(response, http.StatusBadRequest, "account number is required")
			return
		}

		var history AccountHistory
		err := db.QueryRowContext(request.Context(), `
			SELECT account_no, balance
			FROM SAVINGS_ACCOUNT
			WHERE account_no = ?`, accountNo).Scan(&history.AccountNo, &history.Balance)
		if errors.Is(err, sql.ErrNoRows) {
			writeAccountError(response, http.StatusNotFound, "account not found")
			return
		}
		if err != nil {
			writeAccountError(response, http.StatusInternalServerError, "could not fetch account")
			return
		}

		rows, err := db.QueryContext(request.Context(), `
			SELECT txn_id, txn_type, amount, balance_after, timestamp, reference_no
			FROM TRANSACTION
			WHERE account_no = ?
			ORDER BY timestamp DESC, txn_id DESC`, accountNo)
		if err != nil {
			writeAccountError(response, http.StatusInternalServerError, "could not fetch transactions")
			return
		}
		defer rows.Close()

		history.Transactions = make([]Transaction, 0)
		for rows.Next() {
			var transaction Transaction
			if err := rows.Scan(
				&transaction.TransactionID,
				&transaction.TransactionType,
				&transaction.Amount,
				&transaction.BalanceAfter,
				&transaction.Timestamp,
				&transaction.ReferenceNo,
			); err != nil {
				writeAccountError(response, http.StatusInternalServerError, "could not read transaction")
				return
			}
			history.Transactions = append(history.Transactions, transaction)
		}
		if err := rows.Err(); err != nil {
			writeAccountError(response, http.StatusInternalServerError, "could not read transactions")
			return
		}

		response.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(response).Encode(history); err != nil {
			return
		}
	}
}

func accountNumberFromPath(path string) string {
	const prefix = "/api/account/"
	if !strings.HasPrefix(path, prefix) || !strings.HasSuffix(path, "/history") {
		return ""
	}
	return strings.Trim(strings.TrimSuffix(strings.TrimPrefix(path, prefix), "/history"), "/")
}

func writeAccountError(response http.ResponseWriter, status int, message string) {
	http.Error(response, message, status)
}

func getAccountHistory(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Account history endpoint works!")
}
