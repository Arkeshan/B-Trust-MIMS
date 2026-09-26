# Database

MySQL 8.0 schema and objects for B-Trust MIMS.
Uses InnoDB for ACID compliance, foreign keys, row locking, and triggers.

## Tables (schema.sql)

- USER_ACCOUNT: login credentials, bcrypt password hash, roles (customer, staff, admin) - Arkeshan
- PERSON: personal details (name, phone, address) - Achira
- BRANCH: bank branches - Dinisuru
- ACCOUNT_PLAN: savings plans, min balance, interest rates - Nimthara
- FD_PLAN: fixed deposit plans (6, 12, 36 months) - Sathika
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

- vw_login_auth: user credentials, password hash, role, status for login verification - Sathika
- vw_agent_transaction_summary: count and volume of transactions per agent - Sathika
- vw_account_transaction_summary: summary of deposits, withdrawals, interest per account - Sathika
- vw_active_fd_payouts: active FDs due for payout - Sathika
- vw_monthly_interest_by_account_type: interest payouts grouped by account type - Sathika
- vw_customer_activity: deposit/withdrawal totals per customer - Sathika
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

### monthly_fd_interest_event (Nimthara)
Runs every 1 month to execute ProcessFDInterest().

## Indexes (indexes.sql) (Achira)

- idx_user_account_username on USER_ACCOUNT(username)
- idx_user_account_email on USER_ACCOUNT(email)
- idx_user_account_type_status on USER_ACCOUNT(type, status)
- idx_savings_account_status on SAVINGS_ACCOUNT(status)
- idx_customer_username on CUSTOMER(username)
- idx_staff_username on STAFF(username)

## Seeds (seed_accounts.sql, seed_auth.sql) (Arkeshan)

Initial test data: branches, staff, customers (including joint accounts), FDs, and sample transactions.
