import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getRecoveryUrlSnapshot } from '../utils/recoveryUrlSnapshot';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

const parseRecoveryContext = () => {
  const snapshot = getRecoveryUrlSnapshot();
  const hashSource = window.location.hash || snapshot.hash || '';
  const searchSource = window.location.search || snapshot.search || '';
  const hashParams = new URLSearchParams(hashSource.replace(/^#/, ''));
  const queryParams = new URLSearchParams(searchSource.replace(/^\?/, ''));
  const type = hashParams.get('type') || queryParams.get('type');
  return {
    isRecovery:
      type === 'recovery' ||
      Boolean(queryParams.get('code')) ||
      Boolean(queryParams.get('token_hash')) ||
      (hashParams.has('access_token') && type === 'recovery'),
    code: queryParams.get('code'),
    tokenHash: queryParams.get('token_hash'),
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
  };
};

const stripAuthParamsFromUrl = () => {
  const path = window.location.pathname;
  window.history.replaceState({}, document.title, path);
};

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [linkError, setLinkError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const readyRef = useRef(false);
  // Snapshot URL auth params on first render — Supabase may strip the hash before effects run.
  const recoveryContextRef = useRef(parseRecoveryContext());
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let timeoutId;
    let unsubscribe = () => {};

    const markReady = () => {
      if (!active || readyRef.current) return;
      readyRef.current = true;
      setSessionReady(true);
      setLinkError('');
      stripAuthParamsFromUrl();
    };

    const markLinkError = (message) => {
      if (!active || readyRef.current) return;
      setLinkError(message);
    };

    const bootstrapRecoverySession = async () => {
      const { isRecovery, code, tokenHash, accessToken, refreshToken } = recoveryContextRef.current;

      if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (setSessionError) {
          markLinkError('This reset link is invalid or has expired. Ask your admin to send a new one.');
          return;
        }
        markReady();
        return;
      }

      if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (verifyError) {
          markLinkError('This reset link is invalid or has expired. Ask your admin to send a new one.');
          return;
        }
        markReady();
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          markLinkError('This reset link is invalid or has expired. Ask your admin to send a new one.');
          return;
        }
        markReady();
        return;
      }

      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        markReady();
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!session) return;
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          markReady();
        }
      });
      unsubscribe = () => subscription.unsubscribe();

      timeoutId = setTimeout(async () => {
        if (!active || readyRef.current) return;
        const { data: { session: lateSession } } = await supabase.auth.getSession();
        if (lateSession) {
          markReady();
          return;
        }
        markLinkError(
          isRecovery
            ? 'This reset link is invalid or has expired. Ask your admin to send a new one.'
            : 'Open the password reset link from your email to continue.'
        );
      }, 12000);
    };

    bootstrapRecoverySession();

    return () => {
      active = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Your reset session has expired. Please open the link from your email again.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      const msg = updateError.message || '';
      setError(
        msg.toLowerCase().includes('session')
          ? 'Your reset session has expired. Please open the link from your email again.'
          : msg.includes('expired') || msg.includes('invalid')
          ? 'This reset link has expired. Ask your admin to send a new one.'
          : msg || 'Failed to update password. Please try again.'
      );
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate('/login'), 3000);
  };

  if (linkError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Reset link problem</h2>
          <p className="text-gray-600 text-sm">{linkError}</p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-sm w-full">
          <svg
            className="animate-spin h-12 w-12 text-purple-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-700 font-medium">Verifying your reset link…</p>
          <p className="text-gray-400 text-sm mt-1">This only takes a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {import.meta.env.VITE_COMPANY_NAME || 'JulineMart'} HR
            </h1>
            <p className="text-purple-100 mt-1">Set your new password</p>
          </div>

          <div className="p-8">
            {success ? (
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Password Updated!</h2>
                <p className="text-gray-600">Your password has been set successfully.</p>
                <p className="text-gray-400 text-sm mt-2">Redirecting to login…</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Choose a new password</h2>
                <p className="text-gray-500 text-sm mb-6">Must be at least 8 characters.</p>

                {error && (
                  <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="At least 8 characters"
                        required
                        autoFocus
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword
                          ? <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          : <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Repeat new password"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {loading ? 'Updating…' : 'Set New Password'}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-200">
            <p className="text-xs text-gray-500">
              © 2025 {import.meta.env.VITE_COMPANY_NAME || 'JulineMart'} HR System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
