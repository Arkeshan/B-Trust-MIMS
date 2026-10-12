# Frontend

Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS 4.
Uses Lucide icons. Rewrites `/api/*` requests to the Go backend at `http://localhost:8080/api/*` via `next.config.ts`.

## Pages

- `/` (`app/page.tsx`) - Arkeshan
  Zero-latency server-side redirect to `/login` ensuring the base domain lands directly on the banking application.
- `/login` (`app/login/page.tsx`) - Achira, Vimukthi, Arkeshan
  Unified login portal with 2FA email verification modal:
  - Role-based redirects: customer -> `/customer/dashboard`, staff -> `/agent/dashboard`, admin -> `/admin/reports`
  - Two-Factor Authentication (OTP): 6-digit code validation with persistent 5-minute timer surviving page reloads
  - Resilient error handling: gracefully surfaces cloud cold-start states rather than raw JSON syntax errors
- `/customer/dashboard` (`app/customer/dashboard/page.tsx`) - Nimthara
  Main navigation cards for customer features with header Logout button (clears session and cookie).
- `/customer/savings` (`app/customer/savings/page.tsx`) - Nimthara, Arkeshan
  Auto-loads customer's accounts with dropdown switcher, balance display, transaction history table, and direct link to open an FD.
- `/customer/fd` (`app/customer/fd/page.tsx`) - Dinisuru, Nimthara, Arkeshan
  Open new fixed deposit with eligible account dropdown (filters out accounts that already have an FD), and view active FDs.
- `/customer/transfer` (`app/customer/transfer/page.tsx`) - Arkeshan
  3-row transfer form: recipient account lookup with masked name, balance check, transfer receipt with reference code.
- `/customer/settings` (`app/customer/settings/page.tsx`) - Nethmi
  Customer security management and password change modal.
- `/agent/layout.tsx` - Achira
  Agent portal shell with persistent sidebar navigation, branch badge, and session controls.
- `/agent/dashboard` (`app/agent/dashboard/page.tsx`) - Achira
  Agent dashboard with quick action cards for origination, counter, and portfolio lookup.
- `/agent/customers/new` (`app/agent/customers/new/page.tsx`) - Vimukthi
  Customer KYC registration wizard with 12-character NIC validation and conditional minor guardian linkage.
- `/agent/accounts/new` (`app/agent/accounts/new/page.tsx`) - Arkeshan
  Account origination wizard with guardian-aware search, age checks, and multi-holder joint support.
- `/agent/fd/new` (`app/agent/fd/new/page.tsx`) - Dinisuru
  Agent fixed deposit opening wizard linked to eligible customer savings accounts.
- `/agent/transfer` (`app/agent/transfer/page.tsx`) - Arkeshan, Nimthara
  Teller counter deposit and withdrawal form for bank agents with printable transaction receipts.
- `/agent/portfolio` (`app/agent/portfolio/page.tsx`) - Dinisuru
  Agent portfolio page featuring assigned customer tree, account balances, and 30-day transaction ledger.
- `/admin/layout.tsx` - Dinisuru, Arkeshan
  Admin portal shell with sidebar navigation and session guard checking admin role.
- `/admin/reports` (`app/admin/reports/page.tsx`) - Vimukthi, Arkeshan
  5 management reports tabs (Agent Summary, Account Summary, Active FDs, Monthly Interest, Customer Activity) with CSV download.

## Components

- `app/customer/fd/components/ActiveFD.tsx` (Dinisuru)
  Card showing FD investment amount, progress, earned interest, and next payout date.
- `components/SavingsHistory.tsx` (Achira)
  Table showing last 7 days of transactions for an account.

## Running

```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
npm run start
```
