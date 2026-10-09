# B-Trust Microbanking and Interest Management System (MIMS)

Enterprise banking solution featuring customer internet banking, staff/agent counter operations, and admin reporting dashboards.

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide Icons
- **Backend:** Go 1.24+, MySQL standard driver, shopspring/decimal
- **Database:** MySQL 8.0 (InnoDB, ACID transactions, stored procedures, triggers, views)
- **Containerization:** Docker & Docker Compose

## Live Cloud Deployment
- **Frontend Portal (Vercel):** [https://btrust2.vercel.app](https://btrust2.vercel.app)
- **Backend REST API (Render):** [https://btrust-backend.onrender.com](https://btrust-backend.onrender.com)
- **Database (Aiven Cloud):** MySQL 8.0 Cloud Cluster with TLS Encryption

## Documentation & Viva Study Resources
- **Master Viva Defense Guide (Arkeshan):** [ARKESHAN_VIVA_MASTER_GUIDE.md](./ARKESHAN_VIVA_MASTER_GUIDE.md) — Comprehensive technical architecture, full implementation code, triggers, ACID flows, and 60+ expected viva Q&As.
- **Admin 2FA Security Report:** [arkeshan_final_implementation_report.md](./arkeshan_final_implementation_report.md)
- **Agent Portal Architecture Plan:** [Agent_Portal_Assignments.md](./Agent_Portal_Assignments.md)
- **Project Team Matrix:** [CONTRIBUTORS.md](./CONTRIBUTORS.md)

## Quick Start (Local Docker Containerization)

Run the entire bank stack (Database + Backend + Frontend) with a single command:

```bash
docker-compose up -d
```

### Services & Local Ports:
- **Frontend Portal:** [http://localhost:3000](http://localhost:3000)
- **Backend REST API:** [http://localhost:8080](http://localhost:8080)
- **MySQL Database:** `localhost:3307` (user: `root`, database: `btrust`)

### Default Test Credentials:
- **Admin Login:** `admin` / `Arkeshan2004` (requires 2FA OTP verification code)
- **Agent Login:** `agent_achira` / `password123`
- **Customer Login:** `cust_1` / `pass1` (has active Fixed Deposit)

To stop all containers:
```bash
docker-compose down
```

---

## Architecture & Project Structure
- `/frontend` - Next.js client pages (Customer portal, Agent portal, Admin reports, Login)
- `/backend` - Go net/http RESTful microbanking backend service
- `/database` - MySQL schema, triggers, views, stored procedures, and seed datasets

## Progress Summary
- [x] Core Authentication & Session Management (Customer, Staff, Admin)
- [x] Admin Two-Factor Authentication (Email OTP with 5-minute cooldown & persistent timer)
- [x] Safe Admin Logout (Cookie invalidation + database session removal)
- [x] Customer Dashboard & Account Services (Savings, Transfers, masked holder lookup)
- [x] Customer FD View-Only Mode (Restricted from originating FDs online, redirected to agents)
- [x] Agent Portal Module 1: Layout Shell & Navigation
- [x] Agent Portal Module 3: Account Origination & Association (Adult, Child, Teen, Senior, Joint accounts with decimal transactions)
- [x] Admin Reports Dashboard (5 Management Views & CSV Export)
- [x] Full Docker Containerization for MySQL, Go Backend, and Next.js Frontend
- [x] Tri-Cloud Production Deployment (Aiven MySQL + Render Go API + Vercel Next.js)
- [x] Resend HTTPS Email Dispatch (Firewall-immune OTP delivery over port 443)

## Recent Updates

### October 8–9, 2026 (Arkeshan)
- **Customer Search Route Unification:** Resolved a critical route collision on `/api/agent/customer/search` by implementing unified query parameter routing (supporting both `?nic=` for Guardian-aware savings account origination and `?username=` for Fixed Deposit origination) in `backend/agent_fd.go`.
- **Cross-Origin Auth & CORS Hardening:** Updated `GetStaffPersonID` in `backend/auth.go` to prioritize `Authorization: Bearer <session_id>` headers over cookies, eliminating cross-domain authentication drops between Vercel and Render. Cleaned up redundant hardcoded localhost CORS headers so `enableCORS` serves `btrust2.vercel.app` dynamically.
- **Cloud Architecture Deployment:** Successfully migrated database to **Aiven Cloud MySQL**, containerized the backend on **Render.com**, and deployed the frontend to **Vercel** (`btrust2.vercel.app`).
- **Resend HTTPS OTP Integration:** Implemented HTTPS API email dispatch in `backend/otp.go` to bypass cloud firewall blocks on SMTP port 587, delivering verification codes directly to admin Gmail inboxes.
- **Root URL Auto-Redirect:** Added server-side auto-redirect from `/` to `/login` with zero client-side latency.
- **Resilient Cloud Error Handling:** Sanitized `BACKEND_URL` rewrite proxying and hardened login UI against raw `<!DOCTYPE` syntax errors during cold backend starts.

### October 6, 2026 (Arkeshan)
- **Admin Email OTP 2FA, Rate Limiting, and Safe Logout** implemented by **Arkeshan**.
- Detailed implementation report available in [arkeshan_final_implementation_report.md](./arkeshan_final_implementation_report.md).

