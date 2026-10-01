import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Navbar } from '../components/Navbar.js';
import {
  User as UserIcon,
  Database,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Server,
  LogOut,
  Mail,
  Calendar,
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const [dbHealth, setDbHealth] = useState<{
    status: string;
    database: {
      isMongo: boolean;
      type: string;
      totalUsers: number;
      totalLists: number;
      totalTasks: number;
    };
  } | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);

  const fetchDbHealth = async () => {
    try {
      setLoadingDb(true);
      const res = await api.getHealth();
      setDbHealth(res);
    } catch (err) {
      console.error('Failed to get database health:', err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbHealth();
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsUpdating(true);
      setUpdateMessage(null);
      await updateProfile({ name: name.trim() });
      setUpdateMessage('Profile updated successfully!');
      setTimeout(() => setUpdateMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Account & Cloud Database
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            View your session information, database connection, and security settings
          </p>
        </div>

        {/* User Profile Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-4">
              <img
                src={
                  user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    user?.name || 'User'
                  )}`
                }
                alt={user?.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500/20 shadow-md"
              />
              <div>
                <h2 className="text-xl font-bold">{user?.name}</h2>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{user?.email}</span>
                </div>
                <div className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Authenticated User</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl transition flex items-center justify-center gap-2 self-start sm:self-center"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Edit Name Form */}
          <form onSubmit={handleUpdateName} className="mt-6 space-y-4 max-w-md">
            {updateMessage && (
              <div className="p-3 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{updateMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Display Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button
                  type="submit"
                  disabled={isUpdating || name.trim() === user?.name}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition"
                >
                  {isUpdating ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Cloud Database Integration Status */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Cloud Database Engine</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Real-time persistence layer storing your tasks across browser sessions
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchDbHealth}
              disabled={loadingDb}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              title="Refresh database diagnostics"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDb ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Database Engine
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {dbHealth?.database?.isMongo ? 'MongoDB Atlas Cluster' : 'Persistent File Cloud DB (Disk)'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                {dbHealth?.database?.isMongo
                  ? 'Connected via Mongoose to MongoDB Atlas'
                  : 'Zero-config persistent JSON storage on server disk'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Total System Records
              </span>
              <div className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {dbHealth?.database?.totalLists || 0} lists &middot; {dbHealth?.database?.totalTasks || 0} tasks
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Across {dbHealth?.database?.totalUsers || 1} registered accounts
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Data Isolation
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Strict User Separation</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Each list query is filtered strictly by your authenticated User ID
              </p>
            </div>
          </div>
        </div>

        {/* Security & Architecture Highlights */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Security & Cryptography</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Industry standard authentication and authorization standards
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                1. Password Salting & Hashing
              </span>
              <p className="text-zinc-500 dark:text-zinc-400">
                Passwords are never stored in plain-text. They are hashed using bcrypt with dynamic salt rounds.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                2. JWT Bearer Tokens
              </span>
              <p className="text-zinc-500 dark:text-zinc-400">
                Stateful session tokens signed by a server secret key keep you logged in across browser reloads.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                3. Access Control (IDOR Protection)
              </span>
              <p className="text-zinc-500 dark:text-zinc-400">
                Changing list or task IDs in the URL returns 403 Forbidden. Other users cannot view your lists.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                4. MongoDB Atlas Connection
              </span>
              <p className="text-zinc-500 dark:text-zinc-400">
                Supply your <code className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">MONGODB_URI</code> in environment variables to directly stream to Atlas.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
