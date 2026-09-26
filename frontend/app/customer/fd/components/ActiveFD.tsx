"use client";

import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle, Calendar, TrendingUp, Wallet, Clock } from "lucide-react";

interface FDStatus {
    fd_acc_no: string;
    account_no: string;
    investment: number;
    start_date: string;
    maturity_date?: string;
    due_date?: string;
    elapsed_months: number;
    interest_rate: number;
    term_months: number;
    interest_paid_to_date: number;
    current_earned_interest: number;
    next_payout_date: string;
}

interface ActiveFDProps {
    fdAccNo: string;
}

export default function ActiveFD({ fdAccNo }: ActiveFDProps) {
    const [status, setStatus] = useState<FDStatus | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchFDStatus() {
            try {
                setLoading(true);
                setError(null);

                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                const res = await fetch(`${baseUrl}/api/fd/status/${encodeURIComponent(fdAccNo)}`);

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || `Failed to fetch FD status (${res.status})`);
                }

                const data: FDStatus = await res.json();
                setStatus(data);
            } catch (err: any) {
                setError(err.message || "An unexpected error occurred.");
            } finally {
                setLoading(false);
            }
        }

        if (fdAccNo) {
            fetchFDStatus();
        }
    }, [fdAccNo]);

    // Format currency helpers
    const formatLKR = (amount: number = 0) =>
        new Intl.NumberFormat("en-LK", {
            style: "currency",
            currency: "LKR",
            minimumFractionDigits: 2,
        }).format(amount);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    //Loading State
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 rounded-xl border border-gray-200 bg-[#F3F4F6] shadow-sm">
                <Loader2 className="animate-spin text-[#06B6D4]" size={28} />
                <span className="ml-3 text-sm font-medium text-[#6B7280]">Loading live status...</span>
            </div>
        );
    }
    //Error State
    if (error || !status) {
        return (
            <div className="flex items-center p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 shadow-sm">
                <AlertCircle size={20} className="mr-3 flex-shrink-0 text-red-500" />
                <span className="text-sm font-medium">{error || "Unable to load status"}</span>
            </div>
        );
    }

    // Progress Calculation
    const progressPercent = Math.min(
        100,
        Math.max(0, Math.round((status.elapsed_months / status.term_months) * 100))
    );

    return (
        <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-[#F3F4F6] p-6 shadow-sm transition-all hover:border-[#06B6D4] hover:shadow-md">
            {/*Header*/}
            <div className="flex items-center justify-between pb-4 border-b border-gray-300/60">
                <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        FD Account
                    </span>
                    <h3 className="font-mono text-lg font-bold text-[#06B6D4]">{status.fd_acc_no}</h3>
                </div>
                <div className="text-right">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                        Linked Savings
                    </span>
                    <p className="font-mono text-sm font-semibold text-[#001F3F]">{status.account_no}</p>
                </div>
            </div>

            {/*Principal Investment */}
            <div className="my-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    Deposited Amount
                </span>
                <div className="text-3xl font-extrabold text-[#001F3F] mt-1">
                    {formatLKR(status.investment)}
                </div>
            </div>

            {/*Elapsed Months & Progress Bar*/}
            <div className="mb-5 bg-white p-3.5 rounded-lg border border-gray-200/80">
                <div className="flex items-center justify-between text-xs font-bold text-[#001F3F] mb-1.5">
                    <span className="flex items-center gap-1">
                        <Clock size={14} className="text-[#06B6D4]" /> Term Progress
                    </span>
                    <span>
                        {status.elapsed_months} / {status.term_months} Months ({progressPercent}%)
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                        className="bg-[#06B6D4] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>


            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3.5 rounded-lg mb-5">
                <div className="flex items-center gap-2">
                    <TrendingUp className="text-emerald-600" size={18} />
                    <div>
                        <p className="text-xs font-bold text-emerald-800 uppercase">Current Earned Interest</p>
                        <p className="text-[#6B7280] text-xs">Rate: {status.interest_rate}% p.a.</p>
                    </div>
                </div>
                <span className="text-lg font-bold text-emerald-600">
                    +{formatLKR(status.current_earned_interest)}
                </span>
            </div>

            {/*  Dates & Next Payout Badge */}
            <div className="pt-4 border-t border-gray-300/60 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]">
                <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#001F3F]" />
                    <span>Start: <strong>{formatDate(status.start_date)}</strong></span>
                </div>
                <div>
                    <span>Due Date: <strong>{formatDate(status.due_date || "")}</strong></span>
                </div>
                {status.next_payout_date && (
                    <div className="w-full mt-2 flex items-center justify-between bg-[#001F3F] text-white px-3 py-1.5 rounded-md">
                        <span>Next Payout:</span>
                        <span className="font-bold text-[#06B6D4]">{formatDate(status.next_payout_date)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
