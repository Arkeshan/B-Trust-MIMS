"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      // Store session info for frontend use
      localStorage.setItem("session_id", data.session_id || "");
      localStorage.setItem("username", data.username || "");
      localStorage.setItem("role", data.role || "");

      const role = (data.role || "").toLowerCase();
      if (role === "staff") {
        router.push("/agent/transfer");
      } else if (role === "customer") {
        router.push("/customer/dashboard");
      } else if (role === "admin") {
        router.push("/admin/reports");
      } else {
        router.push("/customer/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-4 py-12 font-sans">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <span className="block text-3xl font-extrabold uppercase leading-none tracking-[0.12em] text-[#06B6D4]">
            B-Trust MIMS
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#001F3F]">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            Enter your credentials to access the banking portal
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-[#F3F4F6] p-8 shadow-sm">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280]"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. cust_1"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280]"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#001F3F]/90 disabled:opacity-50"
            >
              <LogIn size={16} />
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}