import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Pill, Utensils, Smile, AlertCircle, CheckCircle2, ChevronRight, LayoutDashboard, UserCircle, Activity, Bell, Home, ShieldAlert, FileText, Phone, Delete, Trash, XCircle, Clock } from 'lucide-react';
import { cn } from './lib/utils';
import { DailyCheckIn, UserProfile, CaregiverAlert } from './types';
import api from './lib/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import { useAuthStore } from './store/useAuthStore';
import { useDataStore } from './store/useDataStore';
import { LandingPage } from './LandingPage';
import toast, { Toaster } from 'react-hot-toast';
import { TaskCard } from './components/TaskCard';
import { VitalReadingModal } from './components/VitalReadingModal';
import { VitalReadingForm } from './components/VitalReadingForm';
import {
  canElderlyComplete,
  canMarkTaskComplete,
  canMarkTaskMissed,
  computeAdherencePercent,
  formatGraceWindowRange,
  toLocalIso,
  getTaskVisualStatus,
  isActionWindowOpen,
  SCHEDULE_GRACE_MINUTES,
} from './lib/taskTiming';
import { NextMedicationCard } from './components/NextMedicationCard';
import { LiveCountdown } from './components/LiveCountdown';
import { taskRequiresReading, VitalReadingPayload } from './lib/vitalMetrics';
import { DailyTask } from './types';
import { TimelineView } from './components/TimelineView';
import { Chatbot } from './components/Chatbot';
import ForgotPasswordScreen from './components/ForgotPasswordScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import AccountSettingsScreen from './components/AccountSettingsScreen';
import AdminDashboardScreen from './components/AdminDashboardScreen';
import UserManagementPanel from './components/UserManagementPanel';
import AnalyticsDashboardScreen from './components/AnalyticsDashboardScreen';

import { ElderlyLogin } from './components/auth/ElderlyLogin';
import { CaregiverLogin } from './components/auth/CaregiverLogin';
import { FamilyLogin } from './components/auth/FamilyLogin';
import { BottomNav } from './components/BottomNav';
import { ElderlyFlow } from './components/flows/ElderlyFlow';
import { CaregiverDashboard, FamilyDashboard } from './components/DashboardComponents';
import { ProfileView } from './components/profile/ProfileView';
import { useLocationTracker } from './hooks/useLocationTracker';
import { requestNotificationPermission } from './lib/notifications';

export default function App() {
  const { user, login, register, logout, isAuthenticated, isInitialized } = useAuthStore();
  const { medications, checkins, alerts, fetchMeds, fetchPatients, setActivePatient, patients, activePatient, addCheckin, triggerEmergency, fetchProfile, medicalProfile, fetchAlerts, fetchSchedules, processAutoMissedTasks } = useDataStore();

  const [showLanding, setShowLanding] = useState(!isAuthenticated);
  const [view, setView] = useState<'home' | 'checkin' | 'meds' | 'dashboard' | 'alerts' | 'family' | 'profile' | 'landing' | 'elderly-login' | 'caregiver-login' | 'family-login' | 'timeline' | 'forgot-password' | 'account-settings' | 'users' | 'analytics' | 'settings'>('home');
  const [showCheckinSuccess, setShowCheckinSuccess] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Automatically track location if the user is an elderly patient and logged in
  useLocationTracker(isAuthenticated && user?.role === 'elderly');

  // Initial data fetch and redirect
  useEffect(() => {
    if (isAuthenticated) {
      setShowLanding(false);
      if (user) {
        if (user.role === 'caregiver' || user.role === 'family') {
          fetchPatients();
          fetchAlerts();
          requestNotificationPermission();
        } else if (user.role === 'elderly') {
          fetchMeds(user.id);
          fetchProfile(user.id);
          fetchSchedules(user.id);
        }
        // Ensure we go to a dashboard-appropriate view on login
        if (view === 'home' && user.role !== 'elderly') {
          setView('dashboard');
        }
      }
    }
  }, [user, isAuthenticated, fetchMeds, fetchPatients, fetchSchedules, view]);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'elderly') return;
    const tick = () => processAutoMissedTasks();
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, processAutoMissedTasks]);

  const handleElderlyAuth = async (email: string, pass: string) => {
    try {
      await login({ email, pass, role: 'elderly' });
    } catch (error) { }
  };

  const handleCaregiverAuth = async (isRegister: boolean, email: string, pass: string, name?: string) => {
    try {
      if (isRegister) {
        // Defaulting to caregiver role for the caregiver portal registration
        await register({ name: name || '', email, pass, role: 'caregiver' });
      } else {
        // Allow caregiver or family to login via this portal
        await login({ email, pass, role: 'caregiver' }); // The backend usually handles the actual role resolution
      }
    } catch (error) { }
  };

  const handleFamilyAuth = async (email: string, pass: string) => {
    try {
      await login({ email, pass, role: 'family' });
    } catch (error) { }
  };

  const handleLogout = () => {
    logout();
    setView('home');
    setShowLanding(true);
  };

  const handleEmergency = () => {
    if (user) triggerEmergency(user.id);
  };

  const handleCheckin = async (data: Omit<DailyCheckIn, 'id' | 'userId' | 'timestamp'>) => {
    if (!user) return;
    await addCheckin({ ...data, user_id: user.id });
    setShowCheckinSuccess(true);
    setTimeout(() => setShowCheckinSuccess(false), 3000);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 bg-rose-500 rounded-[32px] flex items-center justify-center shadow-2xl shadow-rose-200 mb-8"
        >
          <Heart className="text-white w-10 h-10" />
        </motion.div>
        <h2 className="text-2xl font-black tracking-tighter animate-pulse">Initializing Care...</h2>
      </div>
    );
  }

  if (!isAuthenticated) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      return <ResetPasswordScreen onNavigate={(screen) => {
        if (screen === 'login') {
          window.history.pushState({}, document.title, window.location.pathname);
          setView('home');
        }
      }} />;
    }

    if (view === 'forgot-password') {
      return <ForgotPasswordScreen onNavigate={(screen) => {
        if (screen === 'login') setView('home');
      }} />;
    }

    if (view === 'elderly-login') {
      return (
        <>
          <ElderlyLogin onAuth={handleElderlyAuth} onBack={() => { setView('landing'); setShowLanding(true); }} onForgotPassword={() => setView('forgot-password')} />
          <Chatbot />
        </>
      );
    }

    if (view === 'caregiver-login') {
      return (
        <>
          <CaregiverLogin onAuth={handleCaregiverAuth} onBack={() => { setView('landing'); setShowLanding(true); }} onForgotPassword={() => setView('forgot-password')} />
          <Chatbot />
        </>
      );
    }

    if (view === 'family-login') {
      return (
        <>
          <FamilyLogin onAuth={handleFamilyAuth} onBack={() => { setView('landing'); setShowLanding(true); }} onForgotPassword={() => setView('forgot-password')} />
          <Chatbot />
        </>
      );
    }

    if (showLanding || view === 'landing' || view === 'home') return (
      <>
        <LandingPage onNavigate={(v) => {
          setView(v as any);
          setShowLanding(false);
        }} isAuthenticated={false} />
        <Chatbot />
      </>
    );

    // Fallback to landing if not authenticated and no specific view
    return (
      <>
        <LandingPage onNavigate={(v) => {
          setView(v as any);
          setShowLanding(false);
        }} isAuthenticated={false} />
        <Chatbot />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-gray-900 overflow-x-hidden">
      <Toaster position="top-right" />
      <nav className="bg-white/70 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(user.role === 'elderly' ? 'home' : 'dashboard')}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
            <Heart className="text-white w-6 h-6" />
          </div>
          <span className="font-black text-xl tracking-tighter">ElderCare Connect</span>
        </div>

        <div className="flex items-center gap-4 relative">
          {user.role !== 'elderly' && (
            <button
              onClick={() => setView('alerts')}
              className="relative p-3 hover:bg-gray-50 rounded-2xl transition-colors hidden sm:block"
            >
              <Bell className={cn("w-6 h-6", alerts.some(a => !a.resolved) ? "text-primary" : "text-gray-400")} />
              {alerts.some(a => !a.resolved) && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-primary border-2 border-white rounded-full" />
              )}
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-3 pl-2 pr-4 py-2 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100"
            >
              <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
                <UserCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-black leading-none">{user.name}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{user.role}</p>
              </div>
            </button>

            <AnimatePresence>
              {showUserDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-[24px] shadow-2xl border border-gray-100 py-3 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2 mb-2 border-b border-gray-50">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account</p>
                    </div>
                    <button onClick={() => { setView('profile'); setShowUserDropdown(false); }} className="w-full px-4 py-3 text-left hover:bg-rose-50 flex items-center gap-3 transition-colors text-gray-700 font-bold">
                      <UserCircle className="w-5 h-5 text-gray-400" /> Profile Details
                    </button>
                    <button onClick={() => { setView('account-settings'); setShowUserDropdown(false); }} className="w-full px-4 py-3 text-left hover:bg-rose-50 flex items-center gap-3 transition-colors text-gray-700 font-bold">
                      <UserCircle className="w-5 h-5 text-gray-400" /> Account Settings
                    </button>
                    <button onClick={() => { setView(user.role === 'elderly' ? 'home' : 'dashboard'); setShowUserDropdown(false); }} className="w-full px-4 py-3 text-left hover:bg-rose-50 flex items-center gap-3 transition-colors text-gray-700 font-bold">
                      <LayoutDashboard className="w-5 h-5 text-gray-400" /> Dashboard
                    </button>
                    <button onClick={() => { setView('landing'); setShowUserDropdown(false); }} className="w-full px-4 py-3 text-left hover:bg-rose-50 flex items-center gap-3 transition-colors text-gray-700 font-bold">
                      <Home className="w-5 h-5 text-gray-400" /> Welcome Page
                    </button>
                    <div className="h-px bg-gray-50 my-2" />
                    <button onClick={handleLogout} className="w-full px-4 py-3 text-left hover:bg-rose-50 flex items-center gap-3 transition-colors text-primary font-black">
                      <AlertCircle className="w-5 h-5" /> Logout
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
        <AnimatePresence mode="wait">
          {view === 'landing' ? (
            <LandingPage onGetStarted={() => setView(user.role === 'elderly' ? 'home' : 'dashboard')} isAuthenticated={true} />
          ) : view === 'account-settings' ? (
            <AccountSettingsScreen />
          ) : view === 'profile' ? (
            <ProfileView user={user} medicalProfile={medicalProfile} onBack={() => setView(user.role === 'elderly' ? 'home' : 'dashboard')} />
          ) : user.role === 'admin' ? (
            view === 'users' ? (
              <UserManagementPanel />
            ) : view === 'analytics' ? (
              <AnalyticsDashboardScreen />
            ) : (
              <AdminDashboardScreen onNavigate={(v) => setView(v as any)} />
            )
          ) : user.role === 'elderly' ? (
            <ElderlyFlow
              view={view}
              setView={setView}
              onCheckin={handleCheckin}
              onEmergency={handleEmergency}
              checkins={checkins}
              medications={medications}
              alerts={alerts}
            />
          ) : user.role === 'caregiver' ? (
            <CaregiverDashboard view={view} setView={setView} checkins={checkins} alerts={alerts} medications={medications} />
          ) : (
            <FamilyDashboard view={view} setView={setView} checkins={checkins} alerts={alerts} medications={medications} />
          )}
        </AnimatePresence>
      </main>

      {/* Role-Specific Bottom Navigation for Mobile */}
      <BottomNav role={user.role} currentView={view} setView={setView} />
      <Chatbot />
    </div>
  );
}



