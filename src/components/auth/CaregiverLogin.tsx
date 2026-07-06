import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Home, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export function CaregiverLogin({ onAuth, onBack, onForgotPassword }: { 
  onAuth: (isReg: boolean, email: string, pass: string, name?: string) => void, 
  onBack: () => void, 
  onForgotPassword?: () => void 
}) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAuth(isRegister, email, password, name);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
      <button
        onClick={onBack}
        className="absolute top-8 left-8 p-4 bg-white rounded-[24px] shadow-sm text-slate-500 hover:text-slate-900 transition-all font-bold flex items-center gap-2"
      >
        <Home className="w-5 h-5" /> Home
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full border border-slate-100"
      >
        <div className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center mb-6 shadow-xl shadow-slate-200">
          <Shield className="text-white w-8 h-8" />
        </div>
        
        <h1 className="text-3xl font-black mb-2 tracking-tight text-slate-900">Caregiver Portal</h1>
        <p className="text-slate-500 mb-8 font-medium">
          {isRegister ? 'Create your caregiver account' : 'Welcome back, please sign in'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[24px] outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium text-slate-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[24px] outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium text-slate-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[24px] outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-medium text-slate-900"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full py-4 mt-2 bg-slate-900 text-white font-bold rounded-[24px] hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
          >
            {isRegister ? 'Create Account' : 'Sign In'} <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
          
          {!isRegister && onForgotPassword && (
            <button
              onClick={onForgotPassword}
              className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors"
            >
              Forgot Password?
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
