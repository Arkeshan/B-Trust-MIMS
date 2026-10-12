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
  ShieldAlert,
  X,
  PlusCircle,
} from "lucide-react";
import ActiveFD from "./components/ActiveFD";

// Type

interface FixedDeposit {
  fd_acc_no: string;
  account_no: string;
}



//  Main Page Content

function CustomerFDContent() {
  const searchParams = useSearchParams();
  const linkedParam = searchParams.get("account") ?? "";

  const [fds, setFds] = useState<FixedDeposit[]>([]);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAgentNotice, setShowAgentNotice] = useState(false);


  const loadFDs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const token = localStorage.getItem("session_id") || "";
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
              <button
                type="button"
                onClick={() => setShowAgentNotice(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#001F3F] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#001F3F]/90 transition"
              >
                <PlusCircle size={15} />
                <span>Open New Fixed Deposit</span>
              </button>
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
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-[#F3F4F6] py-16 text-center px-4">
                <PiggyBank size={36} className="text-[#6B7280] mb-2" />
                <p className="font-semibold text-[#000000]">
                  No Fixed Deposits Found
                </p>
                <p className="text-xs text-[#6B7280] mt-1 max-w-md">
                  Fixed Deposits are opened exclusively by authorized bank agents. Please contact your assigned agent or visit your nearest B-Trust branch to open a term deposit.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAgentNotice(true)}
                  className="mt-4 rounded-lg bg-[#001F3F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#001F3F]/90 transition"
                >
                  How to Open an FD
                </button>
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

      {/* Fixed Deposit Agent Notice Modal */}
      {showAgentNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-[#001F3F]">
                <ShieldAlert className="text-[#06B6D4]" size={20} />
                <h3 className="text-base font-bold">Fixed Deposit Origination</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAgentNotice(false)}
                className="text-gray-400 hover:text-black transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[#4B5563]">
              <p>
                In accordance with B-Trust banking policies, Fixed Deposits must be opened by an authorized bank agent.
              </p>
              <div className="rounded-lg bg-[#F3F4F6] p-3 text-xs text-[#001F3F] border border-gray-200">
                Please contact your assigned agent or visit your nearest B-Trust branch to open a new Fixed Deposit.
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAgentNotice(false)}
                className="rounded-lg bg-[#001F3F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#001F3F]/90 transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
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
