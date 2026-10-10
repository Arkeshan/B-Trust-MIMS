# B-Trust Microbanking and Interest Management System (MIMS)

Enterprise banking solution featuring customer internet banking, staff/agent counter operations, and admin reporting dashboards.

## Architecture Diagram (Frontend → Backend → MySQL)
```text
[ Client Browser ] ──HTTPS──► [ Nginx Reverse Proxy (Port 443) ]
                                      │
[ Next.js Frontend (Port 3000) ] ◄────┘
                                      │ (API Routes)
[ Go REST API Backend (Port 8080) ] ◄─┘
                                      │
[ MySQL 8.0 Database (Port 3307) ] ◄──┘ (TCP 3306)

```

## Tech Stack

* **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide Icons
* **Backend:** Go 1.24+, MySQL standard driver, shopspring/decimal
* **Database:** MySQL 8.0 (InnoDB, ACID transactions, stored procedures, triggers, views)
* **Containerization:** Docker & Docker Compose (with Nginx)

## Live Cloud Deployment

* **Frontend Portal (Vercel):** [https://btrust2.vercel.app](https://btrust2.vercel.app)
* **Backend REST API (Render):** [https://btrust-backend.onrender.com](https://btrust-backend.onrender.com)
* **Database (Aiven Cloud):** MySQL 8.0 Cloud Cluster with TLS Encryption

## Documentation & Viva Study Resources
- **Master Viva Defense Guide (Arkeshan):** [ARKESHAN_VIVA_MASTER_GUIDE.md](./ARKESHAN_VIVA_MASTER_GUIDE.md) — Comprehensive technical architecture, full implementation code, triggers, ACID flows, and 60+ expected viva Q&As.
- **Admin 2FA Security Report:** [arkeshan_final_implementation_report.md](./arkeshan_final_implementation_report.md)
- **Agent Portal Architecture Plan:** [Agent_Portal_Assignments.md](./Agent_Portal_Assignments.md)
- **Project Team Matrix:** [CONTRIBUTORS.md](./CONTRIBUTORS.md)

## Prerequisites

* Docker Desktop (Running in background)
* Docker Compose
* Git
* Go 1.24+ and Node.js 20+ (Only required for local development without Docker)

## Quick Start (Local Docker Containerization)

Run the entire secure bank stack (Database + Backend + Frontend + Nginx) with a single command:

```bash
cp .env.example .env
docker-compose up --build

```

Access the secure portal at: **https://localhost**

### Default Login Credentials Table

| Role | Username | Password | Login Route |
| --- | --- | --- | --- |
| **Admin** | `admin_btrust` | `admin123` | `/admin/login` (Requires 2FA Email OTP) |
| **Agent** | `agent_achira` | `password123` | `/login` |
| **Agent** | `agent_ark` | `password123` | `/login` |
| **Customer** | `cust_1` | `pass1` | `/login` (Has active Fixed Deposit) |
| **Customer** | `cust_2` | `pass2` | `/login` |

## API Endpoints Reference

*See `/backend/README.md` for the full comprehensive list.*

* `POST /api/auth/login` - Authenticate user & trigger 2FA if admin
* `POST /api/auth/logout` - Terminate session & clear cookies
* `POST /api/auth/otp/verify` - Verify 6-digit Admin OTP
* `GET /api/customer/accounts` - View customer accounts & history
* `POST /api/fd/open` - Open a new fixed deposit
* `POST /api/customer/transfer` - Fund transfer between accounts (ACID)
* `GET /api/reports/agents` - View agent performance KPI reports

## Development Setup (Without Docker)

1. Start a local MySQL 8.0 instance.
2. Execute the SQL files in `database/` in chronological order (1-schema.sql to 7-events.sql).
3. Navigate to `/backend`, run `cp .env.example .env`, populate the variables, and start the API with `go run main.go`.
4. Navigate to `/frontend`, run `npm install`, and start the development server with `npm run dev`.

---

## Architecture & Project Structure

* `/frontend` Next.js client pages (Customer portal, Agent portal, Admin reports, Login)
* `/backend` Go net/http RESTful microbanking backend service
* `/database` MySQL schema, triggers, views, stored procedures, and seed datasets

## Progress Summary

* [x] Core Authentication & Session Management (Customer, Staff, Admin)
* [x] Admin Two-Factor Authentication (Email OTP with 5-minute cooldown & persistent timer)
* [x] Safe Admin Logout (Cookie invalidation + database session removal)
* [x] Customer Dashboard & Account Services (Savings, Transfers, masked holder lookup)
* [x] Customer FD View-Only Mode (Restricted from originating FDs online, redirected to agents)
* [x] Agent Portal Module 1: Layout Shell & Navigation
* [x] Agent Portal Module 3: Account Origination & Association (Adult, Child, Teen, Senior, Joint accounts with decimal transactions)
* [x] Admin Reports Dashboard (5 Management Views & CSV Export)
* [x] Full Docker Containerization for MySQL, Go Backend, and Next.js Frontend
* [x] Tri-Cloud Production Deployment (Aiven MySQL + Render Go API + Vercel Next.js)
* [x] Resend HTTPS Email Dispatch (Firewall-immune OTP delivery over port 443)

## Recent Updates

### October 8–9, 2026 (Arkeshan)

* **Customer Search Route Unification:** Resolved a critical route collision on `/api/agent/customer/search` by implementing unified query parameter routing (supporting both `?nic=` for Guardian-aware savings account origination and `?username=` for Fixed Deposit origination).
* **Cross-Origin Auth & CORS Hardening:** Updated `GetStaffPersonID` in `backend/auth.go` to prioritize headers over cookies, eliminating cross-domain drops.
* **Cloud Architecture Deployment:** Successfully migrated database to **Aiven Cloud MySQL**, containerized the backend on **Render.com**, and deployed the frontend to **Vercel** (`btrust2.vercel.app`).
* **Resend HTTPS OTP Integration:** Implemented HTTPS API email dispatch in `backend/otp.go` to bypass cloud firewall blocks on SMTP port 587.
* **Root URL Auto-Redirect:** Added server-side auto-redirect from `/` to `/login` with zero client-side latency.
* **Resilient Cloud Error Handling:** Sanitized `BACKEND_URL` rewrite proxying and hardened login UI against raw `<!DOCTYPE` syntax errors during cold backend starts.

### October 6, 2026 (Arkeshan)

* **Admin Email OTP 2FA, Rate Limiting, and Safe Logout** implemented by **Arkeshan**.
* Detailed implementation report available in 
[arkeshan_final_implementation_report.md]
(./arkeshan_final_implementation_report.md).
