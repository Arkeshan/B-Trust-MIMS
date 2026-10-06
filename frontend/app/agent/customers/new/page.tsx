"use client";

import { useState, useId, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
  const router = useRouter();

  const firstNameId = useId();
  const lastNameId = useId();
  const dobId = useId();
  const nicId = useId();
  const phoneId = useId();
  const addressId = useId();
  const cityId = useId();
  const usernameId = useId();
  const passwordId = useId();
  const emailId = useId();
  const guardianNicId = useId();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [nic, setNic] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [guardianNic, setGuardianNic] = useState("");

  const [age, setAge] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredData, setRegisteredData] = useState<{
    person_id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null>(null);

  function handleDobChange(value: string) {
    setDob(value);
    if (!value) {
      setAge(null);
      return;
    }

    const birthDate = new Date(value);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      calculatedAge--;
    }

    setAge(calculatedAge >= 0 ? calculatedAge : 0);
  }

  function handleReset() {
    setFirstName("");
    setLastName("");
    setDob("");
    setNic("");
    setPhone("");
    setAddress("");
    setCity("");
    setUsername("");
    setPassword("");
    setEmail("");
    setGuardianNic("");
    setAge(null);
    setError("");
    setRegisteredData(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (age !== null && age < 18 && !guardianNic.trim()) {
      setError("Guardian NIC is required for minors under 18 years of age.");
      return;
    }
    if (age !== null && age >= 18 && !nic.trim()) {
      setError("National Identity Card (NIC) is required for adult customers.");
      return;
    }
    if (phone.length !== 10) {
      setError("Phone number must be exactly 10 digits (e.g. 0771234567).");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "/api/agent/customer/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            nic: nic.trim(),
            dob,
            phone_number: phone.trim(),
            address,
            city,
            username: username.trim(),
            password,
            email: email.trim(),
            guardian_nic: guardianNic.trim(),
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Customer registration failed.");
      }

      setRegisteredData({
        person_id: data.person_id,
        username: data.username,
        first_name: firstName,
        last_name: lastName,
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const isMinor = age !== null && age < 18;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 border-b border-slate-800 pb-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Agent Portal • KYC Phase 1
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
            Register Customer Identity
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Create a standalone verified customer identity record in the bank.
            Bank accounts can be opened immediately or at a later stage.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-200">
            <span className="font-semibold">Registration Error: </span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* LEFT COLUMN: Personal Info */}
            <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
              <h2 className="border-b border-slate-800 pb-3 text-lg font-semibold text-cyan-300">
                1. Personal Details
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={firstNameId}
                    className="block text-xs font-medium uppercase tracking-wider text-slate-300"
                  >
                    First Name *
                  </label>
                  <input
                    id={firstNameId}
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Kasun"
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={lastNameId}
                    className="block text-xs font-medium uppercase tracking-wider text-slate-300"
                  >
                    Last Name *
                  </label>
                  <input
                    id={lastNameId}
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Silva"
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={dobId}
                    className="block text-xs font-medium uppercase tracking-wider text-slate-300"
                  >
                    Date of Birth *
                  </label>
                  {age !== null && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isMinor
                          ? "bg-amber-900/50 text-amber-300 border border-amber-600/40"
                          : "bg-emerald-900/50 text-emerald-300 border border-emerald-600/40"
                      }`}
                    >
                      {age} years old ({isMinor ? "Minor" : "Adult"})
                    </span>
                  )}
                </div>
                <input
                  id={dobId}
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor={nicId}
                  className="block text-xs font-medium uppercase tracking-wider text-slate-300"
                >
                  National Identity Card (NIC) {isMinor ? "(Optional for Minor)" : "*"}
                </label>
                <input
                  id={nicId}
                  type="text"
                  required={!isMinor}
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  placeholder={isMinor ? "Nullable for minors" : "e.g. 199012345678"}
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor={phoneId}
                  className="block text-xs font-medium uppercase tracking-wider text-slate-300"
                >
                  Phone Number (10 Digits) *
                </label>
                <input
                  id={phoneId}
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="0771234567"
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label
                    htmlFor={addressId}
                    className="block text-xs font-medium uppercase tracking-wider text-slate-300"
                  >
                    Street Address *
                  </label>
                  <input
                    id={addressId}
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 12 Temple Rd"
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={cityId}
                    className="block text-xs font-medium uppercase tracking-wider text-slate-300"
                  >
                    City *
                  </label>
                  <input
                    id={cityId}
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Trinco"
                    className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Account & Guardian */}
            <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
              <h2 className="border-b border-slate-800 pb-3 text-lg font-semibold text-cyan-300">
                2. User Account & Guardian
              </h2>

              <div>
                <label
                  htmlFor={usernameId}
                  className="block text-xs font-medium uppercase tracking-wider text-slate-300"
                >
                  Portal Username *
                </label>
                <input
                  id={usernameId}
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. kasun_silva"
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor={passwordId}
                  className="block text-xs font-medium uppercase tracking-wider text-slate-300"
                >
                  Temporary Portal Password *
                </label>
                <input
                  id={passwordId}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor={emailId}
                  className="block text-xs font-medium uppercase tracking-wider text-slate-300"
                >
                  Email Address (Optional)
                </label>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. kasun@example.com"
                  className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 sm:text-sm"
                />
              </div>

              {isMinor && (
                <div className="rounded-lg border border-amber-600/40 bg-amber-950/20 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-amber-400"></span>
                    <label
                      htmlFor={guardianNicId}
                      className="block text-xs font-semibold uppercase tracking-wider text-amber-300"
                    >
                      Guardian NIC * (Required for Minors)
                    </label>
                  </div>
                  <p className="text-xs text-amber-200/80">
                    The customer is under 18. A parent or legal guardian already registered in the bank must be linked.
                  </p>
                  <input
                    id={guardianNicId}
                    type="text"
                    required
                    value={guardianNic}
                    onChange={(e) => setGuardianNic(e.target.value)}
                    placeholder="Enter Guardian's registered NIC"
                    className="block w-full rounded-lg border border-amber-500/50 bg-slate-900 px-3.5 py-2 text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 sm:text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-cyan-500 px-8 py-3 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50"
            >
              {loading ? "Registering Identity..." : "Verify & Register Identity"}
            </button>
          </div>
        </form>
      </div>

      {registeredData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Identity Registered!
                </h3>
                <p className="text-xs text-slate-400">
                  Customer successfully added to B-Trust
                </p>
              </div>
            </div>

            <div className="my-5 rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="font-semibold text-slate-200">
                  {registeredData.first_name} {registeredData.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Username:</span>
                <span className="font-mono text-cyan-400">
                  {registeredData.username}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Person ID:</span>
                <span className="font-mono font-bold text-emerald-400">
                  #{registeredData.person_id}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Register Another Identity
              </button>
              <button
                type="button"
                onClick={() => router.push("/agent/accounts/new")}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
              >
                Open Account
              </button>
              <button
                type="button"
                onClick={() => router.push("/agent/dashboard")}
                className="w-full rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:text-slate-200"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}