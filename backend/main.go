package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func homePage(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path !="/"{
		http.NotFound(w, r)
		return
	}
	fmt.Fprintf(w, "B-Trust Backend is running!")
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc{
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	if dbUser == "" {
		dbUser = "root"
	}
	if dbHost == "" {
		dbHost = "127.0.0.1"
	}
	if dbPort == "" {
		dbPort = "3306"
	}
	if dbName == "" {
		dbName = "btrust"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=Local", dbUser, dbPassword, dbHost, dbPort, dbName)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Error connecting to database: ", err)
	}
	defer db.Close()

	// Retry connecting to DB (useful when containerized DB is still booting)
	for i := 0; i < 15; i++ {
		if err = db.Ping(); err == nil {
			log.Println("Successfully connected to MySQL database!")
			break
		}
		log.Printf("Waiting for database connection (%d/15)...: %v", i+1, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatal("Error pinging database: ", err)
	}

	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	_, err = db.Exec(`
        INSERT INTO USER_ACCOUNT (username, password_hash, email, type, status) 
		VALUES (?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			password_hash = VALUES(password_hash),
			email = VALUES(email),
			type = VALUES(type),
			status = VALUES(status)`,
		"agent_achira", string(hashedPwd), "achira@btrust.com", "staff", "active",
	)
	if err != nil {
		log.Println("Warning: Could not seed test user:", err)
	}

	http.HandleFunc("/", homePage)
	http.Handle("/api/reports/", ReportsHandler(db))

	http.HandleFunc("/api/fd/open", enableCORS(AgentOpenFDHandler(db)))
	http.HandleFunc("/api/fd/new", enableCORS(AgentOpenFDHandler(db)))
	http.HandleFunc("/api/fd/list", enableCORS(ListFDHandler(db)))
	http.HandleFunc("/api/fd/status/", enableCORS(FDStatusHandler(db)))
	http.HandleFunc("/api/cron/interest", enableCORS(CronInterestHandler(db)))

	http.HandleFunc("/api/txn/deposit", enableCORS(ProcessTransaction(db, "deposit")))
	http.HandleFunc("/api/txn/withdraw", enableCORS(ProcessTransaction(db, "withdrawal")))
	http.HandleFunc("/api/agent/lookup", enableCORS(AgentCustomerLookupHandler(db)))
	http.HandleFunc("/api/auth/login", enableCORS(LoginHandler(db)))
	http.HandleFunc("/api/auth/logout", enableCORS(LogoutHandler(db)))

	http.HandleFunc("/api/customer/accounts", enableCORS(CustomerAccountsHandler(db)))
	http.HandleFunc("/api/account/lookup", enableCORS(AccountHolderLookupHandler(db)))
	http.HandleFunc("/api/customer/transfer", enableCORS(CustomerTransferHandler(db)))

	// Customer Portal Routes — dispatch account sub-paths
	http.HandleFunc("/api/account/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/history/recent") {
			RecentHistoryHandler(db)(w, r)
		} else if strings.HasSuffix(r.URL.Path, "/history") {
			AccountHistoryHandler(db)(w, r)
		} else {
			http.Error(w, "not found", http.StatusNotFound)
		}
	}))
	http.HandleFunc("/api/agent/customer/register", enableCORS(RegisterCustomerHandler(db)))
	http.HandleFunc("/api/agent/plans", enableCORS(ListAccountPlansHandler(db)))
	http.HandleFunc("/api/agent/account/open", enableCORS(OpenAccountHandler(db)))
	http.HandleFunc("/api/agent/customer/search", enableCORS(AgentCustomerSearchHandler(db)))
	http.HandleFunc("/api/agent/stats", enableCORS(AgentStatsHandler(db)))
	http.HandleFunc("/api/agent/customers", enableCORS(AgentCustomersHandler(db)))
	http.HandleFunc("/api/agent/ledger", enableCORS(AgentLedgerHandler(db)))

	fmt.Println("B-Trust API running on http://localhost:8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
