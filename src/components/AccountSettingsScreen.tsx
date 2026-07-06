import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';
import { User, Shield, Save } from 'lucide-react';

export default function AccountSettingsScreen() {
  const { user, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [profileMessage, setProfileMessage] = useState('');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityStatus, setSecurityStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [securityMessage, setSecurityMessage] = useState('');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus('loading');
    try {
      const payload: any = { name, email };
      if (email !== user?.email) {
        if (!currentPasswordForEmail) {
          setProfileStatus('error');
          setProfileMessage('Current password is required to change email.');
          return;
        }
        payload.current_password = currentPasswordForEmail;
      }
      
      await api.put('/profile', payload);
      await checkAuth();
      setProfileStatus('success');
      setProfileMessage('Profile updated successfully.');
      setCurrentPasswordForEmail('');
    } catch (err: any) {
      setProfileStatus('error');
      setProfileMessage(err.response?.data?.error || err.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSecurityStatus('error');
      setSecurityMessage("New passwords don't match.");
      return;
    }
    setSecurityStatus('loading');
    try {
      await api.post('/profile/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setSecurityStatus('success');
      setSecurityMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityStatus('error');
      setSecurityMessage(err.response?.data?.error || err.response?.data?.message || 'Failed to change password.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

      <div className="bg-white shadow rounded-lg flex overflow-hidden min-h-[500px]">
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'profile' ? 'bg-blue-100 text-blue-700' : 'text-gray-900 hover:bg-gray-200'
              }`}
            >
              <User className="mr-3 h-5 w-5 flex-shrink-0" />
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'security' ? 'bg-blue-100 text-blue-700' : 'text-gray-900 hover:bg-gray-200'
              }`}
            >
              <Shield className="mr-3 h-5 w-5 flex-shrink-0" />
              Security
            </button>
          </nav>
        </div>

        <div className="flex-1 p-8">
          {activeTab === 'profile' ? (
            <div>
              <h2 className="text-xl font-medium text-gray-900 mb-6">Profile Details</h2>
              <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                {email !== user?.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Password (required to change email)</label>
                    <input
                      type="password"
                      value={currentPasswordForEmail}
                      onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                )}

                {profileStatus === 'success' && <div className="text-sm text-green-600 bg-green-50 p-3 rounded">{profileMessage}</div>}
                {profileStatus === 'error' && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{profileMessage}</div>}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={profileStatus === 'loading'}
                    className="flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {profileStatus === 'loading' ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-medium text-gray-900 mb-6">Change Password</h2>
              <form onSubmit={handleSecuritySubmit} className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {securityStatus === 'success' && <div className="text-sm text-green-600 bg-green-50 p-3 rounded">{securityMessage}</div>}
                {securityStatus === 'error' && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{securityMessage}</div>}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={securityStatus === 'loading'}
                    className="flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {securityStatus === 'loading' ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
