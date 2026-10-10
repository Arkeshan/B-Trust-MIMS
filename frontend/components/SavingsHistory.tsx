"use client";

import { useEffect, useState } from "react";

interface Transaction {
  txn_id: number;
  account_no: string;
  txn_type: string;
  amount: number;
  timestamp: string;
}

export default function SavingsHistory({ accountId }: { accountId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Return early if no account is selected
    if (!accountId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const sessionId = localStorage.getItem("session_id") || "";
        const res = await fetch(`/api/account/${accountId}/history/recent`, {
          headers: { Authorization: `Bearer ${sessionId}` },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [accountId]); // Automatically runs when accountId changes

  if (loading) return <div className="p-4 flex items-center text-gray-500"><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></span>Loading history...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 mt-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">7-Day Transaction History</h2>
      
      {transactions.length === 0 ? (
        <p className="text-gray-500">No recent transactions found for this account.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-600">
                <th className="py-3 font-medium">Date</th>
                <th className="py-3 font-medium">Type</th>
                <th className="py-3 font-medium text-right">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.txn_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 text-gray-700">
                    {new Date(txn.timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-sm capitalize ${
                      txn.txn_type === 'deposit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {txn.txn_type}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono text-gray-800">
                    {txn.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
