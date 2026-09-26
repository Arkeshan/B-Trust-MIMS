"use client";

import { Printer, CheckCircle2, X } from "lucide-react";

export interface TransactionReceipt {
  reference_no: string;
  timestamp: string;
  account_no: string;
  customer_name: string;
  nic?: string;
  plan_name?: string;
  txn_type: "deposit" | "withdrawal";
  amount: number;
  previous_balance?: number;
  new_balance: number;
  remarks?: string;
}

interface ReceiptModalProps {
  receipt: TransactionReceipt | null;
  isOpen: boolean;
  onClose: () => void;
}

const currency = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});
export default function ReceiptModal({
  receipt,
  isOpen,
  onClose,
}: ReceiptModalProps) {
  if (!isOpen || !receipt) return null;
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs print:p-0 print:bg-white">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 print:border-none print:shadow-none print:p-0">
        {/* Top Controls (Hidden during printing) */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 print:hidden">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={18} />
            <span className="text-sm font-bold">Transaction Successful</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-[#001F3F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#001F3F]/90 transition cursor-pointer shadow-xs"
            >
              <Printer size={13} />
              Print
            </button>
            <button
              onClick={onClose}
              type="button"
              className="rounded-lg p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div
          id="teller-printable-receipt"
          className="mt-3 rounded-xl border border-gray-200 bg-white p-6 font-mono text-[#000000] print:border-2 print:border-black print:p-6"
        >
          {/* Bank Logo */}
          <div className="border-b-2 border-dashed border-gray-400 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl font-black uppercase tracking-wider text-[#001F3F]">
                B-TRUST BANK
              </span>
            </div>
            <p className="text-[11px] font-bold tracking-tight text-[#06B6D4] uppercase font-sans">
              Microbanking &amp; Interest Management System
            </p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-sans">
              Official Teller Transaction Receipt
            </p>
          </div>

          {/* Reference & Date */}
          <div className="py-3 border-b border-dashed border-gray-300 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500 font-sans">Reference:</span>
              <span className="font-bold text-[#001F3F]">
                {receipt.reference_no}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-sans">Date &amp; Time:</span>
              <span>{new Date(receipt.timestamp).toLocaleString("en-LK")}</span>
            </div>
          </div>

          {/* Customer & Account Details */}
          <div className="py-3 border-b border-dashed border-gray-300 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500 font-sans">Account No: </span>
              <span className="font-bold text-[#001F3F]">
                {receipt.account_no}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-sans">Customer: </span>
              <span className="font-bold text-gray-900">
                {receipt.customer_name}
              </span>
            </div>
            {receipt.nic && (
              <div className="flex justify-between">
                <span className="text-gray-500 font-sans">NIC: </span>
                <span>{receipt.nic}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="text-gray-500 font-sans">Transaction: </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded font-sans ${
                  receipt.txn_type === "deposit"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-rose-100 text-rose-800 border border-rose-200"
                }`}
              >
                Cash {receipt.txn_type}
              </span>
            </div>
          </div>
          {/* Amount & Balance */}
          <div className="py-3 border-b-2 border-dashed border-gray-400 space-y-1.5 text-xs">
            {receipt.previous_balance !== undefined && (
              <div className="flex justify-between text-gray-500">
                <span className="font-sans">Previous Balance:</span>
                <span>{currency.format(receipt.previous_balance)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1">
              <span className="font-bold text-sm font-sans text-[#001F3F]">
                {receipt.txn_type === "deposit"
                  ? "Amount Received:"
                  : "Amount Dispensed:"}
              </span>
              <span
                className={`text-base font-extrabold ${
                  receipt.txn_type === "deposit"
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}
              >
                {receipt.txn_type === "deposit" ? "+" : "−"}{" "}
                {currency.format(receipt.amount)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-gray-200">
              <span className="font-bold font-sans text-xs uppercase text-[#001F3F]">
                New Account Balance:
              </span>
              <span className="text-base font-black text-[#001F3F]">
                {currency.format(receipt.new_balance)}
              </span>
            </div>
          </div>

          {receipt.remarks && (
            <div className="pt-2 text-[10px] text-gray-500 italic">
              Note: {receipt.remarks}
            </div>
          )}

          {/* Signature and Stamp Line */}
          <div className="mt-8 pt-4 flex justify-between items-end text-[10px] text-gray-500 font-sans">
            <div className="text-center">
              <div className="h-8 border-b border-gray-400 w-28 mb-1"></div>
              <span>Customer Signature</span>
            </div>
            <div className="text-center">
              <div className="h-8 border-b border-gray-400 w-28 mb-1"></div>
              <span>Teller Signature & Stamp</span>
            </div>
          </div>
          <div className="mt-5 pt-2 text-center text-[9px] text-gray-400 border-t border-gray-100 font-sans">
            Thank you for banking with B-Trust MIMS.
          </div>
        </div>
      </div>
    </div>
  );
}
