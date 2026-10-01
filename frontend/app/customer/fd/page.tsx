"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  PiggyBank,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import ActiveFD from "./components/ActiveFD";

// Type

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

// Helpers

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

// FD Card Component

function FDCard({ fd }: { fd: FixedDeposit }) {
  const days = daysUntil(fd.next_payout_date);
  const term = fd.plan?.term_months || 12;
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

      <div>
        <span className="text-xs text-[#6B7280]">Principal Investment</span>
        <p className="text-2xl font-extrabold text-[#001F3F] tracking-tight">
          {fmtLKR(fd.investment)}
        </p>
      </div>

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
        <div className="col-span-2 rounded-lg bg-white border border-gray-200/80 p-2.5 text-center">
          <p className="text-[11px] font-medium text-[#6B7280]">
            Next Payout Cycle
          </p>
          <p className="text-sm font-bold text-[#001F3F] mt-0.5">
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

//  Main Page Content

function CustomerFDContent() {
  const searchParams = useSearchParams();
  const linkedParam = searchParams.get("account") ?? "";

  const [fds, setFds] = useState<FixedDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadFDs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const token = localStorage.getItem("token") || "";
      
      const fdsRes = await fetch(`/api/fd/list`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!fdsRes.ok) throw new Error(await fdsRes.text());

      const fdsData: FixedDeposit[] = await fdsRes.json();

      setFds(
        linkedParam
          ? (fdsData || []).filter((fd) => fd.account_no === linkedParam)
          : fdsData || [],
      );
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [linkedParam]);

  useEffect(() => {
    loadFDs();
  }, [loadFDs]);



  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 bg-[#FFFFFF] px-6 py-5 sm:px-10">
        <div className="mx-auto max-w-7xl flex items-center gap-3">
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
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 space-y-8">
        <div className="grid grid-cols-1 gap-8">
          {/* ── Left Column: Active FDs ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="text-base font-bold text-[#001F3F] uppercase tracking-wider">
                Active Term Investments
              </h2>
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
                <ActiveFD key={fd.fd_acc_no} fdAccNo={fd.fd_acc_no} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function CustomerFDPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-500">
          Loading Fixed Deposits...
        </div>
      }
    >
      <CustomerFDContent />
    </Suspense>
  );
}
