# B-Trust MIMS: Master Viva Examination & Technical Study Guide
**Candidate / Author:** Arkeshan  
**System:** B-Trust Microbanking and Interest Management System (MIMS)  
**Modules Developed:** Account Origination & Association (Savings Plans, Multi-Holder Accounts, Guardian-Aware Verification, ACID Transactions), Admin & Agent Authentication (2FA OTP, 5-Minute Rate Limiting, Session Persistence, Safe Logout), Dual-Channel Email Delivery (Resend API + SMTP), Cloud Production Deployment (Vercel, Render, Aiven MySQL), and Unified Endpoint Routing.  
**Target Audience:** Viva Board / Technical Examiners / Architecture Reviewers  
**Document Classification:** Comprehensive Technical Viva Preparation Manual  

---

## Table of Contents
1. [System Overview & Architectural Foundations](#1-system-overview--architectural-foundations)
   - [What is B-Trust MIMS?](#11-what-is-b-trust-mims)
   - [Why 3 Folders? (3-Tier Architectural Rationale)](#12-why-3-folders-3-tier-architectural-rationale)
   - [Core Technology Stack & Justification](#13-core-technology-stack--justification)
   - [Production Cloud Deployment Topology](#14-production-cloud-deployment-topology)
2. [Module 3: Savings Account Origination & Association (Arkeshan's Core Module)](#2-module-3-savings-account-origination--association-arkeshans-core-module)
   - [Business Logic & Banking Rules](#21-business-logic--banking-rules)
   - [Guardian-Aware Customer NIC Search Algorithm](#22-guardian-aware-customer-nic-search-algorithm)
   - [Strict Age Validation Rules](#23-strict-age-validation-rules)
   - [Financial Precision: Why `shopspring/decimal` over `float64`?](#24-financial-precision-why-shopspringdecimal-over-float64)
   - [Atomic ACID Database Transaction Flow](#25-atomic-acid-database-transaction-flow)
   - [The Database Trigger Interception (`before_transaction_insert`)](#26-the-database-trigger-interception-before_transaction_insert)
   - [Sequential Account Number Generation (`ACC000000001`)](#27-sequential-account-number-generation-acc000000001)
   - [Full Backend Code (`backend/agent_account.go`)](#28-full-backend-code-backendagent_accountgo)
   - [Full Frontend Code (`frontend/app/agent/accounts/new/page.tsx`)](#29-full-frontend-code-frontendappagentaccountsnewpagetsx)
   - [Automated Unit Testing Suite (`backend/agent_account_test.go`)](#210-automated-unit-testing-suite-backendagent_account_testgo)
3. [Authentication, 2FA, Session Security & Safe Logout](#3-authentication-2fa-session-security--safe-logout)
   - [Cryptographic OTP Generation (`crypto/rand`)](#31-cryptographic-otp-generation-cryptorand)
   - [Strict 5-Minute Rate-Limiting & Active Session Reuse](#32-strict-5-minute-rate-limiting--active-session-reuse)
   - [The Browser "Back Button" Loophole Fix](#33-the-browser-back-button-loophole-fix)
   - [Dual-Channel Email Dispatch: Resend HTTPS API + SMTP Fallback](#34-dual-channel-email-dispatch-resend-https-api--smtp-fallback)
   - [Role-Based Access Control (RBAC) & Session Verification](#35-role-based-access-control-rbac--session-verification)
   - [Safe Logout: Complete Dual-Side Invalidation](#36-safe-logout-complete-dual-side-invalidation)
   - [Full OTP & Auth Code (`backend/otp.go` & `backend/auth.go`)](#37-full-otp--auth-code-backendotpgo--backendauthgo)
4. [Customer Identity Registration (KYC & Minor Support)](#4-customer-identity-registration-kyc--minor-support)
   - [Two-Phase KYC Flow vs Instant Account Opening](#41-two-phase-kyc-flow-vs-instant-account-opening)
   - [Minor Detection & Guardian Association](#42-minor-detection--guardian-association)
   - [Password Hashing with `bcrypt`](#43-password-hashing-with-bcrypt)
   - [Code Breakdown (`backend/agent_customer.go`)](#44-code-breakdown-backendagent_customergo)
5. [Critical Bug Fixes, Troubleshooting & Hardening Case Studies](#5-critical-bug-fixes-troubleshooting--hardening-case-studies)
   - [Case Study 1: The Unified Customer Search Route Conflict](#51-case-study-1-the-unified-customer-search-route-conflict)
   - [Case Study 2: Cross-Origin Cookie Dropping across Cloud Domains](#52-case-study-2-cross-origin-cookie-dropping-across-cloud-domains)
   - [Case Study 3: Hardcoded Localhost CORS Overrides](#53-case-study-3-hardcoded-localhost-cors-overrides)
   - [Case Study 4: Cloud SMTP Port 587 Firewall Timeout on Render](#54-case-study-4-cloud-smtp-port-587-firewall-timeout-on-render)
   - [Case Study 5: Zero-Latency Root Domain Redirect (`/` -> `/login`)](#55-case-study-5-zero-latency-root-domain-redirect----login)
6. [Complete Database Architecture, Relational Schema & Triggers](#6-complete-database-architecture-relational-schema--triggers)
   - [Relational Entity Structure](#61-relational-entity-structure)
   - [Table Definitions & Schema (`database/schema.sql`)](#62-table-definitions--schema-databaseschemasql)
   - [Database Trigger In-Depth (`database/triggers.sql`)](#63-database-trigger-in-depth-databasetriggerssql)
   - [Scheduled Events & Monthly Compounding (`database/events.sql`)](#64-scheduled-events--monthly-compounding-databaseeventssql)
7. [Comprehensive Viva Examination Q&A Bank (45+ Questions & Model Answers)](#7-comprehensive-viva-examination-qa-bank-45-questions--model-answers)
   - [Category A: High-Level Architecture & Design Decisions](#category-a-high-level-architecture--design-decisions)
   - [Category B: Database, Triggers & ACID Transactions](#category-b-database-triggers--acid-transactions)
   - [Category C: Golang Backend, Concurrency & Type Safety](#category-c-golang-backend-concurrency--type-safety)
   - [Category D: Frontend Architecture & Next.js App Router](#category-d-frontend-architecture--nextjs-app-router)
   - [Category E: Security, 2FA, Sessions & Cryptography](#category-e-security-2fa-sessions--cryptography)
   - [Category F: Cloud Deployment, Networking & CORS](#category-f-cloud-deployment-networking--cors)
   - [Category G: Arkeshan's Specific Implementations & Troubleshooting](#category-g-arkeshans-specific-implementations--troubleshooting)

---

## 1. System Overview & Architectural Foundations

### 1.1 What is B-Trust MIMS?
**B-Trust MIMS (Microbanking and Interest Management System)** is a mission-critical, enterprise-grade banking web platform designed to support commercial and micro-savings operations. It handles customer KYC onboarding, multi-tier savings accounts (Children, Teen, Adult, Senior, and Joint), fixed deposits (FD), real-time teller transactions (cash deposits and withdrawals), automatic interest accrual, administrative portfolio reporting, and two-factor authentication (2FA).

### 1.2 Why 3 Folders? (3-Tier Architectural Rationale)
A common, fundamental viva question is: *"Why is your project organized into three primary folders (`frontend/`, `backend/`, and `database/`)? What purpose does this structure serve?"*

```
┌─────────────────────────────────────────────────────────────┐
│                       B-Trust MIMS                          │
├─────────────────┬─────────────────────────┬─────────────────┤
│    frontend/    │        backend/         │    database/    │
│ (Presentation)  │   (Application/Logic)   │  (Persistence)  │
├─────────────────┼─────────────────────────┼─────────────────┤
│ Next.js 16      │ Golang (net/http)       │ MySQL 8.0       │
│ TypeScript      │ Go Standard Library     │ InnoDB Engine   │
│ Tailwind CSS    │ Decimal Arithmetic      │ ACID Triggers   │
│ Client-side UX  │ RESTful API Controllers │ Scheduled Events│
└─────────────────┴─────────────────────────┴─────────────────┘
```

The separation into three top-level directories represents the industry-standard **3-Tier Architecture Pattern**:

1. **Separation of Concerns (SoC):**
   - **`frontend/` (Presentation Tier):** Exclusively handles user interface rendering, client-side input validation, responsive design, user state, and session persistence. It possesses **zero direct access** to the database or private encryption keys.
   - **`backend/` (Application/Logic Tier):** Houses the business rules, cryptographic operations, access control (RBAC), session lifecycle management, and transactional orchestration. It acts as an authoritative gateway between incoming requests and the database.
   - **`database/` (Data Tier):** Contains the foundational data schema (`schema.sql`), stored procedures (`procedures.sql`), integrity triggers (`triggers.sql`), scheduled events (`events.sql`), and seed scripts. It guarantees physical data integrity, referential constraints, and transactional persistence.

2. **Security & Zero-Trust Boundary:**
   - Client browsers are fundamentally untrusted environments. If the frontend connected directly to the database (e.g., via raw SQL client libraries), database credentials would be exposed in client bundles, allowing arbitrary SQL execution and data tampering.
   - By isolating the backend in its own directory, all database credentials (`DB_USER`, `DB_PASSWORD`, `DB_HOST`) reside solely in server-side environment variables (`.env`). The backend validates every client action before querying the database.

3. **Independent Scalability & Maintainability:**
   - The frontend and backend can be maintained, tested, and deployed entirely independently. For instance, the frontend can be deployed globally across serverless edge networks (Vercel Edge Network), while the backend runs as a high-performance compiled binary in a container (Render / Docker), and the database runs on managed high-availability hardware (Aiven Cloud).
   - If the frontend is completely rewritten (e.g., migrating to React Native or Flutter for mobile apps), the backend API and database schemas remain 100% unchanged.

4. **Containerization & CI/CD Readiness:**
   - Having distinct folders allows Docker to build lean, optimized images: a multi-stage Alpine binary container for Go (`backend/Dockerfile`) and a Node.js runtime container for Next.js (`frontend/Dockerfile`), orchestrated effortlessly by `docker-compose.yml`.

### 1.3 Core Technology Stack & Justification

| Layer | Technology | Key Justification for Viva |
|---|---|---|
| **Frontend** | **Next.js 16 (App Router) + TypeScript** | Server-Side Rendering (SSR) for initial loads, client components for interactive wizard states, strict compile-time type safety preventing `undefined` property crashes, and Tailwind CSS for a clean, accessible UI. |
| **Backend** | **Golang (Go standard library `net/http`)** | Native concurrency via Goroutines, blazing fast compiled machine code with low memory footprint, strict static typing, and no dependency on bloated third-party frameworks. |
| **Database** | **MySQL 8.0 (InnoDB Engine)** | Full ACID compliance (Atomicity, Consistency, Isolation, Durability), row-level locking, foreign key integrity, and trigger support for ledger constraints. |
| **Arithmetic** | **`github.com/shopspring/decimal`** | Exact arbitrary-precision fixed-point mathematics. Completely avoids binary floating-point rounding errors inherent to standard IEEE-754 `float64`. |
| **Auth & Security** | **`bcrypt` + `crypto/rand` + 2FA** | Salted password hashing (work factor 10), cryptographically secure pseudorandom number generation for OTPs, and `HttpOnly` cookie session isolation. |
| **Email API** | **Resend HTTPS REST API + `net/smtp`** | Guaranteed email delivery over standard HTTPS port 443, bypassing cloud container firewall blocks on SMTP port 587. |

### 1.4 Production Cloud Deployment Topology

In production, the system runs on a distributed cloud topology:

```
                  ┌───────────────────────────────────────────────┐
                  │                 END USER                      │
                  │             (Web Browser)                     │
                  └───────────────────────┬───────────────────────┘
                                          │
                                          │ HTTPS (Port 443)
                                          ▼
                  ┌───────────────────────────────────────────────┐
                  │            VERCEL EDGE NETWORK                │
                  │         Domain: btrust2.vercel.app            │
                  │  - Next.js 16 App Router UI                   │
                  │  - Server-side redirect: / -> /login          │
                  │  - Reverse Proxy: /api/* -> Render Backend    │
                  └───────────────────────┬───────────────────────┘
                                          │
                                          │ HTTPS Rewrites (/api/*)
                                          ▼
                  ┌───────────────────────────────────────────────┐
                  │            RENDER WEB SERVICE                 │
                  │     Domain: btrust-backend.onrender.com       │
                  │  - Compiled Golang Binary (Alpine Docker)     │
                  │  - Dynamic Port Allocation ($PORT)            │
                  │  - Dual Auth: Bearer Token + HttpOnly Cookies │
                  │  - Outbound HTTPS (Port 443) -> Resend API    │
                  └───────────────────────┬───────────────────────┘
                                          │
                                          │ Encrypted MySQL Protocol
                                          │ (TLS / SSL on Port 19482)
                                          ▼
                  ┌───────────────────────────────────────────────┐
                  │           AIVEN MANAGED CLOUD DB              │
                  │         Engine: MySQL 8.0 InnoDB              │
                  │  - Tables, Foreign Keys, Unique Indexes       │
                  │  - Trigger: before_transaction_insert         │
                  │  - Event: process_fd_interest_event           │
                  └───────────────────────────────────────────────┘
```

---

## 2. Module 3: Savings Account Origination & Association (Arkeshan's Core Module)

### 2.1 Business Logic & Banking Rules
Account origination is the core banking transaction where an agent opens a physical savings account, associates one or more registered customer identities (`ACCOUNT_HOLDER`), and executes the mandatory opening deposit (`TRANSACTION`).

The system supports **5 distinct account plans** defined in the `ACCOUNT_PLAN` table:

| Plan ID | Plan Name | Interest Rate | Minimum Balance (LKR) | Holder Constraints | Permitted Age Bracket |
|---|---|---|---|---|---|
| **1** | **Children** | 12.00% | LKR 0.00 | Exactly 1 holder | Age < 12 years |
| **2** | **Teen** | 11.00% | LKR 500.00 | Exactly 1 holder | 12 &le; Age < 18 years |
| **3** | **Adult** | 10.00% | LKR 1,000.00 | Exactly 1 holder | 18 &le; Age < 60 years |
| **4** | **Senior** | 13.00% | LKR 1,000.00 | Exactly 1 holder | Age &ge; 60 years |
| **5** | **Joint** | 7.00% | LKR 5,000.00 | 2 to 4 holders | All holders &ge; 18 years |

### 2.2 Guardian-Aware Customer NIC Search Algorithm
In traditional banking systems, minors (children under 16-18) do not possess a national identity card (NIC). If an agent attempts to open a Children or Teen account for a child, how can the agent find the child in the system?

Arkeshan designed and implemented the **Guardian-Aware NIC Search Algorithm**:
When an agent types an NIC prefix (e.g., `1980`):
1. The query matches adult customers whose *own* NIC starts with `1980%` (`Primary` role).
2. Simultaneously, using a `UNION` query, it searches the `CUSTOMER` table for minors who have `guardian_person_id` linked to a `PERSON` whose NIC matches `1980%` (`Dependent` role).
3. The results are unified, ordered by role (`Primary` first, then `Dependent`), and tagged so the agent immediately sees whether the individual is the primary adult or a minor dependent under that guardian.

```sql
SELECT * FROM (
    -- 1. Direct match on customer's own NIC
    SELECT 
        c.person_id,
        p.first_name,
        p.last_name,
        COALESCE(p.nic, '') AS nic,
        c.username,
        DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob,
        'Primary' AS role,
        COALESCE(g.nic, '') AS guardian_nic
    FROM CUSTOMER c
    JOIN PERSON p ON c.person_id = p.person_id
    LEFT JOIN PERSON g ON c.guardian_person_id = g.person_id
    WHERE p.nic LIKE CONCAT(?, '%')

    UNION

    -- 2. Dependent match via guardian's NIC (for minors without an NIC)
    SELECT 
        c.person_id,
        p.first_name,
        p.last_name,
        COALESCE(p.nic, '') AS nic,
        c.username,
        DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob,
        'Dependent' AS role,
        COALESCE(g.nic, '') AS guardian_nic
    FROM CUSTOMER c
    JOIN PERSON p ON c.person_id = p.person_id
    JOIN PERSON g ON c.guardian_person_id = g.person_id
    WHERE g.nic LIKE CONCAT(?, '%')
) AS results
ORDER BY role ASC, first_name ASC
LIMIT 15;
```

### 2.3 Strict Age Validation Rules
Age cannot be calculated simply as `current_year - birth_year` because that ignores whether the customer's birthday has passed in the current year.

Arkeshan implemented **exact day-of-year age calculation** in Go:
```go
now := time.Now()
age := now.Year() - birthDate.Year()
if now.YearDay() < birthDate.YearDay() {
    age-- // Birthday has not occurred yet this calendar year
}
```

The system strictly validates the age against the requested plan:
- **Children (Plan 1):** If `age >= 12`, rejected: *"Children plan is restricted to minors under 12 years old."*
- **Teen (Plan 2):** If `age < 12 || age >= 18`, rejected: *"Teen plan is restricted to customers aged 12 to 17 years old."*
- **Adult (Plan 3):** If `age < 18`, rejected. If `age >= 60`, rejected with an informative prompt: *"Adult plan is restricted to ages 18 to 59. Customer qualifies for the higher-interest Senior plan."*
- **Senior (Plan 4):** If `age < 60`, rejected: *"Senior plan is restricted to customers aged 60 and above."*
- **Joint (Plan 5):** Loops over every holder in the array. If any holder has `age < 18`, rejected: *"All holders of a Joint account must be at least 18 years old."*

### 2.4 Financial Precision: Why `shopspring/decimal` over `float64`?
In standard computer science, `float32` and `float64` use the IEEE-754 binary representation. Certain base-10 decimals cannot be represented exactly in binary:
```go
// Standard Go float64 danger:
var a float64 = 0.1
var b float64 = 0.2
fmt.Println(a + b) // Prints: 0.30000000000000004 !
```
In a banking system handling millions in transactions, fractional cent rounding errors accumulate into significant discrepancies, violating accounting audits.

**The Solution:** Arkeshan integrated `github.com/shopspring/decimal`. This package implements arbitrary-precision fixed-point decimal arithmetic:
```go
minBalance, _ := decimal.NewFromString("1000.00")
deposit, _ := decimal.NewFromString("500.00")

if deposit.LessThan(minBalance) {
    // Exact, non-lossy comparison!
}
```
In database queries, values are passed and scanned as strings or Decimal types, ensuring exact conversion to MySQL's `DECIMAL(15,2)` column.

### 2.5 Atomic ACID Database Transaction Flow
Opening a bank account touches multiple tables (`SAVINGS_ACCOUNT`, `ACCOUNT_HOLDER`, `TRANSACTION`). If an error occurs halfway through (e.g., initial deposit is rejected), the database must not be left with an orphaned account without holders or without funds.

Arkeshan structured the process as an **ACID Transaction**:
```go
tx, err := db.BeginTx(r.Context(), nil)
if err != nil {
    // Return HTTP 500
}
defer tx.Rollback() // Automatically rolls back if not committed!
```

**Step-by-Step Flow:**
1. **Begin Transaction (`tx.BeginTx`)**
2. **Sequential Account Number Generation:** Query `MAX(CAST(SUBSTRING(account_no, 4) AS UNSIGNED))` inside the active transaction.
3. **Insert `SAVINGS_ACCOUNT`:** Insert the account row with initial balance `0.00` and status `'active'`.
4. **Insert `ACCOUNT_HOLDER`:** Iterate over `req.PersonIDs` and insert one row per customer into the junction table.
5. **Insert Initial Deposit `TRANSACTION`:** Insert a `'deposit'` row into `TRANSACTION`.
6. **Trigger Execution:** The MySQL trigger `before_transaction_insert` fires automatically, computes `balance_after`, updates `SAVINGS_ACCOUNT.balance`, and enforces the plan minimum balance.
7. **Verify Balance:** Query `SELECT balance FROM SAVINGS_ACCOUNT WHERE account_no = ?` to verify the trigger updated the balance.
8. **Commit (`tx.Commit`)**: Commit all changes permanently to disk. If any step fails, `defer tx.Rollback()` reverts every modification.

### 2.6 The Database Trigger Interception (`before_transaction_insert`)
The backend does **not** run an explicit `UPDATE SAVINGS_ACCOUNT SET balance = balance + ?` query! Instead, it delegates ledger balance updates to the database trigger:

```sql
CREATE TRIGGER before_transaction_insert
BEFORE INSERT ON TRANSACTION
FOR EACH ROW
BEGIN
    DECLARE current_balance DECIMAL(15,2);
    DECLARE required_min_balance DECIMAL(12,2);

    -- Retrieve current balance and minimum required balance
    SELECT sa.balance, ap.min_balance 
    INTO current_balance, required_min_balance
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_PLAN ap ON sa.plan_id = ap.plan_id
    WHERE sa.account_no = NEW.account_no;

    IF NEW.txn_type = 'withdrawal' THEN
        IF (current_balance - NEW.amount) < required_min_balance THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transaction Denied: Insufficient funds or minimum balance breached.';
        ELSE
            SET NEW.balance_after = current_balance - NEW.amount;
            UPDATE SAVINGS_ACCOUNT 
            SET balance = NEW.balance_after 
            WHERE account_no = NEW.account_no;
        END IF;

    ELSEIF NEW.txn_type IN ('deposit', 'interest') THEN
        SET NEW.balance_after = current_balance + NEW.amount;
        UPDATE SAVINGS_ACCOUNT 
        SET balance = NEW.balance_after 
        WHERE account_no = NEW.account_no;
    END IF;
END;
```

**Why this is crucial for the Viva:**
- **Single Source of Truth:** Balance modifications cannot be bypassed by buggy code or rogue scripts. Any insertion into `TRANSACTION` automatically updates `SAVINGS_ACCOUNT.balance`.
- **Double-Entry Consistency:** Every change in balance has an immutable, corresponding row in `TRANSACTION`.

### 2.7 Sequential Account Number Generation (`ACC000000001`)
To ensure predictable, clean account numbers matching banking standards:
```go
func generateAccountNo(tx *sql.Tx, ctx context.Context) (string, error) {
	var nextNum int
	err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(CAST(SUBSTRING(account_no, 4) AS UNSIGNED)), 0) + 1 
		FROM SAVINGS_ACCOUNT`).Scan(&nextNum)
	if err != nil {
		return "", err
	}
	// "ACC" (3 chars) + 9 digits = 12 characters (e.g., ACC000000011)
	return fmt.Sprintf("ACC%09d", nextNum), nil
}
```

### 2.8 Full Backend Code (`backend/agent_account.go`)
Here is the complete implementation authored by Arkeshan:

```go
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// AccountPlan represents a savings account tier from ACCOUNT_PLAN.
type AccountPlan struct {
	PlanID       int             `json:"plan_id"`
	PlanName     string          `json:"plan_name"`
	InterestRate decimal.Decimal `json:"interest_rate"`
	MinBalance   decimal.Decimal `json:"min_balance"`
}

// CustomerSearchResult represents a customer found via NIC or Guardian NIC.
type CustomerSearchResult struct {
	PersonID    int    `json:"person_id"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	NIC         string `json:"nic"`
	Username    string `json:"username"`
	DOB         string `json:"dob"`
	Role        string `json:"role"` // "Primary" or "Dependent"
	GuardianNIC string `json:"guardian_nic,omitempty"`
}

// OpenAccountRequest is the payload sent from the frontend to open an account.
type OpenAccountRequest struct {
	PlanID         int             `json:"plan_id"`
	PersonIDs      []int           `json:"person_ids"`
	InitialDeposit decimal.Decimal `json:"initial_deposit"`
}

// OpenAccountResponse is the response sent after successful account origination.
type OpenAccountResponse struct {
	Status       string          `json:"status"`
	Message      string          `json:"message"`
	AccountNo    string          `json:"account_no"`
	Balance      decimal.Decimal `json:"balance"`
	PlanName     string          `json:"plan_name"`
	HoldersCount int             `json:"holders_count"`
}

// ListAccountPlansHandler returns all active savings plans with interest and minimum balance requirements.
// GET /api/agent/plans
func ListAccountPlansHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Method not allowed"})
			return
		}

		rows, err := db.QueryContext(r.Context(), `
			SELECT plan_id, plan_name, interest_rate, min_balance 
			FROM ACCOUNT_PLAN 
			ORDER BY plan_id ASC`)
		if err != nil {
			log.Printf("Failed to query ACCOUNT_PLAN: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Database error loading account plans"})
			return
		}
		defer rows.Close()

		var plans []AccountPlan
		for rows.Next() {
			var p AccountPlan
			if err := rows.Scan(&p.PlanID, &p.PlanName, &p.InterestRate, &p.MinBalance); err != nil {
				log.Printf("Failed to scan AccountPlan: %v\n", err)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse account plans"})
				return
			}
			plans = append(plans, p)
		}

		if plans == nil {
			plans = []AccountPlan{}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(plans)
	}
}

// SearchCustomerByNICHandler performs a "Guardian-Aware" NIC search.
// It finds individuals matching the NIC directly ('Primary'), as well as minors
// who do not possess an NIC and are registered under a guardian with that NIC ('Dependent').
// GET /api/agent/customer/search?nic=<query>
func SearchCustomerByNICHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Method not allowed"})
			return
		}

		nic := strings.TrimSpace(r.URL.Query().Get("nic"))
		if nic == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]CustomerSearchResult{})
			return
		}

		query := `
			SELECT * FROM (
				-- 1. Direct match on customer's own NIC
				SELECT 
					c.person_id,
					p.first_name,
					p.last_name,
					COALESCE(p.nic, '') AS nic,
					c.username,
					DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob,
					'Primary' AS role,
					COALESCE(g.nic, '') AS guardian_nic
				FROM CUSTOMER c
				JOIN PERSON p ON c.person_id = p.person_id
				LEFT JOIN PERSON g ON c.guardian_person_id = g.person_id
				WHERE p.nic LIKE CONCAT(?, '%')

				UNION

				-- 2. Dependent match via guardian's NIC (for minors without an NIC)
				SELECT 
					c.person_id,
					p.first_name,
					p.last_name,
					COALESCE(p.nic, '') AS nic,
					c.username,
					DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob,
					'Dependent' AS role,
					COALESCE(g.nic, '') AS guardian_nic
				FROM CUSTOMER c
				JOIN PERSON p ON c.person_id = p.person_id
				JOIN PERSON g ON c.guardian_person_id = g.person_id
				WHERE g.nic LIKE CONCAT(?, '%')
			) AS results
			ORDER BY role ASC, first_name ASC
			LIMIT 15`

		rows, err := db.QueryContext(r.Context(), query, nic, nic)
		if err != nil {
			log.Printf("Failed to search customers by NIC: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Database error searching customers"})
			return
		}
		defer rows.Close()

		var results []CustomerSearchResult
		for rows.Next() {
			var res CustomerSearchResult
			if err := rows.Scan(
				&res.PersonID,
				&res.FirstName,
				&res.LastName,
				&res.NIC,
				&res.Username,
				&res.DOB,
				&res.Role,
				&res.GuardianNIC,
			); err != nil {
				log.Printf("Failed to scan customer search result: %v\n", err)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse customer search results"})
				return
			}
			results = append(results, res)
		}

		if results == nil {
			results = []CustomerSearchResult{}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(results)
	}
}

// generateAccountNo generates a sequential 12-character account number within the active transaction.
func generateAccountNo(tx *sql.Tx, ctx context.Context) (string, error) {
	var nextNum int
	err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(CAST(SUBSTRING(account_no, 4) AS UNSIGNED)), 0) + 1 
		FROM SAVINGS_ACCOUNT`).Scan(&nextNum)
	if err != nil {
		return "", err
	}
	// "ACC" (3 chars) + 9 digits = 12 characters (e.g., ACC000000011)
	return fmt.Sprintf("ACC%09d", nextNum), nil
}

// OpenAccountHandler handles Phase 2 Account Origination:
// Validates plan rules, performs strict DOB age checks, verifies minimum balance using decimal.Decimal,
// creates the SAVINGS_ACCOUNT, maps ACCOUNT_HOLDER rows, and deposits the initial funds
// into TRANSACTION (which fires the before_transaction_insert trigger).
// POST /api/agent/account/open
func OpenAccountHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Method not allowed"})
			return
		}

		var req OpenAccountRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid request payload"})
			return
		}

		// 1. Basic Payload Validation
		if req.PlanID < 1 || req.PlanID > 5 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Invalid plan selected. Plan ID must be between 1 and 5."})
			return
		}
		if len(req.PersonIDs) == 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "At least one customer must be selected as an account holder."})
			return
		}
		if req.InitialDeposit.IsNegative() {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Initial deposit cannot be negative."})
			return
		}

		// Check for duplicate person IDs in request
		seen := make(map[int]bool)
		for _, pid := range req.PersonIDs {
			if seen[pid] {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Duplicate customer selected in account holders list."})
				return
			}
			seen[pid] = true
		}

		// 2. Fetch Plan Details (Name & Minimum Balance)
		var planName string
		var minBalance decimal.Decimal
		err := db.QueryRowContext(r.Context(),
			"SELECT plan_name, min_balance FROM ACCOUNT_PLAN WHERE plan_id = ?",
			req.PlanID,
		).Scan(&planName, &minBalance)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Selected account plan does not exist."})
			return
		}

		// Verify Initial Deposit meets plan minimum balance using exact Decimal comparison
		if req.InitialDeposit.LessThan(minBalance) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(ErrorResponse{
				Error: fmt.Sprintf("Initial deposit of LKR %s is less than the required minimum balance of LKR %s for the %s plan.",
					req.InitialDeposit.StringFixed(2), minBalance.StringFixed(2), planName),
			})
			return
		}

		// 3. Holder Count & Strict Age Validation
		if req.PlanID == 5 {
			if len(req.PersonIDs) < 2 || len(req.PersonIDs) > 4 {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Joint accounts require between 2 and 4 distinct account holders."})
				return
			}
		} else {
			if len(req.PersonIDs) != 1 {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(ErrorResponse{
					Error: fmt.Sprintf("%s plan accounts must have exactly one account holder.", planName),
				})
				return
			}
		}

		now := time.Now()
		for _, pid := range req.PersonIDs {
			var firstName, lastName, dobStr string
			err := db.QueryRowContext(r.Context(), `
				SELECT p.first_name, p.last_name, DATE_FORMAT(p.dob, '%Y-%m-%d')
				FROM PERSON p
				JOIN CUSTOMER c ON p.person_id = c.person_id
				WHERE p.person_id = ?`, pid,
			).Scan(&firstName, &lastName, &dobStr)
			if err != nil {
				if err == sql.ErrNoRows {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Person ID %d is not a registered customer.", pid),
					})
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Database error retrieving customer details."})
				return
			}

			birthDate, err := time.Parse("2006-01-02", dobStr)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to parse customer date of birth."})
				return
			}

			// Calculate precise age
			age := now.Year() - birthDate.Year()
			if now.YearDay() < birthDate.YearDay() {
				age--
			}

			// Strict Age Rules Enforcement
			switch req.PlanID {
			case 1: // Children (< 12)
				if age >= 12 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Children plan is restricted to minors under 12 years old. %s %s is %d years old.", firstName, lastName, age),
					})
					return
				}
			case 2: // Teen (12 - 17)
				if age < 12 || age >= 18 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Teen plan is restricted to customers aged 12 to 17 years old. %s %s is %d years old.", firstName, lastName, age),
					})
					return
				}
			case 3: // Adult (18 - 59)
				if age < 18 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Adult plan requires account holder to be at least 18 years old. %s %s is %d years old.", firstName, lastName, age),
					})
					return
				}
				if age >= 60 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Adult plan is restricted to ages 18 to 59. %s %s is %d years old and qualifies for the higher-interest Senior plan.", firstName, lastName, age),
					})
					return
				}
			case 4: // Senior (60+)
				if age < 60 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("Senior plan is restricted to customers aged 60 and above. %s %s is %d years old.", firstName, lastName, age),
					})
					return
				}
			case 5: // Joint (All holders 18+)
				if age < 18 {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(ErrorResponse{
						Error: fmt.Sprintf("All holders of a Joint account must be at least 18 years old. %s %s is %d years old.", firstName, lastName, age),
					})
					return
				}
			}
		}

		// 4. Resolve Active Staff & Branch
		staffPersonID, err := GetStaffPersonID(r, db)
		if err != nil {
			log.Printf("Failed to resolve staff person ID: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Could not identify active staff member."})
			return
		}

		branchID, err := GetStaffBranchID(staffPersonID, db)
		if err != nil {
			log.Printf("Failed to resolve branch ID for staff %d: %v\n", staffPersonID, err)
			branchID = 1 // Fallback to primary branch if not mapped
		}

		// 5. ACID Database Transaction
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			log.Printf("Failed to begin transaction: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to initialize database transaction."})
			return
		}
		defer tx.Rollback()

		// Step A: Generate unique 12-char account number (e.g. ACC000000011)
		accountNo, err := generateAccountNo(tx, r.Context())
		if err != nil {
			log.Printf("Failed to generate account number: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to allocate account number."})
			return
		}

		// Step B: Insert into SAVINGS_ACCOUNT with starting balance 0.00
		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO SAVINGS_ACCOUNT (account_no, plan_id, branch_id, balance, opened_date, status)
			VALUES (?, ?, ?, 0.00, CURDATE(), 'active')`,
			accountNo, req.PlanID, branchID,
		)
		if err != nil {
			log.Printf("Failed to insert SAVINGS_ACCOUNT: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to create savings account record."})
			return
		}

		// Step C: Link each customer in ACCOUNT_HOLDER junction table
		for _, pid := range req.PersonIDs {
			_, err = tx.ExecContext(r.Context(), `
				INSERT INTO ACCOUNT_HOLDER (person_id, account_no)
				VALUES (?, ?)`,
				pid, accountNo,
			)
			if err != nil {
				log.Printf("Failed to insert ACCOUNT_HOLDER for person %d: %v\n", pid, err)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to associate account holder."})
				return
			}
		}

		// Step D: Insert Initial Deposit into TRANSACTION table using exact Decimal string
		// The MySQL 'before_transaction_insert' trigger catches this,
		// sets NEW.balance_after = current_balance + amount, and updates SAVINGS_ACCOUNT.balance!
		refNo := fmt.Sprintf("INIT-%s", accountNo)
		_, err = tx.ExecContext(r.Context(), `
			INSERT INTO TRANSACTION (account_no, staff_person_id, txn_type, amount, balance_after, reference_no, remarks)
			VALUES (?, ?, 'deposit', ?, 0.00, ?, 'Initial deposit on account opening')`,
			accountNo, staffPersonID, req.InitialDeposit.StringFixed(2), refNo,
		)
		if err != nil {
			log.Printf("Failed to insert initial deposit TRANSACTION: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to process initial deposit transaction."})
			return
		}

		// Step E: Fetch the updated balance directly from SAVINGS_ACCOUNT to verify trigger execution
		var finalBalance decimal.Decimal
		err = tx.QueryRowContext(r.Context(),
			"SELECT balance FROM SAVINGS_ACCOUNT WHERE account_no = ?", accountNo,
		).Scan(&finalBalance)
		if err != nil {
			log.Printf("Failed to verify final balance: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Failed to verify account balance."})
			return
		}

		// Step F: Commit the transaction
		if err := tx.Commit(); err != nil {
			log.Printf("Failed to commit account opening transaction: %v\n", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "Database transaction commit failed."})
			return
		}

		// 6. Return 201 Created Response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(OpenAccountResponse{
			Status:       "success",
			Message:      fmt.Sprintf("Successfully opened %s savings account.", planName),
			AccountNo:    accountNo,
			Balance:      finalBalance,
			PlanName:     planName,
			HoldersCount: len(req.PersonIDs),
		})
	}
}
```

### 2.9 Full Frontend Code (`frontend/app/agent/accounts/new/page.tsx`)
The frontend is a multi-step, interactive wizard built with React hooks:

```tsx
"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";

interface AccountPlan {
  plan_id: number;
  plan_name: string;
  interest_rate: string | number;
  min_balance: string | number;
}

interface CustomerSearchResult {
  person_id: number;
  first_name: string;
  last_name: string;
  nic: string;
  username: string;
  dob: string;
  role: "Primary" | "Dependent";
  guardian_nic?: string;
}

interface OpenAccountReceipt {
  status: string;
  message: string;
  account_no: string;
  balance: string | number;
  plan_name: string;
  holders_count: number;
}

function formatLKR(value: string | number): string {
  const numeric = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numeric)) return "0.00";
  return numeric.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function OpenSavingsAccountPage() {
  const [plans, setPlans] = useState<AccountPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number>(3); // Default Adult (Plan 3)
  const [initialDeposit, setInitialDeposit] = useState<string>("1000");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Selected holders state
  const [selectedHolders, setSelectedHolders] = useState<CustomerSearchResult[]>([]);

  // Action / State-driven views
  type OriginationStep = "form" | "processing" | "success";
  const [step, setStep] = useState<OriginationStep>("form");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OpenAccountReceipt | null>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 1. Fetch available plans on mount with Authorization header
  useEffect(() => {
    async function loadPlans() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("session_id") || "" : "";
        const res = await fetch("/api/agent/plans", {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data: AccountPlan[] = await res.json();
          setPlans(data);
          const adult = data.find((p) => p.plan_name.toLowerCase() === "adult");
          if (adult) {
            setSelectedPlanId(adult.plan_id);
            setInitialDeposit(String(adult.min_balance));
          } else if (data.length > 0) {
            setSelectedPlanId(data[0].plan_id);
            setInitialDeposit(String(data[0].min_balance));
          }
        }
      } catch (err) {
        console.error("Failed to load account plans:", err);
      }
    }
    loadPlans();
  }, []);

  // 2. Debounced search by NIC / Guardian NIC
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults([]);
      setIsSearching(false);
      setIsSearchOpen(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("session_id") || "" : "";
        const res = await fetch(
          `/api/agent/customer/search?nic=${encodeURIComponent(term)}`,
          {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (res.ok) {
          const results: CustomerSearchResult[] = await res.json();
          setSearchResults(results);
          setIsSearchOpen(results.length > 0);
        } else {
          setSearchResults([]);
          setIsSearchOpen(false);
        }
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
        setIsSearchOpen(false);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const currentPlan = plans.find((p) => p.plan_id === selectedPlanId);
  const minBalance = currentPlan ? Number(currentPlan.min_balance) : 0;
  const isJoint = selectedPlanId === 5;

  function handlePlanChange(newPlanId: number) {
    setSelectedPlanId(newPlanId);
    setError(null);
    const plan = plans.find((p) => p.plan_id === newPlanId);
    if (plan) {
      const planMin = Number(plan.min_balance);
      if (Number(initialDeposit) < planMin) {
        setInitialDeposit(String(planMin));
      }
    }
    if (newPlanId !== 5 && selectedHolders.length > 1) {
      setSelectedHolders([selectedHolders[0]]);
    }
  }

  function handleAddHolder(customer: CustomerSearchResult) {
    setError(null);
    if (selectedHolders.some((h) => h.person_id === customer.person_id)) {
      setError(`${customer.first_name} ${customer.last_name} is already added.`);
      return;
    }

    if (!isJoint) {
      setSelectedHolders([customer]);
    } else {
      if (selectedHolders.length >= 4) {
        setError("Joint accounts allow a maximum of 4 account holders.");
        return;
      }
      setSelectedHolders([...selectedHolders, customer]);
    }

    setSearchQuery("");
    setIsSearchOpen(false);
  }

  function handleRemoveHolder(personId: number) {
    setSelectedHolders(selectedHolders.filter((h) => h.person_id !== personId));
  }

  async function handleOpenAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedHolders.length === 0) {
      setError("Please search and attach at least one customer as an account holder.");
      return;
    }

    if (isJoint && selectedHolders.length < 2) {
      setError("Joint accounts require at least 2 distinct account holders.");
      return;
    }

    const depositNum = parseFloat(initialDeposit);
    if (isNaN(depositNum) || depositNum < 0) {
      setError("Please enter a valid initial deposit amount.");
      return;
    }

    if (depositNum < minBalance) {
      setError(
        `Initial deposit must be at least LKR ${formatLKR(minBalance)} for the ${currentPlan?.plan_name} plan.`
      );
      return;
    }

    try {
      setStep("processing");

      const token = typeof window !== "undefined" ? localStorage.getItem("session_id") || "" : "";
      const [res] = await Promise.all([
        fetch("/api/agent/account/open", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            plan_id: selectedPlanId,
            person_ids: selectedHolders.map((h) => h.person_id),
            initial_deposit: depositNum,
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to open account.");
        setStep("form");
        return;
      }

      setReceipt(data);
      setStep("success");
    } catch {
      setError("Failed to communicate with account service. Make sure Go is running.");
      setStep("form");
    }
  }

  return (
    // ... JSX rendering form, search dropdown, holder chips, and receipt modal ...
  );
}
```

### 2.10 Automated Unit Testing Suite (`backend/agent_account_test.go`)
To guarantee regression-free code, Arkeshan authored a comprehensive Go unit testing suite verifying all business rules against real database connections:

```go
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

	"github.com/shopspring/decimal"
)

func getTestDB(t *testing.T) *sql.DB {
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "127.0.0.1"
	}
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root"
	}
	dbPassword := os.Getenv("DB_PASSWORD")
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
}

func TestOpenAccount_AgeValidation_ChildrenPlanForAdultRejected(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	// Attempting to open Children plan (Plan 1) for adult Amal (person_id 6, born 1980)
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

	// Attempting Joint account with only 1 holder
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

	// Adult plan has min_balance = 1000. Try deposit = 500:
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

	// Calling the unified endpoint /api/agent/customer/search with ?nic=1980
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
```

---

## 3. Authentication, 2FA, Session Security & Safe Logout

### 3.1 Cryptographic OTP Generation (`crypto/rand`)
Many beginners use Go's `math/rand` package to generate random codes.
**Viva Critical Point:** `math/rand` is a deterministic pseudo-random number generator (PRNG). If the seed is known or left unseeded, the generated OTPs are 100% predictable by an attacker!

Arkeshan utilized `crypto/rand`, which interfaces directly with the host operating system's cryptographic entropy source (`/dev/urandom` on Linux or `CryptGenRandom` on Windows):

```go
func GenerateOTP() (string, error) {
	const digits = "0123456789"
	otp := make([]byte, 6)
	for i := 0; i < 6; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		otp[i] = digits[num.Int64()]
	}
	return string(otp), nil
}
```

The generated 6-digit plain OTP is hashed using `bcrypt` before being stored in the `OTP_TOKEN` table (`otp_hash`), ensuring that even a database dump does not expose active verification codes.

### 3.2 Strict 5-Minute Rate-Limiting & Active Session Reuse
To prevent brute-force attacks and email flooding, the system enforces a strict 5-minute cooldown.

```sql
SELECT token_id, TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS seconds_remaining
FROM OTP_TOKEN
WHERE username = ? AND purpose = 'login' AND expires_at > NOW()
ORDER BY expires_at DESC LIMIT 1;
```

**Behavior:**
1. If an active, unexpired OTP exists for the user, the backend **does not** generate a new code.
2. It returns the existing `temp_token` and the exact `seconds_remaining`.
3. The frontend countdown resumes without spamming the user's email or resetting the clock.

### 3.3 The Browser "Back Button" Loophole Fix
In early testing, when a user landed on the OTP screen, they could press the browser's "Back" button, re-enter their password, and hit "Login" again. If handled naively, this would generate a new OTP and reset the timer, completely bypassing the 5-minute security limit.

**Arkeshan's Two-Layer Fix:**
1. **Frontend Persistence (`sessionStorage`):**
   When the OTP step begins, the frontend writes:
   ```ts
   sessionStorage.setItem("admin_pending_otp", JSON.stringify({
       expiryTime: Date.now() + secondsRemaining * 1000
   }));
   ```
   If the user navigates back or refreshes, `useEffect` detects `admin_pending_otp`, calculates the remaining time, and immediately jumps back to the OTP step.
2. **Backend Authoritative Guard:**
   Even if the attacker opens Chrome DevTools and clears `sessionStorage`, the backend queries `OTP_TOKEN` for `expires_at > NOW()`. If active, it returns `seconds_remaining` and reuses the active token, rendering the bypass impossible.

### 3.4 Dual-Channel Email Dispatch: Resend HTTPS API + SMTP Fallback
Free cloud hosting environments (such as Render) block outbound TCP traffic on ports 25, 465, and 587 to prevent automated spam abuse. Connecting to `smtp.gmail.com:587` results in:
`dial tcp 74.125.24.108:587: connect: connection timed out`

Arkeshan engineered a **Dual-Channel Dispatch Architecture**:

```
                          [ SendEmailOTP(email, otp) ]
                                        │
                         Is RESEND_API_KEY present?
                                ├─── YES ───► [ Channel 1: Resend HTTPS REST API ]
                                │             - URL: https://api.resend.com/emails
                                │             - Port: 443 (HTTPS - Never Blocked)
                                │             - Header: Bearer re_xxx
                                │
                                └─── NO ────► [ Channel 2: Standard net/smtp ]
                                              - Host: smtp.gmail.com:587
                                              - Used in Local Docker / Dev
                                              - Logs code to console on timeout
```

**Resend HTTPS Dispatch Implementation (`backend/otp.go`):**
```go
func sendViaResend(apiKey, toEmail, otpCode, htmlBody string) error {
	fromEmail := os.Getenv("RESEND_FROM")
	if fromEmail == "" {
		fromEmail = "B-Trust Banking <onboarding@resend.dev>"
	}

	payload := resendPayload{
		From:    fromEmail,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("B-Trust MIMS Security Verification Code: %s", otpCode),
		HTML:    htmlBody,
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode resend payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return fmt.Errorf("failed to build resend request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("resend http request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend api error status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}
```

### 3.5 Role-Based Access Control (RBAC) & Session Verification
When a user logs in, a cryptographic session token is generated and stored in `USER_SESSION`:
```sql
CREATE TABLE USER_SESSION(
    session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    device_ip VARCHAR(50),
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES USER_ACCOUNT(username)
);
```

To resolve the agent making a request, Arkeshan implemented `GetStaffPersonID`:
```go
func GetStaffPersonID(r *http.Request, db *sql.DB) (int, error) {
	var sessionID string

	// 1. Prioritize Authorization: Bearer <token>
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		sessionID = strings.TrimPrefix(authHeader, "Bearer ")
	} else if authHeader != "" {
		sessionID = authHeader
	} else if cookie, err := r.Cookie("session_id"); err == nil && cookie.Value != "" {
		// 2. Fall back to HttpOnly cookie
		sessionID = cookie.Value
	}

	if sessionID == "" {
		return 0, errors.New("unauthorized: missing session token")
	}

	query := `
		SELECT s.person_id 
		FROM USER_SESSION us 
		JOIN STAFF s ON us.username = s.username 
		WHERE us.session_id = ? AND us.expires_at > NOW()
	`

	var personID int
	err := db.QueryRowContext(r.Context(), query, sessionID).Scan(&personID)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, errors.New("unauthorized: invalid or expired session")
		}
		return 0, err
	}

	return personID, nil
}
```

### 3.6 Safe Logout: Complete Dual-Side Invalidation
Incomplete logout implementations leave sessions active in the database or leave cookies in the browser.

**Arkeshan's Triple-Invalidation Protocol (`LogoutHandler`):**
1. **Database Session Purge:** Deletes the record from `USER_SESSION` where `session_id = ?`.
2. **Server-Side Cookie Destruction:** Sends an expired `Set-Cookie` header with `MaxAge: -1` and `Expires: time.Unix(0, 0)`:
   ```go
   http.SetCookie(w, &http.Cookie{
       Name:     "session_id",
       Value:    "",
       Path:     "/",
       Expires:  time.Unix(0, 0),
       MaxAge:   -1,
       HttpOnly: true,
       Secure:   isSecure,
       SameSite: http.SameSiteLaxMode,
   })
   ```
3. **Client-Side Cache Wipe:** Frontend executes `localStorage.clear()`, `sessionStorage.clear()`, and triggers a Next.js cache refresh via `router.refresh()`.

---

## 4. Customer Identity Registration (KYC & Minor Support)

### 4.1 Two-Phase KYC Flow vs Instant Account Opening
In real-world microbanking, identity registration (KYC) and account opening are distinct operations:
- **Phase 1 (Identity Registration):** A customer is vetted, their NIC, date of birth, phone, and address are verified, and a `PERSON` record and `CUSTOMER` record are created.
- **Phase 2 (Account Origination):** Once identities exist, an agent can open single accounts, joint accounts (linking 2-4 previously registered identities), or minor accounts.

This separation prevents data duplication when a customer opens multiple accounts over time.

### 4.2 Minor Detection & Guardian Association
When registering a customer in `frontend/app/agent/customers/new/page.tsx`:
- The frontend computes age from the `dob` field.
- If `age < 18`, the UI displays a mandatory **Guardian NIC** input.
- The backend (`backend/agent_customer.go`) validates that the guardian's NIC exists in the `PERSON` table and links `guardian_person_id` in the `CUSTOMER` record.
- If the minor does not have an NIC yet, `PERSON.nic` is safely inserted as `NULL` without violating uniqueness constraints.

### 4.3 Password Hashing with `bcrypt`
Passwords must never be stored in plain text. The system uses `golang.org/x/crypto/bcrypt` with a cost factor of 10:
```go
hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
```
Bcrypt automatically incorporates a random salt and is computationally expensive, making precomputed rainbow table attacks impossible.

---

## 5. Critical Bug Fixes, Troubleshooting & Hardening Case Studies

### 5.1 Case Study 1: The Unified Customer Search Route Conflict
* **The Incident:** When testing the Open Savings Account wizard (`/agent/accounts/new`), typing an NIC into the search bar resulted in zero customers appearing in the dropdown.
* **The Root Cause:**
  - Route `/api/agent/customer/search` was wired to `AgentCustomerSearchHandler(db)` in `main.go`.
  - When the Fixed Deposit (FD) module was created, `AgentCustomerSearchHandler` was written to expect `?username=...`. If `username` was empty, it returned `400 Bad Request: {"error": "username is required"}`.
  - The savings account wizard queries `/api/agent/customer/search?nic=...`. Because `username` was omitted, the request was rejected with HTTP 400!
* **The Fix:**
  Arkeshan unified the handler in `backend/agent_fd.go`:
  ```go
  // 1. If 'nic' parameter is present, dispatch to guardian-aware NIC search
  if r.URL.Query().Has("nic") {
      SearchCustomerByNICHandler(db)(w, r)
      return
  }

  // 2. Otherwise, check FD customer search by username
  searchUsername := strings.TrimSpace(r.URL.Query().Get("username"))
  if searchUsername == "" {
      w.WriteHeader(http.StatusBadRequest)
      json.NewEncoder(w).Encode(map[string]string{"error": "nic or username parameter is required"})
      return
  }
  ```
  Both pages now coexist seamlessly on the same endpoint.

### 5.2 Case Study 2: Cross-Origin Cookie Dropping across Cloud Domains
* **The Incident:** On the deployed cloud system, opening an account failed with `401 Unauthorized: Could not identify active staff member`, even though the agent was logged in.
* **The Root Cause:**
  - The frontend is on `https://btrust2.vercel.app` while the backend is on `https://btrust-backend.onrender.com`.
  - Many browsers (Safari, Chrome Incognito, Brave) block third-party cross-site cookies by default. The `session_id` cookie was not being transmitted across cloud domains.
  - The fetch call was missing the explicit `Authorization: Bearer <session_id>` header.
* **The Fix:**
  - Updated all frontend fetch calls to attach `headers: { Authorization: `Bearer ${token}` }` where `token` is retrieved from `localStorage.getItem("session_id")`.
  - Updated `GetStaffPersonID` in `backend/auth.go` to inspect the `Authorization` header first before checking cookies.

### 5.3 Case Study 3: Hardcoded Localhost CORS Overrides
* **The Incident:** Certain endpoints returned CORS errors on Vercel: `Access to fetch at ... has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'http://localhost:3000' that is not equal to the supplied origin.`
* **The Root Cause:** Handlers in `agent_account.go` and `agent_customer.go` had redundant, hardcoded lines:
  ```go
  w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
  ```
  Even though `main.go` wrapped them with `enableCORS` (which dynamically echoes the calling origin), the inner handlers were overwriting the header back to `http://localhost:3000`!
* **The Fix:** Removed all inner CORS headers from individual handlers, letting the centralized `enableCORS` middleware control the origin dynamically.

### 5.4 Case Study 4: Cloud SMTP Port 587 Firewall Timeout on Render
* **The Incident:** During admin login on the cloud deployment, the login request hung for 30 seconds and timed out with `dial tcp 74.125.24.108:587: connect: connection timed out`.
* **The Root Cause:** Render's free tier blocks outbound TCP connections on SMTP ports 25, 465, and 587.
* **The Fix:** Implemented the Resend HTTPS API in `backend/otp.go`. Because it sends HTTP POST requests to `https://api.resend.com/emails` over port 443, it completely bypasses cloud SMTP firewall blocks.

### 5.5 Case Study 5: Zero-Latency Root Domain Redirect (`/` -> `/login`)
* **The Incident:** Visiting `https://btrust2.vercel.app/` displayed an empty white screen or the starter page instead of directing users to the login portal.
* **The Root Cause:** Missing root route redirect configuration in Next.js.
* **The Fix:** Configured redirects at both the server-side Next.js config level (`next.config.ts`) and root page level (`frontend/app/page.tsx` using `redirect("/login")`).

---

## 6. Complete Database Architecture, Relational Schema & Triggers

### 6.1 Relational Entity Structure
```
       ┌─────────────────┐           ┌─────────────────┐
       │  USER_ACCOUNT   │           │     PERSON      │
       │  (Credentials)  │           │   (KYC Data)    │
       └────────┬────────┘           └────────┬────────┘
                │                             │
        ┌───────┴───────┐             ┌───────┴───────┐
        │               │             │               │
        ▼               ▼             ▼               ▼
  ┌───────────┐   ┌───────────┐ ┌───────────┐   ┌───────────┐
  │   STAFF   │   │ CUSTOMER  │ │OTP_TOKEN  │   │USER_SESSION│
  └─────┬─────┘   └─────┬─────┘ └───────────┘   └───────────┘
        │               │
        │         ┌─────┴─────────────────┐
        │         │                       │
        │         ▼                       ▼
        │   ┌───────────────┐       ┌───────────────┐
        │   │ACCOUNT_HOLDER │       │ACCOUNT_PLAN   │
        │   └───────┬───────┘       └───────┬───────┘
        │           │                       │
        │           ▼                       ▼
        │     ┌───────────────────────────────────┐
        │     │         SAVINGS_ACCOUNT           │
        │     └─────────────────┬─────────────────┘
        │                       │
        ▼                       ▼
  ┌───────────────────────────────────────────────┐
  │                  TRANSACTION                  │
  │     (Audited Ledger: Deposit/Withdrawal)      │
  └───────────────────────────────────────────────┘
```

### 6.2 Table Definitions & Schema (`database/schema.sql`)
```sql
CREATE TABLE USER_ACCOUNT(
    username VARCHAR(50) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    type ENUM('customer', 'staff', 'admin') NOT NULL,
    status ENUM('active', 'locked') NOT NULL,
    last_login DATETIME
);

CREATE TABLE PERSON(
    person_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nic VARCHAR(12) UNIQUE, 
    dob DATE NOT NULL,
    phone_number VARCHAR(10) CHECK (phone_number REGEXP '^[0-9]{10}$'),
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL
);

CREATE TABLE BRANCH(
    branch_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL
);

CREATE TABLE ACCOUNT_PLAN(
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(30) NOT NULL UNIQUE,
    interest_rate DECIMAL(5,2) NOT NULL,
    min_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_account_plan_interest CHECK (interest_rate >= 0 AND interest_rate < 100),
    CONSTRAINT chk_account_plan_min_balance CHECK (min_balance >= 0)
);

CREATE TABLE STAFF(
    person_id INT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    branch_id INT NOT NULL,
    role ENUM('agent') NOT NULL DEFAULT 'agent',
    FOREIGN KEY (person_id) REFERENCES PERSON(person_id),
    FOREIGN KEY (username) REFERENCES USER_ACCOUNT(username),
    FOREIGN KEY (branch_id) REFERENCES BRANCH(branch_id)
);

CREATE TABLE CUSTOMER(
    person_id INT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    assigned_agent_person_id INT,
    guardian_person_id INT,
    registered_branch_id INT NOT NULL,
    FOREIGN KEY (person_id) REFERENCES PERSON(person_id),
    FOREIGN KEY (username) REFERENCES USER_ACCOUNT(username),
    FOREIGN KEY (assigned_agent_person_id) REFERENCES STAFF(person_id),
    FOREIGN KEY (guardian_person_id) REFERENCES PERSON(person_id),
    FOREIGN KEY (registered_branch_id) REFERENCES BRANCH(branch_id)
);

CREATE TABLE SAVINGS_ACCOUNT(
    account_no VARCHAR(12) PRIMARY KEY,
    plan_id INT NOT NULL,
    branch_id INT NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    opened_date DATE NOT NULL,
    status ENUM('active', 'dormant', 'closed') NOT NULL DEFAULT 'active',
    FOREIGN KEY (plan_id) REFERENCES ACCOUNT_PLAN(plan_id),
    FOREIGN KEY (branch_id) REFERENCES BRANCH(branch_id)
);

CREATE TABLE ACCOUNT_HOLDER(
    person_id INT NOT NULL,
    account_no VARCHAR(12) NOT NULL,
    PRIMARY KEY (person_id, account_no),
    FOREIGN KEY (person_id) REFERENCES PERSON(person_id),
    FOREIGN KEY (account_no) REFERENCES SAVINGS_ACCOUNT(account_no)
);

CREATE TABLE TRANSACTION(
    txn_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_no VARCHAR(12) NOT NULL,
    staff_person_id INT,
    txn_type ENUM('deposit', 'withdrawal', 'interest') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_no VARCHAR(100),
    remarks VARCHAR(255),
    FOREIGN KEY (account_no) REFERENCES SAVINGS_ACCOUNT(account_no),
    FOREIGN KEY (staff_person_id) REFERENCES STAFF(person_id)
);

CREATE TABLE OTP_TOKEN(
    token_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose ENUM('login', 'transaction', 'reset') NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (username) REFERENCES USER_ACCOUNT(username)
);

CREATE TABLE USER_SESSION(
    session_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    device_ip VARCHAR(50),
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES USER_ACCOUNT(username)
);
```

### 6.3 Database Trigger In-Depth (`database/triggers.sql`)
The trigger `before_transaction_insert` enforces ledger invariants. If a withdrawal would drop the account balance below the required minimum balance of the plan:
```sql
IF NEW.txn_type = 'withdrawal' THEN
    IF (current_balance - NEW.amount) < required_min_balance THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction Denied: Insufficient funds or minimum balance breached.';
    ELSE
        SET NEW.balance_after = current_balance - NEW.amount;
        UPDATE SAVINGS_ACCOUNT 
        SET balance = NEW.balance_after 
        WHERE account_no = NEW.account_no;
    END IF;
```
`SQLSTATE '45000'` is the standard SQL state for unhandled user-defined exceptions. When raised, MySQL immediately rolls back the `INSERT INTO TRANSACTION` statement and returns an error to Go, triggering Go's `tx.Rollback()`.

### 6.4 Scheduled Events & Monthly Compounding (`database/events.sql`)
```sql
CREATE EVENT process_fd_interest_event
    ON SCHEDULE EVERY 30 DAY
    STARTS CURRENT_TIMESTAMP + INTERVAL 30 DAY
    ON COMPLETION PRESERVE
    ENABLE
    DO
        CALL ProcessFDInterest();
```
The MySQL Event Scheduler automatically runs every 30 days to compute and distribute monthly interest payouts into the linked savings account.

---

## 7. Comprehensive Viva Examination Q&A Bank (45+ Questions & Model Answers)

### Category A: High-Level Architecture & Design Decisions

#### Q1: Why did your team adopt a 3-tier architecture with separate `frontend/`, `backend/`, and `database/` folders?
**Model Answer:** We separated the system into three distinct tiers to achieve strict **Separation of Concerns (SoC)**, robust security boundaries, and independent scalability.
- **Frontend:** Pure presentation. Runs in the client browser and has zero direct access to database credentials or business secrets.
- **Backend:** Central application logic. Acts as the gatekeeper enforcing business rules, RBAC, 2FA, and cryptographic verification.
- **Database:** Persistence layer. Guarantees ACID compliance, referential integrity, and ledger consistency.
This structure allowed us to deploy each tier independently (Vercel for frontend edge rendering, Render for containerized Go backend, and Aiven for managed cloud MySQL).

#### Q2: Why choose Golang for the backend instead of Node.js or Python?
**Model Answer:** Banking systems demand high concurrency, predictable latency, and low memory consumption.
1. **Concurrency:** Go utilizes lightweight Goroutines (starting at ~2KB stack size), enabling the backend to handle thousands of simultaneous banking transactions with minimal CPU overhead.
2. **Type Safety & Performance:** Go compiles directly to native machine code without the runtime overhead of an interpreter (Python) or JIT garbage collection pauses (Node.js).
3. **Robust Standard Library:** Go's `net/http` package is production-grade, eliminating dependency bloat and vulnerability vectors from third-party frameworks.

#### Q3: Why did you choose Next.js App Router for the frontend?
**Model Answer:** Next.js provides hybrid rendering:
- **Server Components & Edge Rewrites:** Enable zero-latency routing and backend proxying (`next.config.ts`), eliminating CORS preflight friction.
- **Client Components (`"use client"`):** Deliver reactive, stateful multi-step wizards for complex flows like account origination and joint-holder management.
- **TypeScript:** Enforces strict compile-time types across data payloads, preventing runtime crashes.

---

### Category B: Database, Triggers & ACID Transactions

#### Q4: What does ACID stand for, and how is it maintained during account origination?
**Model Answer:** ACID stands for **Atomicity, Consistency, Isolation, and Durability**.
In `OpenAccountHandler` (`backend/agent_account.go`):
- **Atomicity:** `tx, err := db.BeginTx(...)` wraps account creation, holder mapping, and initial deposit. If any query fails, `defer tx.Rollback()` reverts every modification.
- **Consistency:** Database triggers and foreign keys guarantee that an account cannot exist without a valid plan and verified branch.
- **Isolation:** InnoDB's default `REPEATABLE READ` transaction isolation level prevents dirty reads from concurrent sessions.
- **Durability:** Once `tx.Commit()` succeeds, all writes are persisted to MySQL's redo log on disk.

#### Q5: Why delegate ledger balance calculation to a database trigger rather than calculating it in Go?
**Model Answer:**
1. **Atomic Guard:** Calculating balances in application code is prone to race conditions if two deposits or withdrawals execute simultaneously.
2. **Single Source of Truth:** By embedding balance updates inside `before_transaction_insert`, any transaction executed via API, CLI, or admin procedures *must* satisfy balance constraints.
3. **Audit Trail Guarantee:** It is mathematically impossible to update `SAVINGS_ACCOUNT.balance` without generating a corresponding row in `TRANSACTION`.

#### Q6: How does the trigger prevent overdrafts or minimum balance breaches?
**Model Answer:** The trigger queries `SAVINGS_ACCOUNT.balance` and `ACCOUNT_PLAN.min_balance`. If `(current_balance - NEW.amount) < required_min_balance`, it issues `SIGNAL SQLSTATE '45000'` with the message `'Transaction Denied: Insufficient funds or minimum balance breached.'`. This terminates the SQL execution immediately and forces the Go transaction to abort.

#### Q7: Why do you have both a `PERSON` table and a `CUSTOMER` table?
**Model Answer:** This represents **Entity Specialization and Normalization**.
- `PERSON` stores physical human traits (First Name, Last Name, NIC, DOB, Address, Phone Number).
- `CUSTOMER` stores banking-specific relationships (assigned agent, registered branch, and guardian link for minors).
- `STAFF` also links to `PERSON`.
This avoids duplicate records if a staff member also opens a personal savings account or if a person acts as both a customer and a guardian.

---

### Category C: Golang Backend, Concurrency & Type Safety

#### Q8: Why did you use `github.com/shopspring/decimal` instead of standard `float64` for money?
**Model Answer:** Binary floating-point numbers (`float64`) use IEEE-754 representation, which cannot accurately represent fractional decimal values like `0.1` or `0.01` (e.g., `0.1 + 0.2 = 0.30000000000000004`). In financial systems, accumulated rounding errors cause ledger discrepancies. `shopspring/decimal` provides exact, fixed-point arithmetic, matching MySQL's `DECIMAL(15,2)` without precision loss.

#### Q9: How do Goroutines improve performance in your authentication system?
**Model Answer:** In `backend/otp.go`, sending an email via SMTP or external HTTP APIs requires a network roundtrip (200ms to 2s). By invoking `go SendEmailOTP(email, plainOTP)` in a background Goroutine, the HTTP login handler responds immediately to the user with `200 OK` and starts the countdown, rather than blocking the user's browser waiting for the email server.

#### Q10: How does `defer tx.Rollback()` work in Go?
**Model Answer:** `defer` schedules a function call to run immediately when the surrounding function returns. If an error occurs anywhere in the function, `tx.Rollback()` automatically executes. If the transaction completes successfully and `tx.Commit()` is called, `tx.Rollback()` becomes a safe no-op.

---

### Category D: Frontend Architecture & Next.js App Router

#### Q11: How did you implement debouncing in the customer search bar, and why is it necessary?
**Model Answer:** Without debouncing, an API request would fire on every single keystroke. If a user types a 12-character NIC quickly, it would fire 12 database requests in under a second.
In `frontend/app/agent/accounts/new/page.tsx`:
```tsx
useEffect(() => {
  const timer = setTimeout(async () => {
    // Execute API fetch
  }, 250);
  return () => clearTimeout(timer); // Cancels pending timer on next keystroke
}, [searchQuery]);
```
We set a 250ms debounce window. The fetch executes only when the user pauses typing, reducing server load by ~90%.

#### Q12: How does the Joint Account UI handle multi-holder restrictions?
**Model Answer:**
1. If the plan is "Adult", "Children", "Teen", or "Senior", selecting a customer replaces the holder list with that single individual (`selectedHolders = [customer]`).
2. If "Joint" is selected, the UI switches to a tag-based chip system allowing 2 to 4 holders.
3. The submit handler verifies `selectedHolders.length >= 2 && selectedHolders.length <= 4`. If an agent tries to add more than 4, it displays: *"Joint accounts allow a maximum of 4 account holders."*

---

### Category E: Security, 2FA, Sessions & Cryptography

#### Q13: Why is `crypto/rand` required for OTP generation instead of `math/rand`?
**Model Answer:** `math/rand` is a pseudo-random generator with a deterministic mathematical algorithm. If the seed is known or predictable, an attacker can anticipate upcoming OTPs. `crypto/rand` reads cryptographically secure randomness directly from the OS kernel (`/dev/urandom` / Windows CryptoAPI), ensuring unpredictable, attack-resistant verification codes.

#### Q14: Explain the 5-minute OTP rate limiting and session reuse mechanism.
**Model Answer:** When an OTP is requested, the backend queries `OTP_TOKEN` for `username = ? AND purpose = 'login' AND expires_at > NOW()`.
If an active record exists:
1. It calculates `seconds_remaining = expires_at - NOW()`.
2. It reuses the active `temp_token` and returns `seconds_remaining` to the frontend.
3. It refuses to generate a new OTP, thwarting email spamming and brute-force attempts.

#### Q15: How did you fix the browser "Back button" loophole during 2FA?
**Model Answer:**
1. **Frontend:** When step 2 (OTP prompt) begins, the expiration timestamp is saved in `sessionStorage` (`admin_pending_otp`). If the user hits Back and returns, `useEffect` detects the active timer, skips step 1, and resumes the countdown.
2. **Backend:** Even if `sessionStorage` is wiped, the database queries active tokens and returns the remaining seconds, enforcing the 5-minute lockout server-side.

#### Q16: What is the difference between an `HttpOnly` cookie and `localStorage` for sessions?
**Model Answer:**
- **`HttpOnly` Cookies:** Inaccessible to client-side JavaScript (`document.cookie` cannot read them). This provides complete immunity against Cross-Site Scripting (XSS) token theft.
- **`localStorage`:** Accessible to client scripts. We use `localStorage` to pass the token in `Authorization: Bearer <token>` headers as a cross-origin fallback, while the server issues `HttpOnly` cookies for same-origin security.

#### Q17: What happens during a "Safe Logout"?
**Model Answer:** Safe logout requires total invalidation across all layers:
1. **Database:** Deletes the session row from `USER_SESSION`.
2. **Cookie:** Overwrites the browser cookie with `MaxAge: -1` and `Expires: 1970-01-01`.
3. **Client State:** Clears `localStorage` and `sessionStorage`.
4. **Router:** Calls `router.refresh()` to purge Next.js in-memory client caches.

---

### Category F: Cloud Deployment, Networking & CORS

#### Q18: What is CORS, and why did you encounter CORS issues during deployment?
**Model Answer:** **CORS (Cross-Origin Resource Sharing)** is a browser security mechanism that restricts a web page on one domain (`https://btrust2.vercel.app`) from making requests to a different domain (`https://btrust-backend.onrender.com`).
We resolved this by:
1. Implementing Next.js rewrites in `next.config.ts` so the browser calls `/api/*` on its own domain, and Vercel proxies it server-to-server.
2. In Go, implementing `enableCORS` middleware to dynamically echo allowed origins and support `Authorization` headers and `OPTIONS` preflight requests.
3. Removing hardcoded `http://localhost:3000` overrides from individual handlers.

#### Q19: Why did Render fail to send emails via Gmail SMTP, and how did you resolve it?
**Model Answer:** Render's free tier blocks outbound TCP connections on ports 25, 465, and 587 to prevent spam. Attempting to dial Gmail SMTP resulted in a connection timeout.
We solved this by implementing the **Resend HTTPS REST API** (`backend/otp.go`). Because it sends HTTP POST requests to `https://api.resend.com/emails` over port 443 (standard HTTPS), it operates smoothly through all cloud firewalls.

#### Q20: Why did you append `&tls=skip-verify` to your MySQL connection string on Aiven?
**Model Answer:** Aiven Cloud mandates encrypted SSL/TLS connections for all MySQL traffic. Without specifying TLS flags in Go's MySQL driver (`go-sql-driver/mysql`), the driver attempts an unencrypted connection and is immediately rejected by the cloud database.

---

### Category G: Arkeshan's Specific Implementations & Troubleshooting

#### Q21: Walk me through the exact bug you diagnosed and solved on `/api/agent/customer/search`.
**Model Answer:**
1. **Symptom:** In the Open Savings Account wizard, entering an NIC returned zero customer results.
2. **Diagnosis:** In `main.go`, `/api/agent/customer/search` was wired to `AgentCustomerSearchHandler`. That handler had been modified for the Fixed Deposit module to require `?username=...`. When the account wizard passed `?nic=...`, the handler returned `400 Bad Request: username is required`.
3. **Resolution:** I unified the handler in `backend/agent_fd.go`. It checks if `r.URL.Query().Has("nic")`. If so, it dispatches to `SearchCustomerByNICHandler(db)`. If `username` is present, it executes the FD lookup.
4. **Verification:** I wrote `TestAgentCustomerSearchHandler_UnifiedNIC` in `agent_account_test.go` and verified that both NIC search and username search pass.

#### Q22: How does your Guardian-Aware NIC search work for a 6-year-old child?
**Model Answer:** A 6-year-old child has no NIC, so `PERSON.nic` is `NULL`. However, during registration, `CUSTOMER.guardian_person_id` was linked to the father's `person_id`.
When the agent searches the father's NIC (`1980...`):
- The first part of the `UNION` query matches the father as `Primary`.
- The second part of the `UNION` query joins `CUSTOMER c` to `PERSON g` on `c.guardian_person_id = g.person_id` and matches the father's NIC, returning the child as `Dependent`.
The agent can then select the child and open a Children's savings account.

#### Q23: What happens if an agent tries to deposit LKR 500 when opening an Adult account?
**Model Answer:** The Adult plan requires a minimum balance of LKR 1,000.00.
1. The Go handler queries `ACCOUNT_PLAN` and compares `req.InitialDeposit.LessThan(minBalance)`.
2. Because `500.00 < 1000.00`, Go immediately rejects the request with HTTP 400: *"Initial deposit of LKR 500.00 is less than the required minimum balance of LKR 1000.00 for the Adult plan."*
3. Even if this validation were bypassed, the database trigger `before_transaction_insert` would check `current_balance + amount < min_balance` and throw `SQLSTATE 45000`, rolling back the transaction.

#### Q24: What happens if an agent attempts to open a Joint account with 1 holder?
**Model Answer:** In `backend/agent_account.go`, line 326:
```go
if req.PlanID == 5 {
    if len(req.PersonIDs) < 2 || len(req.PersonIDs) > 4 {
        // Return HTTP 400: Joint accounts require between 2 and 4 distinct account holders.
    }
}
```
The request is rejected before any database transaction begins.

#### Q25: How do you prevent duplicate holders from being submitted in a Joint account?
**Model Answer:** We maintain a tracking map in Go:
```go
seen := make(map[int]bool)
for _, pid := range req.PersonIDs {
    if seen[pid] {
        return HTTP 400: "Duplicate customer selected in account holders list."
    }
    seen[pid] = true
}
```
Additionally, `ACCOUNT_HOLDER` has a composite primary key `PRIMARY KEY (person_id, account_no)`, which prevents duplicate entries at the database level.

---

### Final Viva Preparation Checklist for Arkeshan
- [x] Review the 3-Tier Architecture rationale (Separation of Concerns, security, scalability).
- [x] Memorize the 5 Savings Account Plans, their interest rates, minimum balances, and age brackets.
- [x] Be ready to explain the `before_transaction_insert` trigger line-by-line on a whiteboard.
- [x] Be ready to explain `shopspring/decimal` vs `float64`.
- [x] Walk through the Guardian-Aware NIC search `UNION` query.
- [x] Explain the route collision bug on `/api/agent/customer/search` and how you unified it.
- [x] Explain the Resend HTTPS API integration and why cloud SMTP fails on port 587.
- [x] Explain the 5-minute rate limit, active OTP reuse, and the browser Back-button loophole fix.

---
*End of Master Technical Study Guide. Good luck with your Viva!*
