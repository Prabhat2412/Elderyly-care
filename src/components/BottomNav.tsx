import React from 'react';
import { Home, Smile, Pill, LayoutDashboard, Clock, Bell, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export function BottomNav({ role, currentView, setView }: { role: string, currentView: string, setView: (v: any) => void }) {
  if (role === 'admin') return null;
  const tabs = role === 'elderly' ? [
    { id: 'home', icon: <Home />, label: 'Home' },
    { id: 'checkin', icon: <Smile />, label: 'Check-in' },
    { id: 'meds', icon: <Pill />, label: 'Meds' }
  ] : role === 'family' ? [
    { id: 'dashboard', icon: <LayoutDashboard />, label: 'Overview' },
    { id: 'alerts', icon: <Bell />, label: 'Alerts' },
    { id: 'timeline', icon: <Clock />, label: 'Timeline' },
  ] : [
    { id: 'dashboard', icon: <LayoutDashboard />, label: 'Overview' },
    { id: 'timeline', icon: <Clock />, label: 'Timeline' },
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
