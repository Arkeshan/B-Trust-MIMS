"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, BarChart3 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Session check on mount
    const role = localStorage.getItem("role");
    const session = localStorage.getItem("session_id");

    if (!session || role !== "admin") {
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      localStorage.removeItem("session_id");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Prevent flashing content before redirect
  if (!isAuthorized) {
    return <div className="h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#001F3F] text-white flex flex-col shadow-xl z-10">
        <div className="p-6 text-2xl font-extrabold border-b border-gray-700/50 tracking-wider">
          <span className="text-[#06B6D4]">B-Trust</span> Admin
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <Link href="/admin/reports" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors font-medium">
            <BarChart3 size={18} />
            Reports
          </Link>
          {/* Add more admin links here in the future if needed */}
        </nav>
        <div className="p-4 border-t border-gray-700/50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors font-semibold"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-lg font-semibold text-[#001F3F]">Admin Portal</h1>
          <div className="flex items-center gap-4">
             <div className="h-8 w-8 rounded-full bg-[#06B6D4] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                A
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
