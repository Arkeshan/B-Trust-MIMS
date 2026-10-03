# B-Trust MIMS: Agent Portal Detailed Development Plan

**Project:** Microbanking and Interest Management System (MIMS)
**Phase:** Agent Portal Implementation
**Team Members:** Achira, Vimukthi, Arkeshan, Nethmi, Dinisiru

This document provides a **highly detailed, step-by-step technical breakdown** for each team member. It specifies exact file paths, whether to CREATE or EDIT them, and the exact steps and purpose of the code required in the Frontend, Backend, and Database layers.

---

## 1. Module 1: Agent Shell & Secure Auth
**Assignee:** Achira
**Purpose:** Establish the core authenticated layout for the Agent Portal and ensure the backend securely identifies exactly which staff member is making requests.

### 🌐 Frontend Tasks
- **[CREATE] `frontend/app/agent/layout.tsx`**
  - *Steps:* Create a Next.js layout component that wraps all `/agent` routes. Build a persistent left-side navigation sidebar (Navy Blue `#001F3F`) with links (Dashboard, Register Customer, Open Account, Teller Counter, Portfolio).
  - *Purpose:* Ensures the agent navigation is always visible without reloading between page changes.
- **[CREATE] `frontend/components/AgentHeader.tsx`**
  - *Steps:* Create a top header bar (White `#FFFFFF`). It must read the `username` from `localStorage` (saved during login) and display it alongside a "Logout" button that hits `/api/auth/logout`.
  - *Purpose:* Provides clear user context and secure exit functionality.
- **[CREATE] `frontend/app/agent/dashboard/page.tsx`**
  - *Steps:* Build the default welcome screen. Create three static UI cards as placeholders for now: "Total Customers", "My Transactions", "Branch Information".
  - *Purpose:* The landing page the agent sees immediately after login.

### ⚙️ Backend Tasks
- **[EDIT] `backend/auth.go`**
  - *Steps:* Create a new helper function: `func GetStaffPersonID(r *http.Request, db *sql.DB) (int, error)`.
  - *Purpose:* Read the `session_id` cookie or Bearer token, query the database, and return the unique integer `person_id` of the logged-in agent.
- **[EDIT] `backend/txn.go`**
  - *Steps:* Locate the function `getStaffIDFromSession()`. Delete the hardcoded `return 1`. Replace it by calling your new `GetStaffPersonID(r, db)` function. Return an HTTP 401 Unauthorized error if it fails.
  - *Purpose:* Ensures that all deposits and withdrawals are securely hard-linked to the agent actually performing them, preventing spoofing.

### 🗄️ Database Tasks
- **[EDIT] `backend/auth.go` (SQL Query Writing)**
  - *Steps:* Write the specific SQL query inside `GetStaffPersonID`.
  - *Exact SQL logic:* `SELECT s.person_id FROM USER_SESSION us JOIN USER_ACCOUNT ua ON us.username = ua.username JOIN STAFF s ON ua.username = s.username WHERE us.session_id = ? AND us.expires_at > NOW()`
  - *Purpose:* Maps a temporary browser session securely to the permanent `person_id` in the `STAFF` table.

---

## 2. Module 2: Customer Identity Registration (Phase 1)
**Assignee:** Vimukthi
**Purpose:** Create a standalone KYC (Know Your Customer) process to register individuals into the bank *without* automatically opening a bank account for them.

### 🌐 Frontend Tasks
- **[CREATE] `frontend/app/agent/customers/new/page.tsx`**
  - *Steps:* Build a two-column form using standard HTML inputs.
    - *Left:* First Name, Last Name, NIC, DOB (Date picker), Phone, Address.
    - *Right:* Username, Password, Guardian NIC (Text field).
  - *Steps:* Write a `useEffect` or `onChange` handler that calculates age based on DOB. If age < 18, make the "Guardian NIC" field visible and `required`.
  - *Steps:* On successful submit, show a custom Success Modal with three buttons: "Register Another Identity", "Open Account", "Return to Dashboard".
  - *Purpose:* Prevents the user from being auto-redirected so they can register multiple people sequentially (e.g., husband and wife for a joint account).

### ⚙️ Backend Tasks
- **[CREATE] `backend/agent_customer.go`**
  - *Steps:* Create `RegisterCustomerHandler(db *sql.DB)`. Parse the JSON payload matching the form fields.
  - *Steps:* Use `golang.org/x/crypto/bcrypt` to hash the incoming password.
  - *Steps:* If a Guardian NIC is provided, run a `SELECT person_id FROM PERSON WHERE nic = ?` to verify the guardian exists in the system, returning 400 Bad Request if missing.
  - *Purpose:* Safely receives raw personal data and prepares it for secure DB insertion.

### 🗄️ Database Tasks
- **[EDIT] `backend/agent_customer.go` (SQL Transaction)**
  - *Steps:* Implement a Go SQL transaction (`tx, err := db.Begin()`).
  - *Steps:* 
    1. `INSERT INTO USER_ACCOUNT (username, password_hash, email, type, status)`
    2. `INSERT INTO PERSON (first_name, last_name, nic, dob, phone_number, address, city)`. Capture the generated ID using `result.LastInsertId()`.
    3. `INSERT INTO CUSTOMER (person_id, username, assigned_agent_person_id, guardian_person_id, registered_branch_id)`.
  - *Steps:* Call `tx.Commit()`. If any step errors, call `tx.Rollback()`.
  - *Purpose:* Ensures the database maintains ACID integrity; we never end up with a login account that has no physical person details attached.

---

## 3. Module 3: Account Origination & Association
**Assignee:** Arkeshan (Hardest Part)
**Purpose:** Open a physical savings account, link one or more previously registered identities to it, and process the mandatory initial cash deposit in a single atomic action.

### 🌐 Frontend Tasks
- **[CREATE] `frontend/app/agent/accounts/new/page.tsx`**
  - *Steps:* Build a multi-step form wizard.
    - *Step 1:* Dropdown for Plan Type ("Adult", "Joint", "Children"). Input field for "Initial Deposit Amount (LKR)".
    - *Step 2:* An input field to search for existing customers by NIC. Provide an "Add" button that pushes the customer into a visible list of "Account Holders" (tags).
  - *Steps:* Submit the payload as an array of `person_id`s, the `plan_id`, and the `initial_deposit`.
  - *Purpose:* Simplifies complex Joint account creation into a clean UI.

### ⚙️ Backend Tasks
- **[CREATE] `backend/agent_account.go`**
  - *Steps:* Create `OpenAccountHandler(db *sql.DB)`. 
  - *Steps:* Write a helper function `generateAccountNo(db)` that generates a random 12-character string (e.g., `ACC` + 9 random digits) and verifies it doesn't already exist.
  - *Steps:* Retrieve the active agent's ID via `GetStaffPersonID`.
  - *Purpose:* Orchestrates the complex multi-table orchestration required to initialize a bank account.

### 🗄️ Database Tasks
- **[EDIT] `backend/agent_account.go` (Atomic Nightmare Transaction)**
  - *Steps:* Open `tx, err := db.Begin()`.
  - *Steps:* Execute `INSERT INTO SAVINGS_ACCOUNT (account_no, plan_id, branch_id, balance, opened_date, status)` passing `balance = 0.00` initially.
  - *Steps:* Loop through the array of `person_id`s sent by the frontend. For each, execute `INSERT INTO ACCOUNT_HOLDER (person_id, account_no)`.
  - *Steps:* Execute `INSERT INTO TRANSACTION (account_no, staff_person_id, txn_type, amount, balance_after) VALUES (?, ?, 'deposit', ?, 0.00)`.
  - *Purpose/Magic:* The database `before_transaction_insert` trigger will automatically catch this transaction insert, add the deposit to the 0.00 balance, check if it meets the plan's `min_balance`, and natively `UPDATE SAVINGS_ACCOUNT`. If it fails the minimum balance check, MySQL throws a `45000` error, triggering your Go code to hit `tx.Rollback()` and abort the entire account creation!

---

## 4. Module 4: Teller Counter Operations
**Assignee:** Nethmi
**Purpose:** Provide the primary cash-handling interface where agents process walk-in deposits and withdrawals safely.

### 🌐 Frontend Tasks
- **[EDIT] `frontend/app/agent/transfer/page.tsx`**
  - *Steps:* Completely redesign the current blank page to match the dashboard's Navy/Cyan UI style. Make the "Deposit" and "Withdraw" toggle buttons large and clear.
  - *Steps:* Replace the basic "Account Number" text input with a "Customer Lookup" component. As the agent types an NIC, fetch matching account numbers from `/api/agent/lookup` and display them in a dropdown.
- **[CREATE] `frontend/components/ReceiptModal.tsx`**
  - *Steps:* Create a modal component that appears ONLY after a successful API response. Design it to look like a printed receipt (monospaced font, dotted lines, bank logo).
  - *Steps:* Include a "Print" button that calls standard browser `window.print()`.
  - *Purpose:* Provides a tangible proof of transaction for the walk-in customer.

### ⚙️ Backend Tasks
- **[CREATE] `backend/agent_lookup.go`**
  - *Steps:* Create `AgentCustomerLookupHandler(db *sql.DB)`. Extract the `?nic=` query parameter.
  - *Steps:* Return a JSON array of accounts associated with that NIC.
  - *Purpose:* Serves the autocomplete dropdown on the frontend so the agent never mistypes an account number.

### 🗄️ Database Tasks
- **[EDIT] `backend/agent_lookup.go` (Lookup Query)**
  - *Steps:* Write the lookup SQL query: 
    `SELECT s.account_no, s.balance, p.first_name FROM PERSON p JOIN ACCOUNT_HOLDER ah ON p.person_id = ah.person_id JOIN SAVINGS_ACCOUNT s ON ah.account_no = s.account_no WHERE p.nic = ?`
  - *Purpose:* Joins the identity layer to the physical account layer to allow easy discovery by NIC.

---

### 5. Module 5: Portfolio, Ledger & Fixed Deposit Origination
**Assignee:** Dinisiru
**Purpose:** Provide reporting and oversight so the agent can see their assigned customers and reconcile their physical cash drawer. Additionally, take ownership of Fixed Deposit (FD) origination, as customers are no longer permitted to create FDs on their own according to the SRS.

### 🌐 Frontend Tasks
- **[EDIT] `frontend/app/customer/fd/page.tsx` & `frontend/app/customer/savings/page.tsx`**
  - *Steps:* Completely REMOVE the "Create FD" forms, modals, and buttons from the customer portal. 
  - *Purpose:* Fulfills the strict SRS requirement that customers can only *view* existing FDs, not originate them.
- **[CREATE] `frontend/app/agent/fd/new/page.tsx`**
  - *Steps:* Build the FD Origination wizard for agents. The agent selects a customer, chooses an eligible savings account (one without an existing FD), selects an FD term (6, 12, or 36 months), and inputs the investment principal.
- **[CREATE] `frontend/app/agent/portfolio/page.tsx`**
  - *Steps:* Build a page with two main tabs: "My Customers" and "30-Day Ledger".
  - *Steps (Tab 1):* Build a data table listing assigned customers. Make the rows click-expandable to show nested data (Savings Balance and FD statuses).
  - *Steps (Tab 2):* Build a chronological ledger table mapping Date, Transaction ID, Type, and Amount.
  - *Steps (Top of Page):* Create a prominent KPI metric bar that displays the exact Management Requirement: **"My Total Handled Transactions: [Count]"** and **"Total Value Processed: [LKR Sum]"**.
  - *Purpose:* Centralizes customer management and fulfills the management reporting requirement directly within the agent's view.

### ⚙️ Backend Tasks
- **[CREATE] `backend/agent_fd.go`**
  - *Steps:* Create `AgentOpenFDHandler(db *sql.DB)`. Secure it by resolving the agent's identity via `GetStaffPersonID`.
  - *Steps:* Validate the requested term matches allowed `fd_plan_id`s, and ensure the investment amount is strictly positive.
  - *Purpose:* Safely process FD creations from the agent's privileged context.
- **[CREATE] `backend/agent_reports.go`**
  - *Steps:* Create `AgentCustomersHandler(db *sql.DB)`. Returns all customers where `assigned_agent_person_id` = logged-in agent ID.
  - *Steps:* Create `AgentLedgerHandler(db *sql.DB)`. Returns all rows from `TRANSACTION` processed by this agent in the last 30 days.
  - *Steps:* Create `AgentStatsHandler(db *sql.DB)`. Returns the specific count and sum metrics for the KPI bar.
  - *Purpose:* Distributes the heavy read logic into three distinct API endpoints for faster UI rendering.

### 🗄️ Database Tasks
- **[EDIT] `backend/agent_fd.go` (FD Insertion & Constraint Checking)**
  - *Steps:* `INSERT INTO FIXED_DEPOSIT (fd_acc_no, account_no, fd_plan_id, investment, start_date, next_payout_date)`.
  - *Steps:* The Go backend must catch the MySQL constraint violation for `uq_fd_account_no` and gracefully return a "This savings account already has an active FD" error to the UI.
  - *Purpose:* Relies on strict database-level constraints (rather than just application logic) to enforce the business rule of 1 FD per savings account.
- **[EDIT] `backend/agent_reports.go` (Heavy Reads)**
  - *Steps (Customers):* `SELECT p.first_name, p.nic, c.username FROM CUSTOMER c JOIN PERSON p ON c.person_id = p.person_id WHERE c.assigned_agent_person_id = ?`
  - *Steps (Ledger):* `SELECT txn_id, txn_type, amount, timestamp, reference_no FROM TRANSACTION WHERE staff_person_id = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY) ORDER BY timestamp DESC`
  - *Steps (Stats/Views):* Query the existing database view `vw_agent_transaction_summary` with `WHERE agent_id = ?` to instantly fetch the pre-calculated Management Requirement totals without writing complex `SUM()` queries in Go.
  - *Purpose:* Optimized read operations ensuring the UI loads instantly even if the agent has thousands of assigned customers.
