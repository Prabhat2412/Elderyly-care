import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Home } from 'lucide-react';

export function ElderlyLogin({ onAuth, onBack, onForgotPassword }: { 
  onAuth: (email: string, pass: string) => void, 
  onBack: () => void, 
  onForgotPassword?: () => void 
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAuth(email, password);
  };

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6 relative">
      <button
        onClick={onBack}
        className="absolute top-8 left-8 p-6 bg-white rounded-[32px] shadow-sm text-gray-700 hover:text-gray-900 transition-all font-bold flex items-center gap-4 text-xl"
      >
        <Home className="w-8 h-8" /> Back
      </button>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 sm:p-12 rounded-[48px] shadow-2xl max-w-lg w-full"
      >
        <div className="w-24 h-24 bg-rose-500 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-rose-200">
          <Heart className="text-white w-14 h-14" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black mb-4 text-center tracking-tight text-gray-900">Welcome Back</h1>
        <p className="text-2xl text-gray-600 mb-10 text-center font-medium">Please sign in to continue</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            placeholder="Email Address"
            className="w-full p-6 text-2xl bg-gray-50 border-2 border-gray-100 rounded-[32px] outline-none focus:border-rose-500 focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-6 text-2xl bg-gray-50 border-2 border-gray-100 rounded-[32px] outline-none focus:border-rose-500 focus:bg-white transition-all font-medium text-gray-900 placeholder:text-gray-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full py-6 mt-4 bg-rose-500 text-white font-black text-3xl rounded-[32px] hover:bg-rose-600 active:scale-95 transition-all shadow-xl shadow-rose-200"
          >
            Sign In
          </button>
        </form>
        
        {onForgotPassword && (
          <button
            onClick={onForgotPassword}
            className="w-full mt-8 text-xl font-bold text-gray-500 hover:text-rose-500 transition-colors"
          >
            Forgot Password?
          </button>
        )}
      </motion.div>
    </div>
  );
}
