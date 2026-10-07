"use client";

import { useState, useId, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

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
      const res = await fetch("/api/agent/customer/register", {
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
      });

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
    <div className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* LEFT COLUMN: Personal Info */}
            <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 backdrop-blur-sm">
              <h2 className="border-b border-gray-200 pb-3 text-lg font-semibold text-[#001F3F]">
                1. Personal Details
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={firstNameId}
                    className="block text-xs font-medium uppercase tracking-wider text-gray-600"
                  >
                    First Name *
                  </label>
                  <input
                    id={firstNameId}
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4] sm:text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={lastNameId}
                    className="block text-xs font-medium uppercase tracking-wider text-gray-600"
                  >
                    Last Name *
                  </label>
                  <input
                    id={lastNameId}
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4] sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={dobId}
                    className="block text-xs font-medium uppercase tracking-wider text-gray-600"
                  >
                    Date of Birth *
                  </label>
                  {age !== null && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isMinor
                          ? "bg-amber-900/50 text-amber-800 border border-amber-300"
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
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4] sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor={nicId}
                  className="block text-xs font-medium uppercase tracking-wider text-gray-600"
                >
                  {isMinor
                    ? "Guardian's National Identity Card *"
                    : "National Identity Card *"}
                </label>
                <input
                  id={nicId}
                  type="text"
                  required={!isMinor}
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4] sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor={phoneId}
                  className="block text-xs font-medium uppercase tracking-wider text-gray-600"
                >
                  Phone Number *
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
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4] sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label
                    htmlFor={addressId}
                    className="block text-xs font-medium uppercase tracking-wider text-gray-600"
                  >
                    Street Address *
                  </label>
                  <input
                    id={addressId}
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4] sm:text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={cityId}
                    className="block text-xs font-medium uppercase tracking-wider text-gray-600"
                  >
                    City *
                  </label>
                  <input
                    id={cityId}
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4] sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/*User Account*/}
            <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 backdrop-blur-sm">
              <h2 className="border-b border-gray-200 pb-3 text-lg font-semibold text-[#001F3F]">
                2. User Account
              </h2>

              <div>
                <label
                  htmlFor={usernameId}
                  className="block text-xs font-medium uppercase tracking-wider text-gray-600"
                >
                  Portal Username *
                </label>
                <input
                  id={usernameId}
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4] sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor={passwordId}
                  className="block text-xs font-medium uppercase tracking-wider text-gray-600"
                >
                  Temporary Portal Password *
                </label>
                <input
                  id={passwordId}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4] sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor={emailId}
                  className="block text-xs font-medium uppercase tracking-wider text-gray-600"
                >
                  Email Address
                </label>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:border-[#06B6D4] focus:outline-none focus:ring-1 focus:ring-[#06B6D4] sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#001F3F] px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#001F3F]/90 focus:outline-none disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block align-middle mr-2"></span>
                  Registering Identity...
                </>
              ) : (
                "Register"
              )}
            </button>
          </div>
        </form>
      </div>

      {registeredData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-300 bg-white p-6 shadow-2xl">
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
                <h3 className="text-lg font-bold text-[#001F3F]">
                  Identity Registered!
                </h3>
                <p className="text-xs text-gray-500">
                  Customer successfully added to B-Trust
                </p>
              </div>
            </div>

            <div className="my-5 rounded-lg border border-gray-200 bg-gray-100/70 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="font-semibold text-gray-900">
                  {registeredData.first_name} {registeredData.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Username:</span>
                <span className="font-mono text-[#06B6D4]">
                  {registeredData.username}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Person ID:</span>
                <span className="font-mono font-bold text-emerald-400">
                  #{registeredData.person_id}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-lg bg-[#001F3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#001F3F]/90"
              >
                Register Another Identity
              </button>
              <button
                type="button"
                onClick={() => router.push("/agent/accounts/new")}
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-slate-700 hover:text-[#001F3F]"
              >
                Open Account
              </button>
              <button
                type="button"
                onClick={() => router.push("/agent/dashboard")}
                className="w-full rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
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
