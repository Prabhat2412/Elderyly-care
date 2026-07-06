import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { User, Search, Edit2, Trash2, ShieldAlert, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function UserManagementPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');

  // Edit Modal
  const [editUser, setEditUser] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, [page, role, sort, order]);

  // Use debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchUsers();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: { search, role, page, sort, order, per_page: 10 }
      });
      setUsers(res.data.data);
      setMeta({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        total: res.data.total,
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSort = (field: string) => {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('asc');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/admin/users/${id}`);
        fetchUsers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${editUser.id}`, {
        name: editUser.name,
        email: editUser.email,
        role: editUser.role,
        is_suspended: editUser.is_suspended,
      });
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to update user.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">Manage all registered users on the platform.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full sm:w-48 py-2 px-3 border border-gray-300 rounded-xl outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Roles</option>
            <option value="elderly">Elderly</option>
            <option value="caregiver">Caregiver</option>
            <option value="family">Family</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-sm text-gray-500">
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort('id')}>
                  ID {sort === 'id' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort('name')}>
                  Name {sort === 'name' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort('role')}>
                  Role {sort === 'role' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleSort('created_at')}>
                  Joined {sort === 'created_at' && (order === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">#{user.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {user.name}
                        {user.is_suspended && <ShieldAlert className="w-4 h-4 text-red-500" title="Suspended" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'elderly' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'caregiver' ? 'bg-green-100 text-green-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setEditUser(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{(meta.current_page - 1) * 10 + 1}</span> to <span className="font-medium">{Math.min(meta.current_page * 10, meta.total)}</span> of <span className="font-medium">{meta.total}</span> users
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={page === meta.last_page}
                onClick={() => setPage(page + 1)}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit User #{editUser.id}</h3>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="elderly">Elderly</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="family">Family</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="suspend"
                  checked={editUser.is_suspended}
                  onChange={(e) => setEditUser({ ...editUser, is_suspended: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="suspend" className="text-sm font-medium text-gray-700">Suspend User Account</label>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
