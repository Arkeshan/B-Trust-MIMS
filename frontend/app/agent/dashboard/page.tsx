"use client";

import { useState, useEffect } from "react";

export default function AgentDashboard() {
  const [stats, setStats] = useState({ 
    totalCustomers: "--", 
    myTransactions: "--", 
    branch: "Colombo Central" 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetching live data from the Go backend via Next.js API rewrite proxy
        const res = await fetch("/api/agent/stats"); 
        
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalCustomers: data.total_customers || 0,
            myTransactions: data.total_transactions || 0,
            branch: data.branch_name || "Colombo Central"
          });
        }
      } catch (error) {
        console.error("Failed to fetch agent statistics:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Agent Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#001F3F]">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">Total Customers Assigned</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {loading ? (
               <span className="animate-pulse text-gray-300">...</span>
            ) : (
               stats.totalCustomers
            )}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#001F3F]">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">My Transactions</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {loading ? (
               <span className="animate-pulse text-gray-300">...</span>
            ) : (
               stats.myTransactions
            )}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#001F3F]">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">Branch Information</h3>
          <p className="text-lg font-medium text-gray-800 mt-2">{stats.branch}</p>
        </div>
      </div>
    </div>
  );
}