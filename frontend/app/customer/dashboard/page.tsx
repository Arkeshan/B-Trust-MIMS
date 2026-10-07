"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, LogOut } from "lucide-react";

export default function CustomerDashboard() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const sessionId = localStorage.getItem("session_id") || "";
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        credentials: "include",
      });
    } catch {
      // Even if the request fails, clear local storage and redirect
    }
    localStorage.removeItem("session_id");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans">
      <header className="border-b border-gray-200 bg-[#FFFFFF] px-6 py-7 sm:px-10 sm:py-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <span className="block text-3xl font-extrabold uppercase leading-none tracking-[0.12em] text-[#06B6D4] sm:text-4xl">
              B-Trust MIMS
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#001F3F] sm:text-3xl">
              Customer Dashboard
            </h1>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[#001F3F] transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            <LogOut size={16} />
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/customer/savings"
            className="group relative flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 text-center shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <ArrowUpRight
              size={20}
              className="absolute right-6 top-6 text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
            />
            <h4 className="text-2xl font-bold leading-tight text-[#001F3F]">
              Savings Accounts
            </h4>
          </Link>

          <Link
            href="/customer/fd"
            className="group relative flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 text-center shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <ArrowUpRight
              size={20}
              className="absolute right-6 top-6 text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
            />
            <h4 className="text-2xl font-bold leading-tight text-[#001F3F]">
              Fixed Deposit Accounts
            </h4>
          </Link>

          <Link
            href="/customer/transfer"
            className="group relative flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 text-center shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <ArrowUpRight
              size={20}
              className="absolute right-6 top-6 text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
            />
            <h4 className="text-2xl font-bold leading-tight text-[#001F3F]">
              Transfer Services
            </h4>
          </Link>

          <Link
            href="/customer/settings"
            className="group relative flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 text-center shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <ArrowUpRight
              size={20}
              className="absolute right-6 top-6 text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
            />
            <h4 className="text-2xl font-bold leading-tight text-[#001F3F]">
              Settings
            </h4>
          </Link>
        </section>
      </div>
    </main>
  );
}
