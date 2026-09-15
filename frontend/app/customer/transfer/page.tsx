"use client";

import { useState, useEffect, useRef } from "react";

// $$$ Data Models $$$
// Model for customer savings accounts.
interface CustomerAccount {
  account_no: string;
  balance: string;
}

interface RecipientLookup {
  account_no: string;
  masked_name: string;
  status: string;
}

interface TransferReceipt {
  status: string;
  message: string;
  reference_no: string;
  from_account: string;
  to_account: string;
  amount: string;
  sender_new_balance: string;
  timestamp: string;
  remarks?: string;
}

// $$$ Currency Formatter $$$
// Formats numerical string into clean Sri Lankan Rupee currency format.
function formatLKR(value: string | number): string {
  const numeric = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numeric)) return "0.00";
  return numeric.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// $$$ Customer Transfer Page $$$
// Interactive 3-row fund transfer interface.
export default function CustomerTransferPage() {
  // Row 1 State: Customer accounts and active selection
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [selectedAccountNo, setSelectedAccountNo] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Row 2 State: Recipient input and instant verification
  const [toAccountNo, setToAccountNo] = useState<string>("");
  const [isVerifyingRecipient, setIsVerifyingRecipient] = useState<boolean>(false);
  const [verifiedRecipient, setVerifiedRecipient] = useState<RecipientLookup | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  // Row 3 State: Amount and Remarks
  const [amount, setAmount] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Action State: Processing, error, and receipt
  type TransferStep = "form" | "processing" | "success";
  const [step, setStep] = useState<TransferStep>("form");
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransferReceipt | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // $$$ 1. Fetch Accounts on Page Load $$$
  // Queries backend for active savings accounts owned by the logged-in customer.
  useEffect(() => {
    async function loadCustomerAccounts() {
      try {
        setLoadingAccounts(true);
        setFetchError(null);

        const res = await fetch("/api/customer/accounts");
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }

        const data: CustomerAccount[] = await res.json();
        setAccounts(data);

        // Auto-select the primary account if available
        if (data.length > 0) {
          setSelectedAccountNo(data[0].account_no);
        }
      } catch {
        setFetchError("Could not connect to backend to fetch accounts. Make sure Go is running.");
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadCustomerAccounts();
  }, []);

  // $$$ 2. Automatic Recipient Verification $$$
  // Triggers recipient lookup ONLY when exactly 12 characters are reached.
  useEffect(() => {
    const trimmed = toAccountNo.trim().toUpperCase();

    // Reset when character count is not 12
    if (trimmed.length !== 12) {
      setVerifiedRecipient(null);
      setRecipientError(null);
      return;
    }

    if (trimmed === selectedAccountNo) {
      setVerifiedRecipient(null);
      setRecipientError("Cannot transfer to same account.");
      return;
    }

    let isMounted = true;
    async function verifyRecipient() {
      setIsVerifyingRecipient(true);
      setRecipientError(null);
      setVerifiedRecipient(null);

      try {
        const res = await fetch(`/api/account/lookup?account_no=${encodeURIComponent(trimmed)}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setRecipientError("Account not found.");
        } else {
          setVerifiedRecipient(data);
        }
      } catch {
        if (isMounted) {
          setRecipientError("Unable to verify account.");
        }
      } finally {
        if (isMounted) setIsVerifyingRecipient(false);
      }
    }

    verifyRecipient();

    return () => {
      isMounted = false;
    };
  }, [toAccountNo, selectedAccountNo]);

  // Compute live available balance and overdraft guard
  const currentAccount = accounts.find((acc) => acc.account_no === selectedAccountNo);
  const availableBalance = currentAccount ? parseFloat(currentAccount.balance) : 0;
  const numericAmount = parseFloat(amount) || 0;
  const isOverdraft = numericAmount > availableBalance;
  const isInvalidRemarks = remarks.trim().length > 0 && remarks.trim().length < 3;

  // Lock input to at most 2 decimal places after the dot
  const handleAmountChange = (val: string) => {
    if (val === "" || /^\d*(\.\d{0,2})?$/.test(val)) {
      setAmount(val);
    }
  };

  // Format to 2 decimal places on blur (e.g. 5200 -> 5200.00)
  const handleAmountBlur = () => {
    if (amount !== "") {
      const num = parseFloat(amount);
      if (!isNaN(num) && num > 0) {
        setAmount(num.toFixed(2));
      }
    }
  };

  // $$$ 3. Execute Transfer $$$
  // Sends ACID transfer request to the backend.
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedAccountNo || !verifiedRecipient) {
      setSubmitError("Please select a source account and verify recipient.");
      return;
    }

    if (numericAmount <= 0) {
      setSubmitError("Please enter an amount greater than zero.");
      return;
    }

    if (isOverdraft) {
      setSubmitError("Amount exceeds available balance.");
      return;
    }

    if (isInvalidRemarks) {
      setSubmitError("Remarks must be at least 3 letters if provided.");
      return;
    }

    try {
      setSubmitting(true);
      setStep("processing");

      // Runs transfer with smooth minimum delay for fluid animation transition
      const [res] = await Promise.all([
        fetch("/api/customer/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_account: selectedAccountNo,
            to_account: verifiedRecipient.account_no,
            amount: numericAmount,
            remarks: remarks.trim(),
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.message || "Transfer failed.");
        setStep("form");
        return;
      }

      setReceipt(data);
      setStep("success");

      // Refresh all accounts from the backend so internal transfers update both accounts immediately
      try {
        const accRes = await fetch("/api/customer/accounts");
        if (accRes.ok) {
          const freshAccounts: CustomerAccount[] = await accRes.json();
          setAccounts(freshAccounts);
        }
      } catch {
        // Fallback update for sender account
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.account_no === selectedAccountNo
              ? { ...acc, balance: data.sender_new_balance }
              : acc
          )
        );
      }
    } catch {
      setSubmitError("Failed to communicate with transfer service.");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  // $$$ 4. Reset Form for New Transfer $$$
  const handleReset = () => {
    setIsExiting(true);

    setTimeout(async () => {
      setReceipt(null);
      setToAccountNo("");
      setVerifiedRecipient(null);
      setRecipientError(null);
      setAmount("");
      setRemarks("");
      setSubmitError(null);
      setStep("form");
      setIsExiting(false);

      // Ensure fresh balances are loaded for all accounts
      try {
        const accRes = await fetch("/api/customer/accounts");
        if (accRes.ok) {
          const freshAccounts: CustomerAccount[] = await accRes.json();
          setAccounts(freshAccounts);
        }
      } catch {
        // Keep existing accounts
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#000000] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-left">
          <h1 className="text-3xl font-bold text-[#001F3F] tracking-tight">Fund Transfer</h1>
        </div>

        {/* $$$ State-Driven Views $$$ */}
        {step === "processing" ? (
          /* $$$ 1. Processing Loading View $$$ */
          <div className="bg-white border border-gray-200 rounded-2xl p-12 shadow-sm flex flex-col items-center justify-center text-center animate-fade-in min-h-[360px]">
            <div className="relative w-16 h-16 mb-5">
              <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-[#001F3F] border-r-[#06B6D4] animate-spin"></div>
            </div>
            <p className="text-sm font-semibold text-[#001F3F]">
              Processing transaction...
            </p>
          </div>
        ) : step === "success" && receipt ? (
          /* $$$ 2. Transfer Receipt View $$$ */
          <div className={`bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6 transition-all duration-300 ease-out ${
            isExiting ? "opacity-0 scale-[0.98] translate-y-1" : "animate-fade-in"
          }`}>
            <div className="text-center pb-4 border-b border-gray-100 flex flex-col items-center">
              {/* Animated Green Checkmark */}
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl font-bold animate-scale-in mb-3">
                ✓
              </div>
              <h2 className="text-xl font-bold text-[#001F3F]">Transfer Successful</h2>
              <p className="text-xs text-[#6B7280] mt-1 font-mono">{receipt.reference_no}</p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-[#6B7280]">Transferred Amount</span>
                <span className="font-bold text-[#001F3F]">LKR {formatLKR(receipt.amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-[#6B7280]">From Account</span>
                <span className="font-mono text-gray-800">{receipt.from_account}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-[#6B7280]">To Account</span>
                <span className="font-mono text-gray-800">{receipt.to_account}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-[#6B7280]">Balance</span>
                <span className="font-semibold text-[#001F3F]">LKR {formatLKR(receipt.sender_new_balance)}</span>
              </div>
              {receipt.remarks && receipt.remarks.trim() !== "" && (
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-[#6B7280]">Remarks</span>
                  <span className="text-gray-800 font-medium text-right max-w-[60%] truncate">
                    {receipt.remarks}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-[#6B7280]">Date & Time</span>
                <span className="text-xs text-[#6B7280]">
                  {new Date(receipt.timestamp).toLocaleString("en-LK")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3.5 bg-[#001F3F] text-white rounded-xl text-sm font-semibold hover:bg-[#002b54] transition shadow-sm"
            >
              Make Another Transfer
            </button>
          </div>
        ) : (
          /* $$$ 3. Transfer Form View $$$ */
          <form onSubmit={handleTransfer} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6 animate-fade-in">
          
          {/* $$$ Row 1: Source Account Selection $$$ */}
          <div className="p-5 rounded-xl bg-[#F3F4F6] border border-gray-200 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]">
              FROM
            </label>

            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-sm text-[#6B7280] py-3">
                <span className="w-4 h-4 border-2 border-[#001F3F] border-t-transparent rounded-full animate-spin"></span>
                Loading accounts...
              </div>
            ) : fetchError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {fetchError}
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-sm text-red-600 py-2">
                No active savings accounts found for this customer.
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                {/* Selected Account Trigger */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#06B6D4] transition"
                >
                  <div>
                    <div className="text-sm font-bold text-[#001F3F]">
                      {currentAccount?.account_no}
                    </div>
                    <div className="text-xs text-[#6B7280] mt-0.5">
                      Available: LKR {formatLKR(currentAccount?.balance ?? 0)}
                    </div>
                  </div>
                  <span className={`text-xs text-gray-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>

                {/* Dropdown Options Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden divide-y divide-gray-100 animate-dropdown">
                    {accounts.map((acc) => (
                      <button
                        key={acc.account_no}
                        type="button"
                        onClick={() => {
                          setSelectedAccountNo(acc.account_no);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left transition flex items-center justify-between ${
                          acc.account_no === selectedAccountNo
                            ? "bg-blue-50/70 border-l-4 border-[#001F3F]"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-[#001F3F]">
                            {acc.account_no}
                          </div>
                          <div className="text-xs text-[#6B7280] mt-0.5">
                            Available: LKR {formatLKR(acc.balance)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* $$$ Row 2: Recipient Account & Name Verification $$$ */}
          <div className="p-5 rounded-xl bg-[#F3F4F6] border border-gray-200 space-y-3">
            <label htmlFor="recipientAccount" className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]">
              TO
            </label>

            <div className="relative">
              <input
                id="recipientAccount"
                type="text"
                maxLength={12}
                placeholder="e.g. ACC000000002"
                value={toAccountNo}
                onChange={(e) => setToAccountNo(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm font-mono tracking-wider text-[#000000] placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[#06B6D4] transition"
              />

              {isVerifyingRecipient && (
                <div className="absolute right-3 top-3.5 flex items-center gap-1.5 text-xs text-[#06B6D4] font-medium font-sans">
                  <span className="w-3.5 h-3.5 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin"></span>
                  Verifying...
                </div>
              )}
            </div>

            {/* Verified Hidden Name (Smooth animation, minimal black text) */}
            {verifiedRecipient && (
              <div className="animate-fade-in pt-1 px-1">
                <p className="text-sm font-medium text-[#000000]">
                  {verifiedRecipient.masked_name}
                </p>
              </div>
            )}

            {/* Same-account / lookup notice (Smooth animation, minimal text, no red tint) */}
            {recipientError && (
              <div className="animate-fade-in pt-1 px-1">
                <p className="text-xs text-[#6B7280]">
                  {recipientError}
                </p>
              </div>
            )}
          </div>

          {/* $$$ Row 3: Amount & Remarks $$$ */}
          <div className="p-5 rounded-xl bg-[#F3F4F6] border border-gray-200 space-y-4">
            <div>
              <label htmlFor="transferAmount" className="block text-xs font-bold uppercase tracking-wider text-[#001F3F] mb-2">
                AMOUNT
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-xs font-bold text-[#6B7280]">
                  LKR
                </span>
                <input
                  id="transferAmount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onBlur={handleAmountBlur}
                  className="w-full pl-14 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-[#000000] focus:outline-none focus:ring-2 focus:ring-[#06B6D4] transition"
                />
              </div>

              {isOverdraft && (
                <div className="animate-fade-in pt-1 px-1">
                  <p className="text-xs text-[#6B7280]">
                    Amount exceeds available balance.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="transferRemarks" className="block text-xs font-bold uppercase tracking-wider text-[#001F3F] mb-2">
                REMARKS (OPTIONAL)
              </label>
              <input
                id="transferRemarks"
                type="text"
                maxLength={100}
                placeholder="e.g. Rent, Bill payment, Gift"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm text-[#000000] focus:outline-none focus:ring-2 focus:ring-[#06B6D4] transition"
              />

              {isInvalidRemarks && (
                <div className="animate-fade-in pt-1 px-1">
                  <p className="text-xs text-[#6B7280]">
                    Remarks must be at least 3 letters.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submission Notice / Error */}
          {submitError && (
            <div className="animate-fade-in px-1 text-center">
              <p className="text-xs text-[#6B7280]">
                {submitError}
              </p>
            </div>
          )}

          {/* $$$ Pay Now Action Button $$$ */}
          <div>
            <button
              type="submit"
              disabled={
                submitting ||
                loadingAccounts ||
                !verifiedRecipient ||
                numericAmount <= 0 ||
                isOverdraft ||
                isInvalidRemarks
              }
              className="w-full py-3.5 bg-[#001F3F] text-white rounded-xl text-sm font-semibold hover:bg-[#002b54] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Processing Transfer...</span>
                </>
              ) : (
                <span>Pay Now</span>
              )}
            </button>
          </div>

        </form>
        )}

      </div>
    </div>
  );
}
