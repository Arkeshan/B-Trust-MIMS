"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, AlertCircle, X } from "lucide-react";

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

type CustomerAccount = {
  account_no: string;
  balance: string;
};

const currency = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

export default function SavingsAccountPage() {
  const [myAccounts, setMyAccounts] = useState<CustomerAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [activeAccount, setActiveAccount] = useState<AccountHistory | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // On mount, fetch the logged-in user's own accounts
  useEffect(() => {
    async function fetchMyAccounts() {
      setLoading(true);
      setError("");
      try {
        const sessionId = localStorage.getItem("session_id") || "";
        const res = await fetch("/api/customer/accounts", {
          headers: { Authorization: `Bearer ${sessionId}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Could not load your accounts.");
        const accounts: CustomerAccount[] = await res.json();
        setMyAccounts(accounts);
        if (accounts.length > 0) {
          setSelectedAccount(accounts[0].account_no);
          await loadAccount(accounts[0].account_no, sessionId);
        } else {
          setError("No active savings accounts found for your profile.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load accounts.");
      } finally {
        setLoading(false);
      }
    }
    fetchMyAccounts();
  }, []);

  async function loadAccount(accountNumber: string, sessionOverride?: string) {
    const acc = accountNumber.trim();
    if (!acc) return;

    setLoading(true);
    setError("");

    try {
      const sessionId =
        sessionOverride || localStorage.getItem("session_id") || "";

      const response = await fetch(
        `/api/account/${encodeURIComponent(acc)}/history`,
        {
          headers: { Authorization: `Bearer ${sessionId}` },
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error(`${acc}: Unable to load account history`);
      }
      const data: AccountHistory = await response.json();

      // Check whether this account already has an FD
      let hasFd = false;
      try {
        const fdList = await fetch("/api/fd/list", {
          headers: { Authorization: `Bearer ${sessionId}` },
          credentials: "include",
        });
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

  function handleAccountSwitch(accountNo: string) {
    setSelectedAccount(accountNo);
    loadAccount(accountNo);
  }

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans">
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

          {/* Account switcher (only shown if user has multiple accounts) */}
          {myAccounts.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6B7280] uppercase">
                Account:
              </span>
              <select
                value={selectedAccount}
                onChange={(e) => handleAccountSwitch(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 bg-[#F3F4F6] px-3 text-sm font-mono text-[#000000] outline-none transition focus:border-[#06B6D4]"
              >
                {myAccounts.map((acc) => (
                  <option key={acc.account_no} value={acc.account_no}>
                    {acc.account_no}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 space-y-8">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading && !activeAccount && (
          <div className="text-center py-12 text-sm text-[#6B7280]">
            Loading your account...
          </div>
        )}

        {/* Account Summary & FD Actions */}
        {activeAccount && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2 flex flex-col justify-between rounded-xl border border-gray-200 bg-[#F3F4F6] p-6 shadow-sm">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                  Primary Savings Account
                </span>
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
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-[#F3F4F6] p-6 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-[#001F3F]">
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
                    <span>View Linked FD Details</span>
                    <ArrowUpRight size={14} />
                  </Link>
                ) : (
                  <Link
                    href={`/customer/fd?account=${encodeURIComponent(activeAccount.account_no)}`}
                    className="flex w-full items-center justify-between rounded-lg bg-[#001F3F] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#001F3F]/90 transition"
                  >
                    <span>Create Fixed Deposit</span>
                    <ArrowUpRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

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
                      const isCredit =
                        t.transaction_type.toLowerCase() === "deposit" ||
                        t.transaction_type.toLowerCase() === "interest";
                      return (
                        <tr
                          key={t.transaction_id}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="px-6 py-3.5 font-mono text-xs text-[#6B7280]">
                            <span>#{t.transaction_id}</span>
                            {t.reference_no && (
                              <span className="block text-[10px] text-gray-400 font-mono">
                                {t.reference_no}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                isCredit
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
                              isCredit ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isCredit ? "+" : "-"}
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
    </main>
  );
}
