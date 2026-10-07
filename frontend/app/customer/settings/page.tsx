"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  KeyRound,
  HeadphonesIcon,
  AlertCircle,
} from "lucide-react";

export default function CustomerSettings() {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [agentDetails, setAgentDetails] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);
    const token = localStorage.getItem("session_id") || "";
    fetch("/api/customer/agent", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) {
          setAgentDetails(data);
        }
      })
      .catch((err) => console.error("Failed to fetch agent details:", err));
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("session_id") || "";
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      let data;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(
          res.ok
            ? "Failed to parse response."
            : `Server returned an error: ${res.status} ${res.statusText}`,
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }
      setMessage({
        type: "success",
        text: "Password updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans pb-12">
      <header className="border-b border-gray-200 bg-[#FFFFFF] px-6 py-5 sm:px-10">
        <div className="mx-auto max-w-4xl flex items-center gap-3">
          <Link
            href="/customer/dashboard"
            className="rounded-lg border border-gray-200 p-2 text-[#001F3F] hover:bg-[#F3F4F6] transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#001F3F]">
              Settings
            </h1>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-8 sm:px-10 space-y-8">
        {/* Profile Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex items-start gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
              <span className="text-xs font-semibold uppercase text-gray-500">
                Username:
              </span>
              <span className="font-mono text-sm font-bold text-[#06B6D4]">
                {username || "—"}
              </span>
            </div>
          </div>
        </div>
        {/* Change Password Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Change Password</p>
            </div>
          </div>
          {message && (
            <div
              className={`mb-6 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                message.type === "error"
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800"
              }`}
            >
              <AlertCircle size={16} />
              <span>{message.text}</span>
            </div>
          )}

          <form
            onSubmit={handlePasswordChange}
            className="space-y-5 max-w-md ml-14"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[#000000] outline-none transition focus:border-[#06B6D4]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[#000000] outline-none transition focus:border-[#06B6D4]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[#000000] outline-none transition focus:border-[#06B6D4]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center rounded-lg bg-[#001F3F] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#001F3F]/90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  Updating...
                </>
              ) : (
                "change"
              )}
            </button>
          </form>
        </div>

        {/* Support Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex items-start gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#001F3F] mb-1">
              Contact Support
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              If you need assistance with your account, please reach out to your
              assigned branch agent.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-sm space-y-2">
              {agentDetails ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Agent:</span>
                    <span className="font-semibold text-[#001F3F]">
                      {agentDetails.first_name} {agentDetails.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Email:</span>
                    <span className="font-medium text-[#06B6D4]">
                      {agentDetails.email}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Phone:</span>
                    <span className="font-medium text-gray-800">
                      {agentDetails.phone_number || "N/A"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  Loading agent details...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
