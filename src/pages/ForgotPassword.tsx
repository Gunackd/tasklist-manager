import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { CheckSquare, Mail, Lock, Key, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [step, setStep] = useState<'request' | 'reset'>(searchParams.get('token') ? 'reset' : 'request');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      setStep('reset');
    }
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await api.forgotPassword(email);
      setMessage(res.message);
      if (res.resetToken) {
        setGeneratedToken(res.resetToken);
        setToken(res.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword) {
      setError('Token and new password are required.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const res = await api.resetPassword({ token, newPassword });
      setMessage(res.message);
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-blue-600 items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-3">
          <CheckSquare className="w-7 h-7 stroke-[2.5]" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Reset Password
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Recover access to your TaskList Manager account
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

          {message && (
            <div className="flex items-start gap-2 p-3 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Your Account Email
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
                    autoFocus
                  />
                </div>
              </div>

              {generatedToken && (
                <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                      Generated Reset Code:
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep('reset')}
                      className="text-xs font-bold underline text-blue-600 dark:text-blue-400"
                    >
                      Proceed to set new password →
                    </button>
                  </div>
                  <div className="font-mono text-xs bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-800 break-all select-all">
                    {generatedToken}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2"
              >
                {loading ? 'Sending Request...' : 'Send Reset Link'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('reset')}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Already have a reset token? Enter it here
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Reset Token
                </label>
                <div className="relative">
                  <Key className="w-5 h-5 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste reset token"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:underline"
                >
                  ← Back to request token
                </button>
              </div>
            </form>
          )}

          <div className="text-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Link
              to="/login"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Remember password? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
