package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"github.com/shopspring/decimal"
)

func getTestDB(t *testing.T) *sql.DB {
	_ = godotenv.Load()
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root"
	}
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "127.0.0.1"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "btrust"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=Local", dbUser, dbPassword, dbHost, dbPort, dbName)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		t.Fatalf("Failed to open db: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("Failed to ping db: %v", err)
	}
	return db
}

func TestListAccountPlansHandler(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	req := httptest.NewRequest("GET", "/api/agent/plans", nil)
	rr := httptest.NewRecorder()

	handler := ListAccountPlansHandler(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
	}

	var plans []AccountPlan
	if err := json.NewDecoder(rr.Body).Decode(&plans); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(plans) != 5 {
		t.Fatalf("Expected 5 plans, got %d", len(plans))
	}

	// Verify that min_balance and interest_rate deserialize as decimal.Decimal properly
	for _, p := range plans {
		if p.InterestRate.IsZero() && p.PlanName != "Children" {
			t.Errorf("Plan %s interest rate should not be zero", p.PlanName)
		}
	}
}

func TestSearchCustomerByNIC_GuardianAware(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	// Amal's NIC is 198000000001. He has child Child1 (person_id 19)
	req := httptest.NewRequest("GET", "/api/agent/customer/search?nic=198000000001", nil)
	rr := httptest.NewRecorder()

	handler := SearchCustomerByNICHandler(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
	}

	var results []CustomerSearchResult
	if err := json.NewDecoder(rr.Body).Decode(&results); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(results) < 2 {
		t.Fatalf("Expected at least 2 results (Amal and Child1), got %d", len(results))
	}

	foundPrimary := false
	foundDependent := false
	for _, r := range results {
		if r.Role == "Primary" && r.PersonID == 6 {
			foundPrimary = true
		}
		if r.Role == "Dependent" && r.PersonID == 19 {
			foundDependent = true
		}
	}

	if !foundPrimary {
		t.Errorf("Did not find Amal as Primary holder")
	}
	if !foundDependent {
		t.Errorf("Did not find Child1 as Dependent holder under Amal's NIC")
	}
}

func TestOpenAccount_AgeValidation_ChildrenPlanForAdultRejected(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	// Amal (person_id 6) is born in 1980 (Adult).
	// Attempt to open Plan 1 (Children) for Amal:
	payload := OpenAccountRequest{
		PlanID:         1,
		PersonIDs:      []int{6},
		InitialDeposit: decimal.NewFromInt(1000),
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/agent/account/open", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	handler := OpenAccountHandler(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for age mismatch, got %d. Body: %s", rr.Code, rr.Body.String())
	}
}

func TestOpenAccount_Joint_RequiresMultipleHolders(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	// Plan 5 (Joint) with only 1 holder:
	payload := OpenAccountRequest{
		PlanID:         5,
		PersonIDs:      []int{6},
		InitialDeposit: decimal.NewFromInt(6000),
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/agent/account/open", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	handler := OpenAccountHandler(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for joint with 1 holder, got %d. Body: %s", rr.Code, rr.Body.String())
	}
}

func TestOpenAccount_InsufficientDepositRejected(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	// Adult plan (Plan 3) has min_balance = 1000. Try deposit = 500:
	payload := OpenAccountRequest{
		PlanID:         3,
		PersonIDs:      []int{6},
		InitialDeposit: decimal.NewFromInt(500),
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/agent/account/open", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	handler := OpenAccountHandler(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("Expected status 400 for deposit < min_balance, got %d. Body: %s", rr.Code, rr.Body.String())
	}
}

func TestAgentCustomerSearchHandler_UnifiedNIC(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	// Calling the main unified search route /api/agent/customer/search with ?nic=1980
	req := httptest.NewRequest("GET", "/api/agent/customer/search?nic=1980", nil)
	rr := httptest.NewRecorder()

	handler := AgentCustomerSearchHandler(db)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
	}

	var results []CustomerSearchResult
	if err := json.NewDecoder(rr.Body).Decode(&results); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(results) == 0 {
		t.Fatalf("Expected at least 1 customer result for NIC prefix 1980")
	}
}
