package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

func main() {
	// Load variables from .env
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file: ", err)
	}

	// Get database configuration from environment variables
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	// Make sure required variables exist
	if dbUser == "" || dbPassword == "" || dbHost == "" ||
		dbPort == "" || dbName == "" {
		log.Fatal("Database environment variables are missing")
	}

	// Build MySQL connection string
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s",
		dbUser,
		dbPassword,
		dbHost,
		dbPort,
		dbName,
	)

	// Connect to MySQL
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Error connecting to database: ", err)
	}
	defer db.Close()

	// Check that the database is actually reachable
	if err := db.Ping(); err != nil {
		log.Fatal("Error pinging database: ", err)
	}

	// Register the API endpoints
	http.HandleFunc("/api/txn/deposit", ProcessTransaction(db, "deposit"))
	http.HandleFunc("/api/txn/withdraw", ProcessTransaction(db, "withdrawal"))

	// Start the server
	fmt.Println("B-Trust API running on http://localhost:8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
