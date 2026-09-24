"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function CustomerDashboard() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans">
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

      <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10">
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/customer/savings"
            className="group relative flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 text-center shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <ArrowUpRight
              size={20}
              className="absolute right-6 top-6 text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
            />
            <h2 className="text-2xl font-bold leading-tight text-[#001F3F]">
              Savings Accounts
            </h2>
          </Link>

          <Link
            href="/customer/fd"
            className="group relative flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 text-center shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <ArrowUpRight
              size={20}
              className="absolute right-6 top-6 text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
            />
            <h2 className="text-2xl font-bold leading-tight text-[#001F3F]">
              Fixed Deposit Accounts
            </h2>
          </Link>

          <Link
            href="/customer/transfer"
            className="group relative flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 text-center shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <ArrowUpRight
              size={20}
              className="absolute right-6 top-6 text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
            />
            <h2 className="text-2xl font-bold leading-tight text-[#001F3F]">
              Transfer Services
            </h2>
          </Link>

          <Link
            href="/customer/settings"
            className="group relative flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-[#F3F4F6] p-7 text-center shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md cursor-pointer"
          >
            <ArrowUpRight
              size={20}
              className="absolute right-6 top-6 text-[#6B7280] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#06B6D4]"
            />
            <h2 className="text-2xl font-bold leading-tight text-[#001F3F]">
              Settings
            </h2>
          </Link>
        </section>
      </div>
    </main>
  );
}
