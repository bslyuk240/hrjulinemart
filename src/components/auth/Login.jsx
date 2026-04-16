import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, User, Lock, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';

// ── Brute-force protection ──────────────────────────────────────────────────
const LOCKOUT_KEY   = 'login_lockout';
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 15 * 60 * 1000; // 15 minutes

function getLockoutState() {
  try {
    const raw = sessionStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null };
    return JSON.parse(raw);
  } catch { return { attempts: 0, lockedUntil: null }; }
}

function saveLockoutState(state) {
  sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
}

function isLockedOut() {
  const { lockedUntil } = getLockoutState();
  if (!lockedUntil) return false;
  return new Date(lockedUntil) > new Date();
}

function recordFailedAttempt() {
  const state = getLockoutState();
  const attempts = (state.attempts || 0) + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS
    ? new Date(Date.now() + LOCKOUT_MS).toISOString()
    : state.lockedUntil;
  saveLockoutState({ attempts, lockedUntil });
  return attempts;
}

function resetLockout() {
  sessionStorage.removeItem(LOCKOUT_KEY);
}

function getLockoutMinutesLeft() {
  const { lockedUntil } = getLockoutState();
  if (!lockedUntil) return 0;
  return Math.ceil((new Date(lockedUntil) - new Date()) / 60000);
}

export default function Login() {
  const [identifier, setIdentifier] = useState(''); // email address
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(isLockedOut());
  const [minutesLeft, setMinutesLeft] = useState(getLockoutMinutesLeft());

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  // Countdown timer while locked out
  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => {
      if (!isLockedOut()) {
        setLocked(false);
        setError('');
        resetLockout();
        clearInterval(id);
      } else {
        setMinutesLeft(getLockoutMinutesLeft());
      }
    }, 10000);
    return () => clearInterval(id);
  }, [locked]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Lockout check
    if (isLockedOut()) {
      setLocked(true);
      setMinutesLeft(getLockoutMinutesLeft());
      setError(`Too many failed attempts. Try again in ${getLockoutMinutesLeft()} minute(s).`);
      return;
    }

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email address and password');
      return;
    }

    setLoading(true);
    try {
      const result = await login(identifier, password);

      if (result.success) {
        resetLockout();
        navigate('/dashboard');
      } else {
        const attempts = recordFailedAttempt();
        if (isLockedOut()) {
          setLocked(true);
          setMinutesLeft(getLockoutMinutesLeft());
          setError(`Too many failed attempts. Account locked for ${getLockoutMinutesLeft()} minute(s).`);
        } else {
          const remaining = MAX_ATTEMPTS - attempts;
          setError(`${result.error || 'Invalid credentials.'} ${remaining > 0 ? `${remaining} attempt(s) remaining.` : ''}`);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 overflow-hidden">
              <img 
                src={import.meta.env.VITE_COMPANY_LOGO || "https://res.cloudinary.com/dupgdbwrt/image/upload/v1759971092/icon-512x512.png_ygtda9.png"}
                alt={`${import.meta.env.VITE_COMPANY_NAME || 'JulineMart'} Logo`}
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const icon = document.createElement('div');
                  icon.innerHTML = '<svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>';
                  e.target.parentNode.appendChild(icon.firstChild);
                }}
              />
            </div>
            <h1 className="text-3xl font-bold text-white">
              {import.meta.env.VITE_COMPANY_NAME || 'JulineMart'} HR
            </h1>
            <p className="text-purple-100 mt-2">Human Resource Management System</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back!</h2>
            <p className="text-gray-600 mb-6">Sign in to access your account</p>

            {/* Lockout Banner */}
            {locked && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start space-x-3">
                <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">Account temporarily locked</p>
                  <p className="text-sm text-orange-700 mt-0.5">Too many failed attempts. Try again in <strong>{minutesLeft} minute(s)</strong>.</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && !locked && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter your email address"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || locked}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Use your registered email address and password to sign in
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-200">
            <p className="text-xs text-gray-500">
              © 2025 {import.meta.env.VITE_COMPANY_NAME || 'JulineMart'} HR System. All rights reserved.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-white text-sm">
            Need help? Contact your HR administrator
          </p>
        </div>
      </div>
    </div>
  );
}