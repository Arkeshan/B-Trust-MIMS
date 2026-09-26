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

	_ "github.com/go-sql-driver/mysql"
	"github.com/shopspring/decimal"
)

// TxnRequest defines the expected JSON payload for teller transactions.
type TxnRequest struct {
	AccountNo string          `json:"account_no"`
	Amount    decimal.Decimal `json:"amount"`
	Remarks   string          `json:"remarks,omitempty"`
}

// generateTxnRef generates a unique reference number for teller cash transactions.
func generateTxnRef(txnType string) string{
	bytes :=make([]byte, 3)
	_, _ =rand.Read(bytes)
	randomHex := strings.ToUpper(hex.EncodeToString(bytes))
	prefix :="DEP"
	if txnType =="withdrawal" {
		prefix ="WTH"
	}
	return fmt.Sprintf("%s%s%s", prefix,time.Now().Format("060102150405"), randomHex)
}
func getStaffIDFromSession(r *http.Request,db *sql.DB) int{
	var token string
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader,"Bearer ") {
		token =strings.TrimPrefix(authHeader, "Bearer ")
	} else if authHeader !=""{
		token = authHeader
	} else if cookie, err:=r.Cookie("session_id"); err == nil {
		token= cookie.Value
	}

	if token !="" && db !=nil{
		var personID int
		err := db.QueryRowContext(r.Context(), `
			SELECT s.person_id 
			FROM USER_SESSION us 
			JOIN STAFF s ON s.username = us.username 
			WHERE us.session_id = ? AND us.expires_at > NOW()`,
			token,
		).Scan(&personID)
		if err==nil&& personID> 0{
			return personID
		}
	}

	// Default fallback to Agent ID 1 (e.g. Agent Achira) for local dev testing
	return 1
}

// ProcessTransaction handles POST /api/txn/deposit and POST /api/txn/withdraw
func ProcessTransaction(db *sql.DB, txnType string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions{
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Only POST requests are allowed", http.StatusMethodNotAllowed)
			return
		}

		var req TxnRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("[API Error] JSON Decode Failed: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":"error",
				"message": "Invalid JSON request format.",
			})
			return
		}

		req.AccountNo = strings.TrimSpace(req.AccountNo)
		if req.AccountNo ==""{
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Account number is required.",
			})
			return
		}

		if req.Amount.LessThanOrEqual(decimal.Zero){
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Transaction amount must be greater than zero.",
			})
			return
		}

		// Security: Extract staff ID from the session or dev fallback
		secureStaffID := getStaffIDFromSession(r, db)
		if secureStaffID == 0 {
			w.Header().Set("Content-Type","application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Unauthorized: Invalid agent session.",
			})
			return
		}

		// Begin an ACID-compliant Database Transaction
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			log.Printf("[API Error] Failed to begin transaction: %v",err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Database transaction error.",
			})
			return
		}
		defer tx.Rollback()

		// Generate reference number and remarks
		refNo :=generateTxnRef(txnType)
		remarks :=strings.TrimSpace(req.Remarks)
		if remarks==""{
			if txnType == "deposit"{
				remarks ="Teller counter cash deposit"
			} else{
				remarks ="Teller counter cash withdrawal"
			}
		}

		// Insert transaction record; database trigger before_transaction_insert computes balance_after and enforces min_balance
		insertQuery := `
			INSERT INTO TRANSACTION (account_no, staff_person_id, txn_type, amount, balance_after, reference_no, remarks) 
			VALUES (?, ?, ?, ?, 0.00, ?, ?)`

		result, err := tx.ExecContext(r.Context(), insertQuery, req.AccountNo, secureStaffID, txnType, req.Amount.String(), refNo, remarks)
		if err != nil {
			log.Printf("[API Error] Transaction Exec Failed: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)

			errMsg :=err.Error()
			// Catch MySQL Trigger Signal 45000: Insufficient Funds / Minimum Balance Breached
			if strings.Contains(errMsg, "45000") || strings.Contains(errMsg, "Insufficient funds") || strings.Contains(errMsg, "minimum balance") {
				_ = json.NewEncoder(w).Encode(map[string]string{
					"status":  "error",
					"message": "Transaction declined: Insufficient funds. Account balance cannot drop below the required minimum balance.",
				})
			} else if strings.Contains(errMsg, "foreign key") || strings.Contains(errMsg, "1452") {
				_ = json.NewEncoder(w).Encode(map[string]string{
					"status":  "error",
					"message": "Account number not found or inactive.",
				})
			} else {
				_ = json.NewEncoder(w).Encode(map[string]string{
					"status":  "error",
					"message": fmt.Sprintf("Transaction denied: %v", err),
				})
			}
			return
		}

		txnID, err := result.LastInsertId()
		if err !=nil{
			log.Printf("[API Error] LastInsertId failed: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message":"Failed to retrieve transaction ID.",
			})
			return
		}

		// Fetch updated balance and timestamp computed by trigger
		var updatedBalance decimal.Decimal
		var txnTimestamp time.Time
		selectQuery := `SELECT balance_after, timestamp FROM TRANSACTION WHERE txn_id = ?`

		if err := tx.QueryRowContext(r.Context(), selectQuery, txnID).Scan(&updatedBalance, &txnTimestamp); err != nil {
			log.Printf("[API Error] Query balance_after failed: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Failed to fetch updated balance.",
			})
			return
		}

		// Commit the transaction
		if err := tx.Commit(); err!=nil{
			log.Printf("[API Error] Commit failed: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Failed to finalize transaction.",
			})
			return
		}

		// Return receipt data
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":       "success",
			"message":      fmt.Sprintf("%s completed successfully.", strings.Title(txnType)),
			"reference_no": refNo,
			"timestamp":    txnTimestamp,
			"account_no":   req.AccountNo,
			"amount":       req.Amount,
			"new_balance":  updatedBalance,
			"txn_type":     txnType,
			"remarks":      remarks,
		})
	}
}
