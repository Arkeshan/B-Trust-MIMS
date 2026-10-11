# B-Trust MIMS: Master Viva Defense & Technical Study Guide
**Candidate:** Arkeshan  
**Project:** Microbanking and Interest Management System (B-Trust MIMS)  
**Role:** Core Banking Engine Architect, Transaction Subsystem, Account Origination, 2FA Security, DevOps & Deployment Lead  
**Repository:** [https://github.com/Arkeshan/B-Trust-MIMS](https://github.com/Arkeshan/B-Trust-MIMS)  
**Live Production Environments:**  
- **Frontend Portal:** [https://btrust2.vercel.app](https://btrust2.vercel.app) (Vercel CDN + Next.js Turbopack)  
- **Backend Core API:** [https://btrust-backend.onrender.com](https://btrust-backend.onrender.com) (Render Cloud Docker Container)  
- **Managed Database:** Aiven Cloud MySQL 8.0 Managed Cluster (SSL/TLS Encrypted)  

---

## Table of Contents
0. [Academic Alignment: Course Syllabus (Modules 1–12) & TA Evaluation Criteria](#0-academic-alignment-course-syllabus-modules-112--ta-evaluation-criteria)
1. [Executive Overview & Elevator Pitch](#1-executive-overview--elevator-pitch)
2. [Architectural Foundations: The "Why" Behind the Design](#2-architectural-foundations-the-why-behind-the-design)
   - [Why the 3-Folder Architecture?](#21-why-the-3-folder-architecture)
   - [End-to-End Request Flow & Communication Topology](#22-end-to-end-request-flow--communication-topology)
   - [Database-as-Code vs ORMs](#23-database-as-code-vs-orms)
3. [Arkeshan's Git Commit Timeline & Engineering History](#3-arkeshans-git-commit-timeline--engineering-history)
4. [Deep-Dive Module 1: Account Origination & Association (The Hardest Module)](#4-deep-dive-module-1-account-origination--association)
   - [Problem Statement & Business Requirements](#41-problem-statement--business-requirements)
   - [Guardian-Aware Search Logic (UNION SQL Query)](#42-guardian-aware-search-logic)
   - [Age Rules & Leap-Year Arithmetic](#43-age-rules--leap-year-arithmetic)
   - [The Multi-Table Atomic Transaction & Trigger Synergy](#44-the-multi-table-atomic-transaction--trigger-synergy)
   - [Arbitrary Precision Math: Why `shopspring/decimal` Over `float64`?](#45-arbitrary-precision-math-why-shopspringdecimal-over-float64)
   - [Full Source Code: `backend/agent_account.go`](#46-full-source-code-backendagent_accountgo)
   - [Full Source Code: `frontend/app/agent/accounts/new/page.tsx`](#47-full-source-code-frontendappagentaccountsnewpagetsx)
5. [Deep-Dive Module 2: Atomic Customer Fund Transfers](#5-deep-dive-module-2-atomic-customer-fund-transfers)
   - [ACID Guarantee & Preventing Double-Spending](#51-acid-guarantee--preventing-double-spending)
   - [Pessimistic Row Locking (`SELECT ... FOR UPDATE`)](#52-pessimistic-row-locking-select--for-update)
   - [Dual-Entry Bookkeeping & Shared Reference Codes](#53-dual-entry-bookkeeping--shared-reference-codes)
   - [Privacy-Preserving Account Lookup & Name Masking](#54-privacy-preserving-account-lookup--name-masking)
   - [Full Source Code: `backend/transfer.go`](#55-full-source-code-backendtransfergo)
   - [Full Source Code: `frontend/app/customer/transfer/page.tsx`](#56-full-source-code-frontendappcustomertransferpagetsx)
6. [Deep-Dive Module 3: Teller Counter Transactions](#6-deep-dive-module-3-teller-counter-transactions)
   - [Overdraft Prevention & Staff Audit Trails](#61-overdraft-prevention--staff-audit-trails)
   - [Full Source Code: `backend/txn.go`](#62-full-source-code-backendtxngo)
7. [Deep-Dive Module 4: Admin 2FA Two-Factor Authentication & Session Lifecycle](#7-deep-dive-module-4-admin-2fa-two-factor-authentication--session-lifecycle)
   - [CSPRNG vs Pseudo-Random OTP Generation](#71-csprng-vs-pseudo-random-otp-generation)
   - [5-Minute Database Rate Limiting & The Browser "Back Button" Loophole](#72-5-minute-database-rate-limiting--the-browser-back-button-loophole)
   - [Dual-Channel Email Dispatch: HTTPS Resend API vs SMTP Port 587](#73-dual-channel-email-dispatch-https-resend-api-vs-smtp-port-587)
   - [Triple-Tier Safe Logout Protocol](#74-triple-tier-safe-logout-protocol)
   - [Full Source Code: `backend/otp.go`](#75-full-source-code-backendotpgo)
   - [Full Source Code: `backend/auth.go`](#76-full-source-code-backendauthgo)
8. [Deep-Dive Module 5: Today's Bug Fix & Route Unification](#8-deep-dive-module-5-todays-bug-fix--route-unification)
   - [The Route Collision Problem (`/api/agent/customer/search`)](#81-the-route-collision-problem)
   - [Unified Handler Architecture](#82-unified-handler-architecture)
   - [Eliminating Localhost CORS Overrides for Cloud Portals](#83-eliminating-localhost-cors-overrides-for-cloud-portals)
9. [Database Layer Deep Dive: Schema, Triggers, Constraints & Indexes](#9-database-layer-deep-dive)
   - [The Core Trigger: `before_transaction_insert`](#91-the-core-trigger-before_transaction_insert)
   - [Relational Normalization (3NF) & Schema Design](#92-relational-normalization-3nf--schema-design)
   - [Indexing Strategy](#93-indexing-strategy)
10. [Cloud Deployment & Production DevOps Architecture](#10-cloud-deployment--production-devops-architecture)
    - [Next.js Reverse Proxy & Rewrite Architecture](#101-nextjs-reverse-proxy--rewrite-architecture)
    - [Containerization with Multi-Stage Dockerfile](#102-containerization-with-multi-stage-dockerfile)
    - [Aiven Cloud Managed MySQL with TLS](#103-aiven-cloud-managed-mysql-with-tls)
11. [The Master Viva Defense Question Bank (60 Comprehensive Q&As)](#11-the-master-viva-defense-question-bank)
    - [Category A: Architecture & Structural Decisions (Q1–Q10)](#category-a-architecture--structural-decisions)
    - [Category B: Database, Triggers & ACID Transactions (Q11–Q22)](#category-b-database-triggers--acid-transactions)
    - [Category C: Golang Backend & Concurrency (Q23–Q32)](#category-c-golang-backend--concurrency)
    - [Category D: Security, Authentication & 2FA (Q33–Q42)](#category-d-security-authentication--2fa)
    - [Category E: Account Origination & Domain Rules (Q43–Q50)](#category-e-account-origination--domain-rules)
    - [Category F: DevOps, Cloud Hosting & Troubleshooting (Q51–Q55)](#category-f-devops-cloud-hosting--troubleshooting)
    - [Category G: Examiner "Trap" & Pressure Questions (Q56–Q60)](#category-g-examiner-trap--pressure-questions)
12. [Viva Day Tactical Advice & Technical Vocabulary](#12-viva-day-tactical-advice--technical-vocabulary)

---

## 0. Academic Alignment: Course Syllabus (Modules 1–12) & TA Evaluation Criteria

### 0.1 Meeting the Teaching Assistants' Expectations
Based on the instructional team's explicit guidance, the viva defense will be evaluated on the following priorities:
1. **Primary Focus on Database Design:** Evaluators will examine if the relational schema is normalized, if constraints prevent bad states, and if business requirements are fulfilled.
2. **Bonus Marks for Advanced Database Features:**
   - **Database Triggers:** Authored `before_transaction_insert` (row-level, ECA model, raises custom `SQLSTATE '45000'` exceptions, halts invalid writes, and mutates balances atomically).
   - **Stored Procedures & Cursors:** Partnered on `ProcessFDInterest()` in `database/procedures.sql` using procedural cursor loops for term payouts.
   - **Database Indexing:** Secondary B+ Tree indexes on high-frequency lookup keys in `database/indexes.sql` to avoid sequential full-table scans.
   - **Database Views:** Reporting and security views (`vw_agent_transaction_summary`, `vw_fd_status`, `vw_recent_txn`) for row-level access control.
   - **Scheduled Events:** Automated monthly interest execution via MySQL Event Scheduler (`monthly_fd_interest_event`).
3. **Bonus Marks for Implementation & Architecture:**
   - Enterprise UI/UX with real-time feedback, debounce searching, and printable transaction receipts.
   - Admin Two-Factor Authentication (2FA) with CSPRNG OTP generation, database rate limiting, and firewall-resilient dual-channel email dispatch.
   - Production Docker containerization and live hybrid cloud hosting (Vercel + Render + Aiven Cloud MySQL with TLS).
4. **Individual Competency & Accountability:**
   - Every member must articulate why technical choices were made and defend their code without appearing as a free rider.

### 0.2 Arkeshan's Course Curriculum Alignment Matrix

| Course Module | Syllabus Topic | Arkeshan's Project Implementation | Viva Defense Justification ("Why I did this") |
| :--- | :--- | :--- | :--- |
| **Module 1: Intro to DBMS** | 3-Tier Architecture, Physical/Logical Schema, DBMS Storage Engine | Separated system into Presentation (Next.js), Application (Go REST API), and Data (MySQL 8.0 InnoDB). Docker containerization. | *"A 3-tier architecture achieves physical data independence: the database storage and indexing can be altered without breaking the client."* |
| **Module 2: Intro to SQL** | Data Definition (DDL), Data Types, Precision, Constraints | Schema tables: `SAVINGS_ACCOUNT`, `ACCOUNT_HOLDER`, `TRANSACTION`. Strict types: `DECIMAL(15,2)`, `ENUM`, `TIMESTAMP`. | *"We rejected IEEE-754 `FLOAT`/`DOUBLE` to prevent floating-point rounding errors in monetary sums; strictly used `DECIMAL(15,2)`."* |
| **Module 3: Intermediate SQL** | Transactions, ACID Guarantees, Foreign Key Constraints, Joins | Multi-table atomic transactions (`tx.Begin()`, `tx.Commit()`, `tx.Rollback()`). Dual-entry bookkeeping in transfers. | *"Fund transfers and account origination require all-or-nothing execution; if any step breaches constraints, the entire transaction rolls back."* |
| **Module 4: Advanced SQL** | Triggers (ECA Model), SQL Injection Prevention, Prepared Statements | Authored `before_transaction_insert` trigger with `SIGNAL SQLSTATE '45000'`. 100% Prepared Statements (`?` parameterization). | *"Triggers enforce business invariants at the lowest storage level, ensuring rules cannot be bypassed by buggy backend code or direct SQL access."* |
| **Module 5: ER Modeling** | $1:1$, $1:N$, $M:N$ Cardinalities, Junction Entities, Specialization | Modeled `ACCOUNT_HOLDER(person_id, account_no)` as an associative junction table with composite PK. Specialization of `PERSON`. | *"Joint accounts and multi-account holders form an $M:N$ relationship; resolving this via a junction table is the textbook relational approach."* |
| **Module 6 & 7: Normalization** | 1NF, 2NF, 3NF, BCNF, Functional Dependencies, Lossless Joins | Normalized tables to 3NF. Separated `ACCOUNT_PLAN` from `SAVINGS_ACCOUNT` to eliminate transitive dependencies ($account \rightarrow plan \rightarrow rate$). | *"Keeping interest rates inside `ACCOUNT_PLAN` rather than duplicating them on every account record prevents update anomalies when rates change."* |
| **Module 8: Application Design** | MVC Pattern, Application Security, Connection Pooling | Go REST API with connection pooling (`db.SetMaxOpenConns`). Admin 2FA with CSPRNG tokens and database rate limiting. | *"Application tier acts as a gatekeeper, sanitizing requests before they reach the database and validating user sessions against `USER_SESSION`."* |
| **Module 9: File Org & Indexing** | Clustered vs Secondary Indexes, B+ Trees, Slotted Pages | Primary key clustered indexes on account tables; assisted teammates with secondary B+ Tree indexes on foreign keys. | *"InnoDB stores table rows in clustered B+ tree leaf nodes ordered by Primary Key; foreign key lookups use secondary index pointers."* |
| **Module 12: NoSQL vs RDBMS** | ACID vs BASE, CAP Theorem (Consistency vs Availability) | Explicitly chose Relational MySQL over NoSQL (MongoDB/Cassandra). | *"Banking ledgers require strong consistency and immediate isolation (ACID/CA). BASE eventual consistency allows double-spending and cannot be used for core banking."* |

---

## 1. Executive Overview & Elevator Pitch

### The 30-Second Viva Elevator Pitch
> *"B-Trust MIMS is a microbanking and interest management platform designed to enforce bank-grade ACID guarantees, strict regulatory KYC compliance, and multi-tier authentication. My responsibility in this team project focused on the core transactional and financial backbone:*
> 1. *I designed and authored the atomic **Account Origination engine**, enabling agents to register individual and joint savings accounts with complex age and guardian constraints.*
> 2. *I built the **Customer Transfer engine** utilizing pessimistic row locking (`SELECT ... FOR UPDATE`) and dual-entry ledgers to make race conditions and double-spending mathematically impossible.*
> 3. *I created the database trigger `before_transaction_insert` that validates minimum balances and updates account balances at the database layer.*
> 4. *I implemented the **Admin 2FA Security System** with cryptographically secure random tokens, a persistent 5-minute rate limiter, and dual-channel email dispatch (Resend API over port 443 + SMTP).*
> 5. *Finally, I led the cloud deployment architecture, hosting our frontend on Vercel, backend in a Docker container on Render, and our relational database on an Aiven MySQL Cloud cluster."*

---

## 2. Architectural Foundations: The "Why" Behind the Design

### 2.1 Why the 3-Folder Architecture?
The repository is strictly organized into three top-level directories:
```
B-Trust-MIMS/
├── database/     # Database-as-Code (DDL, DML, Triggers, Procedures, Indexes, Views)
├── backend/      # Golang Microservice REST API (net/http, Business Logic, DB Driver)
└── frontend/     # Next.js 16 Web Application (React 19, TypeScript, Tailwind CSS)
```

#### Why separate them physically instead of a Monolith or Framework-managed structure?
1. **Separation of Concerns (SoC):**
   - The database layer enforces **data integrity** and **relational invariants** (foreign keys, cascading rules, check constraints, triggers).
   - The backend layer enforces **business workflows**, **authentication**, and **API contracts**.
   - The frontend layer focuses solely on **user experience**, **form validation**, and **presentation**.
2. **Polyglot Stack Alignment:**
   - Database: Pure Declarative ANSI SQL / MySQL Dialect.
   - Backend: High-performance, statically typed, compiled Golang.
   - Frontend: Modern component-driven TypeScript with React 19.
3. **Independent Deployability (Micro-architecture):**
   - In production, each folder maps directly to a different cloud infrastructure provider:
     - `database/` runs on **Aiven Cloud** (Managed MySQL 8.0 cluster).
     - `backend/` is packaged as a Linux container and runs on **Render Cloud**.
     - `frontend/` is built using Turbopack and deployed globally across edge nodes on **Vercel CDN**.
4. **Independent Versioning & Scalability:**
   - The backend can scale horizontally across multiple container instances without duplicating frontend asset delivery.
   - The database scripts remain source-controlled as single sources of truth, versioned independently of ORM abstractions.

### 2.2 End-to-End Request Flow & Communication Topology

```
+-----------------------------------------------------------------------------------+
|                                CLIENT BROWSER                                     |
|  (User accesses https://btrust2.vercel.app/agent/accounts/new)                    |
+-----------------------------------------------------------------------------------+
                                        |
                             1. HTTPS GET / POST
                                        v
+-----------------------------------------------------------------------------------+
|                        VERCEL CDN / NEXT.JS RUNTIME                               |
|  - Renders UI via Next.js 16 App Router & React 19                                |
|  - next.config.ts rewrites "/api/:path*" -> "https://btrust-backend.onrender.com" |
|  - Solves browser Mixed Content issues & passes Bearer Auth headers               |
+-----------------------------------------------------------------------------------+
                                        |
                          2. HTTPS Reverse Proxy Request
                                        v
+-----------------------------------------------------------------------------------+
|                           RENDER CLOUD (GOLANG BACKEND)                           |
|  - Docker Container running btrust-backend binary                                 |
|  - Port dispatch: ListenAndServe(":" + PORT)                                      |
|  - Middleware: enableCORS(next)                                                   |
|    * Dynamically sets Access-Control-Allow-Origin: https://btrust2.vercel.app      |
|    * Validates Access-Control-Allow-Credentials: true                             |
|  - Auth Layer: getAuthenticatedUser(r, db) / GetStaffPersonID(r, db)              |
|    * Validates Authorization: Bearer <session_id> against USER_SESSION table      |
|  - Handlers: OpenAccountHandler / CustomerTransferHandler                         |
|  - ACID Engine: db.BeginTx(ctx, nil) with defer tx.Rollback()                     |
+-----------------------------------------------------------------------------------+
                                        |
                          3. MySQL Protocol over TLS (Port 14937)
                                        v
+-----------------------------------------------------------------------------------+
|                        AIVEN MANAGED MYSQL 8.0 CLUSTER                            |
|  - Connection pooling with max connections & SSL verification                     |
|  - InnoDB Storage Engine (Row-level Locking, MVCC, Write-Ahead Logging)           |
|  - Trigger: before_transaction_insert fires automatically BEFORE row insertion    |
|    * Enforces: (current_balance - amount) >= min_balance                          |
|    * Updates: SAVINGS_ACCOUNT.balance = NEW.balance_after                         |
|    * Signals SQLSTATE '45000' on breach -> forces Go tx.Rollback()                |
+-----------------------------------------------------------------------------------+
```

### 2.3 Database-as-Code vs ORMs
A common viva question is: *"Why did you write raw SQL instead of using an ORM like GORM, Prisma, or Hibernate?"*

| Feature | Raw SQL / Database-as-Code (Our Approach) | Typical ORM (GORM / Prisma) |
|---|---|---|
| **Performance** | Zero abstraction overhead; optimized query plans and minimal memory allocations. | Reflection overhead, struct hydration overhead, N+1 query traps. |
| **Trigger Support** | Native integration with `before_transaction_insert`; triggers execute inside the DB transaction. | ORMs frequently bypass DB triggers or miscalculate trigger-generated column updates. |
| **Complex Queries** | Native `UNION`, `FOR UPDATE` row locks, and subqueries written effortlessly. | Complex locking and multi-table unions require cumbersome raw query escapes anyway. |
| **Financial Reliability** | Exact types (`DECIMAL(15,2)`) mapped directly to Go `shopspring/decimal`. | Silent float conversion bugs frequently introduced during ORM struct mapping. |
| **Relational Integrity** | Foreign key cascades and check constraints explicitly defined in DDL scripts. | Often relies on application-level validations that fail during concurrent writes. |

---

## 3. Arkeshan's Git Commit Timeline & Engineering History

Every major technical milestone is backed by git commits authored by Arkeshan:

1. **`09cff00` & `be80c7a` — Core Auth & Ledger Engine:**
   - Implemented `generateSessionToken()`, `getAuthenticatedUser()`, and the initial ACID customer transfer handler.
   - Added `reference_no` and `remarks` schema migration to `TRANSACTION` table.
2. **`4967297` & `e8e67d9` — Customer Transfer UI & Pagination:**
   - Built the 3-row responsive transfer interface with real-time masked recipient account lookup.
3. **`5a52deb` & `f32b472` — Database Driver & Timezone Corrections:**
   - Configured `loc=Local` in the MySQL Data Source Name (DSN) to prevent timezone drift between Colombo time (UTC+5:30) and UTC servers.
   - Fixed `rows.Err()` checks across cursor iterations to prevent silent query truncation.
4. **`5611eac` & `894ab71` & `2c8f643` — Module 3: Account Origination Master Engine:**
   - Implemented `OpenAccountHandler`, `generateAccountNo`, and the Guardian-aware NIC search with `UNION` query.
   - Migrated financial amounts from `float64` to `decimal.Decimal` to eliminate floating-point rounding errors.
   - Built the frontend multi-step account creation wizard with interactive plan selection.
5. **`58114bd` — Admin 2FA Security System:**
   - Created `backend/otp.go` with CSPRNG OTP generation, 5-minute countdown rate limiting, and back-button loophole prevention.
6. **`c47c3f5` & `a104e67` — Cloud Architecture & Resend HTTPS Integration:**
   - Configured Aiven Cloud MySQL TLS connection string.
   - Integrated the Resend HTTPS API (port 443) to overcome cloud SMTP firewall blocks on port 587.
7. **`6a5fb78` & `ec3242a` — Production Frontend Refinements:**
   - Added automatic root URL redirection (`/` &rarr; `/login`) on Vercel.
   - Sanitized `BACKEND_URL` trailing slashes to prevent malformed proxy requests.
8. **`cd7f123` — Master Route Unification & Cross-Origin Auth Fix:**
   - Unified `/api/agent/customer/search` to route `?nic=` to Guardian-aware search and `?username=` to FD search.
   - Fixed `GetStaffPersonID` to prioritize `Authorization: Bearer <token>` over stale browser cookies.
   - Stripped hardcoded `http://localhost:3000` headers across all agent handlers to enable seamless CORS operation on `btrust2.vercel.app`.

---

## 4. Deep-Dive Module 1: Account Origination & Association

### 4.1 Problem Statement & Business Requirements
In microbanking, opening an account cannot be a simple database insert. It must adhere to strict regulatory, legal, and risk constraints:
- **KYC Identity Association:** A customer identity must already exist in `PERSON` / `CUSTOMER`.
- **Plan Eligibility by Age:**
  - **Children (Plan 1):** Age < 12. Must have a registered guardian.
  - **Teen (Plan 2):** Age 12 to 17.
  - **Adult (Plan 3):** Age 18 to 59.
  - **Senior (Plan 4):** Age 60+. (Higher interest tier).
  - **Joint (Plan 5):** Exactly 2 to 4 distinct holders; **all holders must be aged 18 or older**.
- **Mandatory Initial Deposit:** The account cannot be opened with a zero balance. The initial deposit must meet or exceed the selected plan's `min_balance`.
- **Atomic Multi-Table Write:** Generating the account, binding account holders, and processing the initial deposit must succeed as a single atomic transaction or rollback completely.

### 4.2 Guardian-Aware Search Logic (UNION SQL Query)
When an agent searches for a minor (e.g., child aged 8) to open a Children's account, **the minor does not possess a National Identity Card (NIC)**. If the system only searched by `p.nic`, minors would never appear in search results!

Arkeshan solved this with a SQL `UNION` query:
```sql
SELECT * FROM (
    -- 1. Direct match on customer's own NIC (for Adults, Teens, Seniors)
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
**Why this is brilliant for viva defense:**
- It performs a unified prefix search (`LIKE CONCAT(?, '%')`).
- If an agent types the father's NIC (`1980...`), the results return **both the father (as 'Primary') and his children (as 'Dependent')**.
- The frontend tags the minor with a distinct badge so the agent knows they are selecting a minor under that guardian.

### 4.3 Age Rules & Leap-Year Arithmetic
In banking, simply doing `(today.Year - birth.Year)` is a bug because it miscalculates age if the birthday has not yet occurred this year.

Arkeshan implemented exact day-of-year compensation:
```go
birthDate, err := time.Parse("2006-01-02", dobStr)
now := time.Now()

age := now.Year() - birthDate.Year()
if now.YearDay() < birthDate.YearDay() {
    age--
}
```
If today is March 10, 2026 and the customer was born on October 15, 2008:
- `2026 - 2008 = 18`
- `now.YearDay() < birthDate.YearDay()` is `TRUE` (March comes before October).
- `age--` &rarr; `age = 17`.
- The customer is correctly flagged as a minor and prevented from opening an Adult account!

### 4.4 The Multi-Table Atomic Transaction & Trigger Synergy
The account origination process in `backend/agent_account.go` executes across three tables:
1. `SAVINGS_ACCOUNT`: Created with `balance = 0.00`.
2. `ACCOUNT_HOLDER`: Junction rows mapping each `person_id` to `account_no`.
3. `TRANSACTION`: Initial deposit record inserted.

```
       [ Go Application ]                         [ MySQL Database ]
              |                                            |
              |--- 1. BeginTx() -------------------------->|
              |--- 2. INSERT INTO SAVINGS_ACCOUNT -------->| (balance = 0.00)
              |--- 3. INSERT INTO ACCOUNT_HOLDER(s) ------>| (junction rows)
              |--- 4. INSERT INTO TRANSACTION ------------>|
              |       (type='deposit', amount=5000.00)     |
              |                                            |---> [ TRIGGER FIRES ]
              |                                            |     before_transaction_insert:
              |                                            |     checks min_balance,
              |                                            |     updates SAVINGS_ACCOUNT.balance
              |                                            |     (new balance = 5000.00)
              |<-- 5. Trigger Success / Failure -----------|
              |                                            |
    [ If error / min_balance breached ]                    |
              |--- 6. tx.Rollback() ---------------------->| (All rows reverted!)
              |                                            |
    [ If success ]                                         |
              |--- 7. tx.Commit() ------------------------>| (Permanent write!)
              v                                            v
```

### 4.5 Arbitrary Precision Math: Why `shopspring/decimal` Over `float64`?
In standard computer architecture (IEEE 754 floating-point standard), binary fractions cannot accurately represent decimal fractions like `0.1` or `0.2`:
```go
var a float64 = 0.1
var b float64 = 0.2
fmt.Println(a + b) // Prints: 0.30000000000000004 !
```
In banking:
- A rounding error of `$0.0000000000000004` multiplied across millions of transactions leads to ledger imbalances, reconciliation failures, and regulatory audits.
- Arkeshan integrated `github.com/shopspring/decimal`:
```go
type OpenAccountRequest struct {
    PlanID         int             `json:"plan_id"`
    PersonIDs      []int           `json:"person_ids"`
    InitialDeposit decimal.Decimal `json:"initial_deposit"`
}
```
`decimal.Decimal` stores numbers internally as arbitrary-precision big integers with an explicit scale exponent, ensuring exact calculations to the cent.

---

## 5. Deep-Dive Module 2: Atomic Customer Fund Transfers

### 5.1 ACID Guarantee & Preventing Double-Spending
Double-spending occurs if a customer initiates two transfers simultaneously from two browser tabs with a balance of LKR 10,000, sending LKR 10,000 to Alice and LKR 10,000 to Bob. If the server reads the balance concurrently without locking, both transfers would succeed, leaving the bank with a LKR 10,000 loss!

Arkeshan eliminated this using **Pessimistic Row-Level Locking** in `backend/transfer.go`:
```go
// Lock the source account row for update
var fromStatus string
err = tx.QueryRowContext(r.Context(),
    "SELECT status FROM SAVINGS_ACCOUNT WHERE account_no = ? FOR UPDATE", req.FromAccount).Scan(&fromStatus)
```
- `FOR UPDATE` instructs MySQL InnoDB to acquire an exclusive lock on that specific row.
- Any concurrent transfer attempt on the same source account is forced to wait until the first transaction commits or rolls back.

### 5.2 Dual-Entry Bookkeeping & Shared Reference Codes
In accordance with professional banking standards, a fund transfer is not a single update. It consists of two distinct ledger entries:
1. **Debit Entry:** `txn_type = 'withdrawal'` on the sender's account.
2. **Credit Entry:** `txn_type = 'deposit'` on the recipient's account.
3. Both entries share an identical reference number:
```go
func generateTransferRef() string {
    bytes := make([]byte, 3)
    _, _ = rand.Read(bytes)
    randomHex := strings.ToUpper(hex.EncodeToString(bytes))
    return fmt.Sprintf("TRF%s%s", time.Now().Format("060102150405"), randomHex)
}
```
This enables auditors to reconcile debits and credits by querying:
`SELECT * FROM TRANSACTION WHERE reference_no = 'TRF261009123045A1B2'`.

### 5.3 Privacy-Preserving Account Lookup & Name Masking
To prevent phishing and transfer errors, the frontend allows customers to preview the recipient's name before sending money. However, displaying the recipient's full legal name would violate customer privacy laws (PII leakage).

Arkeshan implemented `maskName` in `backend/account.go`:
```go
func maskName(first, last string) string {
    maskPart := func(s string) string {
        s = strings.TrimSpace(s)
        if len(s) == 0 {
            return ""
        }
        if len(s) == 1 {
            return s + "***"
        }
        return string(s[0]) + "***"
    }
    return maskPart(first) + " " + maskPart(last)
}
```
*Example:* `Arkeshan Sujeevan` &rarr; `A*** S***`.  
The customer can verify the initials without leaking the full identity of random account numbers.

---

## 6. Deep-Dive Module 3: Teller Counter Transactions

### 6.1 Overdraft Prevention & Staff Audit Trails
In `backend/txn.go`, branch tellers process direct counter deposits and withdrawals.

Key security controls implemented by Arkeshan:
1. **Enforcing Staff Identity:**
   ```go
   func getStaffIDFromSession(r *http.Request, db *sql.DB) (int, error) {
       personID, err := GetStaffPersonID(r, db)
       if err != nil {
           return 0, errors.New("unauthorized staff session")
       }
       return personID, nil
   }
   ```
   Every transaction records `staff_person_id`. Teller transactions cannot be submitted anonymously or spoofed.
2. **Autonomous Overdraft Rejection:**
   Tellers do not have permission to override minimum balance requirements. If a teller attempts to withdraw LKR 5,000 from an account holding LKR 5,500 with a LKR 1,000 minimum balance requirement, the database trigger raises `SQLSTATE 45000` and immediately blocks the operation.

---

## 7. Deep-Dive Module 4: Admin 2FA Two-Factor Authentication & Session Lifecycle

### 7.1 CSPRNG vs Pseudo-Random OTP Generation
Many student systems generate OTPs using `math/rand`:
```go
// INSECURE! DO NOT DO THIS IN BANKING!
import "math/rand"
otp := rand.Intn(900000) + 100000
```
`math/rand` is a Pseudo-Random Number Generator (PRNG) with a deterministic seed. If an attacker observes one or two generated codes, they can predict all future OTP codes!

Arkeshan implemented cryptographically secure randomness via `crypto/rand`:
```go
func GenerateSecureOTP() (string, error) {
    n, err := rand.Int(rand.Reader, big.NewInt(900000))
    if err != nil {
        return "", err
    }
    return fmt.Sprintf("%06d", n.Int64()+100000), nil
}
```
`crypto/rand` reads from the operating system's cryptographic entropy source (`/dev/urandom` on Linux, `CryptGenRandom` on Windows), guaranteeing non-predictability.

### 7.2 5-Minute Database Rate Limiting & The Browser "Back Button" Loophole
A critical vulnerability discovered during testing:  
*If a user requests an OTP, navigates back in their browser, and enters their credentials again, a naive system generates a brand new OTP, enabling OTP flooding.*

Arkeshan eliminated this loophole in `backend/auth.go` & `backend/otp.go`:
```go
// Check for existing active OTP session
var existingTokenID string
var secondsRemaining int
queryExisting := `
    SELECT token_id, TIMESTAMPDIFF(SECOND, NOW(), expires_at) 
    FROM OTP_TOKEN 
    WHERE username = ? AND is_used = FALSE AND expires_at > NOW() 
    ORDER BY created_at DESC LIMIT 1
`
err := db.QueryRowContext(r.Context(), queryExisting, actualUsername).Scan(&existingTokenID, &secondsRemaining)
if err == nil && existingTokenID != "" && secondsRemaining > 0 {
    log.Printf("[2FA] Active OTP session exists for '%s' (%d seconds remaining). Reusing active verification code.\n", actualUsername, secondsRemaining)
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    _ = json.NewEncoder(w).Encode(map[string]any{
        "status":            "otp_required",
        "message":           "Two-factor authentication required. Verification code already sent to email.",
        "temp_token":        existingTokenID,
        "email":             MaskEmail(email),
        "seconds_remaining": secondsRemaining,
    })
    return
}
```
- If an OTP is still active within its 5-minute window, the backend **refuses to generate a new code**.
- It returns the remaining seconds (`seconds_remaining`) so the frontend timer resumes without resetting.

### 7.3 Dual-Channel Email Dispatch: HTTPS Resend API vs SMTP Port 587
During cloud deployment on Render, SMTP email delivery failed with:
`dial tcp 74.125.24.108:587: connect: connection timed out`
**Why?** Free and standard cloud hosting providers (Render, AWS, DigitalOcean) block outbound traffic on SMTP ports (`25`, `465`, `587`) to prevent automated spam botnets.

Arkeshan implemented a resilient dual-channel strategy:
1. **Primary Cloud Channel:** HTTPS REST API via **Resend** over standard outbound port **443** (which cloud firewalls never block).
2. **Secondary Local Channel:** Traditional SMTP via `net/smtp` for local developer environments.
3. **Console Fallback:** Always prints the OTP to the server log for local debugging.

### 7.4 Triple-Tier Safe Logout Protocol
In `backend/auth.go`, logging out cannot simply be deleting a client cookie. Arkeshan implemented complete session termination across three tiers:
1. **Database Tier:** `DELETE FROM USER_SESSION WHERE session_id = ?` (Immediate server-side invalidation).
2. **Cookie Tier:** `http.SetCookie(w, &http.Cookie{Name: "session_id", Value: "", MaxAge: -1, Expires: time.Unix(0, 0)})` (Instructs browser to wipe cookie storage).
3. **Client Tier:** Frontend executes `localStorage.clear()` and `sessionStorage.clear()`.

---

## 8. Deep-Dive Module 5: Today's Bug Fix & Route Unification

### 8.1 The Route Collision Problem
When opening an account in the Agent Portal, searching for customers by NIC failed to return any results.
**Investigation & Root Cause Analysis:**
- In `backend/main.go`:
  `http.HandleFunc("/api/agent/customer/search", enableCORS(AgentCustomerSearchHandler(db)))`
- Dinisuru had implemented `AgentCustomerSearchHandler` in `agent_fd.go` for the Fixed Deposit module, which strictly expected `r.URL.Query().Get("username")`.
- When the Open Savings Account wizard searched with `?nic=1980`, `username` was empty, causing `AgentCustomerSearchHandler` to reject the request with `400 Bad Request: {"error": "username is required"}`!
- Meanwhile, Arkeshan's Guardian-aware search (`SearchCustomerByNICHandler`) was unmapped from the router.

### 8.2 Unified Handler Architecture
Arkeshan unified both search pathways inside `AgentCustomerSearchHandler`:
```go
func AgentCustomerSearchHandler(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodGet {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }

        // 1. If 'nic' parameter is present -> execute Guardian-aware search
        if r.URL.Query().Has("nic") {
            SearchCustomerByNICHandler(db)(w, r)
            return
        }

        // 2. If 'username' parameter is present -> execute FD search
        searchUsername := strings.TrimSpace(r.URL.Query().Get("username"))
        if searchUsername == "" {
            http.Error(w, "nic or username parameter is required", http.StatusBadRequest)
            return
        }
        ...
```

### 8.3 Eliminating Localhost CORS Overrides for Cloud Portals
Several handlers had hardcoded headers:
`w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")`
When running on `btrust2.vercel.app`, the central middleware `enableCORS` set the origin dynamically, but the inner handler overwrote it back to `http://localhost:3000`, causing browser CORS blocks!  
Arkeshan purged these hardcoded overrides, allowing `enableCORS` to handle dynamic origins cleanly across development and cloud environments.

---

## 9. Database Layer Deep Dive

### 9.1 The Core Trigger: `before_transaction_insert`
```sql
DELIMITER //
CREATE TRIGGER before_transaction_insert
BEFORE INSERT ON TRANSACTION
FOR EACH ROW
BEGIN
    DECLARE current_balance DECIMAL(15,2);
    DECLARE required_min_balance DECIMAL(12,2);

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
END //
DELIMITER ;
```
**Why the trigger is critical:**
1. It eliminates race conditions between calculating the balance in application code and updating it in the database.
2. It guarantees that **no transaction record can ever exist without updating `SAVINGS_ACCOUNT.balance`**.
3. It makes minimum balance violations impossible, even if a buggy or malicious client bypasses frontend checks.

### 9.2 Relational Normalization (3NF) & Schema Design
The system conforms strictly to **Third Normal Form (3NF)**:
- **`PERSON` Table:** Contains individual biometric and demographic data (`person_id`, `first_name`, `last_name`, `nic`, `dob`, `phone_number`, `address`, `city`).
- **`CUSTOMER` Table:** Inherits `person_id`, linking to physical persons. Contains banking relationships (`assigned_agent_person_id`, `guardian_person_id`, `registered_branch_id`).
- **`STAFF` Table:** Inherits `person_id`. Contains employment relationships (`role`, `branch_id`).
- **`USER_ACCOUNT` Table:** Decoupled authentication credentials (`username`, `password_hash`, `email`, `type`, `status`).
- **`ACCOUNT_HOLDER` Table:** Pure junction table resolving the **Many-to-Many relationship** between `PERSON` and `SAVINGS_ACCOUNT` (enabling single holders, joint holders, and corporate holdings).

---

## 10. Cloud Deployment & Production DevOps Architecture

### 10.1 Next.js Reverse Proxy & Rewrite Architecture
In `frontend/next.config.ts`:
```ts
const backendUrl = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};
```
**Why this is crucial:**
- The browser only communicates with `https://btrust2.vercel.app`.
- The browser never encounters CORS preflight restrictions or cross-domain third-party cookie blocking because all API requests are routed through Vercel's server-side reverse proxy.

### 10.2 Containerization with Multi-Stage Dockerfile
In `backend/Dockerfile`:
```dockerfile
# Stage 1: Build binary
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o btrust-backend .

# Stage 2: Minimal Runtime Container
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/
COPY --from=builder /app/btrust-backend .
EXPOSE 8080
CMD ["./btrust-backend"]
```
- **Image Size:** Reduced from ~1 GB (full Go SDK) to **~25 MB** (minimal Alpine runtime).
- **Security:** Contains no compiler toolchains or shell utilities that could be leveraged during remote code execution attacks.

---

## 11. The Master Viva Defense Question Bank

### Category A: Architecture & Structural Decisions

#### Q1: Why did your team split the repository into `backend`, `frontend`, and `database` instead of a standard Next.js full-stack app with API routes?
> **Answer:** Next.js Serverless API routes are stateless and ephemeral; they suffer from cold starts and cannot easily maintain long-lived database connection pools required for high-throughput banking transactions. By using a compiled Golang backend, we achieve sub-millisecond API response times, native connection pooling, and multi-threaded goroutines. Keeping `database/` separate allows us to manage SQL schemas, triggers, and migrations as Database-as-Code independently of frontend deployments.

#### Q2: What is the exact sequence when a customer submits a fund transfer?
> **Answer:**
> 1. The React frontend sends a `POST /api/customer/transfer` payload with `from_account`, `to_account`, and `amount`.
> 2. Next.js proxies the call to the Go backend on Render.
> 3. Go extracts the session token from the `Authorization: Bearer` header or cookie and validates ownership of `from_account`.
> 4. Go starts an ACID transaction (`db.BeginTx`) and acquires a row-level lock on `from_account` using `SELECT ... FOR UPDATE`.
> 5. Go inserts a debit `TRANSACTION` record (`withdrawal`), which fires the MySQL trigger `before_transaction_insert` to verify minimum balance and update `SAVINGS_ACCOUNT.balance`.
> 6. Go inserts a credit `TRANSACTION` record (`deposit`) on `to_account`, firing the trigger to increment its balance.
> 7. If any step fails, Go executes `tx.Rollback()`. If both succeed, Go executes `tx.Commit()` and returns HTTP 200 with the receipt.

#### Q3: Why didn't you use an ORM like GORM?
> **Answer:** Banking systems prioritize deterministic execution and auditability over rapid prototyping. ORMs introduce hidden query generation, reflection overhead, and unpredictable caching layers. By using raw SQL with Go's standard `database/sql`, we have total control over query optimization, explicit locking with `FOR UPDATE`, and seamless integration with database-level triggers.

#### Q4: How does your frontend proxy API calls on Vercel?
> **Answer:** We configured Next.js `rewrites` in `next.config.ts`. Any browser request matching `/api/:path*` is proxied server-to-server to the Render backend URL specified in `BACKEND_URL`. This avoids CORS preflight overhead and prevents third-party cookie blocking by browsers.

#### Q5: What happens if the backend server crashes midway through a fund transfer?
> **Answer:** The ACID transaction guarantees **Atomicity**. Because the changes are executed within `db.BeginTx()`, if the Go process terminates or the connection drops before `tx.Commit()` is called, MySQL InnoDB automatically aborts the active transaction and rolls back all uncommitted row changes to their previous state in the Write-Ahead Log (WAL).

---

### Category B: Database, Triggers & ACID Transactions

#### Q11: Explain the purpose and mechanics of the `before_transaction_insert` trigger.
> **Answer:** The trigger is a `BEFORE INSERT` trigger on the `TRANSACTION` table. It queries `SAVINGS_ACCOUNT` and `ACCOUNT_PLAN` to find the account's current balance and required minimum balance. If the transaction is a withdrawal and `(current_balance - amount) < min_balance`, it raises `SIGNAL SQLSTATE '45000'`, which aborts the insert. If valid, it computes `balance_after` and executes `UPDATE SAVINGS_ACCOUNT SET balance = NEW.balance_after`.

#### Q12: Why enforce minimum balance inside a database trigger rather than only in backend code?
> **Answer:** This represents **Defense-in-Depth**. Backend validations can be bypassed by software bugs, direct database queries, script executions, or concurrent race conditions. By placing the constraint inside the database engine, the business rule is physically impossible to violate regardless of how the insert is triggered.

#### Q13: What does `SIGNAL SQLSTATE '45000'` mean?
> **Answer:** In ANSI SQL and MySQL, `45000` is the standard unhandled user-defined exception code. It instructs MySQL to cancel execution of the current statement and return the error message specified in `MESSAGE_TEXT` to the client.

#### Q14: What is Pessimistic Locking vs Optimistic Locking, and where did you use it?
> **Answer:** Optimistic locking assumes conflicts are rare and verifies a version timestamp before updating. Pessimistic locking assumes conflicts are likely and physically locks the data row before reading it. We used pessimistic locking via `SELECT ... FOR UPDATE` in `CustomerTransferHandler` to lock the sender's account row, guaranteeing that concurrent transactions cannot read or modify the balance until the active transfer concludes.

#### Q15: How does your database maintain 3NF (Third Normal Form)?
> **Answer:** A table is in 3NF if it is in 2NF and has no transitive functional dependencies. We separated personal demographics into `PERSON` (`person_id` primary key), customer banking roles into `CUSTOMER`, and staff roles into `STAFF`. If a person changes their phone number or address, it is updated in exactly one place (`PERSON`) without creating anomalies in accounts, transactions, or sessions.

---

### Category C: Golang Backend & Concurrency

#### Q23: Why did you choose Golang for the backend instead of Node.js/Express or Python/Django?
> **Answer:** Golang compiles to a standalone, statically linked machine binary with zero runtime dependencies. It uses lightweight goroutines (consuming ~2 KB of stack space each) rather than heavy OS threads, allowing our microservice to handle thousands of concurrent transactions with minimal RAM usage. Furthermore, Go enforces strict type safety and explicit error checking, preventing unhandled null pointer exceptions common in JavaScript.

#### Q24: How does Go handle database connection pooling in your project?
> **Answer:** When we call `sql.Open("mysql", dsn)`, Go does not open a single connection; it creates an internal, thread-safe connection pool (`*sql.DB`). Handlers borrow connections from the pool during `db.QueryRowContext` or `db.BeginTx` and automatically release them back to the pool when rows are closed or transactions are committed.

#### Q25: What is the purpose of `defer tx.Rollback()` right after `db.BeginTx()`?
> **Answer:** `defer` schedules the execution of a function until the surrounding function returns. By placing `defer tx.Rollback()`, if any validation fails, an error occurs, or the function panics, `tx.Rollback()` is automatically called. If `tx.Commit()` succeeds beforehand, the deferred rollback becomes a harmless no-op. This pattern completely eliminates transaction leaks.

#### Q26: Why must you call `rows.Close()` and check `rows.Err()` when iterating SQL results?
> **Answer:** Failing to call `rows.Close()` keeps the underlying database connection checked out of the pool, eventually exhausting all available database connections (connection leak). Checking `rows.Err()` is mandatory because a network hiccup or timeout midway through reading a large result set can cause `rows.Next()` to return false before all matching records are processed.

---

### Category D: Security, Authentication & 2FA

#### Q33: How does your system prevent Admin OTP brute-force attacks?
> **Answer:** Through three distinct layers:
> 1. **CSPRNG Tokens:** OTPs are generated using `crypto/rand`, preventing mathematical prediction.
> 2. **Strict Expiration:** Each OTP expires exactly 300 seconds (5 minutes) after creation.
> 3. **Database-Enforced Rate Limiting:** The backend checks `OTP_TOKEN` for unexpired, unused tokens. If one exists, the server reuses the active token and returns the remaining TTL rather than issuing a new code.
> 4. **Single-Use Invalidation:** Once verified, `is_used` is set to `TRUE`, preventing replay attacks.

#### Q34: What is the difference between `crypto/rand` and `math/rand`?
> **Answer:** `math/rand` is a pseudo-random generator that produces deterministic sequences based on an internal seed. `crypto/rand` uses hardware-assisted operating system entropy (`/dev/urandom` / `CryptGenRandom`), making the generated numbers cryptographically non-predictable and suitable for banking security tokens.

#### Q35: How does your authentication handle both Session Cookies and Bearer Tokens?
> **Answer:** In `auth.go`, `getAuthenticatedUser` inspects the HTTP request:
> 1. It checks the `Authorization` header for `Bearer <token>`.
> 2. If absent, it checks the `session_id` cookie.
> 3. It queries `USER_SESSION` where `session_id = ? AND expires_at > NOW()`.  
> This allows web browsers to use cookies or headers while enabling mobile apps and API clients to authenticate via standard Authorization headers.

#### Q36: Why was outbound SMTP blocked on Render, and how did you resolve it?
> **Answer:** Cloud platforms block TCP ports 25, 465, and 587 to prevent their servers from being abused by spam bots. We resolved this by integrating the Resend HTTPS API, which dispatches transactional emails over standard HTTPS (port 443). The backend uses Resend in production and falls back to standard SMTP in local environments.

---

### Category E: Account Origination & Domain Rules

#### Q43: How does your system support both Individual and Joint accounts?
> **Answer:** Through the `ACCOUNT_HOLDER` junction table. Instead of storing a `person_id` column on `SAVINGS_ACCOUNT`, each account is mapped to one or more rows in `ACCOUNT_HOLDER`. An Individual account has 1 mapping; a Joint account has 2 to 4 mappings.

#### Q44: How did you implement the Guardian-Aware search for minors?
> **Answer:** Minors under 16-18 do not have an NIC. We wrote a SQL `UNION` query. The first query matches customers whose own `p.nic` begins with the query string (Primary holders). The second query matches customers whose registered guardian's `g.nic` matches the query string (Dependent holders).

#### Q45: What happens if an agent attempts to open an Adult account for a 16-year-old?
> **Answer:** The backend calculates the exact age using DOB arithmetic. In `OpenAccountHandler`, the switch statement checks `req.PlanID == 3` (Adult) and verifies `age >= 18`. Because the customer is 16, it aborts before touching the database and returns `400 Bad Request: "Adult plan requires account holder to be at least 18 years old"`.

#### Q46: Why is the initial deposit required during account opening?
> **Answer:** Regulations prohibit empty bank accounts. The initial deposit must meet the plan's `min_balance`. By inserting the deposit into `TRANSACTION` during the account creation transaction, the database trigger updates `SAVINGS_ACCOUNT.balance` and validates that the account starts in an active, funded state.

---

### Category F: DevOps, Cloud Hosting & Troubleshooting

#### Q51: How is your database secured on Aiven Cloud?
> **Answer:** Aiven provides a fully managed MySQL instance with automated disk snapshots and continuous backups. Connections require TLS encryption (`tls=custom` with certificate validation in Go). The database is placed behind authentication credentials managed through environment variables rather than hardcoded in the codebase.

#### Q52: What was the bug on `/api/agent/customer/search` and how did you resolve it?
> **Answer:** Two features shared the same URL endpoint. The Fixed Deposit feature expected `?username=`, while the Open Account feature expected `?nic=`. When agents searched by NIC, the handler returned `400 Bad Request: username is required`. We refactored `AgentCustomerSearchHandler` to inspect the query parameters: if `?nic=` is present, it routes to `SearchCustomerByNICHandler`; otherwise, it executes the username search for FD origination.

---

### Category G: Examiner "Trap" & Pressure Questions

#### Q56: "Couldn't an agent bypass your age checks by sending a raw POST request via Postman?"
> **Answer:** No. While frontend form validation restricts dropdown options for user convenience, the Go backend independently parses `dob` from the database for every `person_id` in the request and recalculates their age server-side. Even if an attacker manipulates the JSON payload, the backend strictly rejects invalid ages.

#### Q57: "What if two agents try to open accounts at the exact same millisecond—won't they generate duplicate account numbers?"
> **Answer:** Account numbers are generated using `SELECT COALESCE(MAX(CAST(SUBSTRING(account_no, 4) AS UNSIGNED)), 0) + 1 FROM SAVINGS_ACCOUNT` inside the active transaction. Furthermore, `account_no` has a `PRIMARY KEY` unique constraint in MySQL. If two transactions ever generated the same number concurrently, the second insert would trigger a duplicate key violation and rollback cleanly.

#### Q58: "If the database trigger updates the account balance, why does your Go backend also query the balance after inserting the transaction?"
> **Answer:** In `OpenAccountHandler`, after inserting into `TRANSACTION`, we execute `SELECT balance FROM SAVINGS_ACCOUNT WHERE account_no = ?`. This serves as an immediate programmatic verification that the database trigger fired successfully and that the resulting balance matches expectations before committing the transaction.

#### Q59: "Why didn't you use JWT (JSON Web Tokens) instead of database-backed sessions?"
> **Answer:** JWTs are stateless and cannot be immediately revoked before their expiration time without maintaining a distributed token blacklist. In a banking system where an admin or compromised account must be terminated instantly, server-side database sessions (`USER_SESSION`) allow us to invalidate any session immediately with a single SQL `DELETE` query.

#### Q60: "What is your biggest personal contribution to this project?"
> **Answer:** My greatest contribution was engineering the financial core of the system:
> 1. Writing the ACID transfer and account origination transactions that guarantee ledger consistency.
> 2. Developing the database trigger that enforces minimum balance invariants.
> 3. Hardening authentication with cryptographically secure 2FA and persistent rate limiting.
> 4. Deploying the end-to-end cloud infrastructure connecting Vercel, Render, and Aiven.

---

## 12. Viva Day Tactical Advice & Technical Vocabulary

### Key Technical Terms to Use Naturally
- **ACID Transactions:** Atomicity, Consistency, Isolation, Durability.
- **Pessimistic Row-Level Locking:** `SELECT ... FOR UPDATE` ensuring serial execution of concurrent writes.
- **Trigger Execution Semantics:** `BEFORE INSERT ON TRANSACTION` enforcing database invariants.
- **Arbitrary-Precision Decimal Arithmetic:** Eliminating IEEE 754 floating-point inaccuracies via `shopspring/decimal`.
- **CSPRNG (Cryptographically Secure Pseudo-Random Number Generator):** `crypto/rand` reading from OS entropy pools.
- **Defense-in-Depth:** Validating inputs on the client, verifying rules in the Go API, and enforcing constraints in the database trigger.
- **Server-Side Reverse Proxy:** Next.js `rewrites` forwarding requests to bypass CORS and prevent third-party cookie blocking.

### How to Respond If You Don't Know an Answer
> *"That is an interesting edge case. In our current implementation, we handled this by [relate to a known feature, e.g. rolling back the ACID transaction]. If we were extending this for enterprise scale, I would address it by [e.g. adding a distributed Redis lock / Dead Letter Queue / database partition]."*
