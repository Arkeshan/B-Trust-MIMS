"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AgentHeader() {
  const [username, setUsername] = useState("");
  const [branchName, setBranchName] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Reads the username from localStorage saved during login
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);
    const token = localStorage.getItem("session_id") || "";
    fetch("/api/agent/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.branch_name) setBranchName(data.branch_name);
      })
      .catch((err) => console.error("Could not fetch branch profile", err));
  }, []);

  const handleLogout = async () => {
    try {
      // Hits the logout API endpoint
      await fetch("/api/auth/logout", { 
        method: "POST",
        credentials: "include" 
      });
    } catch (err) {
      console.error("Logout failed", err);
    }
    localStorage.removeItem("username");
    router.push("/login");
  };

  return (
    <header className="bg-white h-16 shadow flex justify-between items-center px-6">
      <div className="font-semibold text-gray-700"> {branchName ? `Branch: ${branchName}` : ""}</div>
      <div className="flex items-center gap-4">
        <span className="text-gray-600">Welcome, {username}</span>
        <button 
          onClick={handleLogout} 
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}