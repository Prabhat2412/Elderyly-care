import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Users, AlertTriangle, Pill, Activity, Settings, RefreshCw, BarChart2, Shield } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function AdminDashboardScreen({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const roleData = Object.entries(stats.users_by_role).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Platform overview and health metrics.</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats.total_users} icon={<Users className="w-6 h-6 text-blue-500" />} />
        <StatCard title="Total Medications" value={stats.total_medications} icon={<Pill className="w-6 h-6 text-green-500" />} />
        <StatCard title="Total Alerts" value={stats.total_alerts} icon={<Activity className="w-6 h-6 text-orange-500" />} />
        <StatCard title="Unresolved Alerts" value={stats.unresolved_alerts} icon={<AlertTriangle className="w-6 h-6 text-red-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Users by Role</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => onNavigate('users')}
                className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100"
              >
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <span className="font-semibold text-blue-900">Manage Users</span>
              </button>
              <button
                onClick={() => onNavigate('analytics')}
                className="flex flex-col items-center justify-center p-6 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-100"
              >
                <BarChart2 className="w-8 h-8 text-purple-600 mb-2" />
                <span className="font-semibold text-purple-900">Analytics</span>
              </button>
              <button
                onClick={() => onNavigate('settings')}
                className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
              >
                <Settings className="w-8 h-8 text-gray-600 mb-2" />
                <span className="font-semibold text-gray-900">System Settings</span>
              </button>
            </div>
          </div>
          
          <div className="mt-8 bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
            <Shield className="w-6 h-6 text-red-600 mt-1" />
            <div>
              <h3 className="font-bold text-red-900">Admin Privileges</h3>
              <p className="text-sm text-red-700">You have full access to view, edit, and delete user data. Please proceed with caution when managing accounts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="p-4 bg-gray-50 rounded-xl">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
