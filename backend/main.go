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

func homePage(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "B-Trust Backend is running!")
}

func main() {
	// 1. Load the hidden variables from the .env file
	godotenv.Load()
	dbPassword := os.Getenv("DB_PASSWORD")

	// 2. Construct the connection string securely
	dsn := fmt.Sprintf("root:%s@tcp(127.0.0.1:3306)/btrust", dbPassword)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// 3. Register routes and start server
	http.HandleFunc("/", homePage)
	http.Handle("/api/reports/", ReportsHandler(db))

	fmt.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
