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

export default function App() {
  const { user, login, register, logout, isAuthenticated, isInitialized } = useAuthStore();
  const { medications, checkins, alerts, fetchMeds, fetchPatients, setActivePatient, patients, activePatient, addCheckin, triggerEmergency, fetchProfile, medicalProfile, fetchAlerts, fetchSchedules, processAutoMissedTasks } = useDataStore();

  const [showLanding, setShowLanding] = useState(!isAuthenticated);
  const [view, setView] = useState<'home' | 'checkin' | 'meds' | 'dashboard' | 'alerts' | 'family' | 'profile' | 'landing'>('home');
  const [showCheckinSuccess, setShowCheckinSuccess] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Initial data fetch and redirect
  useEffect(() => {
    if (isAuthenticated) {
      setShowLanding(false);
      if (user) {
        if (user.role === 'caregiver') {
          fetchPatients();
          fetchAlerts();
        } else if (user.role === 'elderly') {
          fetchMeds(user.id);
          fetchProfile(user.id);
          fetchSchedules(user.id);
        } else {
          fetchMeds(user.id);
          fetchProfile(user.id);
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

  const handleAuth = async (isRegister: boolean, role: 'elderly' | 'caregiver' | 'child', email: string, pass: string, name?: string) => {
    try {
      if (isRegister) {
        await register({ name: name || '', email, pass, role });
      } else {
        await login({ email, pass, role });
      }
    } catch (error) {
      // Errors are already handled by the API interceptor toast, but we can add context if needed
    }
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
    if (showLanding) return <LandingPage onGetStarted={() => setShowLanding(false)} isAuthenticated={false} />;
    return <LoginScreen onAuth={handleAuth} onBack={() => setShowLanding(true)} />;
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
          ) : view === 'profile' ? (
            <ProfileView user={user} medicalProfile={medicalProfile} onBack={() => setView(user.role === 'elderly' ? 'home' : 'dashboard')} />
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
    </div>
  );
}

function BottomNav({ role, currentView, setView }: { role: string, currentView: string, setView: (v: any) => void }) {
  const tabs = role === 'elderly' ? [
    { id: 'home', icon: <Home />, label: 'Home' },
    { id: 'checkin', icon: <Smile />, label: 'Check-in' },
    { id: 'meds', icon: <Pill />, label: 'Meds' }
  ] : [
    { id: 'dashboard', icon: <LayoutDashboard />, label: 'Overview' },
    { id: 'alerts', icon: <Bell />, label: 'Alerts' },
    { id: 'family', icon: <Activity />, label: 'Stats' }
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[32px] px-2 py-2 flex items-center gap-1 z-50 sm:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setView(tab.id)}
          className={cn(
            "flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all",
            currentView === tab.id ? "bg-primary text-white shadow-lg shadow-rose-200" : "text-gray-400"
          )}
        >
          {React.cloneElement(tab.icon as React.ReactElement, { className: "w-6 h-6" })}
          <span className="text-[10px] font-bold mt-1">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

function LoginScreen({ onAuth, onBack }: { onAuth: (isReg: boolean, role: 'elderly' | 'caregiver' | 'child', email: string, pass: string, name?: string) => void, onBack: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'elderly' | 'caregiver' | 'child'>('elderly');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAuth(isRegister, role, email, password, name);
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6 relative">
      <button
        onClick={onBack}
        className="absolute top-8 left-8 p-4 bg-white rounded-2xl shadow-sm text-gray-500 hover:text-gray-900 transition-all font-bold flex items-center gap-2"
      >
        <Home className="w-5 h-5" /> Back to Home
      </button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full"
      >
        <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Heart className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-center">ElderCare Connect</h1>
        <p className="text-gray-500 mb-8 text-center">{isRegister ? 'Create your account' : 'Welcome back'}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="grid grid-cols-3 gap-2 py-2">
            {(['elderly', 'caregiver', 'child'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "p-2 rounded-xl text-xs font-bold capitalize transition-all",
                  role === r ? "bg-rose-500 text-white" : "bg-gray-100 text-gray-500"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
          >
            {isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <button
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-6 text-sm text-gray-500 hover:text-rose-500 transition-colors"
        >
          {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>
      </motion.div>
    </div>
  );
}

function ElderlyFlow({ view, setView, onCheckin, onEmergency, checkins, medications, alerts }: {
  view: string,
  setView: (v: any) => void,
  onCheckin: (d: any) => void,
  onEmergency: () => void,
  checkins: DailyCheckIn[],
  medications: any[],
  alerts: CaregiverAlert[]
}) {
  const { user } = useAuthStore();
  const {
    schedules,
    completeTask,
    markTaskMissed,
    safeZoneActive,
    toggleSafeZone,
    fetchHealthLogs,
  } = useDataStore();
  const [vitalTask, setVitalTask] = useState<DailyTask | null>(null);
  const [vitalSubmitting, setVitalSubmitting] = useState(false);

  const handleVitalSubmit = async (reading: VitalReadingPayload) => {
    if (!vitalTask) return;
    setVitalSubmitting(true);
    const ok = await completeTask(
      vitalTask.id,
      vitalTask.original_id,
      vitalTask.type,
      vitalTask.scheduled_time,
      { reading }
    );
    setVitalSubmitting(false);
    if (ok) {
      setVitalTask(null);
      if (user) fetchHealthLogs(user.id);
    }
  };

  if (view === 'checkin') {
    return <ElderlyCheckin onComplete={(data) => { onCheckin(data); setView('home'); }} onBack={() => setView('home')} />;
  }

  if (view === 'meds') {
    return <ElderlyMeds meds={medications} schedules={schedules} onBack={() => setView('home')} />;
  }
  if (view !== 'home' && view !== 'checkin' && view !== 'meds') {
    // Fallback or handle specific unexpected views
  }

  const nextMed = medications
    .filter(m => m.next_dose)
    .sort((a, b) => dayjs(toLocalIso(a.next_dose)).diff(dayjs(toLocalIso(b.next_dose))))[0];

  const now = dayjs();
  const pendingTasks = (schedules || []).filter((s) => !s.is_completed && !s.is_missed);
  const missedTasks = (schedules || []).filter((s) => s.is_missed && !s.is_completed);
  const completedTasks = (schedules || []).filter((s) => s.is_completed);

  const overdueTasks = pendingTasks.filter((s) => {
    const status = getTaskVisualStatus(s.scheduled_time, false, false, now);
    return status === 'overdue' || status === 'auto-miss-due' || status === 'late-blocked';
  });

  const activeReminders = (alerts || []).filter((a) => !a.resolved);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", safeZoneActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400")}>
            <Home className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-gray-800">Safe Zone (Home)</p>
            <p className="text-xs text-gray-400 font-medium">{safeZoneActive ? "You are safely at home" : "You are currently away"}</p>
          </div>
        </div>
        <button 
          onClick={toggleSafeZone}
          className={cn("px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95", safeZoneActive ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-green-500 text-white hover:bg-green-600")}
        >
          {safeZoneActive ? "I'm Leaving" : "I'm Back"}
        </button>
      </div>

      {overdueTasks.length > 0 && (
        <div className="bg-rose-100 border-l-4 border-rose-500 p-4 rounded-r-2xl mb-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span className="font-black text-rose-800 uppercase tracking-widest text-xs">Overdue Tasks</span>
          </div>
          <p className="text-rose-900 font-bold">You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}. Please mark them as completed or missed.</p>
        </div>
      )}

      {activeReminders.length > 0 && (
        <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-r-2xl mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-amber-600 animate-pulse" />
            <span className="font-black text-amber-800 uppercase tracking-widest text-xs">Reminder</span>
          </div>
          {activeReminders.map(r => (
            <p key={r.id} className="text-amber-900 font-bold mb-1">{r.message}</p>
          ))}
        </div>
      )}

      <div className="bg-gradient-to-br from-rose-500 to-orange-400 p-6 sm:p-8 rounded-[40px] text-white shadow-2xl shadow-rose-200 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-2">Good morning!</h2>
          <p className="text-rose-100 text-lg font-medium opacity-90">
            {pendingTasks.length > 0 ? `You have ${pendingTasks.length} tasks for today.` : "You're all caught up!"}
          </p>

          <div className="mt-8 space-y-3">
            {pendingTasks.map((s: DailyTask) => (
              <TaskCard
                key={s.id}
                task={s}
                variant="elderly"
                onComplete={() => completeTask(s.id, s.original_id, s.type, s.scheduled_time)}
                onMiss={() => markTaskMissed(s.id, s.original_id, s.type, s.title, s.scheduled_time)}
                onRecordReading={() => setVitalTask(s)}
              />
            ))}
            {pendingTasks.length === 0 && (
              <div className="p-6 bg-white/10 rounded-2xl text-center border border-white/10">
                <Smile className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-bold">Everything is done for now!</p>
              </div>
            )}
          </div>

          {/* Missed Tasks Summary */}
          {missedTasks.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/20">
              <p className="text-xs font-black uppercase tracking-widest text-rose-200 mb-3">Missed Today ({missedTasks.length})</p>
              {missedTasks.map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2 opacity-60">
                  <XCircle className="w-5 h-5 text-rose-200" />
                  <span className="font-bold text-sm line-through">{s.title}</span>
                  <span className="text-xs opacity-70 ml-auto">{s.scheduled_time.substring(0, 5)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Completed Tasks Summary */}
          {completedTasks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs font-black uppercase tracking-widest text-green-200 mb-3">Completed ({completedTasks.length})</p>
              {completedTasks.map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2 opacity-60">
                  <CheckCircle2 className="w-5 h-5 text-green-200" />
                  <span className="font-bold text-sm line-through">{s.title}</span>
                  <span className="text-xs opacity-70 ml-auto">{s.scheduled_time.substring(0, 5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
      </div>

      {nextMed?.next_dose && (
        <NextMedicationCard
          name={nextMed.name}
          dosage={nextMed.dosage}
          nextDoseIso={nextMed.next_dose}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setView('meds')}
          className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 hover:border-rose-200 transition-all group"
        >
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Pill className="w-10 h-10" />
          </div>
          <span className="text-2xl font-bold">My Medicines</span>
        </button>

        <button
          className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 hover:border-rose-200 transition-all group"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Phone className="w-10 h-10" />
          </div>
          <span className="text-2xl font-bold">Call Family</span>
        </button>
      </div>

      <div className="pt-4">
        <button
          onClick={onEmergency}
          className="w-full py-10 bg-rose-600 text-white rounded-[40px] shadow-2xl shadow-rose-200 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group animate-pulse"
        >
          <ShieldAlert className="w-16 h-16 mb-2" />
          <span className="text-4xl font-black uppercase tracking-tighter">Emergency Help</span>
          <p className="text-rose-200 font-bold opacity-80 uppercase tracking-widest text-xs">Press if you need help</p>
        </button>
      </div>
    </motion.div>

    <VitalReadingModal
      task={vitalTask}
      open={!!vitalTask}
      onClose={() => setVitalTask(null)}
      onSubmit={handleVitalSubmit}
      isSubmitting={vitalSubmitting}
    />
    </>
  );
}

function ElderlyCheckin({ onComplete, onBack }: { onComplete: (d: any) => void, onBack: () => void }) {
  const { user } = useAuthStore();
  const { schedules, completeTask, markTaskMissed, fetchHealthLogs } = useDataStore();
  const [initialTasks] = useState((schedules || []).filter((s) => !s.is_completed && !s.is_missed));
  const [step, setStep] = useState(0);
  const [recordingVital, setRecordingVital] = useState(false);

  const isWellbeingStep = step >= initialTasks.length;

  const handleNextTask = async (didComplete: boolean) => {
    const task = initialTasks[step] as DailyTask;
    if (didComplete) {
      if (!canElderlyComplete(task)) {
        return;
      }
      if (taskRequiresReading(task)) {
        setRecordingVital(true);
        return;
      }
      await completeTask(task.id, task.original_id, task.type, task.scheduled_time);
      setStep(step + 1);
    } else {
      if (!canMarkTaskMissed(task)) {
        return;
      }
      const ok = await markTaskMissed(task.id, task.original_id, task.type, task.title, task.scheduled_time);
      if (ok) setStep(step + 1);
    }
  };

  const handleVitalRecorded = async (reading: VitalReadingPayload) => {
    const task = initialTasks[step] as DailyTask;
    const ok = await completeTask(task.id, task.original_id, task.type, task.scheduled_time, { reading });
    if (ok) {
      setRecordingVital(false);
      setStep(step + 1);
      if (user) fetchHealthLogs(user.id);
    }
  };

  const handleWellbeing = (mood: string) => {
    onComplete({ mood });
  };

  if (isWellbeingStep) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="min-h-[70vh] flex flex-col"
      >
        <button onClick={onBack} className="self-start mb-8 text-gray-400 font-bold flex items-center gap-2">
          <ChevronRight className="rotate-180 w-5 h-5" /> Back
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-32 h-32 rounded-[40px] flex items-center justify-center text-white mb-8 shadow-2xl bg-indigo-500">
            <Smile className="w-16 h-16" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-12 tracking-tighter">How are you feeling today?</h2>

          <div className="grid grid-cols-1 w-full gap-4 px-4">
            <button onClick={() => handleWellbeing('Happy')} className="py-8 bg-green-500 text-white rounded-[40px] text-3xl font-black shadow-xl shadow-green-100 active:scale-95 transition-all">Good / Happy</button>
            <button onClick={() => handleWellbeing('Neutral')} className="py-8 bg-blue-500 text-white rounded-[40px] text-3xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">Okay / Neutral</button>
            <button onClick={() => handleWellbeing('Sad')} className="py-8 bg-white border-4 border-gray-100 text-gray-400 rounded-[40px] text-3xl font-black active:scale-95 transition-all">Not Great / Sad</button>
          </div>
        </div>
      </motion.div>
    );
  }

  const currentTask = initialTasks[step] as DailyTask;
  const elderlyCanComplete = canElderlyComplete(currentTask);
  const taskCanMiss = canMarkTaskMissed(currentTask);
  const actionOpen = isActionWindowOpen(currentTask.scheduled_time);

  if (recordingVital && currentTask) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[70vh] flex flex-col p-4">
        <button onClick={() => setRecordingVital(false)} className="self-start mb-6 text-gray-400 font-bold flex items-center gap-2">
          <ChevronRight className="rotate-180 w-5 h-5" /> Back
        </button>
        <div className="bg-white rounded-[40px] border border-gray-100 p-6 sm:p-8 shadow-sm flex-1">
          <h2 className="text-2xl font-black mb-2">{currentTask.title}</h2>
          <p className="text-gray-500 font-medium mb-6">Enter your reading to complete this task.</p>
          <VitalReadingForm
            metricType={currentTask.metric_type}
            taskTitle={currentTask.title}
            onSubmit={handleVitalRecorded}
            onCancel={() => setRecordingVital(false)}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-[70vh] flex flex-col"
    >
      <button onClick={onBack} className="self-start mb-8 text-gray-400 font-bold flex items-center gap-2">
        <ChevronRight className="rotate-180 w-5 h-5" /> Back
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="w-32 h-32 rounded-[40px] flex items-center justify-center text-white mb-8 shadow-2xl bg-rose-500">
          {currentTask.type === 'medication' ? <Pill className="w-16 h-16" /> : <CheckCircle2 className="w-16 h-16" />}
        </div>
        <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tighter px-2">{currentTask.title}</h2>
        <p className="text-lg text-gray-500 font-bold mb-2">
          Target {currentTask.scheduled_time.substring(0, 5)} · ±{SCHEDULE_GRACE_MINUTES} min window
        </p>
        <p className="text-sm text-gray-400 font-medium mb-6">{formatGraceWindowRange(currentTask.scheduled_time)}</p>

        {!actionOpen && (
          <div className="w-full max-w-sm mb-8 px-4">
            <LiveCountdown scheduledTime={currentTask.scheduled_time} variant="caregiver" />
            <p className="text-sm text-gray-500 font-medium mt-4">
              You can mark complete up to {SCHEDULE_GRACE_MINUTES} minutes early, or missed after the scheduled time.
            </p>
          </div>
        )}

        {actionOpen && !elderlyCanComplete && !taskCanMiss && (
          <p className="text-rose-600 font-bold mb-6 px-4 text-base">
            Your flexible window has ended. Ask your caregiver or family to record completion.
          </p>
        )}

        {actionOpen && (
          <div className="grid grid-cols-1 w-full gap-4 px-4 max-w-md">
            {elderlyCanComplete && (
              <button
                type="button"
                onClick={() => handleNextTask(true)}
                className="min-h-[56px] py-6 bg-green-500 text-white rounded-[32px] text-2xl font-black shadow-xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center gap-3 touch-manipulation"
              >
                <CheckCircle2 className="w-8 h-8" /> YES, DONE
              </button>
            )}
            {taskCanMiss && (
              <button
                type="button"
                onClick={() => handleNextTask(false)}
                className="min-h-[56px] py-6 bg-rose-500 text-white rounded-[32px] text-2xl font-black shadow-xl shadow-rose-100 active:scale-95 transition-all flex items-center justify-center gap-3 touch-manipulation"
              >
                <XCircle className="w-8 h-8" /> I MISSED IT
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ElderlyMeds({ meds, schedules, onBack }: { meds: any[], schedules: DailyTask[], onBack: () => void }) {
  const displayMeds = meds.length > 0 ? meds : [];
  const { completeTask } = useDataStore();

  const handleTakeMed = async (med: any) => {
    const todayTasks = (schedules || []).filter(
      (t) => t.type === 'medication' && t.original_id === med.id && !t.is_completed && !t.is_missed
    );
    const dueTask = todayTasks.find((t) => canMarkTaskComplete(t));

    if (dueTask) {
      await completeTask(dueTask.id, dueTask.original_id, 'medication', dueTask.scheduled_time);
      return;
    }
    if (todayTasks.length > 0) {
      toast.error('This dose is not due yet. See the countdown above.');
      return;
    }
    if (med.next_dose) {
      const localNextDose = med.next_dose.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
      if (dayjs(localNextDose).diff(dayjs(), 'second') > 0) {
        toast.error('This dose is not due yet.');
        return;
      }
    }
    await useDataStore.getState().takeMed(med.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black tracking-tighter">My Medicines</h2>
        <button onClick={onBack} className="p-4 bg-gray-100 rounded-2xl font-bold">Close</button>
      </div>

      <div className="relative pl-8 space-y-6">
        {/* Vertical Timeline Line */}
        <div className="absolute left-3 top-4 bottom-4 w-1 bg-gray-100 rounded-full" />
        
        {displayMeds.sort((a, b) => dayjs(toLocalIso(a.next_dose) || 0).diff(dayjs(toLocalIso(b.next_dose) || 0))).map((med, i) => {
          const medTask = (schedules || []).find(
            (t) => t.type === 'medication' && t.original_id === med.id && !t.is_completed && !t.is_missed
          );
          const canTake = medTask ? canElderlyComplete(medTask) : false;

          return (
          <div key={med.id ?? i} className="relative bg-white p-5 sm:p-6 rounded-[32px] border border-gray-100 flex flex-col gap-4 shadow-sm">
            <div className="absolute -left-9 top-8 w-6 h-6 rounded-full bg-rose-100 border-4 border-white flex items-center justify-center hidden sm:flex">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn('w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center shrink-0 bg-gray-50', med.color || 'text-rose-500')}>
                  <Pill className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold truncate">{med.name}</p>
                  <p className="text-rose-500 font-black">{med.dosage}</p>
                </div>
              </div>
              {med.next_dose && (
                <LiveCountdown targetIso={med.next_dose} variant="med" label="Next dose" className="w-full sm:w-auto" />
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={!canTake && !!medTask}
                onClick={() => handleTakeMed(med)}
                className={cn(
                  'flex-1 min-h-[52px] py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 touch-manipulation transition-all',
                  canTake || !medTask
                    ? 'bg-green-500 text-white active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                <CheckCircle2 className="w-5 h-5" />
                {canTake ? 'Mark taken' : medTask ? 'Not due yet' : 'Mark taken'}
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Instructions</p>
              <p className="font-medium text-gray-700">{med.instructions || 'No specific instructions.'}</p>
            </div>
          </div>
        );
        })}
        {displayMeds.length === 0 && <p className="text-center text-gray-400 py-12">No medications scheduled.</p>}
      </div>

      <div className="bg-blue-50 p-8 rounded-[40px] border border-blue-100 mt-12">
        <p className="text-blue-700 font-bold text-center text-lg">Your family will be notified when you take your pills! 💖</p>
      </div>
    </motion.div>
  );
}

function CaregiverDashboard({ view, setView, checkins, alerts, medications }: {
  view: string,
  setView: (v: any) => void,
  checkins: DailyCheckIn[],
  alerts: CaregiverAlert[],
  medications: any[]
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'medical'>('overview');
  const { patients, activePatient, setActivePatient, fetchMeds, healthLogs, safeZoneActive, schedules } = useDataStore();
  const activeAlerts = alerts.filter(a => !a.resolved);
  const adherencePercent = computeAdherencePercent(schedules || []);

  const nextMed = medications
    .filter(m => m.next_dose)
    .sort((a, b) => dayjs(toLocalIso(a.next_dose)).diff(dayjs(toLocalIso(b.next_dose))))[0];

  // Map outer 'view' to internal state if needed
  useEffect(() => {
    if (view === 'dashboard') setActiveTab('overview');
  }, [view]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Patient Management</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-gray-400 text-sm font-medium">Monitoring:</span>
            <select
              value={activePatient?.id || ''}
              onChange={(e) => setActivePatient(Number(e.target.value))}
              className="bg-transparent border-none text-rose-500 font-bold p-0 outline-none cursor-pointer text-sm sm:text-base max-w-[200px] sm:max-w-none truncate"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {patients.length === 0 && <option>No Patients Linked</option>}
            </select>
          </div>
        </div>
        <div className="flex gap-2 self-end sm:self-auto">
          <button className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm"><Phone className="w-5 h-5 text-gray-400" /></button>
          <button
            onClick={() => setView('alerts')}
            className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm relative"
          >
            <Bell className={cn("w-5 h-5", activeAlerts.length > 0 ? "text-primary" : "text-gray-400")} />
            {activeAlerts.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-ping" />}
          </button>
        </div>
      </header>

      {/* View Switcher Logic */}
      {view === 'alerts' ? (
        <AlertsListView alerts={alerts} onResolve={(id) => useDataStore.getState().resolveAlert(id)} />
      ) : view === 'family' ? (
        <StatsView healthLogs={healthLogs} activePatient={activePatient} schedules={schedules} />
      ) : (
        <>
          <div className="flex bg-gray-100 p-1 rounded-2xl w-full max-w-sm mb-8">
            {(['overview', 'medical'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all",
                  activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Adherence" value={`${adherencePercent}%`} icon={<CheckCircle2 />} color="text-green-500" />
                <StatCard label="Next Med" value={nextMed ? dayjs(toLocalIso(nextMed.next_dose)).format('HH:mm') : 'None'} icon={<Pill />} color="text-rose-500" />
                <StatCard label="Location" value={safeZoneActive ? 'At Home' : 'Away'} icon={<Home />} color={safeZoneActive ? "text-green-500" : "text-amber-500"} />
              </div>

              <div className="glass-card p-6 sm:p-8 rounded-[40px] relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs uppercase tracking-widest text-indigo-600">Medical Summary</span>
                  </div>
                  <p className="text-xl font-bold leading-tight mb-4">
                    "Patient shows positive response to new medication. Hydration is stable. No pain reported in last 48 hours."
                  </p>
                  <button className="text-indigo-600 font-black text-sm flex items-center gap-1 group">
                    Detailed Analysis <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>

              <DailyTaskChecklist patientName={activePatient?.name || 'Unknown Patient'} />

              <div className="space-y-4">
                <h3 className="text-xl font-black tracking-tight">Recent Activity</h3>
                <div className="grid gap-3">
                  {checkins.length > 0 ? checkins.map((c, i) => (
                    <div key={i} className="bg-white p-4 rounded-3xl border border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-rose-500">
                          <Smile className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold">Daily Check-in</p>
                          <p className="text-xs text-gray-400 font-medium">{new Date(c.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-black uppercase">Good</span>
                    </div>
                  )) : (
                    <div className="py-12 text-center text-gray-400 bg-white rounded-[40px] border border-dashed border-gray-100">
                      No recent activity logs.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <MedicalProfileView medications={medications} fetchMeds={fetchMeds} activePatient={activePatient} />
          )}
        </>
      )}
    </motion.div>
  );
}

function AlertsListView({ alerts, onResolve }: { alerts: CaregiverAlert[]; onResolve: (id: string | number) => void }) {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-black tracking-tight">Emergency & Care Alerts</h3>
      <div className="grid gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className={cn(
            "p-6 rounded-[32px] border flex items-center justify-between",
            alert.resolved ? "bg-white border-gray-100 grayscale" : "bg-rose-50 border-rose-100 shadow-lg shadow-rose-100"
          )}>
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", alert.resolved ? "bg-gray-100" : "bg-rose-500 text-white")}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-lg">{alert.message}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{dayjs(alert.timestamp ?? alert.created_at).fromNow()}</p>
                {!alert.resolved && alert.type === 'emergency' && (
                  <p className="text-xs text-rose-500 font-bold uppercase mt-1">Escalation to Family in 5:00</p>
                )}
              </div>
            </div>
            {!alert.resolved && (
              <button
                type="button"
                onClick={() => onResolve(alert.id)}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl font-bold text-xs"
              >
                RESOLVE
              </button>
            )}
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="py-20 text-center text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold">All clear! No pending alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsView({ healthLogs, activePatient, schedules = [] }: { healthLogs: any[], activePatient: any, schedules?: DailyTask[] }) {
  const adherencePercent = computeAdherencePercent(schedules);
  const missedCount = schedules.filter((t) => t.is_missed && !t.is_completed).length;
  const completedCount = schedules.filter((t) => t.is_completed).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-4">
        <h3 className="text-2xl font-black tracking-tight">Health Trends</h3>
        <p className="text-sm font-bold text-gray-400">{activePatient?.name}'s Summary</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-indigo-500 uppercase tracking-widest text-xs">Heart Rate History</h4>
            <Heart className="w-5 h-5 text-rose-500 animate-pulse" />
          </div>
          <div className="h-32 flex items-end gap-2 px-2">
            {[65, 72, 68, 75, 82, 70, 74].map((v, i) => (
              <div key={i} className="flex-1 bg-indigo-50 rounded-t-lg relative group" style={{ height: `${(v / 100) * 100}%` }}>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {v}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-black text-gray-300 uppercase">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-blue-500 uppercase tracking-widest text-xs">Adherence Report</h4>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex items-center justify-center py-2">
            <div className={cn(
              "w-20 h-20 rounded-full border-8 flex items-center justify-center",
              adherencePercent >= 80 ? "border-green-500" : adherencePercent >= 50 ? "border-amber-500" : "border-rose-500"
            )}>
              <span className="text-xl font-black">{adherencePercent}%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6 text-center">
            <div className="bg-green-50 rounded-2xl p-3">
              <p className="text-2xl font-black text-green-600">{completedCount}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Completed</p>
            </div>
            <div className="bg-rose-50 rounded-2xl p-3">
              <p className="text-2xl font-black text-rose-600">{missedCount}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Missed</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-2xl font-black text-gray-600">{schedules.length}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">Total Today</p>
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest">Today&apos;s Task Summary</p>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100">
        <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs mb-6">Recent Vitals Log</h4>
        <div className="space-y-3">
          {healthLogs.slice(0, 10).map((log, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <p className="font-bold capitalize">{log.type}</p>
                <span className="text-[10px] text-gray-300">{dayjs(log.created_at).format('MMM D, HH:mm')}</span>
              </div>
              <p className="font-black text-indigo-600">
                {typeof log.value === 'object' ? `${log.value.systolic}/${log.value.diastolic}` : log.value} {log.unit}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function DailyTaskChecklist({ patientName }: { patientName: string }) {
  const { schedules, completeTask, markTaskMissed, activePatient, fetchHealthLogs } = useDataStore();
  const [vitalTask, setVitalTask] = useState<DailyTask | null>(null);
  const [vitalSubmitting, setVitalSubmitting] = useState(false);
  const activeTasks = (schedules || []).filter((s) => !s.is_completed);
  const pendingCount = activeTasks.filter((s) => !s.is_missed).length;
  const missedCount = activeTasks.filter((s) => s.is_missed).length;

  const handleVitalSubmit = async (reading: VitalReadingPayload) => {
    if (!vitalTask) return;
    setVitalSubmitting(true);
    const ok = await completeTask(
      vitalTask.id,
      vitalTask.original_id,
      vitalTask.type,
      vitalTask.scheduled_time,
      { onBehalf: true, reading }
    );
    setVitalSubmitting(false);
    if (ok) {
      setVitalTask(null);
      if (activePatient) fetchHealthLogs(activePatient.id);
    }
  };

  return (
  <>
    <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs">Today&apos;s Care Tasks</h4>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">
            {pendingCount} PENDING
          </span>
          {missedCount > 0 && (
            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">
              {missedCount} MISSED
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {activeTasks.map((s: DailyTask) => (
          <TaskCard
            key={s.id}
            task={s}
            variant="caregiver"
            onComplete={() => completeTask(s.id, s.original_id, s.type, s.scheduled_time, { onBehalf: true })}
            onMiss={() => markTaskMissed(s.id, s.original_id, s.type, s.title, s.scheduled_time)}
            onRecordReading={() => setVitalTask(s)}
          />
        ))}
        {activeTasks.length === 0 && (
          <div className="py-8 text-center text-gray-400 italic text-sm">
            All tasks for {patientName} are completed! ✨
          </div>
        )}
      </div>
    </div>

    <VitalReadingModal
      task={vitalTask}
      open={!!vitalTask}
      onClose={() => setVitalTask(null)}
      onSubmit={handleVitalSubmit}
      isSubmitting={vitalSubmitting}
    />
  </>
  );
}


function MedicalProfileView({ medications, fetchMeds, activePatient }: { medications: any[], fetchMeds: (id: number) => void, activePatient: any }) {
  const [showAddMed, setShowAddMed] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const { updateMed, deleteMed, medicalProfile, updateProfile, healthLogs, addHealthLog, fetchSchedules } = useDataStore();
  const { user } = useAuthStore();

  const canEdit = user?.role === 'caregiver' || user?.role === 'elderly';

  const handleSaveMed = async (formData: any) => {
    if (editingMed) {
      await updateMed(editingMed.id, formData);
      setEditingMed(null);
    } else {
      await api.post('/medications', {
        ...formData,
        user_id: activePatient.id
      });
      setShowAddMed(false);
    }
    await Promise.all([
      fetchMeds(activePatient.id),
      fetchSchedules(activePatient.id),
    ]);
  };

  if (!medicalProfile) {
    return (
      <div className="bg-white p-12 rounded-[40px] text-center border border-gray-100">
        <Activity className="w-12 h-12 text-rose-200 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-400 font-bold">Loading medical profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recording Quick Action */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 sm:p-8 rounded-[40px] text-white shadow-xl shadow-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h3 className="text-2xl font-black tracking-tight">Record Health Data</h3>
          <p className="text-indigo-100 font-medium opacity-90">Daily vitals for {activePatient.name}</p>
        </div>
        <button
          onClick={() => setShowAddLog(!showAddLog)}
          className="px-6 py-3 bg-white text-indigo-600 font-black rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          {showAddLog ? 'Cancel' : '+ New Record'}
        </button>
      </div>

      <AnimatePresence>
        {showAddLog && (
          <HealthLogForm
            patientId={activePatient.id}
            monitoredMetrics={medicalProfile.monitored_metrics || ['heartbeat', 'blood_pressure', 'glucose', 'temp']}
            onSave={async (data) => {
              await addHealthLog(data);
              setShowAddLog(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className="bg-white p-6 sm:p-8 rounded-[40px] border border-gray-100 space-y-8">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" /> Chronic Conditions
          </h3>
          {canEdit && (
            <button
              onClick={() => setShowEditProfile(!showEditProfile)}
              className="text-rose-500 font-bold text-sm"
            >
              {showEditProfile ? 'Cancel' : '+ Edit Profile'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {showEditProfile && (
            <ProfileEditForm
              initialData={medicalProfile}
              onSave={async (data) => {
                await updateProfile(activePatient.id, data);
                setShowEditProfile(false);
              }}
              onCancel={() => setShowEditProfile(false)}
            />
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-2">
          {medicalProfile.chronic_conditions?.map((c: string) => (
            <span key={c} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm">{c}</span>
          ))}
          {!medicalProfile.chronic_conditions?.length && <p className="text-gray-400 italic text-sm">No conditions listed.</p>}
        </div>

        <div className="pt-8 border-t border-gray-50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-500" /> Medications
            </h3>
            {canEdit && (
              <button
                onClick={() => setShowAddMed(!showAddMed)}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100"
              >
                {showAddMed ? 'Cancel' : '+ Add Medication'}
              </button>
            )}
          </div>

          {(showAddMed || editingMed) && (
            <MedicationForm
              initialData={editingMed}
              onSave={handleSaveMed}
              onCancel={() => { setShowAddMed(false); setEditingMed(null); }}
            />
          )}

          <div className="space-y-3">
            {medications.map((m, i) => (
              <div key={i} className="p-6 bg-white border border-gray-100 rounded-[32px] flex justify-between items-center group hover:border-rose-200 transition-all shadow-sm">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-lg">{m.name} <span className="text-rose-500 text-sm">{m.dosage}</span></p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{m.frequency_data?.type || 'Daily'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => useDataStore.getState().takeMed(m.id)}
                    className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                  </button>
                </div>
                {canEdit && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingMed(m)} className="p-2 hover:bg-blue-50 text-blue-500 rounded-xl transition-colors">
                      <FileText className="w-5 h-5" />
                    </button>
                    <button onClick={() => deleteMed(m.id)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors">
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {medications.length === 0 && <p className="text-center text-gray-400 py-4 italic">No medications found.</p>}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black tracking-tight mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-500" /> Allergies
          </h3>
          <div className="flex flex-wrap gap-2">
            {medicalProfile.allergies?.map((a: string) => (
              <span key={a} className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-sm">{a}</span>
            ))}
            {!medicalProfile.allergies?.length && <p className="text-gray-400 italic text-sm">No allergies listed.</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-50">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Blood Type</p>
            <p className="text-lg font-black">{medicalProfile.blood_type || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Cognitive Status</p>
            <p className="text-lg font-black text-amber-600">{medicalProfile.cognitive_status || 'Stable'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fall Risk</p>
            <p className="text-lg font-black text-rose-500">{medicalProfile.fall_risk || 'Low'}</p>
          </div>
        </div>
      </div>

      {/* Recent Health Logs */}
      <div className="space-y-4">
        <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" /> Recent Vital History
        </h3>
        <div className="grid gap-3">
          {healthLogs.slice(0, 5).map((log, i) => (
            <div key={i} className="bg-white p-5 rounded-[32px] border border-gray-50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                  {log.type === 'heartbeat' ? <Heart className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-bold capitalize">{log.type.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{dayjs(log.created_at).fromNow()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-indigo-600">
                  {/* @ts-ignore */}
                  {typeof log.value === 'object' ? `${log.value.systolic}/${log.value.diastolic}` : log.value}
                  <span className="text-[10px] text-gray-400 ml-1 uppercase">{log.unit}</span>
                </p>
              </div>
            </div>
          ))}
          {!healthLogs.length && (
            <div className="py-8 text-center text-gray-400 bg-white rounded-[32px] border border-dashed border-gray-100">
              No health logs recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileEditForm({ initialData, onSave, onCancel }: { initialData: any, onSave: (data: any) => void, onCancel: () => void }) {
  const [conditions, setConditions] = useState(initialData.chronic_conditions?.join(', ') || '');
  const [allergies, setAllergies] = useState(initialData.allergies?.join(', ') || '');
  const [bloodType, setBloodType] = useState(initialData.blood_type || '');
  const [cognitive, setCognitive] = useState(initialData.cognitive_status || 'Stable');
  const [fallRisk, setFallRisk] = useState(initialData.fall_risk || 'low');
  const [metrics, setMetrics] = useState<string[]>(initialData.monitored_metrics || ['heartbeat', 'blood_pressure']);

  const allMetrics = [
    { id: 'heartbeat', label: 'Heartbeat (BPM)' },
    { id: 'blood_pressure', label: 'Blood Pressure' },
    { id: 'glucose', label: 'Glucose Levels' },
    { id: 'temp', label: 'Temperature' },
    { id: 'weight', label: 'Weight' }
  ];

  const toggleMetric = (id: string) => {
    setMetrics(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      chronic_conditions: conditions.split(',').map(s => s.trim()).filter(Boolean),
      allergies: allergies.split(',').map(s => s.trim()).filter(Boolean),
      blood_type: bloodType,
      cognitive_status: cognitive,
      fall_risk: fallRisk,
      monitored_metrics: metrics
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-rose-50 p-6 rounded-[32px] border border-rose-100 mb-6 space-y-6 overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Chronic Conditions (comma separated)</label>
            <input value={conditions} onChange={e => setConditions(e.target.value)} type="text" className="w-full p-4 bg-white border border-rose-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Allergies (comma separated)</label>
            <input value={allergies} onChange={e => setAllergies(e.target.value)} type="text" className="w-full p-4 bg-white border border-rose-100 rounded-2xl outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Blood Type</label>
            <input value={bloodType} onChange={e => setBloodType(e.target.value)} type="text" className="w-full p-4 bg-white border border-rose-100 rounded-2xl outline-none font-bold" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Cognitive</label>
            <select value={cognitive} onChange={e => setCognitive(e.target.value)} className="w-full p-4 bg-white border border-rose-100 rounded-2xl outline-none font-bold">
              <option value="Stable">Stable</option>
              <option value="Declining">Declining</option>
              <option value="Impaired">Impaired</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Fall Risk</label>
            <select value={fallRisk} onChange={e => setFallRisk(e.target.value)} className="w-full p-4 bg-white border border-rose-100 rounded-2xl outline-none font-bold">
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-2">Required Daily Records</label>
          <div className="flex flex-wrap gap-2">
            {allMetrics.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMetric(m.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  metrics.includes(m.id) ? "bg-rose-500 text-white" : "bg-white text-gray-400 border border-rose-100"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-200">
          Update Patient Requirements
        </button>
      </form>
    </motion.div>
  );
}

function HealthLogForm({ patientId, monitoredMetrics, onSave }: { patientId: number, monitoredMetrics: string[], onSave: (data: any) => void }) {
  const [type, setType] = useState(monitoredMetrics[0] || 'heartbeat');

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-indigo-50 p-8 rounded-[40px] border border-indigo-100 mb-6"
    >
      <div className="space-y-4 mb-4">
        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">Metric Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full p-4 bg-white border border-indigo-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold capitalize"
        >
          {monitoredMetrics.map((m) => (
            <option key={m} value={m}>{m.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
      <VitalReadingForm
        metricType={type}
        onSubmit={(reading) =>
          onSave({
            user_id: patientId,
            type,
            value: reading.value,
            notes: reading.notes,
          })
        }
        submitLabel="Save Metric Record"
        variant="inline"
      />
    </motion.div>
  );
}


function FamilyDashboard({ view, setView, checkins, alerts, medications }: {
  view: string,
  setView: (v: any) => void,
  checkins: DailyCheckIn[],
  alerts: CaregiverAlert[],
  medications: any[]
}) {
  const { healthLogs, schedules, resolveAlert } = useDataStore();
  const nextMed = medications
    .filter(m => m.next_dose)
    .sort((a, b) => dayjs(toLocalIso(a.next_dose)).diff(dayjs(toLocalIso(b.next_dose))))[0];

  if (view === 'alerts') return <AlertsListView alerts={alerts} onResolve={resolveAlert} />;
  if (view === 'family') return <StatsView healthLogs={healthLogs} activePatient={null} schedules={schedules} />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm text-center">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter mb-2">Everything is fine!</h2>
        <p className="text-gray-500 font-medium italic">Status updated recently.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Next Medication</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center"><Pill className="w-5 h-5" /></div>
            <p className="font-bold">{nextMed ? dayjs(toLocalIso(nextMed.next_dose)).format('HH:mm') : 'None'}</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">{nextMed ? dayjs(toLocalIso(nextMed.next_dose)).fromNow() : 'No meds scheduled'}</p>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Daily Status</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
            <p className="font-bold text-emerald-600">Stable</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Active Monitoring</p>
        </div>
      </div>

      <button className="w-full py-6 bg-secondary text-white rounded-[32px] font-bold shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
        <Phone className="w-6 h-6" /> Video Call Relative
      </button>
    </motion.div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50", color)}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  );
}

const WEEKDAYS = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

function MedicationForm({ initialData, onSave, onCancel }: { initialData?: any, onSave: (data: any) => void, onCancel: () => void }) {
  const [name, setName] = useState(initialData?.name || '');
  const [dosage, setDosage] = useState(initialData?.dosage || '');
  const [instructions, setInstructions] = useState(initialData?.instructions || '');
  const [type, setType] = useState(initialData?.frequency_data?.type || 'daily');
  const [time, setTime] = useState(initialData?.frequency_data?.times?.[0]?.substring(0, 5) || '08:00');
  const [weekDays, setWeekDays] = useState<string[]>(
    initialData?.frequency_data?.days?.length
      ? initialData.frequency_data.days
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  );

  const toggleDay = (day: string) => {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'weekly' && weekDays.length === 0) {
      return;
    }
    const frequency_data =
      type === 'weekly'
        ? { type: 'weekly', times: [time], days: weekDays.map((d) => d.toLowerCase()) }
        : { type: 'daily', times: [time] };

    onSave({
      name,
      dosage,
      instructions,
      frequency_data,
      is_active: true,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 mb-6 space-y-4 overflow-hidden"
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-black text-rose-500 uppercase tracking-widest text-xs">
          {initialData ? 'Edit Medication' : 'Add New Medication'}
        </h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-900 transition-colors"><AlertCircle className="w-5 h-5 rotate-45" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="e.g. Metformin" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500" required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Dosage</label>
            <input value={dosage} onChange={e => setDosage(e.target.value)} type="text" placeholder="e.g. 500mg" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500" required />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Frequency</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 font-bold min-h-[52px]">
              <option value="daily">Every day</option>
              <option value="weekly">Specific days</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Time</label>
            <input value={time} onChange={e => setTime(e.target.value)} type="time" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 font-bold min-h-[52px]" required />
          </div>
        </div>
        {type === 'weekly' && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Days</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={cn(
                    'min-w-[44px] min-h-[44px] px-3 rounded-xl font-bold text-sm transition-all touch-manipulation',
                    weekDays.includes(d.id)
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-500'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Special Instructions</label>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="e.g. Take with food" className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 h-24" />
        </div>
        <button type="submit" className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-200 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest">
          {initialData ? 'Update Schedule' : 'Create Medication'}
        </button>
      </form>
    </motion.div>
  );
}

function ProfileView({ user, medicalProfile, onBack }: { user: any, medicalProfile?: any, onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black tracking-tighter">My Profile</h2>
        <button onClick={onBack} className="p-4 bg-gray-100 rounded-2xl font-bold">Back</button>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-gray-100 text-center space-y-6">
        <div className="w-32 h-32 bg-rose-100 rounded-[48px] flex items-center justify-center mx-auto shadow-inner">
          <UserCircle className="w-20 h-20 text-rose-500" />
        </div>
        <div>
          <h3 className="text-4xl font-black tracking-tight">{user.name}</h3>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">{user.role}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-8 border-t border-gray-50">
          <div className="p-6 bg-gray-50 rounded-3xl">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</p>
            <p className="font-bold text-lg">{user.email}</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-3xl">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Options</p>
            <div className="flex flex-col gap-1">
              <button className="text-sm font-bold text-rose-500 text-left hover:underline">Edit Security Settings</button>
              <button className="text-sm font-bold text-gray-500 text-left hover:underline">Privacy Policy</button>
            </div>
          </div>
        </div>

        {user.role === 'elderly' && medicalProfile && (
          <div className="pt-8 border-t border-gray-50 text-left space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Blood Type</p>
                <p className="font-black text-xl text-rose-500">{medicalProfile.blood_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cognitive</p>
                <p className="font-black text-xl text-amber-600">{medicalProfile.cognitive_status || 'Stable'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fall Risk</p>
                <p className="font-black text-xl text-rose-600">{medicalProfile.fall_risk || 'Low'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Chronic Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {medicalProfile.chronic_conditions?.map((c: string) => (
                    <span key={c} className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg font-bold text-xs">{c}</span>
                  ))}
                  {!medicalProfile.chronic_conditions?.length && <p className="text-gray-400 italic text-sm">None listed</p>}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {medicalProfile.allergies?.map((a: string) => (
                    <span key={a} className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg font-bold text-xs">{a}</span>
                  ))}
                  {!medicalProfile.allergies?.length && <p className="text-gray-400 italic text-sm">None listed</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-rose-50 p-8 rounded-[40px] border border-rose-100">
        <p className="text-rose-600 font-bold text-center">Your profile data is encrypted and only visible to authorized caregivers and linked family members. 🔒</p>
      </div>
    </motion.div>
  );
}
