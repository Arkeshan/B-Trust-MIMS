# Backend

Go service using standard net/http and go-sql-driver/mysql.
Handles authentication, customer accounts, transfers, staff counter operations, fixed deposits, and reports.

Runs on port 8080 (or PORT env). Connects to MySQL using config from .env with parseTime=true&loc=Local.

## Endpoints

- GET / - Health check (Arkeshan)
- POST /api/auth/login - User login with bcrypt and 2FA trigger (Achira, Vimukthi, Arkeshan)
- POST /api/auth/otp/verify - Verify 6-digit OTP and create authenticated session (Arkeshan)
- POST /api/auth/otp/resend - Resend 2FA verification code with 5-minute cooldown (Arkeshan)
- POST /api/auth/password/change - Change password for authenticated customer (Nethmi)
- POST /api/auth/logout - User logout, deletes session from DB and clears cookie (Arkeshan)
- GET /api/customer/accounts - List savings accounts for logged in user (Arkeshan)
- GET /api/customer/agent - Retrieve contact details for customer's assigned agent (Nethmi)
- GET /api/customer/profile - Retrieve customer personal details and profile (Arkeshan)
- GET /api/account/lookup?account_no= - Lookup account holder name with masking (Arkeshan)
- POST /api/customer/transfer - Fund transfer between accounts, ACID transaction (Arkeshan)
- POST /api/txn/deposit - Teller deposit (Arkeshan)
- POST /api/txn/withdraw - Teller withdrawal (Arkeshan)
- POST /api/fd/open - Open a new fixed deposit (Dinisuru)
- POST /api/fd/new - Agent endpoint to open a fixed deposit (Dinisuru)
- GET /api/fd/list - List fixed deposits (Dinisuru)
- GET /api/fd/status/{id} - Get status of a fixed deposit (Dinisuru)
- POST /api/cron/interest - Manually run the interest payout procedure (Dinisuru)
- GET /api/reports/{type} - Get report data (agents, accounts, fds, monthly-interest, customers) (Vimukthi)
- GET /api/agent/plans - List savings account plans (Arkeshan)
- GET /api/agent/lookup?nic= - Quick customer lookup by NIC for teller counter (Arkeshan)
- GET /api/agent/customer/search?nic=&username= - Unified search: Guardian-aware NIC search for savings origination (Arkeshan) and username search for FD origination (Dinisuru)
- POST /api/agent/customer/register - Register new customer identity with minor/guardian verification (Vimukthi)
- POST /api/agent/account/open - Open a new savings account with atomic transaction (Arkeshan)
- GET /api/agent/stats - Transaction count and volume summary for assigned agent (Dinisuru)
- GET /api/agent/customers - List of customers and accounts assigned to agent (Dinisuru)
- GET /api/agent/ledger - 30-day transaction ledger for agent portfolio (Dinisuru)
- GET /api/agent/profile - Agent personal profile and branch assignment (Achira)
- GET /api/account/{id}/history - Full transaction history with pagination (Nimthara, Arkeshan)
- GET /api/account/{id}/history/recent - Last 7 days transactions (Achira)

## Files and Functions

### agent_account.go (Arkeshan)
- ListAccountPlansHandler: returns all plan tiers
- SearchCustomerByNICHandler: guardian-aware NIC search using UNION query
- OpenAccountHandler: creates savings account, links holders, processes initial deposit atomically
- generateAccountNo: sequential 12-char account generator (ACC%09d)

### agent_account_test.go (Arkeshan)
- Unit tests for date-of-birth arithmetic, leap-year calculations, and plan eligibility

### agent_customer.go (Vimukthi)
- RegisterCustomerHandler: registers customer identity in PERSON and CUSTOMER, validates 12-char NIC, links minor to guardian via self-referencing foreign key

### agent_lookup.go (Arkeshan)
- AgentCustomerLookupHandler: rapid lookup of customer name and accounts by NIC for teller operations

### agent_profile.go (Achira)
- AgentProfileHandler: retrieves active agent details, branch information, and employee role

### agent_reports.go (Dinisuru)
- AgentStatsHandler: calculates agent portfolio KPI metrics (total volume, transaction count)
- AgentCustomersHandler: retrieves accounts belonging to customers assigned to active agent
- AgentLedgerHandler: queries 30-day chronological transaction ledger for agent view

### account.go (Arkeshan, Nimthara)
- CustomerAccountsHandler: returns accounts belonging to authenticated customer
- AccountHolderLookupHandler: validates recipient account and masks holder name (e.g. J*** D***)
- AccountHistoryHandler: paginated account transaction list
- maskName: helper to mask names

### auth.go (Achira, Vimukthi, Arkeshan)
- LoginHandler: checks username and password against db using bcrypt, triggers 2FA for admin accounts, sets session
- LogoutHandler: deletes active session from USER_SESSION and expires session_id cookie
- getAuthenticatedUser: reads session token from header or cookie
- generateSessionToken: crypto/rand session token generator

### auth_password.go (Nethmi)
- ChangePasswordHandler: validates old password with bcrypt and updates to new password hash

### customer_agent.go (Nethmi)
- CustomerAgentInfoHandler: retrieves assigned agent contact card for customer dashboard

### customer_profile.go (Arkeshan)
- CustomerProfileHandler: retrieves full customer profile, demographics, and account summary

### otp.go (Arkeshan)
- SendEmailOTP: dual-channel OTP dispatch (Resend HTTPS API over port 443 + standard SMTP fallback + server console audit logging)
- sendViaResend: delivers HTML verification emails over HTTPS to bypass cloud SMTP port 587 firewall blocks
- CreateOTP: cryptographically secure 6-digit OTP generation, hashed in OTP_TOKEN table with 5-minute database expiry
- VerifyOTPHandler: validates temp_token and 6-digit code, issues authenticated admin session
- ResendOTPHandler: enforces strict 5-minute cooldown before regenerating verification codes

### fd.go / agent_fd.go (Dinisuru)
- OpenFDHandler / AgentOpenFDHandler: creates new fixed deposit linked to savings account
- ListFDHandler: lists all FDs with terms and dates
- FDStatusHandler: returns FD progress from vw_fd_status
- CronInterestHandler: calls ProcessFDInterest stored procedure

### reports.go (Vimukthi)
- ReportsHandler: maps report type to SQL views and returns json data (supports CSV export)
- reportTypeFromPath: helper to grab report name from URL
- rowsToMaps: helper to convert sql rows to map slice

### savings.go (Achira)
- RecentHistoryHandler: queries vw_recent_txn for past 7 days transactions

### transfer.go (Arkeshan)
- CustomerTransferHandler: atomic transfer between two accounts. Locks source row with FOR UPDATE, inserts withdrawal (trigger validates balance), inserts deposit, returns transfer reference
- generateTransferRef: generates unique TRF... reference number

### txn.go (Arkeshan)
- ProcessTransaction: counter deposit/withdrawal for staff, uses DB triggers for balance calculations

### main.go (Arkeshan, Achira)
- enableCORS: CORS middleware with dynamic FRONTEND_URL cloud origin support
- requireAdmin: role-guard middleware ensuring only active admin sessions can access management reports
- main: db setup with dynamic TLS for cloud MySQL (Aiven), route registration, sub-path dispatcher for /api/account/ routes, dev user seeding, dynamic $PORT binding for Render deployment

## Running

```bash
go run .
```
