"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

// ==========================================
// 1. TYPES & CONSTANTS
// ==========================================
type AgentSummary = { agent_person_id: number; first_name: string; last_name: string; branch_id: number; total_transactions: number; total_value: number; };
type AccountSummary = { account_no: string; current_balance: number; status: string; total_transactions: number; total_deposits: number; total_withdrawals: number; total_interest_credited: number; };
type ActiveFd = { fd_acc_no: string; account_no: string; investment: number; start_date: string; interest_paid_to_date: number; next_payout_date: string; term_months: number; interest_rate: number; };
type MonthlyInterest = { plan_name: string; payout_month: string; interest_transactions: number; total_interest_paid: number; };
type CustomerActivity = { customer_person_id: number; first_name: string; last_name: string; total_deposits: number; total_withdrawals: number; net_balance_change: number; };

type ReportType = "agents" | "accounts" | "fds" | "monthly-interest" | "customers";
type ReportRow = AgentSummary | AccountSummary | ActiveFd | MonthlyInterest | CustomerActivity;
type ReportResponse = { report: string; data: ReportRow[]; };

const TABS: { id: ReportType; label: string }[] = [
  { id: "agents", label: "Agent Totals" },
  { id: "accounts", label: "Account Summary" },
  { id: "fds", label: "Active FDs" },
  { id: "monthly-interest", label: "Monthly Interest" },
  { id: "customers", label: "Customer Activity" },
];

const currency = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 2 });
const formatDate = (val: string) => (!val || Number.isNaN(new Date(val).getTime()) ? val : new Date(val).toLocaleDateString());

const COLUMNS: Record<ReportType, { header: string; render: (row: any) => React.ReactNode }[]> = {
  agents: [
    { header: "Agent", render: (r: AgentSummary) => <span className="font-medium text-gray-900">{r.first_name} {r.last_name}</span> },
    { header: "Branch", render: (r: AgentSummary) => r.branch_id },
    { header: "Transactions", render: (r: AgentSummary) => r.total_transactions },
    { header: "Total Value", render: (r: AgentSummary) => currency.format(r.total_value) },
  ],
  accounts: [
    { header: "Account No", render: (r: AccountSummary) => <span className="font-semibold text-[#001F3F]">{r.account_no}</span> },
    { header: "Status", render: (r: AccountSummary) => <span className="capitalize px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">{r.status}</span> },
    { header: "Balance", render: (r: AccountSummary) => <span className="font-medium text-gray-900">{currency.format(r.current_balance)}</span> },
    { header: "Transactions", render: (r: AccountSummary) => r.total_transactions },
    { header: "Deposits", render: (r: AccountSummary) => currency.format(r.total_deposits) },
    { header: "Withdrawals", render: (r: AccountSummary) => currency.format(r.total_withdrawals) },
    { header: "Interest", render: (r: AccountSummary) => currency.format(r.total_interest_credited) },
  ],
  fds: [
    { header: "FD Account", render: (r: ActiveFd) => <span className="font-semibold text-[#001F3F]">{r.fd_acc_no}</span> },
    { header: "Investment", render: (r: ActiveFd) => currency.format(r.investment) },
    { header: "Rate", render: (r: ActiveFd) => `${r.interest_rate}%` },
    { header: "Interest Paid", render: (r: ActiveFd) => currency.format(r.interest_paid_to_date) },
  ],
  "monthly-interest": [
    { header: "Plan", render: (r: MonthlyInterest) => <span className="font-medium text-gray-900">{r.plan_name}</span> },
    { header: "Month", render: (r: MonthlyInterest) => r.payout_month },
    { header: "Total Interest Paid", render: (r: MonthlyInterest) => currency.format(r.total_interest_paid) },
  ],
  customers: [
    { header: "Customer", render: (r: CustomerActivity) => <span className="font-medium text-gray-900">{r.first_name} {r.last_name}</span> },
    { header: "Net Change", render: (r: CustomerActivity) => (
        <span className={`font-medium ${r.net_balance_change < 0 ? "text-red-600" : "text-emerald-600"}`}>
          {currency.format(r.net_balance_change)}
        </span>
      )
    },
  ],
};

// ==========================================
// 2. MODULAR UI COMPONENTS
// ==========================================

function TabNavigation({ activeTab, onTabSelect }: { activeTab: ReportType; onTabSelect: (id: ReportType) => void }) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2 p-1 bg-white border border-gray-200 rounded-xl shadow-sm w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabSelect(tab.id)}
          className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
            activeTab === tab.id
              ? "bg-[#001F3F] text-white shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

function DataTable({ activeTab, rows, loading }: { activeTab: ReportType; rows: ReportRow[]; loading: boolean }) {
  const columns = COLUMNS[activeTab];

  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white">
        <h2 className="text-xl font-bold text-[#001F3F]">{TABS.find((tab) => tab.id === activeTab)?.label}</h2>
        {loading && (
          <div className="flex items-center gap-2 text-sm font-medium text-[#06B6D4]">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {columns.map((col) => (
                <th key={col.header} className="px-6 py-4 font-semibold">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                {columns.map((col) => (
                  <td key={col.header} className="px-6 py-4 text-gray-600">{col.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && rows.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <p className="text-base font-medium">No data found for this report.</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ==========================================
// 3. MAIN PAGE ASSEMBLED
// ==========================================

export default function AdminReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ReportType>("agents");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminUser, setAdminUser] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  // Authentication & Role Guard: Ensure session exists and role is admin
  useEffect(() => {
    const sessionId = localStorage.getItem("session_id");
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("username");

    if (!sessionId || role?.toLowerCase() !== "admin") {
      router.push("/login");
      return;
    }
    if (username) {
      setAdminUser(username);
    }
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const token = localStorage.getItem("session_id") || "";
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      localStorage.removeItem("session_id");
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      router.push("/login");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setRows([]); // Clear table to prevent data flashing
      setError("");

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("session_id") || "" : "";
        const response = await fetch(`/api/reports/${activeTab}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("session_id");
          localStorage.removeItem("username");
          localStorage.removeItem("role");
          router.push("/login");
          return;
        }

        if (!response.ok) throw new Error(`Failed to load "${activeTab}" report`);
        
        const body: ReportResponse = await response.json();
        if (!cancelled) setRows(body.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(err instanceof Error ? err.message : "Unable to load report.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReport();
    return () => { cancelled = true; };
  }, [activeTab, router]);

  return (
    <main className="min-h-screen bg-[#F9FAFB] text-[#000000] font-sans">
      <header className="border-b border-gray-200 bg-[#FFFFFF] px-6 py-6 sm:px-10 shadow-sm">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="block text-2xl font-extrabold uppercase leading-none tracking-[0.12em] text-[#06B6D4]">
              B-Trust MIMS
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#001F3F]">
              Admin Reports
            </h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              Signed in as <span className="font-semibold text-[#001F3F]">{adminUser || "admin"}</span> (Administrator)
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#001F3F] transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <LogOut size={16} />
            {loggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <TabNavigation activeTab={activeTab} onTabSelect={setActiveTab} />

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-center gap-3">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <p className="font-medium">{error}</p>
          </div>
        )}

        <DataTable activeTab={activeTab} rows={rows} loading={loading} />
      </div>
    </main>
  );
}