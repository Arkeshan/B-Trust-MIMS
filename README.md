# B-Trust Microbanking and Interest Management System (MIMS)

Enterprise banking solution featuring customer internet banking, staff/agent counter operations, and admin reporting dashboards.

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide Icons
- **Backend:** Go 1.24+, MySQL standard driver, shopspring/decimal
- **Database:** MySQL 8.0 (InnoDB, ACID transactions, stored procedures, triggers, views)
- **Containerization:** Docker & Docker Compose

## Quick Start (Docker Containerization)

Run the entire bank stack (Database + Backend + Frontend) with a single command:

```bash
docker-compose up -d
```

### Services & Ports:
- **Frontend Portal:** [http://localhost:3000](http://localhost:3000)
- **Backend REST API:** [http://localhost:8080](http://localhost:8080)
- **MySQL Database:** `localhost:3307` (user: `root`, database: `btrust`)

### Default Test Credentials:
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
- [x] Customer Dashboard & Account Services (Savings, Transfers, masked holder lookup)
- [x] Customer FD View-Only Mode (Restricted from originating FDs online, redirected to agents)
- [x] Agent Portal Module 1: Layout Shell & Navigation
- [x] Agent Portal Module 3: Account Origination & Association (Adult, Child, Teen, Senior, Joint accounts with decimal transactions)
- [x] Full Docker Containerization for MySQL, Go Backend, and Next.js Frontend


## Recent Updates (October 6, 2026)
- **Admin Email OTP 2FA, Rate Limiting, and Safe Logout** implemented by **Arkeshan**.
- Detailed implementation report available in [arkeshan_final_implementation_report.md](./arkeshan_final_implementation_report.md).

