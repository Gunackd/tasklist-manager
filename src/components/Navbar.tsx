import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import {
  CheckSquare,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Plus,
  Menu,
  X,
  Database,
  ShieldCheck,
} from 'lucide-react';

interface NavbarProps {
  onOpenCreateModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCreateModal }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-zinc-900 dark:text-white">
                TaskList<span className="text-blue-600 dark:text-blue-400">Manager</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  location.pathname === '/dashboard'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>

              <Link
                to="/profile"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  location.pathname === '/profile'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                Profile & DB
              </Link>
            </nav>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cloud DB Status indicator badge */}
            <div
              title="Cloud Database: Active & Synchronized"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Database className="w-3 h-3" />
              <span>Cloud DB</span>
            </div>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-zinc-700" />}
            </button>

            {isAuthenticated ? (
              <>
                {/* Create List Shortcut */}
                {onOpenCreateModal && (
                  <button
                    type="button"
                    onClick={onOpenCreateModal}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New List</span>
                  </button>
                )}

                {/* User Info Capsule */}
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 transition group"
                >
                  <img
                    src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'User')}`}
                    alt={user?.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <div className="text-left text-xs max-w-[120px] truncate">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block truncate">
                      {user?.name}
                    </span>
                  </div>
                </Link>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 rounded-xl text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Sign up
                </Link>
              </div>
            )}

            {/* Mobile menu hamburger */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isAuthenticated && mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Signed in as <span className="text-zinc-900 dark:text-white font-bold">{user?.email}</span>
            </div>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Dashboard
            </Link>
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <UserIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Profile & Database
            </Link>
            {onOpenCreateModal && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCreateModal();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50"
              >
                <Plus className="w-4 h-4" />
                + Create New Task List
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
