package main

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/shopspring/decimal"
)

// Returns the total count and total value of transactions processed by the logged-in agent.
func AgentStatsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeFDError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		agentPersonID, err := getStaffPersonID(r, db)
		if err != nil {
			writeFDError(w, http.StatusForbidden, "forbidden: agent access required")
			return
		}

		var totalTxns int
		var totalValue decimal.Decimal

		// Query the total transactions and total value
		err = db.QueryRowContext(r.Context(), `
			select total_transactions, total_value
			from vw_agent_transaction_summary
			where agent_person_id = ?`,
			agentPersonID,
		).Scan(&totalTxns, &totalValue)
		if err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not fetch stats")
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"total_transactions": totalTxns,
			"total_value":        totalValue,
		})
	}
}

// Returns all customers assigned to the logged in agent, including their savings accounts and FDs.
func AgentCustomersHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeFDError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		agentPersonID, err := getStaffPersonID(r, db)
		if err != nil {
			writeFDError(w, http.StatusForbidden, "forbidden: agent access required")
			return
		}

		// Fetch customers assigned to this agent with their accounts and FD info
		rows, err := db.QueryContext(r.Context(), `
			SELECT
				p.person_id,
				p.first_name,
				p.last_name,
				p.nic,
				c.username,
				sa.account_no,
				sa.balance,
				fd.fd_acc_no,
				fd.investment
			FROM CUSTOMER c
			JOIN PERSON p ON p.person_id = c.person_id
			JOIN ACCOUNT_HOLDER ah ON ah.person_id = c.person_id
			JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
			LEFT JOIN FIXED_DEPOSIT fd ON fd.account_no = sa.account_no
			WHERE c.assigned_agent_person_id = ?
			ORDER BY p.person_id, sa.account_no`,
			agentPersonID,
		)
		if err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not fetch customers")
			return
		}
		defer rows.Close()

		// Group rows by customer since one customer can have multiple accounts
		type AccountInfo struct {
			AccountNo    string           `json:"account_no"`
			Balance      decimal.Decimal  `json:"balance"`
			FDAccNo      *string          `json:"fd_acc_no,omitempty"`
			FDInvestment *decimal.Decimal `json:"fd_investment,omitempty"`
		}
		type CustomerInfo struct {
			PersonID  int           `json:"person_id"`
			FirstName string        `json:"first_name"`
			LastName  string        `json:"last_name"`
			Accounts  []AccountInfo `json:"accounts"`
		}

		customerMap := make(map[int]*CustomerInfo)
		customerOrder := []int{}

		for rows.Next() {
			var personID int
			var firstName, lastName, nic, username, accountNo string
			var balance decimal.Decimal
			var fdAccNo sql.NullString
			var fdInvestment decimal.NullDecimal

			if err := rows.Scan(&personID, &firstName, &lastName, &nic, &username, &accountNo, &balance, &fdAccNo, &fdInvestment); err != nil {
				continue
			}

			if _, exists := customerMap[personID]; !exists {
				customerMap[personID] = &CustomerInfo{
					PersonID:  personID,
					FirstName: firstName,
					LastName:  lastName,
					Accounts:  []AccountInfo{},
				}
				customerOrder = append(customerOrder, personID)
			}

			acc := AccountInfo{
				AccountNo: accountNo,
				Balance:   balance,
			}
			if fdAccNo.Valid {
				s := fdAccNo.String
				acc.FDAccNo = &s
			}
			if fdInvestment.Valid {
				v := fdInvestment.Decimal
				acc.FDInvestment = &v
			}
			customerMap[personID].Accounts = append(customerMap[personID].Accounts, acc)
		}

		// Build ordered result
		result := make([]CustomerInfo, 0, len(customerOrder))
		for _, pid := range customerOrder {
			result = append(result, *customerMap[pid])
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}

// Returns all transactions processed by this agent in the last 30 days.
func AgentLedgerHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeFDError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		agentPersonID, err := getStaffPersonID(r, db)
		if err != nil {
			writeFDError(w, http.StatusForbidden, "forbidden: agent access required")
			return
		}

		rows, err := db.QueryContext(r.Context(), `
			SELECT txn_id, txn_type, amount, timestamp, reference_no
			FROM TRANSACTION
			WHERE staff_person_id = ?
			  AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
			ORDER BY timestamp DESC`,
			agentPersonID,
		)
		if err != nil {
			writeFDError(w, http.StatusInternalServerError, "could not fetch ledger")
			return
		}
		defer rows.Close()

		type LedgerRow struct {
			TxnID       int64           `json:"txn_id"`
			Type        string          `json:"type"`
			Amount      decimal.Decimal `json:"amount"`
			Date        string          `json:"date"`
			ReferenceNo sql.NullString  `json:"reference_no"`
		}

		ledger := make([]LedgerRow, 0)
		for rows.Next() {
			var row LedgerRow
			if err := rows.Scan(&row.TxnID, &row.Type, &row.Amount, &row.Date, &row.ReferenceNo); err != nil {
				continue
			}
			ledger = append(ledger, row)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ledger)
	}
}
