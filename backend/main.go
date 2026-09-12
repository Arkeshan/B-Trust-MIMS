package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func homePage(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "B-Trust Backend is running!")
}

// enableCORS allows frontend requests from Next.js on localhost:3000
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
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
	// 1. Load the hidden variables from the .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file: ", err)
	}

	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	// Fallbacks just in case .env is missing the new fields
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

	// 2. Construct the connection string securely
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPassword, dbHost, dbPort, dbName)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Error connecting to database: ", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
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

	// 3. Register routes + their incoming routes
	http.HandleFunc("/", homePage)
	http.Handle("/api/account/", AccountHistoryHandler(db))
	http.Handle("/api/reports/", ReportsHandler(db)) // Your new dashboard route

	// Incoming transaction and auth routes
	http.HandleFunc("/api/txn/deposit", enableCORS(ProcessTransaction(db, "deposit")))
	http.HandleFunc("/api/txn/withdraw", enableCORS(ProcessTransaction(db, "withdrawal")))
	http.HandleFunc("/api/auth/login", enableCORS(LoginHandler(db)))

	fmt.Println("B-Trust API running on http://localhost:8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
