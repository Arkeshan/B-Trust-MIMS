"use client";

import { useState, useEffect, useCallback } from "react";

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

// OpenFDResponse is inlined at the call site as needed

interface CronResult {
  fds_processed: number;
  fds_skipped: number;
  run_at: string;
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";



function fmtDate(iso: string): string {
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
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function Badge({ label, colour }: { label: string; colour: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colour}`}
    >
      {label}
    </span>
  );
}

// ─── FD Card ──────────────────────────────────────────────────────────────────

function FDCard({ fd }: { fd: FixedDeposit }) {
  const days = daysUntil(fd.next_payout_date);
  const pct = Math.min(
    100,
    ((fd.interest_paid_so_far / fd.investment) * 100 * (12 / fd.plan.term_months))
  );

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:bg-white/10 hover:shadow-[0_0_40px_rgba(52,211,153,0.08)]">
      {/* Accent bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-60 transition-opacity group-hover:opacity-100" />

      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-zinc-500">{fd.fd_acc_no}</p>
          <p className="mt-0.5 text-sm text-zinc-400">
            Linked to{" "}
            <span className="font-mono text-zinc-300">{fd.account_no}</span>
          </p>
        </div>
        <Badge
          label={TERM_LABEL[fd.plan.term_months] ?? `${fd.plan.term_months}mo`}
          colour="bg-emerald-900/60 text-emerald-300 border border-emerald-700/50"
        />
      </div>

      <p className="mb-1 text-3xl font-bold tracking-tight text-white">
        {fmtLKR(fd.investment)}
      </p>
      <p className="text-sm text-emerald-400">
        {fd.plan.interest_rate}% p.a. · {fmtLKR(fd.interest_paid_so_far)} earned
      </p>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-zinc-500">Start Date</p>
          <p className="text-zinc-200">{fmtDate(fd.start_date)}</p>
        </div>
        <div>
          <p className="text-zinc-500">Maturity</p>
          <p className="text-zinc-200">{fmtDate(fd.maturity_date)}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center">
          <p className="text-xs text-amber-400">Next payout in</p>
          <p className="text-lg font-bold text-amber-300">
            {days === 0 ? "Today" : `${days} day${days !== 1 ? "s" : ""}`}
          </p>
          <p className="text-xs text-zinc-500">{fmtDate(fd.next_payout_date)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerFDPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [fds, setFds] = useState<FixedDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Open FD form
  const [accountNo, setAccountNo] = useState("");
  const [planId, setPlanId] = useState<number>(2); // default: 12-month
  const [investment, setInvestment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formResult, setFormResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  // Cron test
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<CronResult | null>(null);
  const [cronError, setCronError] = useState<string | null>(null);

  // ── Data fetch — replace with real account_no from auth context ──────────
  const loadFDs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // In a real app, derive account_no from the session/JWT.
      // For QA testing we load all active FDs via the view endpoint.
      const res = await fetch(`${API}/api/fd/list`);
      if (!res.ok) throw new Error(await res.text());
      const data: FixedDeposit[] = await res.json();
      setFds(data);
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadFDs();
  }, [loadFDs]);

  // ── Open FD handler ────────────────────────────────────────────────────────
  async function handleOpenFD(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormResult(null);

    const inv = parseFloat(investment);
    if (isNaN(inv) || inv <= 0) {
      setFormResult({ ok: false, msg: "Investment must be a positive number." });
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

      const data: { fd_acc_no: string; message: string; error?: string } = await res.json();

      if (!res.ok) {
        setFormResult({ ok: false, msg: data.error ?? "Failed to open FD." });
      } else {
        setFormResult({
          ok: true,
          msg: `✓ ${data.message} — Account: ${data.fd_acc_no}`,
        });
        setAccountNo("");
        setInvestment("");
        await loadFDs(); // refresh card list
      }
    } catch (e) {
      setFormResult({ ok: false, msg: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Manual cron trigger ────────────────────────────────────────────────────
  async function handleRunCron() {
    setCronRunning(true);
    setCronResult(null);
    setCronError(null);

    try {
      const res = await fetch(`${API}/api/cron/interest`, { method: "POST" });
      const data: CronResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cron run failed.");
      setCronResult(data);
      await loadFDs();
    } catch (e) {
      setCronError((e as Error).message);
    } finally {
      setCronRunning(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080c14] font-sans text-white selection:bg-emerald-500/30">
      {/* Background mesh */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(52,211,153,0.12),transparent)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Fixed Deposits</h1>
              <p className="text-sm text-zinc-500">B-Trust Microfinance · Investment Portal</p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* ── Left: FD Cards ── */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-200">
                My Fixed Deposits
                {fds.length > 0 && (
                  <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-sm font-normal text-emerald-400">
                    {fds.length}
                  </span>
                )}
              </h2>
              <button
                onClick={loadFDs}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            )}

            {fetchError && !loading && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {fetchError}
              </div>
            )}

            {!loading && !fetchError && fds.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                  <svg className="h-7 w-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-zinc-400">No Fixed Deposits found</p>
                <p className="mt-1 text-sm text-zinc-600">Open one using the form →</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {fds.map((fd) => (
                <FDCard key={fd.fd_acc_no} fd={fd} />
              ))}
            </div>
          </section>

          {/* ── Right: Sidebar ── */}
          <aside className="space-y-6">

            {/* Open FD Form */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <h2 className="mb-1 text-base font-semibold text-white">Open a Fixed Deposit</h2>
              <p className="mb-5 text-xs text-zinc-500">One FD per savings account. Min. investment LKR 1,000.</p>

              <form onSubmit={handleOpenFD} className="space-y-4" id="open-fd-form">
                {/* Savings Account No */}
                <div>
                  <label htmlFor="fd-account-no" className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Savings Account No.
                  </label>
                  <input
                    id="fd-account-no"
                    type="text"
                    required
                    placeholder="ACC000000001"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* FD Plan selector */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Plan
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 1, label: "6 Months", rate: "13%" },
                      { id: 2, label: "1 Year", rate: "14%" },
                      { id: 3, label: "3 Years", rate: "15%" },
                    ].map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        id={`fd-plan-${plan.id}`}
                        onClick={() => setPlanId(plan.id)}
                        className={`rounded-xl border p-2.5 text-center transition ${
                          planId === plan.id
                            ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                            : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <p className="text-xs font-semibold">{plan.label}</p>
                        <p className="text-[10px] text-zinc-500">{plan.rate} p.a.</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Investment Amount */}
                <div>
                  <label htmlFor="fd-investment" className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Investment (LKR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                      LKR
                    </span>
                    <input
                      id="fd-investment"
                      type="number"
                      required
                      min="1000"
                      step="0.01"
                      placeholder="50000.00"
                      value={investment}
                      onChange={(e) => setInvestment(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-12 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Result message */}
                {formResult && (
                  <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                      formResult.ok
                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border border-red-500/20 bg-red-500/10 text-red-400"
                    }`}
                  >
                    {formResult.msg}
                  </div>
                )}

                <button
                  id="btn-open-fd"
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Opening…" : "Open Fixed Deposit"}
                </button>
              </form>
            </div>

            {/* QA: Manual Cron Trigger */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-amber-300">QA: Trigger Interest Run</h3>
              </div>
              <p className="mb-4 text-xs text-zinc-500">
                Manually execute the 30-day FD interest cycle. Equivalent to the scheduled MySQL event.
              </p>

              <button
                id="btn-run-cron"
                onClick={handleRunCron}
                disabled={cronRunning}
                className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cronRunning ? "Running…" : "POST /api/cron/interest"}
              </button>

              {cronResult && (
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs">
                  <p className="font-semibold text-emerald-300">{cronResult.message}</p>
                  <p className="mt-1 text-zinc-500">
                    Run at: {new Date(cronResult.run_at).toLocaleString()}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-900/40 p-2">
                      <p className="text-lg font-bold text-emerald-300">{cronResult.fds_processed}</p>
                      <p className="text-zinc-500">Processed</p>
                    </div>
                    <div className="rounded-lg bg-zinc-800/60 p-2">
                      <p className="text-lg font-bold text-zinc-300">{cronResult.fds_skipped}</p>
                      <p className="text-zinc-500">Skipped</p>
                    </div>
                  </div>
                </div>
              )}

              {cronError && (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {cronError}
                </div>
              )}
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}
