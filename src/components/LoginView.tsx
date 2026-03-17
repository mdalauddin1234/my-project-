import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserRole, User } from '../types';
import { LayoutGrid, User as UserIcon, Lock, AlertCircle, Trash2 } from 'lucide-react';

interface LoginViewProps {
  onLogin: (user: User) => void;
  users: User[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.length === 0) {
      setError('System is still syncing with Google Sheets. Please wait a moment.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const input = username.toLowerCase().trim();
    const pass = password.trim();

    console.log("Login Attempt:", { input, pass });
    console.log("Available Users:", users.map(u => ({ u: u.username, e: u.email, p: u.password })));

    // Check against both username and email
    const user = users.find(u => 
      (u.username.toLowerCase().trim() === input || u.email.toLowerCase().trim() === input) && 
      u.password?.toString().trim() === pass
    );
    
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid username/email or password');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-indigo-100"
      >
        <div className="flex flex-col items-center mb-8 relative">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
            <LayoutGrid className="text-white w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-indigo-900">Subscription Manager</h1>
          <p className="text-zinc-400 text-sm font-medium">Please sign in to your account</p>
          
          <div className="mt-4 flex flex-col items-center gap-2">
            {users.length === 0 ? (
              <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full animate-pulse">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                Syncing with Google Sheets...
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  {users.length} Users Loaded
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider hover:text-indigo-700 transition-colors flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" /> Sync Now
                </button>
                <button 
                  onClick={() => { localStorage.clear(); window.location.reload(); }}
                  className="text-[10px] font-bold text-rose-500 uppercase tracking-wider hover:text-rose-700 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear Cache
                </button>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl flex items-center gap-2 text-sm font-medium"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Username or Email</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                required
                type="text"
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-indigo-50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Enter username or email"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                required
                type="password"
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-indigo-50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] mt-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold">Powered by Botivate</p>
        </div>
      </motion.div>
    </div>
  );
};
