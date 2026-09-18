package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"
)

// RecentTransaction defines the JSON structure for history responses
type RecentTransaction struct {
	TxnID     int     `json:"txn_id"`
	AccountNo string  `json:"account_no"`
	TxnType   string  `json:"txn_type"`
	Amount    float64 `json:"amount"`
	Timestamp string  `json:"timestamp"`
}

// RecentHistoryHandler fetches the 7-day transaction list for a selected account
func RecentHistoryHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Extract the {id} from the URL path: /api/account/{id}/history/recent
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 6 {
			http.Error(w, "Invalid URL format", http.StatusBadRequest)
			return
		}
		accountNo := parts[3]

		// Query the new view filtering by the specific account
		query := `SELECT txn_id, account_no, txn_type, amount, timestamp 
				  FROM vw_recent_txn 
				  WHERE account_no = ? 
				  ORDER BY timestamp DESC`

		rows, err := db.Query(query, accountNo)
		if err != nil {
			log.Printf("Database Error querying recent history: %v\n", err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var transactions []RecentTransaction
		for rows.Next() {
			var txn RecentTransaction
			if err := rows.Scan(&txn.TxnID, &txn.AccountNo, &txn.TxnType, &txn.Amount, &txn.Timestamp); err != nil {
				log.Printf("Data Scan Error: %v\n", err)
				continue
			}
			transactions = append(transactions, txn)
		}

		if transactions == nil {
			transactions = []RecentTransaction{}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(transactions)
	}
}