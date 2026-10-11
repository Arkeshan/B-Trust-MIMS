# Arkeshan — Database Viva Defense Presentation Slides (2-Slide Master Guide)

> **Candidate:** Arkeshan S  
> **Course:** CS3043 — Database Systems  
> **Project:** B-Trust Microbanking and Interest Management System (MIMS)  
> **Role:** Core Banking Engine Architect, Transaction Subsystem, Account Origination, 2FA Security, DevOps & Deployment Lead  
> **Presentation Requirement:** 2 Slides strictly focused on **Database Design, Advanced Database Features (Triggers, Transactions, Normalization), and Code Flow**.

---

## Slide 1: Core Relational Database Design, Normalization (3NF) & Atomic Multi-Holder Transactions

### 1. Slide Title & Header
> **Title:** Core Relational Architecture, 3NF Normalization & Atomic Account Origination  
> **Subtitle:** Normalization proofs, $M:N$ junction modeling, and multi-table ACID transaction orchestration with database-level rollback.

---

### 2. Slide Layout & Visual Content Breakdown

```text
┌─────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────┐
│ 1. Relational Schema & 3NF Normalization Proof               │ 2. Atomic Account Origination Code Flow                     │
│                                                             │                                                             │
│ • Centralized Entity Separation:                            │ [Agent Submit] ──► [Go Handler: OpenAccountHandler]         │
│   PERSON (Identity) ──1:N──► CUSTOMER (Role)                │                         │                                   │
│   SAVINGS_ACCOUNT ──M:N──► PERSON via ACCOUNT_HOLDER        │                         ▼                                   │
│                                                             │                 tx, _ := db.Begin()                         │
│ • Junction Table Design:                                    │                         │                                   │
│   ACCOUNT_HOLDER(person_id, account_no)                     │                         ├─► 1. INSERT SAVINGS_ACCOUNT (bal=0)       │
│   - Composite Primary Key: (person_id, account_no)          │                         ├─► 2. LOOP INSERT ACCOUNT_HOLDER           │
│   - Enables Single, Joint, Child & Guardian accounts         │                         ├─► 3. INSERT TRANSACTION (deposit)         │
│                                                             │                         │       ▼                                   │
│ • 3NF Normalization Guarantee:                              │                         │   [Trigger Intercepts & Validates]        │
│   - 1NF: Atomic scalar attributes (decimal monetary values) │                         │   - If min_balance breached: SQLSTATE 45000│
│   - 2NF: No partial key dependencies                        │                         ▼                                   │
│   - 3NF: No transitive functional dependencies              │                 Error ? tx.Rollback() : tx.Commit()         │
│     (Account Plan rates isolated to ACCOUNT_PLAN table)     │                                                             │
└─────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

### 3. Bullet Points for Slide 1 (To put on the PowerPoint/Canva slide)

- **Normalized Relational Architecture (3NF):**
  - Clean separation between Identity (`PERSON`), System Authorization (`USER_ACCOUNT`), Banking Client (`CUSTOMER`), and Financial Ledger (`SAVINGS_ACCOUNT`, `TRANSACTION`).
  - **Elimination of Transitive Dependencies:** Account plan terms (`interest_rate`, `min_balance`) are normalized into `ACCOUNT_PLAN(plan_id)`, avoiding update/insertion anomalies across accounts.
- **Many-to-Many ($M:N$) Junction Modeling (`ACCOUNT_HOLDER`):**
  - Composite Primary Key `(person_id, account_no)` with referential foreign keys.
  - Dynamically supports single accounts, multi-holder **Joint Accounts**, and minor accounts linked to guardians without schema changes or column duplication.
- **Atomic Multi-Table Transaction Orchestration (`backend/agent_account.go`):**
  - Multi-step account creation executed within a strict database transaction (`tx, err := db.Begin()`).
  - Sequentially executes: (1) Account record creation, (2) Multi-holder associations, and (3) Mandatory initial cash deposit transaction.
  - **Fail-Safe Integrity:** If any step fails—or if the deposit violates plan minimums—the entire operation executes `tx.Rollback()`, guaranteeing zero orphaned records.
- **Precision Financial Arithmetic:**
  - Database schema uses `DECIMAL(15,2)` to prevent IEEE-754 floating-point rounding errors; mapped directly to Go's `shopspring/decimal` type in the backend.

---

### 4. Verbal Defense Script for Slide 1 (What you say to the TAs)

> *"Good morning. For our B-Trust microbanking platform, I was responsible for designing our core relational schema and the transaction subsystem.*
> 
> *On this slide, you can see how we modeled our core entities to strictly satisfy **Third Normal Form (3NF)**. We decoupled human identity into a central `PERSON` table, while banking roles reside in `CUSTOMER`. To handle the real-world complexity of **Joint Accounts** where multiple people own one savings account—and one person can own multiple accounts—I implemented an associative junction table called `ACCOUNT_HOLDER` with a composite primary key of `(person_id, account_no)`. This completely eliminates partial functional dependencies and avoids redundant multi-valued fields.*
> 
> *When an agent opens an account, our Go backend executes an **atomic database transaction** (`tx.Begin()`). It inserts the new savings account with a zero balance, loops through all associated holders to create the junction rows, and immediately writes the initial deposit to the `TRANSACTION` ledger. What makes this design robust is that we don't rely solely on application logic: our database trigger intercepts the deposit and verifies the minimum plan balance at the database engine level. If anything violates our constraints, MySQL rejects the write, our code triggers `tx.Rollback()`, and the database remains in a perfectly consistent state."*

---

### 5. Expected TA Questions & Winning Answers for Slide 1

* **Q: Why did you use a junction table `ACCOUNT_HOLDER` instead of putting `person_id` directly in `SAVINGS_ACCOUNT`?**
  * **Answer:** *"If `person_id` were stored directly in `SAVINGS_ACCOUNT`, each account could only have exactly one owner. In banking, joint accounts have multiple owners for one account, and a single customer can have multiple savings accounts. This is a classic $M:N$ relationship. Placing multiple person IDs in one row would violate 1NF (non-atomic values), and duplicating account rows for each owner would violate 2NF (redundancy and update anomalies). The `ACCOUNT_HOLDER` junction table with composite key `(person_id, account_no)` resolves this cleanly in 3NF."*
* **Q: Why didn't you just use `FLOAT` or `DOUBLE` for balances and transaction amounts?**
  * **Answer:** *"Floating-point numbers in computers follow IEEE-754 binary representation, which cannot represent base-10 fractions like 0.10 or 0.05 precisely. Over millions of calculations, floating-point rounding errors lead to discrepancies. In banking, data consistency is paramount, so we strictly used `DECIMAL(15,2)` in MySQL and arbitrary-precision decimal structures (`shopspring/decimal`) in Go."*

---
---

## Slide 2: Advanced Database Invariants: ACID Triggers, Overdraft Prevention & Security

### 1. Slide Title & Header
> **Title:** Advanced Database Features: ACID Triggers, Concurrency Control & Security  
> **Subtitle:** Event-Condition-Action triggers, pessimistic locking for fund transfers, and SQL injection defense.

---

### 2. Slide Layout & Visual Content Breakdown

```text
┌─────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────┐
│ 1. The Core ACID Trigger: before_transaction_insert         │ 2. Concurrency Control & SQL Security                       │
│                                                             │                                                             │
│ • ECA (Event-Condition-Action) Model:                       │ • Customer Transfer Concurrency:                            │
│   - Event: BEFORE INSERT ON TRANSACTION                     │   - Dual-entry ledger accounting (Debit + Credit).          │
│   - Granularity: FOR EACH ROW                               │   - Both account mutations wrapped in a single DB tx.       │
│                                                             │   - Overdraft impossible: Trigger executes on debit row!    │
│ • Invariant Checks:                                         │                                                             │
│   - Fetches current balance & required min_balance from     │ • SQL Injection Immunity:                                   │
│     SAVINGS_ACCOUNT JOIN ACCOUNT_PLAN.                       │   - Zero dynamic string concatenation (fmt.Sprintf).        │
│   - IF (current_balance - NEW.amount) < min_balance THEN    │   - 100% Prepared Statements with parameterized ? tokens:   │
│       SIGNAL SQLSTATE '45000'                               │     db.QueryRowContext(ctx, "SELECT ... WHERE id = ?", id)  │
│       SET MESSAGE_TEXT = 'Transaction Denied...';           │                                                             │
│   - ELSE                                                    │ • Deployment Tiering (3-Tier Physical Architecture):        │
│       SET NEW.balance_after = current_balance - amount;     │   - Presentation Tier: Next.js 16 (Port 3000)               │
│       UPDATE SAVINGS_ACCOUNT SET balance = NEW.balance_after│   - Application Tier: Go REST API (Port 8080)               │
│                                                             │   - Data Tier: MySQL 8.0 InnoDB (Docker & Aiven Cloud TLS)  │
└─────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

### 3. Bullet Points for Slide 2 (To put on the PowerPoint/Canva slide)

- **Database-Enforced Invariant Trigger (`before_transaction_insert`):**
  - **Granularity:** Row-level (`BEFORE INSERT ON TRANSACTION FOR EACH ROW`).
  - **Overdraft & Minimum Balance Enforcement:** Automatically checks `(current_balance - NEW.amount) < min_balance`.
  - **Active State Rejection:** Throws custom database exception `SIGNAL SQLSTATE '45000'` if funds are insufficient, immediately halting query execution and rolling back any parent transaction.
  - **Atomic Balance Mutation:** Eliminates application-level race conditions by computing `NEW.balance_after` and executing `UPDATE SAVINGS_ACCOUNT` inside the database engine.
- **ACID Customer Fund Transfers (`backend/transfer.go`):**
  - Dual-entry bookkeeping: Writes two linked transaction rows (1 withdrawal, 1 deposit) sharing an immutable cryptographically secure `reference_no`.
  - Both mutations execute inside a single atomic database transaction (`tx`).
- **Comprehensive SQL Injection Immunity:**
  - Zero SQL string formatting (`fmt.Sprintf`, raw string interpolation) across all backend endpoints.
  - 100% Parameterized queries using prepared statement placeholders (`?`), ensuring database query plans are precompiled and inputs are strictly bound as literal data.
- **Physical 3-Tier Architecture & Cloud Hardening:**
  - **Presentation:** Next.js 16 App Router on Port 3000 / Vercel CDN.
  - **Application Logic:** Compiled Go 1.24 HTTP REST server on Port 8080 / Render Docker.
  - **Data Persistence:** MySQL 8.0 InnoDB on Port 3307 / Aiven Cloud with mandatory TLS encryption.

---

### 4. Verbal Defense Script for Slide 2 (What you say to the TAs)

> *"On our second slide, we showcase our advanced database logic and security architecture. 
> 
> Rather than relying on the backend to check balances and update accounts in separate queries—which is vulnerable to race conditions—I implemented an **Event-Condition-Action (ECA) database trigger** called `before_transaction_insert`. Whenever any withdrawal or deposit is inserted into the `TRANSACTION` table, the trigger fires at row level before the row is written. It joins `SAVINGS_ACCOUNT` with `ACCOUNT_PLAN`, inspects the current balance and minimum required balance, and checks if the withdrawal is legal. If the withdrawal would breach the minimum balance or cause an overdraft, the trigger invokes `SIGNAL SQLSTATE '45000'`. This forces MySQL to raise an unhandled exception, aborting the write immediately.
> 
> If the transaction is valid, the trigger computes `NEW.balance_after` and updates `SAVINGS_ACCOUNT.balance` right inside MySQL's storage engine.
> 
> Furthermore, for customer transfers, we follow dual-entry accounting: a debit row and a credit row are inserted within a single transaction sharing a common reference number. If the sender does not have enough funds, the trigger catches the debit, aborts, and neither account is touched.
> 
> Finally, regarding database security: 100% of our queries use **Prepared Statements and parameterized `?` tokens**. This ensures complete immunity against SQL injection attacks because user input is never concatenated into SQL execution trees. We also host the system across a true **3-Tier physical architecture**, isolating the database behind Docker and TLS encryption."*

---

### 5. Expected TA Questions & Winning Answers for Slide 2

* **Q: Why did you use a `BEFORE INSERT` trigger rather than an `AFTER INSERT` trigger?**
  * **Answer:** *"In a `BEFORE INSERT` trigger, we can examine the incoming row (`NEW.amount`) and modify fields like `NEW.balance_after` before the row is physically committed to the disk block. More importantly, if the business rule is violated (insufficient funds), throwing a `SIGNAL SQLSTATE '45000'` in a `BEFORE` trigger prevents the invalid transaction record from ever being written to the table."*
* **Q: What happens if two customers transfer money to the same account at the exact same millisecond? How does your system prevent race conditions?**
  * **Answer:** *"MySQL's InnoDB storage engine uses row-level locking. When our trigger executes `UPDATE SAVINGS_ACCOUNT SET balance = ... WHERE account_no = ...`, InnoDB automatically acquires an exclusive row lock (`X-lock`) on that account's primary key record. Any concurrent transaction attempting to modify that same account is queued until the first transaction commits or rolls back, guaranteeing strict **Isolation** under ACID."*
* **Q: How does your trigger differentiate between a deposit, withdrawal, and interest payout?**
  * **Answer:** *"The trigger inspects the `NEW.txn_type` ENUM column. If `NEW.txn_type = 'withdrawal'`, it performs the subtraction and minimum balance check. If `NEW.txn_type IN ('deposit', 'interest')`, it adds the amount to the balance and writes the new balance without checking for minimum balance violations."*

