"use client";

import { useState } from "react";

export default function AgentTransferPage() {
  const [accountNo, setAccountNo] = useState("");
  const [amount, setAmount] = useState("");
  const [txnType, setTxnType] = useState<"deposit" | "withdraw">("deposit");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string; balance?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const endpoint = txnType === "deposit" ? "/api/txn/deposit" : "/api/txn/withdraw";

    try {
      const res = await fetch(`http://localhost:8080${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_no: accountNo,
          amount: parseFloat(amount),
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.message || `Server responded with status ${res.status}`,
        });
      } else {
        setFeedback({
          type: "success",
          message: `${data.message || "Transaction completed."}`,
          balance: data.new_balance,
        });
        setAmount("");
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: "Failed to connect to backend server. Make sure Go is running on port 8080.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-zinc-900">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-xl font-bold mb-1">Agent Banking Counter</h1>
        <p className="text-sm text-zinc-500 mb-6">Process customer deposits and withdrawals</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxnType("deposit")}
                className={`py-2 text-sm font-medium rounded-lg border transition ${
                  txnType === "deposit"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => setTxnType("withdraw")}
                className={`py-2 text-sm font-medium rounded-lg border transition ${
                  txnType === "withdraw"
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                Withdraw
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
              Account Number
            </label>
            <input
              type="text"
              required
              placeholder="ACC000000001"
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1">
              Amount (LKR)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              placeholder="5000.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : `Execute ${txnType === "deposit" ? "Deposit" : "Withdrawal"}`}
          </button>
        </form>

        {feedback && (
          <div
            className={`mt-6 p-4 rounded-lg text-sm border ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <p className="font-semibold">{feedback.type === "success" ? "Success" : "Failed"}</p>
            <p className="mt-0.5 text-xs">{feedback.message}</p>
            {feedback.balance && (
              <p className="mt-2 font-mono text-xs font-bold">
                Updated Balance: LKR {feedback.balance}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}