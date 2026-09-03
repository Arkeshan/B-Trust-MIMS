"use client";

import { FormEvent, useEffect, useState } from "react";

type Transaction = {
  transaction_id: number;
  transaction_type: string;
  amount: number;
  balance_after: number;
  timestamp: string;
  reference_no: string;
};

type AccountHistory = {
  account_no: string;
  balance: number;
  transactions: Transaction[];
};

const currency = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

export default function CustomerDashboard() {
  const [accountInput, setAccountInput] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return new URLSearchParams(window.location.search).get("accounts") ?? "";
  });
  const [accounts, setAccounts] = useState<AccountHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAccounts(accountNumbers: string[]) {
    const uniqueAccounts = [
      ...new Set(
        accountNumbers.map((account) => account.trim()).filter(Boolean),
      ),
    ];
    if (uniqueAccounts.length === 0) {
      setError("Enter at least one account number.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const results = await Promise.all(
        uniqueAccounts.map(async (accountNumber) => {
          const response = await fetch(
            `/api/account/${encodeURIComponent(accountNumber)}/history`,
          );
          if (!response.ok) {
            throw new Error(`${accountNumber}: unable to load account history`);
          }
          return response.json() as Promise<AccountHistory>;
        }),
      );
      setAccounts(results);
    } catch (requestError) {
      setAccounts([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load account history.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const accountNumbers = new URLSearchParams(window.location.search).get(
      "accounts",
    );
    if (accountNumbers) {
      const loadInitialAccounts = window.setTimeout(() => {
        void loadAccounts(accountNumbers.split(","));
      }, 0);

      return () => window.clearTimeout(loadInitialAccounts);
    }
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadAccounts(accountInput.split(","));
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-slate-800 pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
            B-Trust MIMS
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Customer dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Review balances and recent activity across your savings accounts.
          </p>
        </header>

        <form
          onSubmit={submit}
          className="mb-8 flex flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="accounts" className="sr-only">
            Account numbers
          </label>
          <input
            id="accounts"
            value={accountInput}
            onChange={(event) => setAccountInput(event.target.value)}
            placeholder="Account numbers, separated by commas"
            className="min-h-12 flex-1 border border-slate-700 bg-slate-900 px-4 text-slate-100 outline-none transition focus:border-cyan-300"
          />
          <button
            type="submit"
            disabled={loading}
            className="min-h-12 bg-cyan-300 px-6 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Loading..." : "Load accounts"}
          </button>
        </form>

        {error && (
          <p
            role="alert"
            className="mb-6 border border-rose-400/40 bg-rose-950/40 px-4 py-3 text-rose-200"
          >
            {error}
          </p>
        )}

        {accounts.length === 0 && !loading && !error && (
          <div className="border border-dashed border-slate-700 px-6 py-12 text-center text-slate-400">
            No accounts loaded.
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          {accounts.map((account) => (
            <article
              key={account.account_no}
              className="border border-slate-800 bg-slate-900 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">Savings account</p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {account.account_no}
                  </h2>
                </div>
                <p className="text-right text-2xl font-semibold text-cyan-300">
                  {currency.format(account.balance)}
                </p>
              </div>

              <div className="mt-8 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-slate-700 text-slate-400">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Type</th>
                      <th className="pb-3 pr-4 font-medium">Amount</th>
                      <th className="pb-3 pr-4 font-medium">Balance</th>
                      <th className="pb-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.transactions.map((transaction) => (
                      <tr
                        key={transaction.transaction_id}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <td className="py-3 pr-4 capitalize">
                          {transaction.transaction_type}
                        </td>
                        <td className="py-3 pr-4">
                          {currency.format(transaction.amount)}
                        </td>
                        <td className="py-3 pr-4">
                          {currency.format(transaction.balance_after)}
                        </td>
                        <td className="py-3 text-slate-400">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {account.transactions.length === 0 && (
                  <p className="pt-4 text-sm text-slate-400">
                    No transactions found.
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
