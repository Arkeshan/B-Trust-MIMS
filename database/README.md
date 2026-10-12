# Database

MySQL 8.0 schema and objects for B-Trust MIMS.
Uses InnoDB for ACID compliance, foreign keys, row locking, and triggers.

## Tables (schema.sql)

- USER_ACCOUNT: login credentials, bcrypt password hash, roles (customer, staff, admin) - Arkeshan
- PERSON: personal details (name, phone, address) - Achira
- BRANCH: bank branches - Dinisuru
- ACCOUNT_PLAN: savings plans, min balance, interest rates - Nimthara
- FD_PLAN: fixed deposit plans (6, 12, 36 months) - Vimukthi
- STAFF: branch staff and agents - Arkeshan
- CUSTOMER: customers assigned to an agent - Arkeshan
- SAVINGS_ACCOUNT: savings accounts, balances, plan id - Arkeshan
- USER_SESSION: active login sessions - Arkeshan
- OTP_TOKEN: 2FA tokens - Arkeshan
- NOTIFICATION: user alerts - Arkeshan
- ACCOUNT_HOLDER: links person to account, supports joint accounts - Arkeshan
- FIXED_DEPOSIT: fixed deposit contracts with unique constraint on account_no (1 FD per savings account) - Dinisuru, Nimthara
- TRANSACTION: ledger for deposits, withdrawals, transfers, interest - Arkeshan

## Views (views.sql)

- vw_login_auth: user credentials, password hash, role, status for login verification - Vimukthi
- vw_agent_transaction_summary: count and volume of transactions per agent - Vimukthi
- vw_account_transaction_summary: summary of deposits, withdrawals, interest per account - Vimukthi
- vw_active_fd_payouts: active FDs due for payout - Vimukthi
- vw_monthly_interest_by_account_type: interest payouts grouped by account type - Vimukthi
- vw_customer_activity: deposit/withdrawal totals per customer - Vimukthi
- vw_fd_status: active FD details, elapsed months, interest earned so far - Dinisuru
- vw_recent_txn: transactions from the last 7 days - Achira

## Stored Procedures (procedures.sql)

### ProcessFDInterest() (Dinisuru, Arkeshan)
Cursor that iterates through active FDs where next_payout_date <= CURDATE().
- Calculates 30-day payout: investment * (rate / 100) * (30 / 365)
- Locks savings account with FOR UPDATE
- Inserts interest transaction (trigger updates savings balance)
- Updates FIXED_DEPOSIT next payout date and total interest paid
- Rollback on SQLEXCEPTION

## Triggers (triggers.sql)

### before_transaction_insert (Arkeshan, Nimthara)
Runs before insert on TRANSACTION.
- For withdrawals: checks current balance minus withdrawal against plan min_balance. Throws error 45000 if insufficient.
- Updates SAVINGS_ACCOUNT balance atomically.
- For deposits and interest: calculates new balance and updates SAVINGS_ACCOUNT.

## Events (events.sql)

### process_fd_interest_event (Nimthara)
Runs daily at midnight (00:00:00) to execute ProcessFDInterest().

## Indexes (indexes.sql, schema.sql) (Achira, Arkeshan)

### Secondary B+ Tree Indexes (indexes.sql)
- `idx_savings_account_no` on `SAVINGS_ACCOUNT(account_no)` - Fast balance and status lookup
- `idx_transaction_account_no` on `TRANSACTION(account_no)` - Accelerates ledger and transaction history queries
- `idx_person_id` on `PERSON(person_id)` - Rapid personal demographic joins
- `idx_customer_person_id` on `CUSTOMER(person_id)` - Customer profile and agent relationship resolution
- `idx_branch_id` on `BRANCH(branch_id)` - Branch routing and reporting lookups

### Unique Constraints & Natural Keys (schema.sql)
- `UNIQUE (username)` on `USER_ACCOUNT(username)`
- `UNIQUE (email)` on `USER_ACCOUNT(email)`
- `UNIQUE (account_no)` on `FIXED_DEPOSIT(account_no)` - Enforces regulatory rule: max 1 FD contract per savings account
- Composite Primary Key `(person_id, account_no)` on `ACCOUNT_HOLDER` - Enforces distinct holder mappings

## Seeds (seed_accounts.sql, seed_auth.sql) (Arkeshan)

Initial test database fixtures:
- **5 Bank Branches:** Batticaloa, Trincomalee, Ampara, Colombo, Kandy
- **5 Active Agents (2004 Birth Dates):** `agent_achira`, `agent_ark`, `agent_dinisiru`, `agent_nethmi`, `agent_vimukthi`
- **Customer Personas:** Across all 5 savings plan types (Children, Teen, Adult, Senior, Joint), linking minors to guardians
- **Financial Ledgers:** Active Fixed Deposits (6-month, 12-month) and sample deposit/withdrawal transactions

## Cloud Deployment (Aiven Cloud) (Arkeshan)

- Deployed on Aiven Cloud Managed MySQL 8.0 with SSL/TLS encryption.
- Fully compatible with cloud security restrictions (optimized `events.sql` to leverage Aiven's default-enabled event scheduler without requiring restricted `SUPER` / `SET GLOBAL` privileges).
