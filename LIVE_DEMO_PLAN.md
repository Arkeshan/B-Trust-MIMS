# B-Trust MIMS: Master Live Demonstration Plan
**Project:** Microbanking and Interest Management System (B-Trust MIMS)  
**Academic Alignment:** CS3043 Database Systems  
**Evaluation Rubric:** Criterion 1 — *Demonstration of Project Functionality Demo Plan, Communication, Relevance (5 Points)*  
**Live Production URL:** [https://btrust2.vercel.app](https://btrust2.vercel.app)  

---

## 1. Demo Schedule & Time Allocation (10–12 Minutes Total)

| Phase | Duration | Core Feature Demonstrated | Lead Presenter | Database Concept Highlighted |
| :---: | :---: | :--- | :--- | :--- |
| **0** | 1 min | **Architectural Intro & Cloud Topology** | Arkeshan | 3-Tier Architecture, Hybrid Cloud (Vercel + Render + Aiven), Docker |
| **1** | 2 min | **KYC Registration & Minor Guardianship** | Vimukthi | Specialization (`PERSON` $\rightarrow$ `CUSTOMER`), Self-referencing FK, 12-char NIC |
| **2** | 2.5 min | **Account Origination (Individual & Joint)** | Arkeshan | $M:N$ Junction Table (`ACCOUNT_HOLDER`), Age Math, Atomic `tx.Begin()`, Trigger |
| **3** | 2.5 min | **Customer Portal, Transfers & Trigger Defense** | Arkeshan / Achira | `SELECT ... FOR UPDATE`, Dual-Entry Ledger, Overdraft Rejection `SQLSTATE 45000` |
| **4** | 2 min | **Fixed Deposit Lifecycle & Interest Engine** | Dinisiru | Stored Procedure (`ProcessFDInterest`), Cursors, Scheduled Events |
| **5** | 2 min | **Admin 2FA Security & Analytical Reports** | Nethmi / Arkeshan | 2FA Rate-Limiting (`OTP_TOKEN`), Resend HTTPS Email, Database Views (`vw_...`) |

---

## 2. Test Credentials Cheat Sheet

| Role | Username | Password | Purpose in Demo |
| :--- | :--- | :--- | :--- |
| **Agent / Teller** | `ark` (or `agent1`) | `password123` | Originate accounts, search customers, counter deposits |
| **Primary Customer** | `kasun` | `password123` | Performs fund transfers, checks history, opens FDs |
| **Recipient Customer** | `nuwan` | `password123` | Receives transfers (tests masked recipient lookup `N*** P***`) |
| **Admin** | `admin` | *(Live password)* | 2FA OTP verification via email, views analytical reports |

---

## 3. Step-by-Step Live Demonstration Script

### Phase 1: Customer KYC Registration & Minor Guardianship (2 Minutes)
* **Goal:** Prove data integrity and entity specialization before an account is opened.
* **Navigation:** Login as Agent $\rightarrow$ Click **"New Customer"** (`/agent/customers/new`).
* **Test Case A (Minor Customer):**
  1. Enter First Name: `Shenal`, Last Name: `Perera`.
  2. Enter Date of Birth: `2015-06-10` (Age 11).
  3. **Visual Highlight:** System badge turns amber: *"11 yrs (Minor)"*. Customer NIC input becomes optional.
  4. Dynamic **Minor Guardian Panel** appears automatically.
  5. Enter Guardian NIC: `198512345678` (valid 12-character format).
  6. Submit $\rightarrow$ Successful KYC registration linked via `guardian_person_id`.
* **TA Talking Point:** *"Notice that minors do not hold NICs. The schema links minors to an existing guardian via a self-referencing foreign key on `CUSTOMER(guardian_person_id)`."*

---

### Phase 2: Savings Account Origination & The Core Trigger (2.5 Minutes)
* **Goal:** Demonstrate the $M:N$ junction table and atomic multi-table write.
* **Navigation:** Click **"Open Account"** (`/agent/accounts/new`).
* **Test Case A (Guardian-Aware Search):**
  1. In the search box, type the guardian's NIC: `198512345678`.
  2. **Visual Highlight:** Search results return **both** the father (`Primary`) and minor child (`Dependent`) via our **SQL `UNION` query**.
  3. Select the minor child.
* **Test Case B (Plan Selection & Dynamic Age Enforcement):**
  1. Try selecting **Adult Plan** $\rightarrow$ UI blocks it: *"Customer is 11 years old and qualifies only for the Children plan"*.
  2. Select **Children Plan** (Plan ID 1).
  3. Enter Initial Deposit: `LKR 2,000.00`.
  4. Click **"Open Account"**.
* **Test Case C (Joint Account Demonstration):**
  1. Select **Joint Plan** (Plan ID 5).
  2. Add Customer 1 (`kasun`) + Customer 2 (`nuwan`).
  3. Submit initial deposit `LKR 10,000.00`.
* **TA Talking Point:** *"Behind the scenes, Go executes `tx.Begin()`, inserts into `SAVINGS_ACCOUNT` with balance 0.00, writes 2 junction rows to `ACCOUNT_HOLDER`, and inserts the deposit into `TRANSACTION`. The `before_transaction_insert` database trigger computes `balance_after` and mutates the account balance inside the database engine before committing."*

---

### Phase 3: Customer Transfers & The Trigger Overdraft Trap (2.5 Minutes)
* **Goal:** Show real-time pessimistic locking and live trigger rejection.
* **Navigation:** Logout $\rightarrow$ Login as Customer `kasun` $\rightarrow$ Navigate to **"Transfer Funds"** (`/customer/transfer`).
* **Test Case A (Privacy-Preserving Recipient Lookup):**
  1. Select source account holding `LKR 15,000.00`.
  2. In destination account, type recipient account (e.g., `ACC000000002`).
  3. **Visual Highlight:** Real-time lookup displays: *"Transferring to: N*** P***"*.
  4. Explain to TA: *"We use `maskName` in Go to protect customer privacy and prevent PII leakage while letting the sender verify the initials."*
* **Test Case B (Live Trigger Rejection — The "Overdraft Trap"):**
  1. Enter transfer amount: `LKR 14,800.00` (which would leave balance at LKR 200, below the LKR 1,000 minimum balance requirement).
  2. Click **"Confirm Transfer"**.
  3. **Visual Highlight:** System instantly declines with a red toast:  
     `"Transaction declined: Insufficient funds. Account balance cannot drop below the required minimum balance."`
  4. Explain to TA: *"This rejection was not just frontend logic. MySQL's `before_transaction_insert` trigger evaluated `(current_balance - amount) < min_balance` and threw `SIGNAL SQLSTATE '45000'`. Go caught the error and executed `tx.Rollback()`."*
* **Test Case C (Successful Transfer):**
  1. Change amount to `LKR 2,500.00`.
  2. Click **"Confirm Transfer"** $\rightarrow$ Instant success!
  3. **Visual Highlight:** Digital printable receipt renders showing shared tracking reference `TRF261011...` and exact timestamp.

---

### Phase 4: Fixed Deposit Engine & Procedural Interest (2 Minutes)
* **Goal:** Prove stored procedure and cursor execution.
* **Navigation:** Customer clicks **"Fixed Deposits"** (`/customer/fd`).
* **Test Case:**
  1. View active FD plans (e.g., 6 Months @ 12%, 12 Months @ 14%).
  2. Open new FD linked to savings account.
  3. Present the stored procedure:
     `CALL ProcessFDInterest();`
  4. Explain cursor loop: *"The procedure uses an open cursor to iterate over active FDs where `next_interest_date <= CURDATE()`, computes monthly compound interest, credits the linked savings account, and logs the payout."*

---

### Phase 5: Admin 2FA Security & Analytical Reporting (2 Minutes)
* **Goal:** Show 2FA authentication, rate-limiting, and SQL views.
* **Navigation:** Logout $\rightarrow$ Navigate to `/login` $\rightarrow$ Enter `admin` credentials.
* **Test Case A (2FA Challenge & Live Email Dispatch):**
  1. Click Sign In $\rightarrow$ System intercepts standard login and displays 6-digit OTP modal.
  2. Live 300-second countdown timer starts.
  3. Check email inbox / server logs for the live HTML email dispatched via **Resend HTTPS API (Port 443)**.
* **Test Case B (Back-Button Protection Test):**
  1. Hit browser back button and submit credentials again.
  2. **Visual Highlight:** Server reuses the active `temp_token` and resumes countdown without generating duplicate emails (rate-limit protection).
  3. Enter 6-digit code $\rightarrow$ Admin dashboard opens!
* **Test Case C (Analytical Views):**
  1. Navigate to **"Reports & Analytics"** (`/admin/reports`).
  2. Show summary cards generated by database views:
     - `vw_agent_transaction_summary`
     - `vw_fd_status`
     - `vw_recent_txn`
  3. Explain: *"These views pre-aggregate millions of rows at the database engine level, avoiding expensive application-layer joins."*

---

## 4. Viva Defense Wrap-Up & Closing Statement
> *"To conclude: B-Trust MIMS fulfills every requirement of the CS3043 syllabus. Our relational model is strictly 3NF normalized with zero modification anomalies; our business invariants are enforced at the lowest level via MySQL triggers and stored procedures; our transactions use pessimistic row locks for mathematical concurrency safety; and our deployment runs live across hybrid cloud containers."*
