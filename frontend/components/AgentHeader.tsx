"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AgentHeader() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Reads the username from localStorage saved during login
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);
  }, []);

  const handleLogout = async () => {
    try {
      // Hits the logout API endpoint
      await fetch("http://localhost:8080/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed", err);
    }
    localStorage.removeItem("username");
    router.push("/login");
  };

  return (
    <header className="bg-white h-16 shadow flex justify-between items-center px-6">
      <div className="font-semibold text-gray-700">Branch: Colombo Central</div>
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