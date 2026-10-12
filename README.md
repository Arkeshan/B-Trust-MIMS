# B-Trust Microbanking and Interest Management System (MIMS)

Microbanking and interest management web application supporting customer internet banking, agent counter operations, and admin reporting.

## System Architecture

```text
                           [ Client Web Browser ]
                                     │
                               HTTPS (Port 443)
                                     ▼
                      [ Nginx Reverse Proxy & SSL ]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │ HTTP (Port 3000)                                  │ HTTP (Port 8080)
           ▼                                                   ▼
[ Next.js 16 Frontend ]                           [ Go REST API Backend ]
(Customer, Agent, Admin UI)                       (Authentication, Business Logic)
                                                               │
                                                               │ TCP (Port 3306)
                                                               ▼
                                                       [ MySQL 8.0 Database ]
                                                (Triggers, Procedures, Views, Events)
```

## Team Contributions

| Team Member | Role / Responsibilities |
| :--- | :--- |
| **Arkeshan S** | System architecture, database schema, transaction triggers, account origination, fund transfers, admin 2FA, Docker setup |
| **Achira Ayomal** | Agent portal shell, person identity schema, database indexing, authentication, recent transactions |
| **Dinisiru Sangadith** | Fixed deposit management, interest calculation stored procedure, agent portfolio, 30-day ledger |
| **Nethmi Dissanayake** | Teller counter operations, interest distribution event scheduler, customer settings, password management |
| **Vimukthi Senanayake** | Customer registration and guardian verification, admin reporting views, CSV export |

### Individual Contributions Breakdown

#### Arkeshan S
- **Database:** Designed core tables (`SAVINGS_ACCOUNT`, `ACCOUNT_HOLDER`, `TRANSACTION`, `STAFF`, `CUSTOMER`, `USER_ACCOUNT`, `USER_SESSION`). Implemented `before_transaction_insert` trigger for balance updates, overdraft prevention, and minimum balance checks.
- **Backend:** Implemented internal fund transfer handler (`CustomerTransferHandler`) with transaction rollbacks and reference generation. Implemented counter transaction execution (`ProcessTransaction`). Built account origination endpoint (`OpenAccountHandler`) with account number generation. Implemented admin email OTP 2FA with rate limiting.
- **Frontend:** Customer transfer page with recipient lookup and receipt display. Agent account origination form (adult, child, senior, joint accounts).
- **Deployment:** Docker and Docker Compose configuration with Nginx reverse proxy. Deployment setup for Vercel, Render, and Aiven MySQL.

#### Achira Ayomal
- **Database:** `PERSON` table schema for personal records. Database indexing on lookup columns (`idx_username`, `idx_email`, `idx_account_no`). Rolling transaction view `vw_recent_txn`.
- **Backend:** Login handler (`LoginHandler`) with bcrypt authentication and password validation. Staff ID resolution helper (`GetStaffPersonID`). 7-day rolling transaction history handler (`RecentHistoryHandler`).
- **Frontend:** Agent portal layout and sidebar navigation (`agent/layout.tsx`). Agent header with session display and logout. Customer recent transaction history component.

#### Dinisiru Sangadith
- **Database:** `FIXED_DEPOSIT` and `BRANCH` table schemas. Stored procedure `ProcessFDInterest()` using cursors for 30-day interest calculation. Fixed deposit status view `vw_fd_status`.
- **Backend:** Fixed deposit endpoints (`OpenFDHandler`, `ListFDHandler`, `FDStatusHandler`, `CronInterestHandler`). Agent reporting endpoints (`AgentCustomersHandler`, `AgentLedgerHandler`, `AgentStatsHandler`).
- **Frontend:** Agent fixed deposit creation form (`agent/fd/new`). Agent portfolio page with customer account tree, 30-day transaction ledger, and summary KPI cards.

#### Nethmi Dissanayake
- **Database:** `ACCOUNT_PLAN` table schema. Scheduled event `monthly_fd_interest_event` for monthly interest processing. Interest transaction type handling in triggers.
- **Backend:** Account history retrieval (`AccountHistoryHandler`). Password change handler (`ChangePasswordHandler`) with bcrypt validation. Assigned agent contact lookup (`CustomerAgentInfoHandler`).
- **Frontend:** Agent teller counter page (`agent/transfer`) with account lookup and printable transaction receipt modal. Customer settings page (`customer/settings`) for password updates. Customer dashboard navigation.

#### Vimukthi Senanayake
- **Database:** `FD_PLAN` table schema. Management reporting views (`vw_agent_transaction_summary`, `vw_account_transaction_summary`, `vw_active_fd_payouts`, `vw_monthly_interest_by_account_type`, `vw_customer_activity`).
- **Backend:** Customer registration handler (`RegisterCustomerHandler`) with age check and guardian validation. Admin reports handler (`ReportsHandler`) with data aggregation and CSV export streaming.
- **Frontend:** Agent customer registration form (`agent/customers/new`) with guardian field toggling for minors. Admin reports dashboard (`admin/reports`) with 5 reporting tabs and CSV download.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Go 1.24+ (`net/http`, `database/sql`, `shopspring/decimal`, `golang.org/x/crypto/bcrypt`)
- **Database:** MySQL 8.0 (InnoDB, Triggers, Views, Stored Procedures, Events)
- **Infrastructure:** Docker, Docker Compose, Nginx
- **Cloud Hosting:** Vercel (Frontend), Render (Backend), Aiven Cloud (MySQL)

## Getting Started

### Local Setup with Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/Arkeshan/B-Trust-MIMS.git
   cd B-Trust-MIMS
   ```

2. Build and run containers:
   ```bash
   docker compose up --build
   ```

3. Open the application:
   - http://localhost:3000/

To reset the database with seed data:
```bash
docker compose down -v
docker compose up --build
```

### Cloud Deployment

- Frontend: https://btrust2.vercel.app
- Backend API: https://b-trust-mims-backend.onrender.com
- Database: Managed MySQL 8.0 on Aiven Cloud

### Manual Setup (Without Docker)

1. Start MySQL 8.0 and run the SQL scripts in `database/` in sequential order (`schema.sql` through `events.sql`).
2. Start backend:
   ```bash
   cd backend
   go run .
   ```
3. Start frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Demo Credentials

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Arkeshan2004` | Prompts for 6-digit email OTP |
| **Agent (Batticaloa)** | `agent_achira` | `password123` | Assigned to Amal A & Nayana F |
| **Agent (Trincomalee)** | `agent_ark` | `password123` | Assigned to Bimal B & Kasun G |
| **Agent (Ampara)** | `agent_dinisiru` | `password123` | Assigned to Chathura C & Ruwan H |
| **Agent (Batticaloa)** | `agent_nethmi` | `password123` | Assigned to Dilani D & Sandun I |
| **Agent (Trincomalee)** | `agent_vimukthi` | `password123` | Assigned to Eranga E & Thilina J |
| **Customer** | `cust_1` | `pass1` | Has active savings and fixed deposit accounts |
| **Customer** | `cust_2` | `pass2` | Has active savings account |

## API Endpoints

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user (initiates 2FA for admin) | Public |
| `POST` | `/api/auth/otp/verify` | Verify admin 2FA OTP | Admin |
| `POST` | `/api/auth/otp/resend` | Resend 2FA verification code (5-min cooldown) | Admin |
| `POST` | `/api/auth/password/change` | Change customer account password | Authenticated |
| `POST` | `/api/auth/logout` | Terminate active session | Authenticated |
| `GET` | `/api/customer/accounts` | Fetch customer accounts and balances | Customer |
| `GET` | `/api/account/lookup?account_no=` | Lookup recipient account holder name with masking | Customer |
| `POST` | `/api/customer/transfer` | Fund transfer between savings accounts (ACID) | Customer |
| `GET` | `/api/account/:id/history` | Paginated transaction history for account | Customer |
| `GET` | `/api/account/:id/history/recent` | 7-day rolling transaction history | Customer |
| `GET` | `/api/customer/agent` | Fetch assigned agent contact details | Customer |
| `GET` | `/api/customer/profile` | Fetch customer profile information | Customer |
| `POST` | `/api/agent/customer/register` | Register customer identity (KYC with guardian) | Agent |
| `GET` | `/api/agent/customer/search?nic=` | Guardian-aware customer NIC prefix search | Agent |
| `GET` | `/api/agent/plans` | Fetch savings account plan tiers and minimums | Agent |
| `POST` | `/api/agent/account/open` | Open savings account with initial deposit | Agent |
| `POST` | `/api/fd/open` | Open fixed deposit linked to savings account | Agent |
| `GET` | `/api/fd/list` | List active fixed deposit contracts | Agent |
| `GET` | `/api/fd/status/:id` | Retrieve progress and maturity of fixed deposit | Agent |
| `POST` | `/api/cron/interest` | Trigger interest calculation procedure | Agent |
| `POST` | `/api/txn/deposit` | Process counter deposit (updates via trigger) | Agent |
| `POST` | `/api/txn/withdraw` | Process counter withdrawal (checks min balance) | Agent |
| `GET` | `/api/agent/lookup?nic=` | Quick customer lookup by NIC for counter ops | Agent |
| `GET` | `/api/agent/customers` | Fetch assigned customers and accounts | Agent |
| `GET` | `/api/agent/ledger` | 30-day transaction ledger for agent | Agent |
| `GET` | `/api/agent/stats` | Transaction count and volume summary | Agent |
| `GET` | `/api/agent/profile` | Retrieve agent profile and branch assignment | Agent |
| `GET` | `/api/reports/:type` | Management reports (agents, accounts, FDs, CSV) | Admin |

## Database Components

- **Trigger (`before_transaction_insert`):** Validates balance and minimum balance constraints on withdrawals, and updates account balance atomically on deposits and withdrawals.
- **Stored Procedure (`ProcessFDInterest`):** Calculates and credits monthly interest for active fixed deposits.
- **Event (`monthly_fd_interest_event`):** Runs interest calculation on a monthly schedule.
- **Views:** Predefined reporting views for agent performance, account summary, active FD payouts, and customer activity.
