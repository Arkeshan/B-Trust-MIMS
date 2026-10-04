"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import {
  Wallet,
  UserPlus,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  Plus,
  Sparkles,
  RefreshCcw,
} from "lucide-react";

interface AccountPlan {
  plan_id: number;
  plan_name: string;
  interest_rate: string | number;
  min_balance: string | number;
}

interface CustomerSearchResult {
  person_id: number;
  first_name: string;
  last_name: string;
  nic: string;
  username: string;
  dob: string;
  role: "Primary" | "Dependent";
  guardian_nic?: string;
}

interface OpenAccountResponse {
  status: string;
  message: string;
  account_no: string;
  balance: string | number;
  plan_name: string;
  holders_count: number;
}

export default function OpenSavingsAccountPage() {
  const [plans, setPlans] = useState<AccountPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number>(3); // Default to Adult (Plan 3)
  const [initialDeposit, setInitialDeposit] = useState<string>("1000");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selected holders state
  const [selectedHolders, setSelectedHolders] = useState<CustomerSearchResult[]>([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<OpenAccountResponse | null>(null);

  // 1. Fetch available plans on mount
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/agent/plans", {
          credentials: "include",
        });
        if (res.ok) {
          const data: AccountPlan[] = await res.json();
          setPlans(data);
          // If adult plan exists, select it by default, else select first
          const adult = data.find((p) => p.plan_name.toLowerCase() === "adult");
          if (adult) {
            setSelectedPlanId(adult.plan_id);
            setInitialDeposit(String(adult.min_balance));
          } else if (data.length > 0) {
            setSelectedPlanId(data[0].plan_id);
            setInitialDeposit(String(data[0].min_balance));
          }
        }
      } catch (err) {
        console.error("Failed to load plans:", err);
      }
    }
    loadPlans();
  }, []);

  // 2. Debounced search for customers by NIC / Guardian NIC
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/agent/customer/search?nic=${encodeURIComponent(term)}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const results: CustomerSearchResult[] = await res.json();
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Current plan object
  const currentPlan = plans.find((p) => p.plan_id === selectedPlanId);
  const minBalance = currentPlan ? Number(currentPlan.min_balance) : 0;
  const isJoint = selectedPlanId === 5;

  // Handle plan change
  function handlePlanChange(newPlanId: number) {
    setSelectedPlanId(newPlanId);
    setError("");
    const plan = plans.find((p) => p.plan_id === newPlanId);
    if (plan) {
      const planMin = Number(plan.min_balance);
      if (Number(initialDeposit) < planMin) {
        setInitialDeposit(String(planMin));
      }
    }
    // If switched from Joint to individual, keep only first holder if multiple were selected
    if (newPlanId !== 5 && selectedHolders.length > 1) {
      setSelectedHolders([selectedHolders[0]]);
    }
  }

  // Add holder
  function handleAddHolder(customer: CustomerSearchResult) {
    setError("");
    if (selectedHolders.some((h) => h.person_id === customer.person_id)) {
      setError(`${customer.first_name} ${customer.last_name} is already added.`);
      return;
    }

    if (!isJoint) {
      // Individual plans strictly allow 1 holder
      setSelectedHolders([customer]);
      setSearchQuery("");
      setSearchResults([]);
    } else {
      // Joint allows 2-4 holders
      if (selectedHolders.length >= 4) {
        setError("Joint accounts can have a maximum of 4 account holders.");
        return;
      }
      setSelectedHolders([...selectedHolders, customer]);
      setSearchQuery("");
      setSearchResults([]);
    }
  }

  // Remove holder
  function handleRemoveHolder(personId: number) {
    setSelectedHolders(selectedHolders.filter((h) => h.person_id !== personId));
  }

  // Submit Handler
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side guard rails
    if (selectedHolders.length === 0) {
      setError("Please search and select at least one customer as an account holder.");
      return;
    }

    if (isJoint && selectedHolders.length < 2) {
      setError("Joint accounts require at least 2 distinct account holders.");
      return;
    }

    const depositNum = parseFloat(initialDeposit);
    if (isNaN(depositNum) || depositNum < 0) {
      setError("Please enter a valid positive initial deposit amount.");
      return;
    }

    if (depositNum < minBalance) {
      setError(
        `Initial deposit must be at least LKR ${minBalance.toLocaleString("en-LK", {
          minimumFractionDigits: 2,
        })} for the ${currentPlan?.plan_name} plan.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        plan_id: selectedPlanId,
        person_ids: selectedHolders.map((h) => h.person_id),
        initial_deposit: depositNum,
      };

      const res = await fetch("/api/agent/account/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to open account.");
      }

      setSuccessData(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while opening account.");
    } finally {
      setSubmitting(false);
    }
  }

  // Reset form for opening another account
  function handleReset() {
    setSelectedHolders([]);
    setSearchQuery("");
    setSearchResults([]);
    setError("");
    setSuccessData(null);
    if (currentPlan) {
      setInitialDeposit(String(currentPlan.min_balance));
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8 font-sans">
      <div className="mx-auto max-w-5xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link
              href="/agent/transfer"
              className="flex items-center gap-1 hover:text-cyan-400 transition"
            >
              <ArrowLeft size={14} /> Agent Portal
            </Link>
            <span>/</span>
            <span className="text-cyan-400 font-semibold">Account Origination</span>
          </div>

          <Link
            href="/agent/customers/new"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition"
          >
            <UserPlus size={14} /> Register New Customer
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400 text-xs font-bold">
              3
            </span>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Agent Portal • Phase 2 & 3
            </p>
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
            Open New Savings Account
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Select an account tier, bind verified customers (individuals or joint
            holders), and process the mandatory initial cash deposit.
          </p>
        </div>

        {/* Success Modal / Screen */}
        {successData && (
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Origination Successful
                </span>
                <h2 className="text-2xl font-bold text-white">
                  Account Created & Funds Deposited!
                </h2>
                <p className="text-sm text-slate-400">
                  The account is now active and ready for counter operations.
                </p>
              </div>
            </div>

            <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  New Account Number
                </span>
                <p className="mt-1 text-2xl font-mono font-bold text-cyan-400 tracking-wider">
                  {successData.account_no}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Initial Verified Balance
                </span>
                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  LKR{" "}
                  {Number(successData.balance).toLocaleString("en-LK", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Plan & Linked Holders
                </span>
                <p className="mt-1 text-lg font-semibold text-white">
                  {successData.plan_name} ({successData.holders_count} Holder
                  {successData.holders_count > 1 ? "s" : ""})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md hover:bg-cyan-400 transition"
              >
                <RefreshCcw size={16} /> Open Another Account
              </button>
              <Link
                href="/agent/transfer"
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 transition"
              >
                <Wallet size={16} /> Go to Teller Counter
              </Link>
            </div>
          </div>
        )}

        {/* Main Origination Form */}
        {!successData && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200">
                <AlertCircle size={20} className="shrink-0 text-rose-400" />
                <div>
                  <span className="font-semibold">Origination Denied: </span>
                  {error}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* LEFT COLUMN: Account Configuration */}
              <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Wallet size={18} className="text-cyan-400" />
                  <h2 className="text-base font-semibold text-white">
                    1. Account Plan & Initial Deposit
                  </h2>
                </div>

                {/* Plan Dropdown */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Select Account Plan *
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => handlePlanChange(Number(e.target.value))}
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {plans.map((p) => (
                      <option key={p.plan_id} value={p.plan_id}>
                        {p.plan_name} Plan ({Number(p.interest_rate).toFixed(1)}% p.a.
                        | Min: LKR {Number(p.min_balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plan Details Card */}
                {currentPlan && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Plan Tier:</span>
                      <span className="font-semibold text-cyan-400">
                        {currentPlan.plan_name} Savings
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Annual Interest Rate:</span>
                      <span className="font-semibold text-emerald-400">
                        {Number(currentPlan.interest_rate).toFixed(2)}% per annum
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Minimum Balance Threshold:</span>
                      <span className="font-bold text-white">
                        LKR{" "}
                        {minBalance.toLocaleString("en-LK", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="border-t border-slate-800/80 pt-2 text-[11px] text-slate-400 leading-relaxed">
                      {selectedPlanId === 1 && (
                        <span>
                          <strong className="text-amber-400">Children Plan Rule:</strong>{" "}
                          Restricted strictly to minors under 12 years. Exactly 1
                          account holder allowed.
                        </span>
                      )}
                      {selectedPlanId === 2 && (
                        <span>
                          <strong className="text-amber-400">Teen Plan Rule:</strong>{" "}
                          Restricted to teenagers aged 12 to 17 years. Exactly 1
                          account holder allowed.
                        </span>
                      )}
                      {selectedPlanId === 3 && (
                        <span>
                          <strong className="text-cyan-400">Adult Plan Rule:</strong>{" "}
                          Restricted to adults aged 18 to 59 years. Exactly 1
                          account holder allowed.
                        </span>
                      )}
                      {selectedPlanId === 4 && (
                        <span>
                          <strong className="text-purple-400">Senior Plan Rule:</strong>{" "}
                          Restricted to senior citizens aged 60 and above. Exactly 1
                          account holder allowed.
                        </span>
                      )}
                      {selectedPlanId === 5 && (
                        <span>
                          <strong className="text-emerald-400">Joint Plan Rule:</strong>{" "}
                          Requires 2 to 4 distinct holders. All holders must be
                          adults (18+).
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Initial Deposit Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Initial Deposit Amount (LKR) *
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-500">
                      LKR
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={initialDeposit}
                      onChange={(e) => setInitialDeposit(e.target.value)}
                      placeholder="e.g. 5000.00"
                      className="block w-full rounded-lg border border-slate-700 bg-slate-800 pl-14 pr-3.5 py-2.5 text-sm font-semibold text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Must be at least LKR {minBalance.toLocaleString("en-LK")} to
                    satisfy plan minimum balance.
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: Customer Lookup & Holders Assignment */}
              <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-cyan-400" />
                    <h2 className="text-base font-semibold text-white">
                      2. Account Holders ({selectedHolders.length}
                      {isJoint ? " of 2-4" : " of 1"})
                    </h2>
                  </div>
                  {isJoint ? (
                    <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                      Joint Mode (2-4 Holders)
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      Individual Mode (1 Holder)
                    </span>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Search Customer by NIC / Guardian NIC
                  </label>
                  <div className="relative mt-1.5">
                    <Search
                      size={16}
                      className="absolute left-3.5 top-3 text-slate-500"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type NIC (e.g. 198000000001)..."
                      className="block w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    {isSearching && (
                      <span className="absolute right-3.5 top-3 text-xs text-slate-400">
                        Searching...
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    For minors without an NIC, search using their registered
                    Guardian's NIC.
                  </p>

                  {/* Autocomplete Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl">
                      {searchResults.map((cust) => {
                        const isSelected = selectedHolders.some(
                          (h) => h.person_id === cust.person_id
                        );
                        return (
                          <div
                            key={cust.person_id}
                            className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-800 transition"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-white">
                                  {cust.first_name} {cust.last_name}
                                </span>
                                {cust.role === "Dependent" ? (
                                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                    Minor Dependent
                                  </span>
                                ) : (
                                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                                    Primary NIC
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                {cust.nic ? `NIC: ${cust.nic}` : "No NIC (Minor)"}{" "}
                                • DOB: {cust.dob} • User: @{cust.username}
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={isSelected}
                              onClick={() => handleAddHolder(cust)}
                              className="flex items-center gap-1 rounded-md bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 transition"
                            >
                              <Plus size={14} /> {isSelected ? "Added" : "Add"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Holders Cards */}
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Assigned Account Holders
                  </span>

                  {selectedHolders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500">
                      <Users size={28} className="mb-2 opacity-50" />
                      <p className="text-xs">
                        No customers assigned yet. Search an NIC above to attach
                        account holders.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedHolders.map((holder, idx) => (
                        <div
                          key={holder.person_id}
                          className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-cyan-400">
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-white">
                                  {holder.first_name} {holder.last_name}
                                </span>
                                {holder.role === "Dependent" && (
                                  <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-300">
                                    Minor
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {holder.nic ? `NIC: ${holder.nic}` : "Minor (No NIC)"}{" "}
                                • Born: {holder.dob}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveHolder(holder.person_id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950/50 hover:text-rose-400 transition"
                            title="Remove holder"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submission Section */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-6">
              <div className="text-xs text-slate-400">
                Opening an account processes an atomic initial deposit transaction
                verified by database triggers.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-cyan-500 px-8 py-3 text-sm font-bold text-slate-950 shadow-lg hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 transition"
              >
                {submitting ? (
                  "Processing Origination..."
                ) : (
                  <>
                    Confirm & Open Account <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
