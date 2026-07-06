import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { RefreshCw, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsDashboardScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/analytics');
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleExportTasks = () => {
    window.open(`${api.defaults.baseURL}/admin/reports/tasks?token=${localStorage.getItem('token')}`, '_blank');
  };

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const chartData = data.tasks_trend.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString(),
    completed: parseInt(d.completed || '0', 10),
    missed: parseInt(d.missed || '0', 10),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Platform performance and task adherence.</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Active Alerts</p>
          <p className="text-3xl font-bold text-red-600">{data.active_alerts}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Alerts Resolved (30d)</p>
          <p className="text-3xl font-bold text-green-600">{data.resolved_alerts_30d}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Check-ins (30d)</p>
          <p className="text-3xl font-bold text-blue-600">{data.check_ins_30d}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-800">Task Completion Trend (30d)</h2>
          <button onClick={handleExportTasks} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Completed Tasks" />
              <Line type="monotone" dataKey="missed" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Missed Tasks" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
