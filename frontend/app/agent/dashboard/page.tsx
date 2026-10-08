export default function AgentDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Agent Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#001F3F]">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">Total Customers Assigned</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">--</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#001F3F]">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">My Transactions</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">--</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#001F3F]">
          <h3 className="text-gray-500 text-sm font-semibold uppercase">Branch Information</h3>
          <p className="text-lg font-medium text-gray-800 mt-2">Colombo Central</p>
        </div>
      </div>
    </div>
  );
}