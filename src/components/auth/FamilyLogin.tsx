import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Home, ArrowRight, Eye, EyeOff } from 'lucide-react';

export function FamilyLogin({
  onAuth,
  onBack,
  onForgotPassword,
}: {
  onAuth: (email: string, pass: string) => void;
  onBack: () => void;
  onForgotPassword?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAuth(email, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-6 relative">
      <button
        onClick={onBack}
        className="absolute top-8 left-8 p-4 bg-white rounded-[24px] shadow-sm text-indigo-500 hover:text-indigo-900 transition-all font-bold flex items-center gap-2"
      >
        <Home className="w-5 h-5" /> Home
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[40px] shadow-2xl max-w-md w-full border border-indigo-100"
      >
        {/* Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[24px] flex items-center justify-center mb-6 shadow-xl shadow-indigo-200">
          <Heart className="text-white w-8 h-8" />
        </div>

        <h1 className="text-3xl font-black mb-1 tracking-tight text-gray-900">Family Member Login</h1>
        <p className="text-gray-500 mb-8 font-medium">Stay connected with your loved one's care.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email Address"
              className="w-full p-4 bg-indigo-50 border border-indigo-200 rounded-[24px] outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-gray-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="w-full p-4 bg-indigo-50 border border-indigo-200 rounded-[24px] outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium text-gray-900 pr-14"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-[24px] hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span className="animate-pulse">Signing In...</span>
            ) : (
              <>Sign In <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3 text-center">
          {onForgotPassword && (
            <button
              onClick={onForgotPassword}
              className="text-indigo-500 font-bold text-sm hover:text-indigo-700 transition-colors"
            >
              Forgot Password?
            </button>
          )}
          <p className="text-xs text-gray-400 font-medium">
            This portal is for registered Family Members only.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
