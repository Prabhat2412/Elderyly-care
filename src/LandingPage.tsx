import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Shield, Users, ArrowRight, Activity, Bell, Smartphone } from 'lucide-react';
import { cn } from './lib/utils';

export function LandingPage({ onNavigate, isAuthenticated = false }: { onNavigate: (view: 'elderly-login' | 'caregiver-login' | 'family-login' | 'dashboard') => void, isAuthenticated?: boolean }) {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
              <Heart className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter">ElderCare </span>
          </div>
          <button
            onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'caregiver-login')}
            className="px-6 py-2 bg-gray-900 text-white rounded-full font-bold text-sm hover:bg-gray-800 transition-all"
          >
            {isAuthenticated ? 'Dashboard' : 'Caregiver Portal'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block">
              Intelligent Care for Seniors
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">
              Care that feels like <span className="text-rose-500 underline decoration-rose-200 underline-offset-8">family.</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
              Empowering independent living through specialized health monitoring,
              automated medication tracking, and seamless family connectivity.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
              <button
                onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'elderly-login')}
                className="w-full sm:w-auto px-10 py-5 bg-rose-500 text-white rounded-[32px] font-black text-lg shadow-2xl shadow-rose-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Login as Elderly'} <ArrowRight className="w-6 h-6" />
              </button>
              <button
                onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'caregiver-login')}
                className="w-full sm:w-auto px-10 py-5 bg-gray-900 text-white rounded-[32px] font-black text-lg shadow-2xl shadow-gray-300 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Login as Caregiver'} <Shield className="w-6 h-6" />
              </button>
              {!isAuthenticated && (
                <button
                  onClick={() => onNavigate('family-login')}
                  className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-[32px] font-black text-lg shadow-2xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Login as Family Member <Heart className="w-6 h-6" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Activity />}
            title="Health Vitals"
            desc="Track blood pressure, glucose, and heart rate with comprehensive trend analysis."
            color="bg-rose-500"
          />
          <FeatureCard
            icon={<Bell />}
            title="Smart Alerts"
            desc="Instant notifications for missed medications or unexpected behavior shifts."
            color="bg-amber-500"
          />
          <FeatureCard
            icon={<Smartphone />}
            title="Family Sync"
            desc="Keep loved ones informed with a real-time 'Peace of Mind' dashboard."
            color="bg-indigo-500"
          />
        </div>
      </section>

      {/* Role Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-8 leading-[0.9]">
                Tailored experiences for every <span className="text-gray-400">role.</span>
              </h2>
              <div className="space-y-6">
                <RoleBadge icon={<Users />} title="For Elderly" text="Simple, one-tap interfaces designed for dementia care." />
                <RoleBadge icon={<Shield />} title="For Caregivers" text="A unified command center for managing multiple patients." />
                <RoleBadge icon={<Heart />} title="For Family" text="Direct connectivity and real-time health summaries." />
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-rose-100 rounded-[80px] rotate-3 absolute inset-0 blur-3xl opacity-50" />
              <div className="relative bg-white border border-gray-100 p-8 rounded-[60px] shadow-2xl">
                <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1000&auto=format&fit=crop" className="rounded-[40px] grayscale-0" alt="Elderly care" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-gray-100 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
              <Heart className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-black tracking-tighter">ElderCare</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">© 2026 ElderCare . All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) {
  return (
    <div className="bg-white p-8 sm:p-10 rounded-[48px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform", color)}>
        {React.cloneElement(icon, { className: "w-8 h-8" })}
      </div>
      <h3 className="text-2xl font-black mb-4">{title}</h3>
      <p className="text-gray-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function RoleBadge({ icon, title, text }: { icon: any, title: string, text: string }) {
  return (
    <div className="flex items-start gap-4 p-6 hover:bg-gray-50 rounded-[32px] transition-all">
      <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm">
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-black">{title}</h4>
        <p className="text-gray-500 font-medium text-sm">{text}</p>
      </div>
    </div>
  );
}
