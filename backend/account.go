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

// $$$ Account Models $$$
// Model for customer account dropdown selection.
type CustomerAccount struct {
	AccountNo string          `json:"account_no"`
	Balance   decimal.Decimal `json:"balance"`
}

// Model for recipient verification confirmation.
type RecipientLookup struct {
	AccountNo  string `json:"account_no"`
	MaskedName string `json:"masked_name"`
	Status     string `json:"status"`
}

type AccountHistory struct {
	AccountNo    string          `json:"account_no"`
	Balance      decimal.Decimal `json:"balance"`
	HasMore      bool            `json:"has_more"`
	Transactions []Transaction   `json:"transactions"`
}

type Transaction struct {
	TransactionID   int64           `json:"transaction_id"`
	TransactionType string          `json:"transaction_type"`
	Amount          decimal.Decimal `json:"amount"`
	BalanceAfter    decimal.Decimal `json:"balance_after"`
	Timestamp       time.Time       `json:"timestamp"`
	ReferenceNo     string          `json:"reference_no"`
}

// $$$ Recipient Name Masking $$$
// Formats full name into privacy-preserving format: F*** L***
func maskName(first, last string) string {
	first = strings.TrimSpace(first)
	last = strings.TrimSpace(last)
	maskedFirst := ""
	if len(first) > 0 {
		maskedFirst = string([]rune(first)[0]) + "***"
	}
	maskedLast := ""
	if len(last) > 0 {
		maskedLast = string([]rune(last)[0]) + "***"
	}
	if maskedFirst != "" && maskedLast != "" {
		return maskedFirst + " " + maskedLast
	}
	if maskedFirst != "" {
		return maskedFirst
	}
	return maskedLast
}

// $$$ Customer Accounts Handler $$$
// Returns all active savings accounts owned by the authenticated customer.
func CustomerAccountsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Resolve username from session token or testing parameter
		username, err := getAuthenticatedUser(r, db)
		if err != nil || username == "" {
			http.Error(w, "Unauthorized access", http.StatusUnauthorized)
			return
		}

		query := `
			SELECT sa.account_no, sa.balance
			FROM CUSTOMER c
			JOIN ACCOUNT_HOLDER ah ON c.person_id = ah.person_id
			JOIN SAVINGS_ACCOUNT sa ON ah.account_no = sa.account_no
			WHERE c.username = ? AND sa.status = 'active'
			ORDER BY sa.account_no ASC`

		rows, err := db.QueryContext(r.Context(), query, username)
		if err != nil {
			http.Error(w, "Database error querying accounts", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		accounts := make([]CustomerAccount, 0)
		for rows.Next() {
			var acc CustomerAccount
			if err := rows.Scan(&acc.AccountNo, &acc.Balance); err != nil {
				http.Error(w, "Error reading account row", http.StatusInternalServerError)
				return
			}
			accounts = append(accounts, acc)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(accounts)
	}
}

// $$$ Recipient Lookup Handler $$$
// Validates destination account existence and returns masked holder name.
func AccountHolderLookupHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		accountNo := strings.TrimSpace(r.URL.Query().Get("account_no"))
		if accountNo == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "account_no parameter is required"})
			return
		}

		// Uses QueryContext to handle Joint Accounts (multiple account holders) gracefully.
		query := `
			SELECT 
				sa.account_no,
				sa.status,
				COALESCE(p.first_name, ''),
				COALESCE(p.last_name, '')
			FROM SAVINGS_ACCOUNT sa
			LEFT JOIN ACCOUNT_HOLDER ah ON sa.account_no = ah.account_no
			LEFT JOIN PERSON p ON ah.person_id = p.person_id
			WHERE sa.account_no = ?`

		rows, err := db.QueryContext(r.Context(), query, accountNo)
		if err != nil {
			http.Error(w, "Database lookup error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var resp RecipientLookup
		var maskedHolders []string
		found := false

		for rows.Next() {
			found = true
			var accNo, status, firstName, lastName string
			if err := rows.Scan(&accNo, &status, &firstName, &lastName); err != nil {
				http.Error(w, "Error reading lookup row", http.StatusInternalServerError)
				return
			}
			resp.AccountNo = accNo
			resp.Status = status
			if firstName != "" || lastName != "" {
				maskedHolders = append(maskedHolders, maskName(firstName, lastName))
			}
		}

		if !found {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "Account not found",
			})
			return
		}

		if resp.Status != "active" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "Account is " + resp.Status + " and cannot receive transfers",
			})
			return
		}

		if len(maskedHolders) > 0 {
			resp.MaskedName = strings.Join(maskedHolders, " / ")
		} else {
			resp.MaskedName = "B-Trust Customer"
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}

// $$$ Account History Handler $$$
// Fetches transaction history for a savings account, supporting pagination.
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

		importStrconv := true
		_ = importStrconv // Handled by goimports later if needed.

		// Parse offset from URL query
		offsetStr := request.URL.Query().Get("offset")
		var offset int
		fmt.Sscanf(offsetStr, "%d", &offset) // simple parse without extra imports
		if offset < 0 {
			offset = 0
		}

		limit := 50
		// Fetch limit + 1 to detect if there are more rows
		rows, err := db.QueryContext(request.Context(), `
			SELECT txn_id, txn_type, amount, balance_after, timestamp, reference_no
			FROM TRANSACTION
			WHERE account_no = ?
			ORDER BY timestamp DESC, txn_id DESC
			LIMIT ? OFFSET ?`, accountNo, limit+1, offset)
		if err != nil {
			writeAccountError(response, http.StatusInternalServerError, "could not fetch transactions")
			return
		}
		defer rows.Close()

		history.Transactions = make([]Transaction, 0)
		for rows.Next() {
			var transaction Transaction
			var nullRef sql.NullString
			if err := rows.Scan(
				&transaction.TransactionID,
				&transaction.TransactionType,
				&transaction.Amount,
				&transaction.BalanceAfter,
				&transaction.Timestamp,
				&nullRef,
			); err != nil {
				writeAccountError(response, http.StatusInternalServerError, "could not read transaction")
				return
			}
			transaction.ReferenceNo = nullRef.String
			history.Transactions = append(history.Transactions, transaction)
		}
		if err := rows.Err(); err != nil {
			writeAccountError(response, http.StatusInternalServerError, "could not read transactions")
			return
		}

		if len(history.Transactions) > limit {
			history.HasMore = true
			history.Transactions = history.Transactions[:limit]
		} else {
			history.HasMore = false
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
