# B-Trust Microbanking and Interest Management System (MIMS)

> **CS3043 — Database Systems Project**  
> An enterprise-grade microbanking solution featuring Customer Internet Banking, Agent Branch Counter Operations, and Executive Management Reporting powered by a resilient, ACID-compliant MySQL database engine.

---

## 🏛️ System Architecture

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
[ Next.js 16 Frontend Portal ]                    [ Go REST API Backend ]
(Customer, Agent, Admin UI)                       (Authentication, Business Logic)
                                                               │
                                                               │ TCP (Port 3306)
                                                               ▼
                                                  [ MySQL 8.0 InnoDB Database ]
                                                  (Triggers, Procedures, Views, Events)
```

---

## 👥 Team Members & Project Contributions

| Student Name | Primary Modules & Responsibilities |
| :--- | :--- |
| **Arkeshan S** *(Lead)* | System Architecture, Core Schema & ACID Triggers, Account Origination, Internal Transfers, Admin 2FA OTP, Docker & Cloud Deployment |
| **Achira Ayumal** | Agent Portal Shell & Secure Session Mapping, Identity Person Models, DB Indexing, Recent Transaction Engine |
| **Dinisiru Sangadith** | Fixed Deposit Management, Stored Procedures & Cursors, Agent Portfolio & 30-Day Cash Drawer Ledger |
| **Nethmi Dissanayake** | Teller Counter Operations, Automated Event Scheduling, Customer Settings & Password Security |
| **Vimukthi Senanayake** | Customer KYC Registration & Minor Validation, Executive Management Reports Dashboard & Reporting Views |

### Detailed Individual Contributions

#### 1. Arkeshan S
- **Database Engine:** Designed the core normalized relational schema (`SAVINGS_ACCOUNT`, `ACCOUNT_HOLDER`, `TRANSACTION`, `STAFF`, `CUSTOMER`, `USER_ACCOUNT`, `USER_SESSION`). Authored the mission-critical `before_transaction_insert` ACID trigger enforcing overdraft prevention, minimum balance rules, and atomic running balance calculations.
- **Backend (Go):** 
  - Implemented atomic customer transfers (`CustomerTransferHandler`) with dual-entry ledger accounting, transaction rollbacks, and unique reference code generation.
  - Developed walk-in counter transaction processing (`ProcessTransaction`).
  - Built the multi-holder Account Origination engine (`OpenAccountHandler`) featuring unique account number generation and atomic customer-account associations.
  - Implemented the Admin Two-Factor Authentication (2FA) system with rate limiting, secure cookie sessions, and HTTPS email OTP dispatch.
- **Frontend (Next.js):** Built the Customer Fund Transfer portal with recipient name masking and printable receipts; developed the multi-step Agent Account Origination wizard for Adult, Child, Teen, Senior, and Joint accounts.
- **DevOps & Cloud:** Configured full Docker & Docker Compose containerization with Nginx reverse proxy; deployed and orchestrated the hybrid production cloud architecture (Vercel + Render + Aiven Cloud MySQL with TLS).

#### 2. Achira Ayumal
- **Database Engine:** Designed the centralized `PERSON` table schema for unified identity management; created database indexes (`idx_username`, `idx_email`, `idx_account_no`) for query optimization; created the rolling transaction view `vw_recent_txn`.
- **Backend (Go):** Implemented core authentication (`LoginHandler`) with bcrypt hashing and transparent legacy password upgrading; authored the central staff identification resolver (`GetStaffPersonID`); developed the 7-day rolling transaction history handler (`RecentHistoryHandler`).
- **Frontend (Next.js):** Built the persistent Agent Portal Shell layout (`agent/layout.tsx`), sidebar navigation, session-aware `AgentHeader` with secure logout, and the customer 7-day transaction history component.

#### 3. Dinisiru Sangadith
- **Database Engine:** Designed the `FIXED_DEPOSIT` and `BRANCH` table structures with strict unique constraints; authored the `ProcessFDInterest()` stored procedure utilizing MySQL cursors for 30-day term interest calculations; created the `vw_fd_status` view.
- **Backend (Go):** Developed Fixed Deposit operations (`OpenFDHandler`, `ListFDHandler`, `FDStatusHandler`, `CronInterestHandler`); built the agent reporting endpoints (`AgentCustomersHandler`, `AgentLedgerHandler`, `AgentStatsHandler`).
- **Frontend (Next.js):** Developed the Agent Fixed Deposit Origination Wizard (`agent/fd/new`); built the comprehensive Agent Portfolio Dashboard featuring expandable customer account trees, the 30-Day Cash Drawer Ledger, and real-time transaction KPI metric bars.

#### 4. Nethmi Dissanayake
- **Database Engine:** Designed the `ACCOUNT_PLAN` table structure; authored `events.sql` establishing the recurring `monthly_fd_interest_event` via MySQL Event Scheduler; configured trigger logic for automated interest transactions.
- **Backend (Go):** Implemented customer transaction history retrieval (`AccountHistoryHandler`); authored the secure Customer Password Change handler (`ChangePasswordHandler`) with bcrypt hashing; created the customer assigned agent contact info endpoint (`CustomerAgentInfoHandler`).
- **Frontend (Next.js):** Developed the interactive Teller Counter (`agent/transfer`) with debounced account search and printable receipt modals (`ReceiptModal`); implemented the Customer Settings interface (`customer/settings`) and customer dashboard navigation cards.

#### 5. Vimukthi Senanayake
- **Database Engine:** Designed the `FD_PLAN` schema; authored 5 enterprise reporting views:
  - `vw_agent_transaction_summary` (Staff performance and total processed volume)
  - `vw_account_transaction_summary` (Activity grouped by account plan)
  - `vw_active_fd_payouts` (Upcoming Fixed Deposit interest liabilities)
  - `vw_monthly_interest_by_account_type` (Interest expense breakdowns)
  - `vw_customer_activity` (Customer engagement and transaction counts)
- **Backend (Go):** Developed the Customer KYC Registration handler (`RegisterCustomerHandler`) enforcing legal adult/guardian relationship constraints; built the Executive Reports handler (`ReportsHandler`) supporting tabular aggregation and dynamic CSV export streaming.
- **Frontend (Next.js):** Created the Agent Customer KYC Registration Wizard (`agent/customers/new`) featuring real-time age verification and conditional Guardian NIC requirements; built the executive Admin Reports Dashboard (`admin/reports`) with 5 analytical tabs and CSV download capabilities.

---

## 💻 Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Go 1.24+ (`net/http`, `database/sql`, `shopspring/decimal`, `golang.org/x/crypto/bcrypt`)
- **Database:** MySQL 8.0 (InnoDB, ACID Transactions, Triggers, Views, Stored Procedures, Scheduled Events)
- **Infrastructure:** Docker, Docker Compose, Nginx (Reverse Proxy & SSL Termination)
- **Cloud Deployments:** Vercel (Frontend), Render (Backend), Aiven Cloud (Managed MySQL with TLS)

---

## 🚀 Launch Instructions

### Option 1: Local Docker Stack (Recommended)

Run the complete bank system (Database + Backend + Frontend + Nginx Reverse Proxy) locally with Docker Compose:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Arkeshan/B-Trust-MIMS.git
   cd B-Trust-MIMS
   ```

2. **Set up the environment:**
   ```bash
   cp .env.example .env
   ```

3. **Start the containers:**
   ```bash
   docker compose up --build
   ```

4. **Access the application:**
   - **Secure Portal (via Nginx):** [https://localhost](https://localhost) *(accept self-signed SSL cert in browser)*
   - **Frontend Direct:** [http://localhost:3000](http://localhost:3000)
   - **Backend API Direct:** [http://localhost:8080](http://localhost:8080)
   - **MySQL Database:** `localhost:3307`

> [!TIP]
> **Clean Database Re-initialization:**
> If you want to wipe local data and re-run all seed files from scratch:
> ```bash
> docker compose down -v
> docker compose up --build
> ```

---

### Option 2: Live Cloud Deployment (Hybrid Cloud)

The system is continuously deployed and accessible online:

- **Frontend Portal (Vercel):** [https://btrust2.vercel.app](https://btrust2.vercel.app)
- **Backend REST API (Render):** [https://b-trust-mims-backend.onrender.com](https://b-trust-mims-backend.onrender.com)
- **Database (Aiven Cloud):** Managed MySQL 8.0 Cloud Cluster with TLS encryption

---

### Option 3: Manual Local Development (Without Docker)

1. **Database:** Start a local MySQL 8.0 server and execute the scripts in `database/` in numerical order (`schema.sql` through `events.sql`).
2. **Backend:**
   ```bash
   cd backend
   cp .env.example .env
   go run .
   ```
3. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 🔐 Demo Credentials

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Arkeshan2004` | Prompts for 6-digit Email OTP 2FA |
| **Agent (Batticaloa)** | `agent_achira` | `password123` | Assigned to Amal A & Nayana F |
| **Agent (Trincomalee)** | `agent_ark` | `password123` | Assigned to Bimal B & Kasun G |
| **Agent (Ampara)** | `agent_dinisiru` | `password123` | Assigned to Chathura C & Ruwan H |
| **Agent (Batticaloa)** | `agent_nethmi` | `password123` | Assigned to Dilani D & Sandun I |
| **Agent (Trincomalee)** | `agent_vimukthi` | `password123` | Assigned to Eranga E & Thilina J |
| **Customer** | `cust_1` | `pass1` | Active Savings & Active Fixed Deposit |
| **Customer** | `cust_2` | `pass2` | Active Savings Account |

---

## 📡 API Reference Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & issue session (or trigger 2FA for Admin) | None |
| `POST` | `/api/auth/logout` | Terminate session & clear cookies | Authenticated |
| `POST` | `/api/auth/otp/verify` | Verify 6-digit Admin 2FA OTP | Admin |
| `POST` | `/api/auth/password/change` | Secure customer/agent password change with bcrypt | Authenticated |
| `GET` | `/api/customer/accounts` | Fetch authenticated customer accounts & transaction history | Customer |
| `POST` | `/api/customer/transfer` | Atomic fund transfer between accounts with balance checks | Customer |
| `GET` | `/api/customer/agent` | Fetch assigned relationship agent contact details | Customer |
| `POST` | `/api/agent/customer/register` | KYC Customer Registration with age & guardian verification | Agent |
| `POST` | `/api/agent/account/open` | Open Savings Account with multi-holder association & deposit | Agent |
| `POST` | `/api/fd/open` | Open Fixed Deposit backed by active savings account | Agent |
| `POST` | `/api/txn/deposit` | Counter cash deposit processed by agent | Agent |
| `POST` | `/api/txn/withdraw` | Counter cash withdrawal with trigger-enforced balance checks | Agent |
| `GET` | `/api/agent/customers` | Fetch assigned customer portfolio with accounts and FDs | Agent |
| `GET` | `/api/agent/ledger` | 30-day cash drawer ledger of transactions executed by agent | Agent |
| `GET` | `/api/agent/stats` | KPI summary metrics (total count and value handled) | Agent |
| `GET` | `/api/reports/agents` | Executive management reports (Supports CSV export) | Admin |

---

## 🗄️ Database Architecture Highlights

1. **ACID Trigger (`before_transaction_insert`):**
   - Intercepts all incoming transactions (`deposit`, `withdrawal`, `interest`).
   - Validates that withdrawals do not breach minimum balance limits or cause overdrafts.
   - Recalculates and updates the account running balance atomically within the same transaction.
2. **Fixed Deposit Interest Stored Procedure (`ProcessFDInterest`):**
   - Runs a cursor loop across active Fixed Deposits.
   - Calculates monthly accrued interest based on plan tenure (6, 12, or 36 months).
   - Credits the payout directly into the linked savings account and logs a transaction row.
3. **Scheduled Events (`monthly_fd_interest_event`):**
   - Configured via MySQL Event Scheduler to automate periodic interest distribution on the 1st of every month.
4. **Normalized Relationship Management:**
   - Separates identity (`PERSON`), access credentials (`USER_ACCOUNT`), relationship banking (`CUSTOMER`), staff assignments (`STAFF`), and financial ledger entries (`TRANSACTION`).

---

## 📄 License
This project is developed for academic evaluation purposes under the **CS3043 Database Systems** module.
