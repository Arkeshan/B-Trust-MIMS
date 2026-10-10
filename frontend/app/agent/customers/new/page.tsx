"use client";

import { useState, useId, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

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
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        nic: nic.trim() || undefined,
        dob: dob,
        phone_number: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        username: username.trim(),
        password: password,
        email: email.trim() || `${username.trim()}@btrust.local`,
        guardian_nic: age !== null && age < 18 ? guardianNic.trim() : undefined,
      };

      const res = await fetch("/api/agent/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register customer identity.");
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
    <div className="text-[#000000] font-sans pb-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/agent/portfolio"
            className="rounded-lg border border-gray-200 bg-white p-2 text-[#001F3F] hover:bg-gray-100 transition shadow-xs"
            title="Back to Portfolio"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#06B6D4]">
                Agent Portal • KYC Onboarding
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[#001F3F] tracking-tight">
              Register Customer Identity
            </h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Create a verified customer identity in B-Trust. Accounts and Fixed
              Deposits can be opened once registered.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-xs animate-shake">
            <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="font-bold text-rose-950">Registration Alert</p>
              <p className="mt-0.5 text-xs text-rose-800">{error}</p>
            </div>
          </div>
        )}

        {/* KYC Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* LEFT COLUMN: Personal Details */}
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-[#001F3F]">
                  1. Personal Details
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Legal identity and contact information
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={firstNameId}
                    className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
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
                    className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor={lastNameId}
                    className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
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
                    className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={dobId}
                    className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
                  >
                    Date of Birth *
                  </label>
                  {age !== null && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isMinor
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {age} yrs ({isMinor ? "Minor" : "Adult"})
                    </span>
                  )}
                </div>
                <input
                  id={dobId}
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#000000] outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20"
                />
              </div>

              <div>
                <label
                  htmlFor={nicId}
                  className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
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
                  placeholder={
                    isMinor ? "Not required for minors" : "e.g. 199012345678"
                  }
                  className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20"
                />
              </div>

              <div>
                <label
                  htmlFor={phoneId}
                  className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
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
                  placeholder="0771234567"
                  className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label
                    htmlFor={addressId}
                    className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
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
                    className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor={cityId}
                    className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
                  >
                    City *
                  </label>
                  <input
                    id={cityId}
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Colombo"
                    className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Account & Guardian */}
            <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-sm">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-[#001F3F]">
                  2. User Account & Guardian
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Online portal credentials and minor guardianship
                </p>
              </div>

              <div>
                <label
                  htmlFor={usernameId}
                  className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
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
                  className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20 font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor={passwordId}
                  className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
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
                  className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20"
                />
              </div>

              <div>
                <label
                  htmlFor={emailId}
                  className="block text-xs font-bold uppercase tracking-wider text-[#001F3F]"
                >
                  Email Address
                </label>
                <input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. kasun@example.com"
                  className="mt-1.5 block w-full rounded-xl border border-gray-300 bg-[#F9FAFB] px-3.5 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-[#06B6D4] focus:bg-white focus:ring-2 focus:ring-[#06B6D4]/20"
                />
              </div>

              {/* Minor Guardian Panel */}
              {isMinor && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2.5 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-amber-600" />
                    <label
                      htmlFor={guardianNicId}
                      className="block text-xs font-bold uppercase tracking-wider text-amber-900"
                    >
                      Guardian NIC * (Required for Minors)
                    </label>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Customer is under 18. A parent or legal guardian already
                    registered in the bank must be linked.
                  </p>
                  <input
                    id={guardianNicId}
                    type="text"
                    required
                    value={guardianNic}
                    onChange={(e) => setGuardianNic(e.target.value)}
                    placeholder="Enter Guardian's registered NIC"
                    className="block w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-sm text-[#000000] placeholder-gray-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#001F3F] hover:bg-[#002D5B] px-8 py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#06B6D4] disabled:opacity-50"
            >
              <UserPlus size={18} />
              {loading
                ? "Registering Identity..."
                : "Verify & Register Customer"}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {registeredData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#001F3F]">
                  Identity Registered!
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Customer successfully added to B-Trust
                </p>
              </div>
            </div>

            <div className="my-5 rounded-xl border border-gray-100 bg-[#F9FAFB] p-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Full Name:</span>
                <span className="font-bold text-[#001F3F]">
                  {registeredData.first_name} {registeredData.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Portal Username:</span>
                <span className="font-mono font-semibold text-[#06B6D4]">
                  {registeredData.username}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Customer ID:</span>
                <span className="font-mono font-bold text-emerald-700">
                  #{registeredData.person_id}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => router.push("/agent/accounts/new")}
                className="w-full rounded-xl bg-[#001F3F] hover:bg-[#002D5B] px-4 py-3 text-sm font-bold text-white transition shadow-sm"
              >
                Open Savings Account
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2.5 text-sm font-semibold text-[#001F3F] transition"
              >
                Register Another Customer
              </button>
              <button
                type="button"
                onClick={() => router.push("/agent/portfolio")}
                className="w-full rounded-xl px-4 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#001F3F] transition"
              >
                Return to Portfolio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
