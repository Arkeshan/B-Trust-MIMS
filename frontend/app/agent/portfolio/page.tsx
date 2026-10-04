"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users, FileText, ChevronDown, ChevronUp, Activity } from "lucide-react";

// Types & Interfaces 

interface AgentStats {
  total_transactions: number;
  total_value: number;
}

interface CustomerAccount {
  account_no: string;
  balance: number;
  fd_acc_no?: string; // Optional: If they have an FD attached
  fd_investment?: number;
}

interface CustomerRecord {
  person_id: string;
  first_name: string;
  last_name: string;
  accounts: CustomerAccount[];
}

interface LedgerRecord {
  txn_id: number;
  date: string;
  type: string;
  amount: number;
}

// --- Helper Functions ---
function fmtLKR(amount: number) {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount);
}

// Main Page Component
export default function AgentPortfolioPage() {
  const [activeTab, setActiveTab] = useState<"customers" | "ledger">("customers");

  const [stats, setStats] = useState<AgentStats | null>(null);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerRecord[]>([]);

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const toggleRow = (personId: string) => {
    setExpandedRows(prev => ({ ...prev, [personId]: !prev[personId] }));
  };


  const loadPortfolioData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("session_id") || "";
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, customersRes, ledgerRes] = await Promise.all([
        fetch("/api/agent/stats", { headers }),
        fetch("/api/agent/customers", { headers }),
        fetch("/api/agent/ledger", { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (customersRes.ok) setCustomers(await customersRes.json());
      if (ledgerRes.ok) setLedger(await ledgerRes.json());

    } catch (err) {
      console.error("Failed to load portfolio data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolioData();
  }, []);

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans pb-12">
      {/* Header */}
      <header className="border-b border-gray-200 bg-[#FFFFFF] px-6 py-5 sm:px-10">
        <div className="mx-auto max-w-6xl flex items-center gap-3">
          <Link
            href="/agent/dashboard"
            className="rounded-lg border border-gray-200 p-2 text-[#001F3F] hover:bg-[#F3F4F6] transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#001F3F]">
              Agent Portfolio
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10 space-y-8">

        {/* KPI Metric Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Total Handled Transactions</p>
              <h2 className="text-3xl font-bold text-[#001F3F]">{loading ? "..." : stats?.total_transactions || 0}</h2>
            </div>
          </div>
          
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Total Value Processed</p>
              <h2 className="text-3xl font-bold text-[#06B6D4]">{loading ? "..." : fmtLKR(stats?.total_value || 0)}</h2>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("customers")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === "customers"
              ? "border-b-2 border-[#06B6D4] text-[#001F3F]"
              : "text-gray-500 hover:text-[#001F3F]"
              }`}
          >
            <Users size={18} /> My Customers
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors ${activeTab === "ledger"
              ? "border-b-2 border-[#06B6D4] text-[#001F3F]"
              : "text-gray-500 hover:text-[#001F3F]"
              }`}
          >
            <FileText size={18} /> 30-Day Ledger
          </button>
        </div>

        {/* Tab 1: My Customers */}
        {activeTab === "customers" && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F3F4F6] text-[#6B7280]">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase">Customer Name</th>
                  <th className="px-6 py-4 font-semibold uppercase">Customer ID</th>
                  <th className="px-6 py-4 font-semibold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">


                {customers.map((c) => (
                  <React.Fragment key={c.person_id}>
                    <tr className="hover:bg-gray-50 border-b border-gray-100">
                      <td className="px-6 py-4 font-medium text-[#001F3F]">{c.first_name} {c.last_name}</td>
                      <td className="px-6 py-4 text-gray-500">{c.person_id}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => toggleRow(c.person_id)}
                          className="text-[#06B6D4] hover:text-[#001F3F] font-medium flex items-center justify-end gap-1 w-full"
                        >
                          {expandedRows[c.person_id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          {expandedRows[c.person_id] ? "Hide Accounts" : "View Accounts"}
                        </button>
                      </td>
                    </tr>
                    {expandedRows[c.person_id] && (
                      <tr className="bg-[#F9FAFB] border-b border-gray-200">
                        <td colSpan={3} className="px-8 py-5">
                          <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Linked Accounts</h4>
                          <div className="space-y-3">
                            {c.accounts && c.accounts.length > 0 ? c.accounts.map((acc, i) => (
                              <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div>
                                  <p className="font-mono text-sm font-semibold text-[#001F3F]">{acc.account_no}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">Savings Balance: <span className="font-medium text-emerald-600">{fmtLKR(acc.balance)}</span></p>
                                </div>
                                {acc.fd_acc_no ? (
                                  <div className="text-right">
                                    <span className="inline-block rounded bg-cyan-50 px-2 py-1 text-[10px] font-bold text-cyan-700 border border-cyan-100 mb-1">
                                      FD: {acc.fd_acc_no}
                                    </span>
                                    <p className="text-xs text-gray-500">Investment: {fmtLKR(acc.fd_investment || 0)}</p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">No FD</span>
                                )}
                              </div>
                            )) : (
                              <p className="text-sm text-gray-500">No accounts found.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: 30-Day Ledger */}
        {activeTab === "ledger" && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F3F4F6] text-[#6B7280]">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase">Date</th>
                  <th className="px-6 py-4 font-semibold uppercase">Txn ID</th>
                  <th className="px-6 py-4 font-semibold uppercase">Type</th>
                  <th className="px-6 py-4 font-semibold uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">


                {ledger.map((row) => (
                  <tr key={row.txn_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(row.date).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </td>
                    <td className="px-6 py-4 font-mono text-[#001F3F]">#{row.txn_id}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-600 border border-gray-200">
                        {row.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${row.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {row.type === 'deposit' ? '+' : '-'}{fmtLKR(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </main>
  );
}
