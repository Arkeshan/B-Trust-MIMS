"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  PiggyBank,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FDPlan {
  fd_plan_id: number;
  interest_rate: number;
  term_months: number;
}

interface FixedDeposit {
  fd_acc_no: string;
  account_no: string;
  plan: FDPlan;
  investment: number;
  start_date: string;
  maturity_date: string;
  next_payout_date: string;
  interest_paid_so_far: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const TERM_LABEL: Record<number, string> = {
  6: "6 Months",
  12: "1 Year",
  36: "3 Years",
};

function fmtLKR(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function daysUntil(iso: string): number {
  if (!iso) return 0;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

// ─── FD Card Component ────────────────────────────────────────────────────────

function FDCard({ fd }: { fd: FixedDeposit }) {
  const days = daysUntil(fd.next_payout_date);
  const term = fd.plan?.term_months || 12;
  const rate = fd.plan?.interest_rate || 0;
  const pct = Math.min(
    100,
    (fd.interest_paid_so_far / (fd.investment || 1)) * 100 * (12 / term),
  );

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-[#F3F4F6] p-6 shadow-sm transition hover:shadow-md">
      {/* Top Brand Accent Bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-[#06B6D4]" />

      <div className="mb-4 flex items-start justify-between">
        <div>
          <span className="font-mono text-xs font-semibold text-[#06B6D4]">
            {fd.fd_acc_no}
          </span>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            Linked Savings:{" "}
            <span className="font-mono font-medium text-[#000000]">
              {fd.account_no}
            </span>
          </p>
        </div>
        <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-[#001F3F] border border-cyan-200">
          {TERM_LABEL[term] ?? `${term} Months`}
        </span>
      </div>

      <div className="mb-2">
        <span className="text-xs text-[#6B7280]">Principal Investment</span>
        <p className="text-2xl font-extrabold text-[#001F3F] tracking-tight">
          {fmtLKR(fd.investment)}
        </p>
      </div>

      <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
        <TrendingUp size={14} />
        {rate}% p.a. · {fmtLKR(fd.interest_paid_so_far)} earned to date
      </p>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full rounded-full bg-gray-300/70 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#06B6D4] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-white p-2.5 border border-gray-200/80">
          <p className="text-[#6B7280] flex items-center gap-1">
            <Calendar size={12} /> Start Date
          </p>
          <p className="font-semibold text-[#000000] mt-0.5">
            {fmtDate(fd.start_date)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-2.5 border border-gray-200/80">
          <p className="text-[#6B7280] flex items-center gap-1">
            <Clock size={12} /> Maturity Date
          </p>
          <p className="font-semibold text-[#000000] mt-0.5">
            {fmtDate(fd.maturity_date)}
          </p>
        </div>
        <div className="col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-center">
          <p className="text-[11px] font-medium text-amber-800">
            Next Payout Cycle
          </p>
          <p className="text-sm font-bold text-amber-900">
            {days === 0
              ? "Due Today"
              : `In ${days} day${days !== 1 ? "s" : ""}`}{" "}
            ({fmtDate(fd.next_payout_date)})
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerFDPage() {
  const searchParams = useSearchParams();
  const linkedParam = searchParams.get("account") ?? "";

  const [fds, setFds] = useState<FixedDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form State
  const [accountNo, setAccountNo] = useState("");
  const [planId, setPlanId] = useState<number>(2); // Default: 12-Month Plan
  const [investment, setInvestment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formResult, setFormResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  // Set account from query param if available
  useEffect(() => {
    if (linkedParam) {
      setAccountNo(linkedParam);
    }
  }, [linkedParam]);

  const loadFDs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API}/api/fd/list`);
      if (!res.ok) throw new Error(await res.text());
      const data: FixedDeposit[] = await res.json();
      setFds(
        linkedParam
          ? (data || []).filter((fd) => fd.account_no === linkedParam)
          : data || [],
      );
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFDs();
  }, [loadFDs]);

  async function handleOpenFD(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormResult(null);

    const inv = parseFloat(investment);
    if (isNaN(inv) || inv <= 0) {
      setFormResult({
        ok: false,
        msg: "Investment amount must be a positive number.",
      });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/fd/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_no: accountNo.trim(),
          fd_plan_id: planId,
          investment: inv,
        }),
      });

      const data: { fd_acc_no?: string; message?: string; error?: string } =
        await res.json();

      if (!res.ok) {
        setFormResult({
          ok: false,
          msg: data.error ?? "Failed to open Fixed Deposit.",
        });
      } else {
        setFormResult({
          ok: true,
          msg: `Success! Created Fixed Deposit ${data.fd_acc_no ?? ""}`,
        });
        setInvestment("");
        await loadFDs();
      }
    } catch (e) {
      setFormResult({ ok: false, msg: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans">
      {/* Header */}
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
                Fixed Deposits
              </h1>
            </div>
          </div>

          <button
            onClick={loadFDs}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-[#F3F4F6] px-3.5 py-2 text-xs font-semibold text-[#001F3F] hover:border-[#06B6D4] transition cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh List
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          {/* ── Left Column: Active FDs ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="text-base font-bold text-[#001F3F] uppercase tracking-wider">
                Active Term Investments
              </h2>
              {fds.length > 0 && (
                <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-[#001F3F]">
                  {fds.length} Active
                </span>
              )}
            </div>

            {loading && (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#001F3F] border-t-[#06B6D4]" />
              </div>
            )}

            {fetchError && !loading && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                <AlertCircle size={16} />
                <span>{fetchError}</span>
              </div>
            )}

            {!loading && !fetchError && fds.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-[#F3F4F6] py-16 text-center">
                <PiggyBank size={36} className="text-[#6B7280] mb-2" />
                <p className="font-semibold text-[#000000]">
                  No Fixed Deposits Found
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Open a term deposit using the panel on the right to start
                  earning monthly returns.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {fds.map((fd) => (
                <FDCard key={fd.fd_acc_no} fd={fd} />
              ))}
            </div>
          </section>

          {/* ── Right Column: Management Actions ── */}
          <aside className="space-y-6">
            {/* Open FD Form: unavailable when the selected account already has an FD. */}
            {(!linkedParam || fds.length === 0) && (
              <div className="rounded-xl border border-gray-200 bg-[#F3F4F6] p-6 shadow-sm">
                <h3 className="text-base font-bold text-[#001F3F]">
                  Open a Fixed Deposit
                </h3>
                <p className="mt-1 text-xs text-[#6B7280]">
                  One fixed deposit per savings account. Minimum investment of
                  LKR 1,000 required.
                </p>

                <form onSubmit={handleOpenFD} className="mt-5 space-y-4">
                  {/* Savings Account */}
                  <div>
                    <label
                      htmlFor="fd-account-no"
                      className="block text-xs font-semibold uppercase text-[#6B7280]"
                    >
                      Linked Savings Account
                    </label>
                    <input
                      id="fd-account-no"
                      type="text"
                      required
                      placeholder="ACC000000001"
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 font-mono text-sm text-[#000000] focus:border-[#06B6D4] outline-none transition"
                    />
                  </div>

                  {/* Plan Selection */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-[#6B7280] mb-1">
                      Select Plan Tier
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 1, label: "6 Mo", rate: "13%" },
                        { id: 2, label: "1 Yr", rate: "14%" },
                        { id: 3, label: "3 Yrs", rate: "15%" },
                      ].map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setPlanId(plan.id)}
                          className={`rounded-lg border p-2 text-center transition cursor-pointer ${planId === plan.id
                              ? "border-[#06B6D4] bg-white text-[#001F3F] shadow-xs"
                              : "border-gray-200 bg-transparent text-[#6B7280] hover:bg-white/50"
                            }`}
                        >
                          <p className="text-xs font-bold">{plan.label}</p>
                          <p className="text-[10px] text-[#06B6D4] font-semibold">
                            {plan.rate} p.a.
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Deposit Investment */}
                  <div>
                    <label
                      htmlFor="fd-investment"
                      className="block text-xs font-semibold uppercase text-[#6B7280]"
                    >
                      Investment Amount (LKR)
                    </label>
                    <input
                      id="fd-investment"
                      type="number"
                      required
                      min="1000"
                      step="0.01"
                      placeholder="50000.00"
                      value={investment}
                      onChange={(e) => setInvestment(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-[#000000] focus:border-[#06B6D4] outline-none transition"
                    />
                  </div>

                  {/* Form Message */}
                  {formResult && (
                    <div
                      className={`flex items-start gap-2 rounded-lg p-3 text-xs border ${formResult.ok
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-rose-200 bg-rose-50 text-rose-800"
                        }`}
                    >
                      {formResult.ok ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                      <span>{formResult.msg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-[#001F3F] py-2.5 text-xs font-bold text-white transition hover:bg-[#001F3F]/90 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting
                      ? "Opening Account..."
                      : "Confirm & Open Deposit"}
                  </button>
                </form>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
