"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, Search } from "lucide-react";


interface CustomerInfo {
  person_id: string;
  first_name: string;
  last_name: string;
  nic: string;
}

interface SavingsAccount {
  account_no: string;
  balance: number;
}

export default function AgentNewFDPage() {
  // Step 1 Search State
  const [searchUsername, setSearchUsername] = useState("");
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [searchError, setSearchError] = useState("");

  // Step 2 FD Form State
  const [eligibleAccounts, setEligibleAccounts] = useState<SavingsAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [planId, setPlanId] = useState<number>(2); // 1=6mo, 2=12mo, 3=36mo
  const [investment, setInvestment] = useState("");

  // Step 3 Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);


  const handleSearchCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    setCustomer(null);

    try {
      // Get the agent's token to authenticate the request
      const token = localStorage.getItem("session_id") || "";

      //  Fetch customer details
      const customerRes = await fetch(`/api/agent/customer/search?username=${searchUsername}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!customerRes.ok) {
        throw new Error("Customer not found or invalid username");
      }

      const customerData = await customerRes.json();
      setCustomer(customerData);

      // Extract the accounts returned by the single API call
      const accountsData = customerData.accounts || [];
      setEligibleAccounts(accountsData);

      // Automatically select the first account in the dropdown if available
      if (accountsData.length > 0) {
        setSelectedAccount(accountsData[0].account_no);
      }
    } catch (err: any) {
      setSearchError(err.message || "Failed to find customer");
    }

  };


  const handleOpenFD = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);


    if (!selectedAccount) {
      setSubmitResult({ ok: false, msg: "Please select a savings account." });
      setSubmitting(false);
      return;
    }
    try {
      const token = localStorage.getItem("session_id") || "";

      const res = await fetch("/api/fd/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          account_no: selectedAccount,
          fd_plan_id: planId,
          investment: parseFloat(investment),
        }),
      });
      if (!res.ok) {

        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to open Fixed Deposit");
      }

      const data = await res.json();
      setSubmitResult({
        ok: true,
        msg: `Success! Created FD Account: ${data.fd_acc_no}`
      });

      // Clear the investment field so  don't accidentally submit twice
      setInvestment("");
    } catch (err: any) {
      setSubmitResult({ ok: false, msg: err.message });
    } finally {

      setSubmitting(false);
    };
  };

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 bg-[#FFFFFF] px-6 py-5 sm:px-10">
        <div className="mx-auto max-w-4xl flex items-center gap-3">
          <Link
            href="/agent/dashboard"
            className="rounded-lg border border-gray-200 p-2 text-[#001F3F] hover:bg-[#F3F4F6] transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#001F3F]">
              Open Fixed Deposit
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8 sm:px-10 space-y-8">

        {/* Step 1: Customer Search */}
        <div className="rounded-xl border border-gray-200 bg-[#F3F4F6] p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#001F3F] mb-4">Find Customer</h2>

          <form onSubmit={handleSearchCustomer} className="flex gap-3">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Enter Customer Username..."
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                required
                className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-[#06B6D4] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#001F3F] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#001F3F]/90"
            >
              Search
            </button>
          </form>

          {searchError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} />
              <span>{searchError}</span>
            </div>
          )}

          {customer && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm text-emerald-800">
                Found Customer: <strong>{customer.first_name} {customer.last_name}</strong>
              </p>
              <p className="text-sm text-emerald-800 mt-1">
                NIC No: <strong>{customer.nic}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Step 2 FD Form */}
        {customer && (
          <div className="rounded-xl border border-gray-200 bg-[#F3F4F6] p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#001F3F] mb-4">FD Details</h2>

            <form onSubmit={handleOpenFD} className="space-y-5">

              {/* Account Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">
                  Eligible Savings Account
                </label>


                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-[#06B6D4] focus:outline-none"
                >
                  {eligibleAccounts.length === 0 ? (
                    <option value="" disabled>
                      No eligible accounts found
                    </option>
                  ) : (
                    eligibleAccounts.map((acc) => (
                      <option key={acc.account_no} value={acc.account_no}>
                        {acc.account_no} — LKR {Number(acc.balance).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </option>
                    ))
                  )}
                </select>
              </div>


              {/* Plan Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-2">
                  Select Plan
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 1, label: "6 Months" },
                    { id: 2, label: "1 Year" },
                    { id: 3, label: "3 Years" },
                  ].map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setPlanId(plan.id)}
                      className={`rounded-lg border p-3 text-center transition cursor-pointer ${planId === plan.id
                          ? "border-[#06B6D4] bg-white text-[#001F3F] shadow-sm ring-1 ring-[#06B6D4]"
                          : "border-gray-200 bg-transparent text-[#6B7280] hover:bg-white/50"
                        }`}
                    >
                      <p className="text-sm font-bold">{plan.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Investment Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">
                  Investment Amount (LKR)
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="0.01"
                  placeholder="e.g. 50000.00"
                  value={investment}
                  onChange={(e) => setInvestment(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-[#06B6D4] outline-none"
                />
              </div>

              {/* Submit Result */}
              {submitResult && (
                <div className={`flex items-start gap-2 rounded-lg p-3 text-sm border ${submitResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}>
                  {submitResult.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{submitResult.msg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#001F3F] py-3 text-sm font-bold text-white transition hover:bg-[#001F3F]/90 disabled:opacity-50"
              >
                {submitting ? "Processing..." : "Confirm & Open Fixed Deposit"}
              </button>
            </form>
          </div>
        )}

      </div>
    </main>
  );
}
