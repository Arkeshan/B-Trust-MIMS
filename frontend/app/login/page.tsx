"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA / OTP State
  const [otpRequired, setOtpRequired] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp] = useState("");
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes hard limit

  // Restore active OTP session on page mount (persistence across refresh or navigation)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("pending_otp_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        const remaining = Math.round((parsed.expiresAt - Date.now()) / 1000);
        if (remaining > 0 && parsed.tempToken) {
          setOtpRequired(true);
          setTempToken(parsed.tempToken);
          setTimeLeft(remaining);
          if (parsed.username) setUsername(parsed.username);
        } else {
          sessionStorage.removeItem("pending_otp_session");
        }
      }
    } catch {
      sessionStorage.removeItem("pending_otp_session");
    }
  }, []);

  // Countdown timer for OTP expiry and resend cooldown
  useEffect(() => {
    if (!otpRequired) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [otpRequired, tempToken]);

  function handleRedirect(roleName: string) {
    const role = (roleName || "").toLowerCase();
    if (role === "staff") {
      router.push("/agent/dashboard");
    } else if (role === "customer") {
      router.push("/customer/dashboard");
    } else if (role === "admin") {
      router.push("/admin/reports");
    } else {
      router.push("/customer/dashboard");
    }
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        if (!res.ok) {
          if (res.status === 401) throw new Error("Invalid username or password.");
          if (res.status === 403) throw new Error("Account is locked.");
          if (res.status === 429) throw new Error("Too many failed login attempts.");
        }
        throw new Error("Server error or backend is not reachable.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      // If Two-Factor Authentication is required
      if (data.status === "otp_required") {
        const remaining = typeof data.seconds_remaining === "number" ? data.seconds_remaining : 300;
        setOtpRequired(true);
        setTempToken(data.temp_token || "");
        setTimeLeft(remaining);
        try {
          sessionStorage.setItem(
            "pending_otp_session",
            JSON.stringify({
              tempToken: data.temp_token || "",
              username: data.username || username,
              expiresAt: Date.now() + remaining * 1000,
            })
          );
        } catch { }
        return;
      }

      // Direct login for roles not requiring OTP
      sessionStorage.removeItem("pending_otp_session");
      localStorage.setItem("session_id", data.session_id || "");
      localStorage.setItem("username", data.username || "");
      localStorage.setItem("role", data.role || "");

      handleRedirect(data.role);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ temp_token: tempToken, otp }),
      });

      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        if (!res.ok) {
          if (res.status === 401) throw new Error("Invalid username or password.");
          if (res.status === 403) throw new Error("Account is locked.");
          if (res.status === 429) throw new Error("Too many failed login attempts.");
        }
        throw new Error("Server error or backend is not reachable.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Verification failed. Please check your code.");
      }

      sessionStorage.removeItem("pending_otp_session");
      localStorage.setItem("session_id", data.session_id || "");
      localStorage.setItem("username", data.username || "");
      localStorage.setItem("role", data.role || "");

      handleRedirect(data.role);
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    if (timeLeft > 0 || resending) return;
    setError("");
    setSuccessMsg("");
    setResending(true);

    try {
      const res = await fetch("/api/auth/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ temp_token: tempToken }),
      });

      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        if (!res.ok) {
          if (res.status === 401) throw new Error("Invalid username or password.");
          if (res.status === 403) throw new Error("Account is locked.");
          if (res.status === 429) throw new Error("Too many failed login attempts.");
        }
        throw new Error("Server error or backend is not reachable.");
      }

      if (!res.ok) {
        if (data.seconds_remaining) {
          setTimeLeft(data.seconds_remaining);
        }
        throw new Error(data.error || "Could not resend verification code.");
      }

      if (data.temp_token) {
        setTempToken(data.temp_token);
        try {
          sessionStorage.setItem(
            "pending_otp_session",
            JSON.stringify({
              tempToken: data.temp_token,
              username,
              expiresAt: Date.now() + 300 * 1000,
            })
          );
        } catch { }
      }
      setTimeLeft(300);
      setOtp("");
      setSuccessMsg("A new verification code has been dispatched.");
    } catch (err: any) {
      setError(err.message || "Could not resend code.");
    } finally {
      setResending(false);
    }
  }

  function handleBackToLogin() {
    setOtpRequired(false);
    setOtp("");
    setError("");
    setSuccessMsg("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-4 py-12 font-sans">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <span className="block text-3xl font-extrabold uppercase leading-none tracking-[0.12em] text-[#06B6D4]">
            B-Trust MIMS
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#001F3F]">
            {otpRequired ? "Verification Code" : "Sign in to your account"}
          </h1>
          <p className="mt-2 text-sm text-[#6B7280]">
            {otpRequired
              ? "Enter the 6-digit verification code to continue"
              : "Enter your credentials to access the banking portal"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-[#F3F4F6] p-8 shadow-sm">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {!otpRequired ? (
            /* Standard Login Form */
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
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[#000000] outline-none transition focus:border-[#06B6D4]"
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
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-[#000000] outline-none transition focus:border-[#06B6D4]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#001F3F]/90 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            /* Minimal OTP Verification Form */
            <form className="space-y-6" onSubmit={handleVerifyOTP}>
              <div>
                <label
                  htmlFor="otp"
                  className="block text-center text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2"
                >
                  6-Digit Code
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="block w-full text-center font-mono text-3xl font-extrabold tracking-[0.4em] rounded-lg border border-gray-300 bg-white px-4 py-3 text-[#001F3F] outline-none transition focus:border-[#06B6D4]"
                />
                <p className="mt-2 text-center text-xs text-[#6B7280]">
                  {timeLeft > 0
                    ? `Expires in ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`
                    : "Code expired. Please request a new code."}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex w-full items-center justify-center rounded-lg bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#001F3F]/90 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="font-semibold text-[#6B7280] hover:text-[#001F3F] transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={resending || timeLeft > 0}
                  onClick={handleResendOTP}
                  className="font-semibold text-[#06B6D4] hover:text-[#001F3F] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {resending
                    ? "Sending..."
                    : timeLeft > 0
                      ? `Resend in ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`
                      : "Resend Code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}