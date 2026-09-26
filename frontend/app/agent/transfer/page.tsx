"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import Link from "next/link";
import { Search, ArrowLeft, AlertCircle, X, ShieldCheck } from "lucide-react";
import ReceiptModal from "@/components/ReceiptModal";

interface CustomerLookupItem {
  person_id: number;
  customer_name: string;
  nic: string;
  username: string;
  account_no: string;
  balance: number;
  plan_name: string;
  min_balance: number;
  status: string;
}
interface TransactionReceipt {
  reference_no: string;
  timestamp: string;
  account_no: string;
  customer_name: string;
  nic: string;
  username: string;
  plan_name: string;
  txn_type: "deposit" | "withdrawal";
  amount: number;
  previous_balance: number;
  new_balance: number;
  remarks?: string;
}

const currency = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

export default function AgentTransferPage() {
  // Autocomplete search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerLookupItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] =
    useState<CustomerLookupItem | null>(null);

  // Transaction form states
  const [txnType, setTxnType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Receipt modal states
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close autocomplete dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for customer NIC
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/agent/lookup?nic=${encodeURIComponent(trimmed)}`,
        );
        if (res.ok) {
          const data: CustomerLookupItem[] = await res.json();
          setSearchResults(data);
          setIsDropdownOpen(true);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Failed to query customer lookup:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectAccount = (acc: CustomerLookupItem) => {
    setSelectedAccount(acc);
    setSearchQuery("");
    setIsDropdownOpen(false);
    setErrorMessage("");
  };

  const handleClearSelection = () => {
    setSelectedAccount(null);
    setAmount("");
    setRemarks("");
    setErrorMessage("");
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const handlePresetAmount = (preset: number) => {
    setAmount(preset.toString());
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedAccount) {
      setErrorMessage(
        "Please select a customer account first using the search bar above.",
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than zero.");
      return;
    }
    setLoading(true);
    const endpoint =
      txnType === "deposit" ? "/api/txn/deposit" : "/api/txn/withdraw";

    try {
      const sessionId =
        typeof window !== "undefined"
          ? localStorage.getItem("session_id") || ""
          : "";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        credentials: "include",
        body: JSON.stringify({
          account_no: selectedAccount.account_no,
          amount: numAmount,
          remarks: remarks.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(
          data.message || `Transaction declined (Status: ${res.status})`,
        );
        return;
      }
      // Success: prepare receipt and display modal
      const newBal =
        typeof data.new_balance === "string"
          ? parseFloat(data.new_balance)
          : Number(data.new_balance);
      const parsedReceipt: TransactionReceipt = {
        reference_no: data.reference_no,
        timestamp: data.timestamp || new Date().toISOString(),
        account_no: data.account_no,
        customer_name: selectedAccount.customer_name,
        nic: selectedAccount.nic,
        username: selectedAccount.username,
        plan_name: selectedAccount.plan_name,
        txn_type: txnType,
        amount: numAmount,
        previous_balance: selectedAccount.balance,
        new_balance: newBal,
        remarks: data.remarks || remarks.trim(),
      };

      setReceipt(parsedReceipt);
      setIsReceiptModalOpen(true);

      // Update selectedAccount balance so subsequent actions use the fresh value
      setSelectedAccount({
        ...selectedAccount,
        balance: newBal,
      });

      // Clear inputs
      setAmount("");
      setRemarks("");
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "Failed to communicate with server. Please check backend connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNextTransaction = () => {
    setIsReceiptModalOpen(false);
    setReceipt(null);
    handleClearSelection();
  };

  return (
    <main className="min-h-screen bg-[#F3F4F6] text-[#000000] font-sans print:bg-white print:p-0">
      {/* ── Top Header Navigation ── */}
      <header className="border-b border-gray-200 bg-[#FFFFFF] px-6 py-4 sm:px-10 print:hidden">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/agent/portfolio"
              className="flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-[#001F3F] hover:bg-gray-100 transition shadow-xs"
              title="Back to Agent Portal"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <span className="block text-3xl font-extrabold uppercase leading-none tracking-[0.12em] text-[#06B6D4] sm:text-4xl">
                B-Trust MIMS
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#001F3F] sm:text-3xl">
                Agent Counter
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 print:hidden">
        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-xs">
            <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="font-bold text-rose-950">Transaction Alert</p>
              <p className="mt-0.5 text-xs text-rose-800">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage("")}
              className="text-rose-500 hover:text-rose-800 transition"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Card Top Banner */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* Customer & Account Lookup*/}
            <div>
              {!selectedAccount ? (
                <div className="relative" ref={dropdownRef}>
                  <div className="relative flex items-center">
                    <Search
                      size={18}
                      className="absolute left-3.5 text-gray-400 pointer-events-none"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Type customer's NIC (e.g. 198000000001)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (searchResults.length > 0) setIsDropdownOpen(true);
                      }}
                      className="w-full rounded-xl border border-gray-300 bg-[#F9FAFB] pl-10 pr-10 py-3 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20"
                    />
                    {isSearching ? (
                      <div className="absolute right-3.5 h-4 w-4 rounded-full border-2 border-[#06B6D4] border-t-transparent animate-spin"></div>
                    ) : searchQuery ? (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="absolute right-3.5 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    ) : null}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-30 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                      {searchResults.length === 0 ? (
                        <div className="px-4 py-5 text-center text-xs text-gray-500">
                          No matching active savings accounts found for &quot;
                          {searchQuery}&quot;.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="px-3 py-1.5 text-[11px] font-bold uppercase text-[#6B7280]">
                            Matching Accounts ({searchResults.length})
                          </div>
                          {searchResults.map((item) => (
                            <button
                              key={item.account_no}
                              type="button"
                              onClick={() => handleSelectAccount(item)}
                              className="w-full text-left rounded-lg p-3 hover:bg-[#F3F4F6] transition flex items-center justify-between group cursor-pointer border border-transparent hover:border-gray-200"
                            >
                              <div className="flex items-start gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-bold text-[#001F3F]">
                                      {item.account_no}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-gray-700 mt-0.5">
                                    {item.customer_name}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-gray-400 uppercase font-semibold">
                                  Balance
                                </span>
                                <p className="font-mono text-sm font-bold text-emerald-600">
                                  {currency.format(item.balance)}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Account Summary Card */
                <div className="rounded-xl border border-[#06B6D4]/40 bg-[#F0FDFA] p-5 shadow-xs transition">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[#001F3F]">
                            {selectedAccount.customer_name}
                          </h3>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Active Account
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mt-1">
                          <span className="font-mono font-semibold text-[#001F3F]">
                            {selectedAccount.account_no}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right sm:border-l sm:border-gray-200 sm:pl-4">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase">
                          Available Balance
                        </span>
                        <p className="text-xl font-extrabold font-mono text-[#001F3F]">
                          {currency.format(selectedAccount.balance)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-red-700 transition shadow-xs cursor-pointer"
                        title="Change customer account"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Controls*/}
            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTxnType("deposit")}
                    className={`flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-sm transition-all cursor-pointer border-2 ${
                      txnType === "deposit"
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "border-gray-200 bg-[#F9FAFB] text-gray-700 hover:bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-white/40 flex items-center justify-center">
                      {txnType === "deposit" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                      )}
                    </span>
                    Cash Deposit (+)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxnType("withdrawal")}
                    className={`flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-sm transition-all cursor-pointer border-2 ${
                      txnType === "withdrawal"
                        ? "border-rose-600 bg-rose-600 text-white shadow-md shadow-rose-600/20"
                        : "border-gray-200 bg-[#F9FAFB] text-gray-700 hover:bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full bg-white/40 flex items-center justify-center">
                      {txnType === "withdrawal" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                      )}
                    </span>
                    Cash Withdrawal (−)
                  </button>
                </div>
              </div>

              {/* Amount Input & Preset Chips */}
              <div>
                <div className="flex items-center justify-between mb-2"></div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-gray-400 text-base">
                    LKR
                  </span>
                  <input
                    id="txn-amount"
                    type="number"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!selectedAccount}
                    className="w-full rounded-xl border border-gray-300 bg-white pl-16 pr-4 py-3.5 font-mono text-xl font-bold text-[#001F3F] placeholder-gray-300 outline-none transition focus:border-[#06B6D4] focus:ring-2 focus:ring-[#06B6D4]/20 disabled:bg-gray-100 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Quick Presets */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {[1000, 2000, 5000, 10000, 25000, 50000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={!selectedAccount}
                      onClick={() => handlePresetAmount(preset)}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-[#001F3F] hover:text-white hover:border-[#001F3F] transition disabled:opacity-40 cursor-pointer"
                    >
                      +{currency.format(preset).replace("LKR", "").trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Remarks */}
              <div>
                <label
                  htmlFor="txn-remarks"
                  className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-1"
                >
                  Remarks
                </label>
                <input
                  id="txn-remarks"
                  type="text"
                  placeholder={
                    txnType === "deposit"
                      ? "e.g., Counter cash deposit by customer"
                      : "e.g., Over-the-counter cash withdrawal"
                  }
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={!selectedAccount}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs text-[#000000] outline-none transition focus:border-[#06B6D4] disabled:bg-gray-100"
                />
              </div>

              {/* Submit Execution Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !selectedAccount || !amount}
                  className={`w-full py-4 rounded-xl text-sm font-bold text-white shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    txnType === "deposit"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Processing Transaction...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>
                        Authorize{" "}
                        {txnType === "deposit"
                          ? "Cash Deposit"
                          : "Cash Withdrawal"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/*Printable Receipt */}
      <ReceiptModal
        receipt={receipt}
        isOpen={isReceiptModalOpen}
        onClose={handleNextTransaction}
      />
    </main>
  );
}
