"use client";

import Link from "next/link";
import {
  Wallet,
  PiggyBank,
  ArrowLeftRight,
  Settings,
  ArrowUpRight,
} from "lucide-react";

export default function CustomerDashboard() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans">
      {/* Top Navbar */}
      <header className="border-b border-gray-200 bg-[#FFFFFF] px-6 py-7 sm:px-10 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <span className="block text-3xl font-extrabold uppercase leading-none tracking-[0.12em] text-[#06B6D4] sm:text-4xl">
            B-Trust MIMS
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#001F3F] sm:text-3xl">
            Customer Dashboard
          </h1>
        </div>
      </header>

      {/* 4 Cards Grid - Matches Hand-Drawn Layout */}
      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Savings Accounts */}
          <Link
            href="/customer/savings"
            className="group flex min-h-[300px] flex-col justify-between rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-[#001F3F] p-3 text-[#06B6D4]">
                  <Wallet size={24} />
                </div>
                <ArrowUpRight
                  size={20}
                  className="text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
                />
              </div>
              <h2 className="mt-6 text-2xl font-bold leading-tight text-[#001F3F]">
                Savings Accounts
              </h2>
            </div>
            <div className="pt-4 border-t border-gray-300/60">
              <span className="flex items-center gap-1 text-sm font-bold leading-tight text-[#001F3F] group-hover:text-[#06B6D4]">
                View Accounts &rarr;
              </span>
            </div>
          </Link>

          {/* Card 2: Fixed Deposit Accounts */}
          <Link
            href="/customer/fd"
            className="group flex min-h-[300px] flex-col justify-between rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-[#001F3F] p-3 text-[#06B6D4]">
                  <PiggyBank size={24} />
                </div>
                <ArrowUpRight
                  size={20}
                  className="text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
                />
              </div>
              <h2 className="mt-6 text-2xl font-bold leading-tight text-[#001F3F]">
                Fixed Deposit Accounts
              </h2>
            </div>
            <div className="pt-4 border-t border-gray-300/60">
              <span className="flex items-center gap-1 text-sm font-bold leading-tight text-[#001F3F] group-hover:text-[#06B6D4]">
                View Investments &rarr;
              </span>
            </div>
          </Link>

          {/* Card 3: Transfer Services */}
          <Link
            href="/customer/transfer"
            className="group flex min-h-[300px] flex-col justify-between rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-[#001F3F] p-3 text-[#06B6D4]">
                  <ArrowLeftRight size={24} />
                </div>
                <ArrowUpRight
                  size={20}
                  className="text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
                />
              </div>
              <h2 className="mt-6 text-2xl font-bold leading-tight text-[#001F3F]">
                Transfer Services
              </h2>
            </div>
            <div className="pt-4 border-t border-gray-300/60">
              <span className="flex items-center gap-1 text-sm font-bold leading-tight text-[#001F3F] group-hover:text-[#06B6D4]">
                Make a Transfer &rarr;
              </span>
            </div>
          </Link>

          {/* Card 4: Settings */}
          <Link
            href="/customer/settings"
            className="group flex min-h-[300px] flex-col justify-between rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-[#001F3F] p-3 text-[#06B6D4]">
                  <Settings size={24} />
                </div>
                <ArrowUpRight
                  size={20}
                  className="text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
                />
              </div>
              <h2 className="mt-6 text-2xl font-bold leading-tight text-[#001F3F]">
                Settings
              </h2>
            </div>
            <div className="pt-4 border-t border-gray-300/60">
              <span className="flex items-center gap-1 text-sm font-bold leading-tight text-[#001F3F] group-hover:text-[#06B6D4]">
                Security & Preferences &rarr;
              </span>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
