"use client";

import { useEffect, useState } from "react";

interface DashboardStats {
  total_transactions: number;
  total_customers: number;
}

export default function AgentDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [branchName, setBranchName] = useState<string>("—");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("session_id") || "";
        const headers = { Authorization: `Bearer ${token}` };
        const [statsRes, customersRes, profileRes] = await Promise.all([
          fetch("/api/agent/stats", { headers }),
          fetch("/api/agent/customers", { headers }),
          fetch("/api/agent/profile", { headers }),
        ]);
        let totalTransactions = 0;
        let totalCustomers = 0;

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          totalTransactions = statsData.total_transactions ?? 0;
        }
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          totalCustomers = Array.isArray(customersData)
            ? customersData.length
            : 0;
        }
        setStats({
          total_transactions: totalTransactions,
          total_customers: totalCustomers,
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.branch_name) setBranchName(profileData.branch_name);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Agent Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#001F3F]">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">
            Total Customers Assigned
          </h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {loading ? "…" : (stats?.total_customers ?? "—")}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#001F3F]">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">
            My Transactions
          </h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {loading ? "…" : (stats?.total_transactions ?? "—")}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#001F3F]">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">
            Branch Information
          </h3>
          <p className="text-lg font-medium text-gray-800 mt-2">
            {loading ? "…" : branchName}
          </p>
        </div>
      </div>
    </div>
  );
}
