import AgentHeader from "../../components/AgentHeader";
import Link from "next/link";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Persistent left-side navigation sidebar */}
      <aside className="w-64 bg-[#001F3F] text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-gray-700">B-Trust Agent</div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/agent/dashboard" className="block px-4 py-2 rounded hover:bg-blue-800 transition-colors">Dashboard</Link>
          <Link href="/agent/customers/new" className="block px-4 py-2 rounded hover:bg-blue-800 transition-colors">Register Customer</Link>
          <Link href="/agent/accounts/new" className="block px-4 py-2 rounded hover:bg-blue-800 transition-colors">Open Account</Link>
          <Link href="/agent/fd/new" className="block px-4 py-2 rounded hover:bg-blue-800 transition-colors">Open FD</Link>
          <Link href="/agent/transfer" className="block px-4 py-2 rounded hover:bg-blue-800 transition-colors">Teller Counter</Link>
          <Link href="/agent/portfolio" className="block px-4 py-2 rounded hover:bg-blue-800 transition-colors">Portfolio</Link>
          <Link href="/admin/reports" className="block px-4 py-2 rounded hover:bg-blue-800 transition-colors">Admin Reports</Link>
        </nav>
      </aside>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <AgentHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}