# B-Trust MIMS: Teammate Viva Defense Presentation Guide (2 Slides Per Member)

> **Purpose:** This guide provides clear, database-course-aligned instructions for the remaining four team members (**Achira, Dinisiru, Nethmi, Vimukthi**). Each member has **2 dedicated slides** focused on database concepts, advanced features, code flow, and verbal defense scripts to demonstrate strong individual contributions and secure bonus marks.

---

## 1. Achira Ayumal

### Slide 1: Unified Identity Hierarchy (`PERSON`), Referential Integrity & Secondary Indexing
- **Course Mapping:** Lecture 1 (DBMS Architecture), Chapter 7 (Entity-Relationship Model), Week 9 (File Organization & Indexing).
- **Slide Layout:**
  - Left Column: Schema diagram showing `PERSON` as the super-entity with foreign key references to `STAFF` and `CUSTOMER`.
  - Right Column: Index analysis table (`database/indexes.sql`) showing column name, index type (B+ Tree), and query speedup benefits.
- **Slide Bullet Points:**
  - **Unified Identity Entity (`PERSON`):** Modeled real-world individuals in a single normalized table with primary key `person_id`. Eliminates duplicate storage of names, NICs, phone numbers, and addresses.
  - **Subtype Partitioning:** Applied specialization (`ISA`) where `STAFF` and `CUSTOMER` inherit identity attributes via 1:1 foreign keys (`STAFF.person_id -> PERSON.person_id`).
  - **B+ Tree Secondary Indexing (`database/indexes.sql`):**
    - Created explicit secondary indexes on search columns: `CREATE INDEX idx_username ON USER_ACCOUNT(username)`, `CREATE INDEX idx_email ON USER_ACCOUNT(email)`, and `CREATE INDEX idx_person_id ON PERSON(person_id)`.
    - Prevents $O(N)$ full table sequential disk scans; leverages self-balancing B+ Trees for $O(\log N)$ logarithmic index lookups.
- **Verbal Defense Script (What Achira says):**
  > *"For my part of the database design, I focused on identity modeling and query performance tuning. Instead of scattering customer and staff personal details across different tables, I established a centralized `PERSON` table acting as an entity supertype. Both `CUSTOMER` and `STAFF` reference this table through foreign keys, preserving referential integrity.
  > 
  > To ensure high performance on search operations, I designed secondary B+ Tree indexes on high-frequency columns like `username`, `email`, and `person_id`. In MySQL's InnoDB storage engine, this replaces sequential disk scans with logarithmic B+ tree traversals, ensuring instant authentication lookups even as the database scales."*
- **Expected TA Questions & Answers:**
  - **Q: What is the difference between a clustered index and a secondary index in your tables?**
    - **A:** *"The primary key (`person_id`) forms the clustered index, dictating the physical order of rows on disk in the B+ tree leaf nodes. The secondary indexes (`idx_username`, `idx_email`) store the search key along with a pointer to the primary key, requiring a fast index lookup followed by a clustered key traverse to read the full tuple."*

### Slide 2: Stateless Session Resolution (`GetStaffPersonID`) & Rolling Window Views
- **Course Mapping:** CS3042 Intermediate SQL (Views), Chapter 9 (Application Security & 3-Tier Architecture).
- **Slide Layout:**
  - Left Column: Architecture flow showing how an incoming HTTP request maps cookie/token $\rightarrow$ `USER_SESSION` $\rightarrow$ `USER_ACCOUNT` $\rightarrow$ `STAFF.person_id`.
  - Right Column: SQL definition of `vw_recent_txn` showing 7-day rolling window date arithmetic.
- **Slide Bullet Points:**
  - **Database-Backed Session Identification (`backend/auth.go`):**
    - Implemented `GetStaffPersonID(r, db)`: Resolves an agent's physical database `person_id` by joining `USER_SESSION`, `USER_ACCOUNT`, and `STAFF`.
    - Eliminates client-side identity spoofing by verifying session validity (`expires_at > NOW()`) directly in the database.
  - **Rolling 7-Day Window View (`database/views.sql`):**
    - Authored `vw_recent_txn`: Virtual view projecting transactions from the last 7 days (`WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)`).
    - Encapsulates date-filtering logic at the database level so frontend queries remain clean and performant.
  - **Cryptographic Password Protection:**
    - Integrated `golang.org/x/crypto/bcrypt` password hashing with salt cost factor 10, preventing dictionary and rainbow table compromises.
- **Verbal Defense Script (What Achira says):**
  > *"On my second slide, I showcase how our application securely identifies staff members and presents transaction history. I wrote `GetStaffPersonID`, which queries the database to map a temporary session token to the permanent `STAFF.person_id`, ensuring no agent can impersonate another staff member. 
  > 
  > I also authored the database view `vw_recent_txn`. By defining a 7-day rolling window using MySQL date arithmetic inside a view, our Go backend can query recent transactions without repeatedly writing complex date-filter clauses in application code."*
- **Expected TA Questions & Answers:**
  - **Q: Why use a database View instead of writing the date filter directly in the Go backend query?**
    - **A:** *"Using a view provides logical data independence. If the bank decides to extend the recent window from 7 days to 14 days, we simply update the view definition in SQL without having to recompile or redeploy our backend application service."*

---

## 2. Dinisiru Sangadith

### Slide 1: Fixed Deposit Relational Model & Cursor-Based Stored Procedure (`ProcessFDInterest`)
- **Course Mapping:** CS3042 Intermediate SQL (Unique Constraints), CS3043 Advanced SQL (Stored Procedures & Cursors).
- **Slide Layout:**
  - Left Column: Schema diagram of `FIXED_DEPOSIT` highlighting the `UNIQUE(account_no)` constraint ensuring 1 FD per savings account.
  - Right Column: Annotated SQL snippet of `ProcessFDInterest()` showing cursor declaration, loop, and interest payout calculation.
- **Slide Bullet Points:**
  - **Strict Relational Domain Constraints:**
    - Implemented `FIXED_DEPOSIT` schema with foreign key linkage to `SAVINGS_ACCOUNT`.
    - Enforced the business rule of exactly one active FD per savings account via candidate key constraint: `UNIQUE KEY uq_fd_account_no (account_no)`.
  - **Advanced Stored Procedure with Cursors (`database/procedures.sql`):**
    - Authored `ProcessFDInterest()`: Uses a procedural MySQL cursor (`DECLARE cur CURSOR FOR ...`) to iterate across all active fixed deposits due for payment.
    - Calculates term interest dynamically based on plan interest rates: `(investment * rate / (100 * 12))`.
    - Executes atomic credits to the linked savings account and logs transaction records using loop constructs (`WHILE`).
  - **Efficiency Advantage:**
    - Executes bulk interest distribution directly within the database engine memory, avoiding thousands of individual network round-trips from the backend.
- **Verbal Defense Script (What Dinisiru says):**
  > *"For my core database contribution, I designed the Fixed Deposit architecture and procedural logic. We enforce the banking rule of '1 FD per savings account' using a database-level `UNIQUE` constraint, which guarantees data consistency even if application code fails.
  > 
  > To handle periodic interest calculation, I developed the stored procedure `ProcessFDInterest()`. It uses a MySQL cursor to iterate over active FDs, calculates the exact monthly payout using tenure interest rates, and automatically credits the linked savings accounts. Because this runs as precompiled procedural SQL inside the DBMS, it minimizes network latency and ensures high execution speed."*
- **Expected TA Questions & Answers:**
  - **Q: Why use a Cursor in a Stored Procedure instead of a simple `UPDATE ... JOIN` statement?**
    - **A:** *"While a set-based `UPDATE` can adjust balances, an interest payout requires two distinct operations per deposit: updating the savings balance AND inserting an individual audited record into the `TRANSACTION` ledger with unique metadata and payout dates. A cursor allows row-by-row procedural orchestration with exception handling for each individual account."*

### Slide 2: Real-Time Dynamic Views (`vw_fd_status`) & Agent Portfolio Isolation
- **Course Mapping:** CS3042 Intermediate SQL (Views, Outer Joins), Chapter 9 (Row-Level Security).
- **Slide Layout:**
  - Left Column: `vw_fd_status` SQL query breakdown showing `LEFT JOIN` and tenure month calculation (`TIMESTAMPDIFF`).
  - Right Column: Agent Portfolio interface showing assigned customer tree and 30-day cash drawer ledger.
- **Slide Bullet Points:**
  - **Dynamic Status View (`vw_fd_status`):**
    - Uses `LEFT JOIN` between `FIXED_DEPOSIT` and `FD_PLAN`.
    - Calculates accrued interest and maturity dynamically on read: `ROUND(investment * (interest_rate / (100 * 12)) * TIMESTAMPDIFF(MONTH, start_date, CURDATE()), 2)`.
    - Eliminates redundant storage of accumulated interest columns, preventing data synchronization anomalies.
  - **Agent Customer Isolation Querying (`backend/agent_reports.go`):**
    - Securely filters the customer book using `WHERE c.assigned_agent_person_id = ?`, providing row-level portfolio separation.
    - Powers the 30-Day Cash Drawer Ledger to give agents real-time reconciliation of transactions they personally authorized.
- **Verbal Defense Script (What Dinisiru says):**
  > *"On my second slide, I highlight our reporting views and agent portfolio features. I created `vw_fd_status`, which calculates accrued interest dynamically using `TIMESTAMPDIFF` based on current system time. This means we never have to store a stale 'accrued interest' field in our database tables.
  > 
  > In our backend, I built the agent portfolio handlers. By querying `CUSTOMER` filtered strictly by `assigned_agent_person_id`, each agent only sees their assigned clients. Furthermore, the 30-day ledger lets agents balance their cash drawer by querying transactions where `staff_person_id` matches their own identity."*
- **Expected TA Questions & Answers:**
  - **Q: Why is calculating accrued interest dynamically inside a view better than updating an 'accrued_interest' column every day?**
    - **A:** *"Updating a column daily requires a heavy write job that locks tables and generates write I/O. By computing it dynamically in a view on read, the value is always 100% accurate down to the current second without storing redundant or derivative data, maintaining proper 3NF normalization."*

---

## 3. Nethmi Dissanayake

### Slide 1: Teller Counter Cash Operations & Transaction Trigger Verification
- **Course Mapping:** CS3042 Introduction & Intermediate SQL (DML, Constraints), CS3043 Advanced SQL (Triggers).
- **Slide Layout:**
  - Left Column: Teller Counter UI (`agent/transfer`) showing autocomplete account lookup and Cash Deposit/Withdrawal options.
  - Right Column: Flow diagram of a counter transaction passing from the frontend through Go handler to the `before_transaction_insert` trigger.
- **Slide Bullet Points:**
  - **Teller Cash Operations (`backend/teller.go`):**
    - Implemented high-throughput cash deposits and withdrawals for walk-in branch customers.
    - Interacts directly with the `before_transaction_insert` database trigger: withdrawals exceeding available funds trigger a rollback and return descriptive error messages.
  - **Audited Financial Attribution:**
    - Every counter transaction explicitly sets `staff_person_id` to the logged-in agent, creating an immutable audit trail for internal compliance.
  - **Interactive User Experience:**
    - Designed real-time debounced account search and generated printable transaction receipts (`ReceiptModal`) with reference numbers and balance breakdowns.
- **Verbal Defense Script (What Nethmi says):**
  > *"For my first presentation topic, I developed the Branch Teller Counter operations. Walk-in customers interact with agents for cash deposits and withdrawals. In our implementation, every counter action writes an audited row to the `TRANSACTION` table with the authorized `staff_person_id`.
  > 
  > If an agent attempts to withdraw more cash than a customer's savings plan allows, our database trigger immediately raises an error and halts the transaction. On the frontend, I integrated real-time account search and printable receipt modals to provide customers with immediate proof of transaction."*
- **Expected TA Questions & Answers:**
  - **Q: How does your teller interface ensure that an agent doesn't deposit cash into an invalid or closed account?**
    - **A:** *"Before processing, our backend checks `SAVINGS_ACCOUNT.status = 'active'`. Furthermore, referential integrity via foreign key `account_no REFERENCES SAVINGS_ACCOUNT(account_no)` prevents writing transactions for non-existent accounts at the database engine level."*

### Slide 2: Autonomous Temporal Processing via MySQL Event Scheduler (`events.sql`)
- **Course Mapping:** CS3043 Advanced SQL (Event Scheduling & Database Administration), Chapter 9 (Application Security).
- **Slide Layout:**
  - Left Column: SQL script from `database/events.sql` showing `CREATE EVENT monthly_fd_interest_event`.
  - Right Column: Diagram showing autonomous execution inside MySQL without external cron services + Customer Settings security flow.
- **Slide Bullet Points:**
  - **Automated Recurring Database Event (`database/events.sql`):**
    - Configured MySQL Event Scheduler: `CREATE EVENT monthly_fd_interest_event ON SCHEDULE EVERY 1 MONTH STARTS '2026-11-01 00:00:00' DO CALL ProcessFDInterest();`.
    - **Fully Autonomous:** Operates entirely within the DBMS engine without requiring external operating system crons, third-party schedulers, or active web server connections.
  - **Customer Password Management & Security (`backend/auth_password.go`):**
    - Implemented `ChangePasswordHandler`: Verifies existing password with bcrypt before allowing updates.
    - Transparently re-encrypts passwords using bcrypt salt cost factor 10, ensuring database breach resistance.
  - **Assigned Agent Contact Mapping (`CustomerAgentInfoHandler`):**
    - Queries relational joins to connect customers with their relationship manager's branch and phone details.
- **Verbal Defense Script (What Nethmi says):**
  > *"On my second slide, I present our automated database scheduling and customer security features. We configured the MySQL Event Scheduler to run `monthly_fd_interest_event` on the first day of every month. This automatically executes our `ProcessFDInterest()` stored procedure inside the database engine, ensuring interest is credited on time without relying on an external server or cron script.
  > 
  > I also implemented the Customer Password Change system. It verifies the user's current password via bcrypt before updating the database, and ensures all newly stored credentials remain encrypted with standard salt hashing."*
- **Expected TA Questions & Answers:**
  - **Q: Why use the MySQL Event Scheduler instead of a Linux cron job or a Go ticker?**
    - **A:** *"A Linux cron job or application ticker introduces an external point of failure. If the application server crashes or restarts, scheduled tasks can be missed. The MySQL Event Scheduler runs inside the DBMS daemon itself, guaranteeing that as long as the database is online, scheduled business routines execute reliably."*

---

## 4. Vimukthi Senanayake

### Slide 1: Complex Relational Constraints & KYC Identity Registration
- **Course Mapping:** Chapter 7 (Entity-Relationship Model), CS3042 Intermediate SQL (Integrity Constraints & Cascading).
- **Slide Layout:**
  - Left Column: Self-referential ER diagram showing `CUSTOMER.guardian_person_id -> PERSON.person_id`.
  - Right Column: Form validation flow in `agent/customers/new` checking minor age (< 18) and requiring Guardian NIC.
- **Slide Bullet Points:**
  - **Recursive / Self-Referential Integrity Constraint:**
    - Designed `CUSTOMER` table with self-referential foreign key: `FOREIGN KEY (guardian_person_id) REFERENCES PERSON(person_id)`.
    - Models real-world child accounts where a dependent customer must be legally linked to a registered adult guardian.
  - **KYC Identity Registration Workflow (`backend/agent_customer.go`):**
    - Enforces legal banking regulations: If date of birth indicates age < 18, guardian verification is mandatory.
    - Wraps customer registration in a multi-table database transaction inserting into `USER_ACCOUNT`, `PERSON`, and `CUSTOMER`.
  - **Referential Integrity Defense:**
    - If a guardian NIC is invalid or non-existent in `PERSON`, foreign key constraints reject the insert, preventing phantom guardian references.
- **Verbal Defense Script (What Vimukthi says):**
  > *"For my first slide, I focus on relational constraints and customer KYC onboarding. In microbanking, opening accounts for minors requires strict legal guardianship. I modeled this using a self-referential foreign key constraint on `CUSTOMER.guardian_person_id` pointing back to `PERSON.person_id`.
  > 
  > When an agent registers a client, our backend calculates age from the birth date. If the applicant is under 18, our system requires a valid Guardian NIC. Because of our foreign key constraint, MySQL guarantees that no minor can ever be inserted without an adult guardian already verified and registered in the system."*
- **Expected TA Questions & Answers:**
  - **Q: What happens if a guardian record in `PERSON` is deleted?**
    - **A:** *"Because of our referential integrity rules, foreign key constraints prevent deleting an adult from `PERSON` if they are linked as a `guardian_person_id` for an active child account, preventing orphaned dependent accounts."*

### Slide 2: Advanced SQL Analytical Views (OLAP) & Executive Management Reports
- **Course Mapping:** CS3043 Advanced SQL (Views & Aggregations), Chapter 11 (Data Analytics & OLAP).
- **Slide Layout:**
  - Left Column: Matrix of the 5 reporting views with SQL aggregation functions (`SUM`, `COUNT`, `AVG`, `GROUP BY`).
  - Right Column: Screenshot of the Executive Reports Dashboard (`admin/reports`) with the CSV download feature.
- **Slide Bullet Points:**
  - **5 Core Executive Reporting Views (`database/views.sql`):**
    - `vw_agent_transaction_summary`: Aggregates total transactions and LKR volume per agent (`COUNT`, `SUM`, `GROUP BY s.person_id`).
    - `vw_account_transaction_summary`: Analyzes transaction velocity by account plan tier.
    - `vw_active_fd_payouts`: Projects upcoming monthly fixed deposit interest liabilities for liquidity planning.
    - `vw_monthly_interest_by_account_type`: Breaks down bank interest expenses across plan categories.
    - `vw_customer_activity`: Tracks transaction counts and client engagement levels.
  - **Analytical Performance & CSV Export (`backend/reports.go`):**
    - Precalculates aggregations inside database views, drastically reducing API response times.
    - Implemented dynamic streaming CSV export for external banking audits.
- **Verbal Defense Script (What Vimukthi says):**
  > *"On my second slide, I present our executive management analytics and reporting views. To provide leadership with business intelligence without degrading transaction performance, I designed 5 analytical database views.
  > 
  > These views perform multi-table joins and aggregation functions like `SUM`, `COUNT`, and `GROUP BY` directly inside the database engine. For example, `vw_agent_transaction_summary` calculates total transaction volume per agent for KPI evaluations, and `vw_active_fd_payouts` forecasts the bank's upcoming interest payout liabilities. Our admin dashboard queries these views directly and supports instant CSV export for auditing."*
- **Expected TA Questions & Answers:**
  - **Q: Why create separate views for reports instead of querying the raw tables directly in the backend?**
    - **A:** *"Encapsulating complex analytical aggregations in database views simplifies application code, allows the MySQL query optimizer to cache and reuse execution plans, and enables strict role-based access control where managers can read summary metrics without accessing sensitive row-level personal data."*

