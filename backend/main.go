package main

import (
	"database/sql"
	"encoding/json"
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
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	fmt.Fprintf(w, "B-Trust Backend is running!")
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigins := map[string]bool{
			"http://localhost:3000": true,
			"http://127.0.0.1:3000": true,
			"http://frontend:3000":  true,
		}
		if frontendURL := os.Getenv("FRONTEND_URL"); frontendURL != "" {
			allowedOrigins[strings.TrimRight(frontendURL, "/")] = true
		}
		if allowedOrigins[origin] || (os.Getenv("ENV") != "production" && origin != "") {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else if origin == "" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func requireAdmin(db *sql.DB, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		username, err := getAuthenticatedUser(r, db)
		if err != nil || username == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized: valid session required"})
			return
		}

		var role string
		err = db.QueryRowContext(r.Context(), "SELECT type FROM USER_ACCOUNT WHERE username = ?", username).Scan(&role)
		if err != nil || strings.ToLower(role) != "admin" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Forbidden: admin access required"})
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

	tlsParam := ""
	if dbTLS := os.Getenv("DB_TLS"); dbTLS != "" {
		tlsParam = "&tls=" + dbTLS
	} else if dbHost != "127.0.0.1" && dbHost != "localhost" && dbHost != "db" {
		// Managed cloud MySQL providers (such as Aiven) require TLS connections by default
		tlsParam = "&tls=skip-verify"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=Local%s", dbUser, dbPassword, dbHost, dbPort, dbName, tlsParam)
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

	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = "arkesuje@gmail.com"
	}
	adminInitialPassword := os.Getenv("ADMIN_INITIAL_PASSWORD")
	if adminInitialPassword != "" {
		adminPwd, err := bcrypt.GenerateFromPassword([]byte(adminInitialPassword), bcrypt.DefaultCost)
		if err == nil {
			_, err = db.Exec(`
				INSERT INTO USER_ACCOUNT (username, password_hash, email, type, status) 
				VALUES (?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					password_hash = VALUES(password_hash),
					email = VALUES(email),
					type = VALUES(type),
					status = VALUES(status)`,
				"admin", string(adminPwd), adminEmail, "admin", "active",
			)
			if err != nil {
				log.Println("Warning: Could not seed admin user:", err)
			} else {
				log.Printf("Admin account initialized for %s\n", adminEmail)
			}
		}
	} else {
		log.Println("Notice: ADMIN_INITIAL_PASSWORD not provided in environment; skipping admin bootstrap")
	}

	http.HandleFunc("/", homePage)
	http.HandleFunc("/api/reports/", enableCORS(requireAdmin(db, ReportsHandler(db))))

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
	http.HandleFunc("/api/auth/password/change", enableCORS(ChangePasswordHandler(db)))
	http.HandleFunc("/api/auth/otp/verify", enableCORS(VerifyOTPHandler(db)))
	http.HandleFunc("/api/auth/otp/resend", enableCORS(ResendOTPHandler(db)))

	http.HandleFunc("/api/customer/accounts", enableCORS(CustomerAccountsHandler(db)))
	http.HandleFunc("/api/account/lookup", enableCORS(AccountHolderLookupHandler(db)))
	http.HandleFunc("/api/customer/transfer", enableCORS(CustomerTransferHandler(db)))
	http.HandleFunc("/api/customer/agent", enableCORS(CustomerAgentInfoHandler(db)))

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
	http.HandleFunc("/api/agent/profile", enableCORS(AgentProfileHandler(db)))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Printf("B-Trust API running on http://localhost:%s...\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}