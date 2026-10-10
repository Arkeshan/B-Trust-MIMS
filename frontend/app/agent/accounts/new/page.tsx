"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Search, X , AlertCircle} from "lucide-react";

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

interface OpenAccountReceipt {
  status: string;
  message: string;
  account_no: string;
  balance: string | number;
  plan_name: string;
  holders_count: number;
}

function formatLKR(value: string | number): string {
  const numeric = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numeric)) return "0.00";
  return numeric.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function OpenSavingsAccountPage() {
  const [plans, setPlans] = useState<AccountPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number>(3); // Default Adult (Plan 3)
  const [initialDeposit, setInitialDeposit] = useState<string>("1000");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Selected holders state
  const [selectedHolders, setSelectedHolders] = useState<CustomerSearchResult[]>([]);

  // Action / State-driven views
  type OriginationStep = "form" | "processing" | "success";
  const [step, setStep] = useState<OriginationStep>("form");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OpenAccountReceipt | null>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 1. Fetch available plans on mount
  useEffect(() => {
    async function loadPlans() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("session_id") || "" : "";
        const res = await fetch("/api/agent/plans", {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data: AccountPlan[] = await res.json();
          setPlans(data);
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
        console.error("Failed to load account plans:", err);
      }
    }
    loadPlans();
  }, []);

  // 2. Debounced search by NIC / Guardian NIC
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults([]);
      setIsSearching(false);
      setIsSearchOpen(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("session_id") || "" : "";
        const res = await fetch(
          `/api/agent/customer/search?nic=${encodeURIComponent(term)}`,
          {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (res.ok) {
          const results: CustomerSearchResult[] = await res.json();
          setSearchResults(results);
          setIsSearchOpen(results.length > 0);
        } else {
          setSearchResults([]);
          setIsSearchOpen(false);
        }
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
        setIsSearchOpen(false);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const currentPlan = plans.find((p) => p.plan_id === selectedPlanId);
  const minBalance = currentPlan ? Number(currentPlan.min_balance) : 0;
  const isJoint = selectedPlanId === 5;

  function handlePlanChange(newPlanId: number) {
    setSelectedPlanId(newPlanId);
    setError(null);
    const plan = plans.find((p) => p.plan_id === newPlanId);
    if (plan) {
      const planMin = Number(plan.min_balance);
      if (Number(initialDeposit) < planMin) {
        setInitialDeposit(String(planMin));
      }
    }
    // If switching from Joint to individual, preserve at most 1 holder
    if (newPlanId !== 5 && selectedHolders.length > 1) {
      setSelectedHolders([selectedHolders[0]]);
    }
  }

  function handleAddHolder(customer: CustomerSearchResult) {
    setError(null);
    if (selectedHolders.some((h) => h.person_id === customer.person_id)) {
      setError(`${customer.first_name} ${customer.last_name} is already added.`);
      return;
    }

    if (!isJoint) {
      setSelectedHolders([customer]);
    } else {
      if (selectedHolders.length >= 4) {
        setError("Joint accounts allow a maximum of 4 account holders.");
        return;
      }
      setSelectedHolders([...selectedHolders, customer]);
    }

    setSearchQuery("");
    setIsSearchOpen(false);
  }

  function handleRemoveHolder(personId: number) {
    setSelectedHolders(selectedHolders.filter((h) => h.person_id !== personId));
  }

  async function handleOpenAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedHolders.length === 0) {
      setError("Please search and attach at least one customer as an account holder.");
      return;
    }

    if (isJoint && selectedHolders.length < 2) {
      setError("Joint accounts require at least 2 distinct account holders.");
      return;
    }

    const depositNum = parseFloat(initialDeposit);
    if (isNaN(depositNum) || depositNum < 0) {
      setError("Please enter a valid initial deposit amount.");
      return;
    }

    if (depositNum < minBalance) {
      setError(
        `Initial deposit must be at least LKR ${formatLKR(minBalance)} for the ${currentPlan?.plan_name} plan.`
      );
      return;
    }

    try {
      setStep("processing");

      const token = typeof window !== "undefined" ? localStorage.getItem("session_id") || "" : "";
      const [res] = await Promise.all([
        fetch("/api/agent/account/open", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            plan_id: selectedPlanId,
            person_ids: selectedHolders.map((h) => h.person_id),
            initial_deposit: depositNum,
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to open account.");
        setStep("form");
        return;
      }

      setReceipt(data);
      setStep("success");
    } catch {
      setError("Failed to communicate with account service. Make sure Go is running.");
      setStep("form");
    }
  }

  function handleReset() {
    setReceipt(null);
    setSelectedHolders([]);
    setSearchQuery("");
    setError(null);
    setStep("form");
    if (currentPlan) {
      setInitialDeposit(String(currentPlan.min_balance));
    }
  }

  return (
    <div className="text-[#000000] font-sans pb-12">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/agent/transfer"
            className="rounded-lg border border-gray-200 bg-white p-2 text-[#001F3F] hover:bg-gray-100 transition shadow-xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#001F3F] tracking-tight">
              Open Savings Account
            </h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Select an account tier, attach customer holders, and process initial deposit.
            </p>
          </div>
        </div>

        {/* $$$ State-Driven Views $$$ */}
        {step === "processing" ? (
          /* 1. Processing Loading View */
          <div className="bg-white border border-gray-200 rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center text-center animate-fade-in min-h-[360px]">
            <div className="relative w-16 h-16 mb-5">
              <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-[#001F3F] border-r-[#06B6D4] animate-spin"></div>
            </div>
            <p className="text-sm font-semibold text-[#001F3F]">
              Opening account & processing initial deposit...
            </p>
          </div>
        ) : step === "success" && receipt ? (
          /* 2. Account Origination Receipt View */
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6 animate-fade-in">
            <div className="text-center pb-4 border-b border-gray-100 flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl font-bold mb-3">
                ✓
              </div>
              <h2 className="text-xl font-bold text-[#001F3F]">Account Opened Successfully</h2>
              <p className="text-xs text-[#6B7280] mt-1 font-mono tracking-wider font-semibold">
                {receipt.account_no}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-[#6B7280]">Account Plan</span>
                <span className="font-semibold text-[#001F3F]">{receipt.plan_name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-[#6B7280]">Account Holders</span>
                <span className="font-medium text-gray-800">
                  {receipt.holders_count} {receipt.holders_count > 1 ? "Holders (Joint)" : "Holder (Individual)"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-[#6B7280]">Opening Balance</span>
                <span className="font-bold text-[#001F3F]">LKR {formatLKR(receipt.balance)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-[#6B7280]">Status</span>
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Active
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#6B7280]">Created On</span>
                <span className="text-xs text-[#6B7280]">
                  {new Date().toLocaleDateString("en-LK")}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3.5 bg-[#001F3F] text-white rounded-xl text-sm font-semibold hover:bg-[#002b54] transition shadow-sm"
              >
                Open Another Account
              </button>
              <Link
                href="/agent/transfer"
                className="block text-center w-full py-3 border border-gray-200 bg-white text-[#001F3F] rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
              >
                Go to Teller Counter
              </Link>
            </div>
          </div>
        ) : (
          /* 3. Minimalist 3-Row Origination Form */
          <form
            onSubmit={handleOpenAccount}
            className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6 animate-fade-in"
          >
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Row 1: Account Plan Selection */}
            <div className="p-5 rounded-xl bg-[#F3F4F6] border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]">
                  1. ACCOUNT PLAN
                </label>
                {currentPlan && (
                  <span className="text-xs text-[#6B7280]">
                    Rate: <strong className="text-[#001F3F]">{Number(currentPlan.interest_rate).toFixed(1)}% p.a.</strong>
                  </span>
                )}
              </div>

              <select
                value={selectedPlanId}
                onChange={(e) => handlePlanChange(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-[#000000] focus:outline-none focus:ring-2 focus:ring-[#06B6D4] transition"
              >
                {plans.map((p) => (
                  <option key={p.plan_id} value={p.plan_id}>
                    {p.plan_name} Plan ({Number(p.interest_rate).toFixed(1)}% p.a. • Min LKR {formatLKR(p.min_balance)})
                  </option>
                ))}
              </select>

              <div className="text-[11px] text-[#6B7280] flex items-center justify-between pt-1">
                <span>
                  Minimum required deposit:{" "}
                  <strong className="text-[#001F3F]">LKR {formatLKR(minBalance)}</strong>
                </span>
                <span className="italic">
                  {selectedPlanId === 1 && "Eligibility: Minors under 12"}
                  {selectedPlanId === 2 && "Eligibility: Ages 12 to 17"}
                  {selectedPlanId === 3 && "Eligibility: Ages 18 to 59"}
                  {selectedPlanId === 4 && "Eligibility: Seniors 60+"}
                  {selectedPlanId === 5 && "Eligibility: 2–4 Adults (18+)"}
                </span>
              </div>
            </div>

            {/* Row 2: Account Holders Selection */}
            <div className="p-5 rounded-xl bg-[#F3F4F6] border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]">
                  2. ACCOUNT HOLDERS
                </label>
                <span className="text-xs text-[#6B7280] font-medium">
                  {selectedHolders.length} {isJoint ? "of 2–4 selected" : "of 1 selected"}
                </span>
              </div>

              {/* Search Input with Autocomplete */}
              <div className="relative" ref={searchDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by NIC (or Guardian NIC for minors)..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-[#000000] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] transition"
                  />
                  <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                  {isSearching && (
                    <span className="absolute right-3.5 top-3.5 text-xs text-[#06B6D4] font-medium">
                      Searching...
                    </span>
                  )}
                </div>

                {/* Dropdown Options Menu */}
                {isSearchOpen && (
                  <div className="absolute z-20 w-full mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden divide-y divide-gray-100 max-h-60 overflow-y-auto">
                    {searchResults.map((cust) => {
                      const isAdded = selectedHolders.some((h) => h.person_id === cust.person_id);
                      return (
                        <div
                          key={cust.person_id}
                          className="px-4 py-3 text-left transition flex items-center justify-between hover:bg-gray-50"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[#001F3F]">
                                {cust.first_name} {cust.last_name}
                              </span>
                              {cust.role === "Dependent" ? (
                                <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                  Minor Dependent
                                </span>
                              ) : (
                                <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-[#001F3F]">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#6B7280] mt-0.5">
                              {cust.nic ? `NIC: ${cust.nic}` : "Minor (No NIC)"} • DOB: {cust.dob}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleAddHolder(cust)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#001F3F] text-white hover:bg-[#002b54] disabled:opacity-40 transition"
                          >
                            {isAdded ? "Added" : "+ Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Holders List */}
              {selectedHolders.length > 0 && (
                <div className="space-y-2 pt-1">
                  {selectedHolders.map((holder, idx) => (
                    <div
                      key={holder.person_id}
                      className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#001F3F] text-white text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#001F3F]">
                              {holder.first_name} {holder.last_name}
                            </span>
                            {holder.role === "Dependent" && (
                              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1 rounded">
                                Minor
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#6B7280]">
                            {holder.nic ? `NIC: ${holder.nic}` : "Minor (No NIC)"} • Born: {holder.dob}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveHolder(holder.person_id)}
                        className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Remove holder"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Row 3: Initial Deposit Amount */}
            <div className="p-5 rounded-xl bg-[#F3F4F6] border border-gray-200 space-y-3">
              <label
                htmlFor="initialDepositAmount"
                className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
              >
                3. INITIAL DEPOSIT (LKR)
              </label>

              <div className="relative">
                <input
                  id="initialDepositAmount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={initialDeposit}
                  onChange={(e) => setInitialDeposit(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-[#001F3F] focus:outline-none focus:ring-2 focus:ring-[#06B6D4] transition"
                />
              </div>

              <div className="text-xs text-[#6B7280]">
                Minimum required balance for this plan:{" "}
                <span className="font-semibold text-[#001F3F]">
                  LKR {formatLKR(minBalance)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-[#001F3F] text-white rounded-xl text-sm font-semibold hover:bg-[#002b54] transition shadow-sm disabled:opacity-50"
            >
              Confirm & Open Account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
