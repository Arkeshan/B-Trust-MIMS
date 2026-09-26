# Contributors

Notes on who worked on what across backend, database, and frontend.

## Arkeshan
- Backend:
  - transfer.go: atomic customer transfers (CustomerTransferHandler) with rollback and reference generation
  - txn.go: staff counter deposits and withdrawals (ProcessTransaction)
  - account.go: customer accounts list (CustomerAccountsHandler), recipient lookup with name masking (AccountHolderLookupHandler), maskName helper
  - auth.go: session token generation (generateSessionToken) and auth helper (getAuthenticatedUser)
  - main.go: timezone fix (loc=Local), route wiring, dev test user seeds
- Database:
  - triggers.sql: before_transaction_insert trigger for overdraft checks, minimum balance enforcement, balance update
  - schema.sql: core tables (SAVINGS_ACCOUNT, ACCOUNT_HOLDER, TRANSACTION, STAFF, CUSTOMER, USER_ACCOUNT, USER_SESSION)
  - seed_accounts.sql & seed_auth.sql: initial seed data (agents, branches, customers, FDs, transactions)
- Frontend:
  - app/customer/transfer/page.tsx: transfer form, account lookup with masked name, receipt view
  - app/agent/transfer/page.tsx: teller deposit and withdrawal page
  - fixes on savings page and reports display

## Dinisuru Sangadith
- Backend:
  - fd.go: OpenFDHandler, ListFDHandler, FDStatusHandler, CronInterestHandler
- Database:
  - procedures.sql: ProcessFDInterest() stored procedure (30-day payout formula and cursor)
  - views.sql: vw_fd_status view
  - schema.sql: BRANCH table and fixed deposit structure
- Frontend:
  - app/customer/fd/page.tsx: FD creation and listing
  - app/customer/fd/components/ActiveFD.tsx: active FD status card

## Nimthara
- Backend:
  - account.go: initial AccountHistoryHandler
- Database:
  - schema.sql: ACCOUNT_PLAN table
  - events.sql: monthly_fd_interest_event
  - triggers.sql: interest transaction type handling
- Frontend:
  - app/customer/dashboard/page.tsx: customer dashboard navigation cards
  - app/customer/savings/page.tsx: savings account overview and transaction table

## Sathika
- Backend:
  - reports.go: ReportsHandler for querying management views
  - auth.go: login response and session payload
- Database:
  - views.sql: 5 reporting views (vw_agent_transaction_summary, vw_account_transaction_summary, vw_active_fd_payouts, vw_monthly_interest_by_account_type, vw_customer_activity)
  - schema.sql: FD_PLAN table
- Frontend:
  - app/admin/reports/page.tsx: admin reporting dashboard with 5 tabs
  - app/login/page.tsx: login page improvements and role routing

## Achira Ayomal
- Backend:
  - auth.go: LoginHandler with bcrypt password check
  - savings.go: RecentHistoryHandler for 7-day rolling window
- Database:
  - schema.sql: PERSON table
  - indexes.sql: indexes for usernames, emails, account status
  - views.sql: vw_recent_txn view
- Frontend:
  - app/login/page.tsx: initial login form
  - components/SavingsHistory.tsx: 7-day transaction history component
