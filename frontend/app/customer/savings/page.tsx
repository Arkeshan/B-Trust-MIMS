"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowLeft,
  ArrowUpRight,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react";

type Transaction = {
  transaction_id: number;
  transaction_type: string;
  amount: number;
  balance_after: number;
  timestamp: string;
  reference_no?: string;
};

type AccountHistory = {
  account_no: string;
  balance: number;
  transactions: Transaction[];
  has_fixed_deposit?: boolean;
};

const currency = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

export default function SavingsAccountPage() {
  const [accountInput, setAccountInput] = useState("ACC000000001");
  const [activeAccount, setActiveAccount] = useState<AccountHistory | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // FD Creation Modal State
  const [isFdModalOpen, setIsFdModalOpen] = useState(false);
  const [fdAmount, setFdAmount] = useState("");
  const [fdPlan, setFdPlan] = useState("1");
  const [fdSubmitting, setFdSubmitting] = useState(false);
  const [fdModalError, setFdModalError] = useState("");

  const MIN_SAVINGS_BALANCE = 1000;

  async function loadAccount(accountNumber: string) {
    const acc = accountNumber.trim();
    if (!acc) {
      setError("Please enter a valid account number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Fetch Savings Account History & Balance
      const response = await fetch(
        `http://localhost:8080/api/account/${encodeURIComponent(acc)}/history`,
      );
      if (!response.ok) {
        throw new Error(`${acc}: Unable to load account history`);
      }
      const data: AccountHistory = await response.json();

      // 2. Check whether this account already has an FD.
      let hasFd = false;
      try {
        const fdList = await fetch("http://localhost:8080/api/fd/list");
        if (fdList.ok) {
          const fdData: { account_no?: string }[] = await fdList.json();
          hasFd = fdData.some((fd) => fd.account_no === acc);
        }
      } catch {
        hasFd = false;
      }

      data.has_fixed_deposit = hasFd;
      setActiveAccount(data);
    } catch (requestError) {
      setActiveAccount(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load account details.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccount(accountInput);
  }, []);

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    loadAccount(accountInput);
  }

  async function handleOpenFdSubmit(e: FormEvent) {
    e.preventDefault();
    setFdModalError("");

    const investmentAmount = parseFloat(fdAmount);
    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      setFdModalError("Please enter a valid positive deposit amount.");
      return;
    }

    if (!activeAccount) return;

    if (activeAccount.balance - investmentAmount < MIN_SAVINGS_BALANCE) {
      setFdModalError(
        `Insufficient balance. You must maintain at least ${currency.format(
          MIN_SAVINGS_BALANCE,
        )} in your savings account after opening this FD.`,
      );
      return;
    }

    setFdSubmitting(true);
    try {
      const res = await fetch("http://localhost:8080/api/fd/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_no: activeAccount.account_no,
          investment: investmentAmount,
          fd_plan_id: parseInt(fdPlan, 10),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to create fixed deposit.");
      }

      setIsFdModalOpen(false);
      setFdAmount("");
      loadAccount(activeAccount.account_no);
    } catch (err: any) {
      setFdModalError(err.message || "An error occurred.");
    } finally {
      setFdSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans">
      {/* Header Bar */}
      <header className="border-b border-gray-200 bg-[#FFFFFF] px-6 py-5 sm:px-10">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/customer/dashboard"
              className="rounded-lg border border-gray-200 p-2 text-[#001F3F] hover:bg-[#F3F4F6] transition"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#001F3F]">
                Savings Account Overview
              </h1>
            </div>
          </div>

          {/* Account Selector */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)}
              placeholder="Account Number"
              className="h-10 rounded-lg border border-gray-300 bg-[#F3F4F6] px-3 text-sm text-[#000000] outline-none transition focus:border-[#06B6D4]"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-[#001F3F] px-4 text-xs font-semibold text-white transition hover:bg-[#001F3F]/90 disabled:opacity-50"
            >
              {loading ? "..." : "Select"}
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 space-y-8">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Account Summary & FD Actions */}
        {activeAccount && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Balance Overview Card */}
            <div className="md:col-span-2 flex flex-col justify-between rounded-xl border border-gray-200 bg-[#F3F4F6] p-6 shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    Primary Savings Account
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Active
                  </span>
                </div>
                <p className="mt-2 font-mono text-sm font-bold text-[#001F3F]">
                  {activeAccount.account_no}
                </p>
                <div className="mt-4">
                  <span className="text-xs text-[#6B7280]">
                    Available Balance
                  </span>
                  <p className="text-3xl font-extrabold tracking-tight text-[#001F3F]">
                    {currency.format(activeAccount.balance)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 border-t border-gray-300/60 pt-4">
                <Link
                  href="/customer/transfer"
                  className="rounded-lg bg-[#001F3F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#001F3F]/90 transition"
                >
                  Make Transfer
                </Link>
                <button
                  onClick={() => loadAccount(activeAccount.account_no)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-[#001F3F] hover:bg-gray-50 transition"
                >
                  Refresh Balance
                </button>
              </div>
            </div>

            {/* Linked FD Action Card */}
            <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-[#F3F4F6] p-6 shadow-sm">
              <div>
                <div className="rounded-lg bg-[#001F3F] w-fit p-2.5 text-[#06B6D4]">
                  <Wallet size={20} />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#001F3F]">
                  Fixed Deposit Status
                </h3>
                <p className="mt-1 text-xs text-[#6B7280] leading-relaxed">
                  {activeAccount.has_fixed_deposit
                    ? "An active fixed deposit investment is currently linked to this savings account."
                    : "No fixed deposit linked. Open an FD to earn up to 15.0% annual returns."}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-300/60">
                {activeAccount.has_fixed_deposit ? (
                  <Link
                    href={`/customer/fd?account=${encodeURIComponent(activeAccount.account_no)}`}
                    className="flex w-full items-center justify-between rounded-lg bg-[#FFFFFF] px-3 py-2.5 text-xs font-semibold text-[#001F3F] border border-gray-300 hover:border-[#06B6D4] transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <ExternalLink size={14} className="text-[#06B6D4]" />
                      View Linked FD Details
                    </span>
                    <ArrowUpRight size={14} />
                  </Link>
                ) : (
                  <button
                    onClick={() => setIsFdModalOpen(true)}
                    className="flex w-full items-center justify-between rounded-lg bg-[#001F3F] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#001F3F]/90 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <PlusCircle size={14} className="text-[#06B6D4]" />
                      Create Fixed Deposit
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {activeAccount && (
          <section className="rounded-xl border border-gray-200 bg-[#FFFFFF] shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-[#F3F4F6] px-6 py-4">
              <h3 className="text-sm font-bold text-[#001F3F] uppercase tracking-wider">
                Transaction History
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-[#FFFFFF] text-xs font-semibold uppercase text-[#6B7280]">
                  <tr>
                    <th className="px-6 py-3">Txn ID</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeAccount.transactions &&
                  activeAccount.transactions.length > 0 ? (
                    activeAccount.transactions.map((t) => {
                      const isDeposit =
                        t.transaction_type.toLowerCase() === "deposit";
                      return (
                        <tr
                          key={t.transaction_id}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="px-6 py-3.5 font-mono text-xs text-[#6B7280]">
                            #{t.transaction_id}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                isDeposit
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {t.transaction_type}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-xs text-[#6B7280]">
                            {new Date(t.timestamp).toLocaleString()}
                          </td>
                          <td
                            className={`px-6 py-3.5 text-right font-medium ${
                              isDeposit ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isDeposit ? "+" : "-"}
                            {currency.format(t.amount)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono text-xs text-[#000000]">
                            {currency.format(t.balance_after)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center text-xs text-[#6B7280]"
                      >
                        No transactions recorded for this account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Modal: Open Fixed Deposit */}
      {isFdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-[#001F3F]">
                <ShieldCheck className="text-[#06B6D4]" size={20} />
                <h3 className="text-lg font-bold">Open Fixed Deposit</h3>
              </div>
              <button
                onClick={() => setIsFdModalOpen(false)}
                className="text-gray-400 hover:text-black transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleOpenFdSubmit} className="mt-4 space-y-4">
              {fdModalError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                  {fdModalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] uppercase">
                  Linked Savings Account
                </label>
                <input
                  type="text"
                  disabled
                  value={activeAccount?.account_no ?? ""}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-mono text-gray-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] uppercase">
                  Select FD Plan
                </label>
                <select
                  value={fdPlan}
                  onChange={(e) => setFdPlan(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-[#F3F4F6] px-3 py-2 text-sm text-[#000000] focus:border-[#06B6D4] outline-none"
                >
                  <option value="1">Plan A - 6 Months (13% p.a.)</option>
                  <option value="2">Plan B - 12 Months (14% p.a.)</option>
                  <option value="3">Plan C - 36 Months (15% p.a.)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7280] uppercase">
                  Deposit Amount (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 50000"
                  value={fdAmount}
                  onChange={(e) => setFdAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-[#F3F4F6] px-3 py-2 text-sm text-[#000000] focus:border-[#06B6D4] outline-none"
                />
                <p className="mt-1 text-[11px] text-[#6B7280]">
                  Available:{" "}
                  {activeAccount ? currency.format(activeAccount.balance) : "—"}{" "}
                  (Must maintain {currency.format(MIN_SAVINGS_BALANCE)}{" "}
                  balance).
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFdModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-[#6B7280] hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fdSubmitting}
                  className="rounded-lg bg-[#001F3F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#001F3F]/90 disabled:opacity-50"
                >
                  {fdSubmitting ? "Creating..." : "Confirm & Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
