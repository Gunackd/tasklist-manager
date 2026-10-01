import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { CheckSquare, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill out all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await register({ name, email, password });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-blue-600 items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-3">
          <CheckSquare className="w-7 h-7 stroke-[2.5]" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Create an Account
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Get started with your cloud-backed personal task organizer
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-zinc-900 py-8 px-6 sm:px-8 shadow-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/40">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Guna"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guna@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Includes sample learning roadmaps ready to customize</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
