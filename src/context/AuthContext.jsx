import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { buildUserFromSession } from '../services/authService';
import { removeFCMTokens } from '../services/fcmService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // ── 1. Load any existing session on mount ─────────────────────────────────
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(buildUserFromSession(session?.user ?? null));
      setLoading(false);
    });

    // ── 2. Keep state in sync with Supabase Auth events ───────────────────────
    //   SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(buildUserFromSession(session?.user ?? null));
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const isCredentials =
        authError.message?.toLowerCase().includes('invalid login') ||
        authError.message?.toLowerCase().includes('invalid credentials') ||
        authError.status === 400;
      const msg = isCredentials
        ? 'Invalid email or password. Please try again.'
        : (authError.message || 'Login failed. Please check your connection.');
      setError(msg);
      return { success: false, error: msg };
    }

    const userData = buildUserFromSession(data.user);
    if (!userData) {
      // Auth succeeded but no employee_id in app_metadata — not provisioned
      await supabase.auth.signOut();
      const msg = 'Account not configured. Please contact your administrator.';
      setError(msg);
      return { success: false, error: msg };
    }

    // onAuthStateChange will set the user state; return success immediately
    return { success: true, user: userData };
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      if (user?.id) removeFCMTokens(user.id).catch(() => {});
      await supabase.auth.signOut();
      // onAuthStateChange fires SIGNED_OUT → setUser(null)
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // ── Update display fields ──────────────────────────────────────────────────
  // Updates local React state immediately AND persists display fields in
  // Supabase Auth user_metadata so they survive token refreshes.
  const updateUser = async (updates) => {
    // Optimistic local update
    setUser((prev) => (prev ? { ...prev, ...updates } : null));

    // Persist display-only fields to Supabase Auth
    const metaFields = ['name', 'position', 'department', 'profile_pic'];
    const metaUpdates = Object.fromEntries(
      metaFields
        .filter((k) => k in updates)
        .map((k) => [k, updates[k]])
    );
    if (Object.keys(metaUpdates).length > 0) {
      await supabase.auth.updateUser({ data: metaUpdates }).catch((err) => {
        console.warn('[Auth] user_metadata sync failed:', err);
      });
    }
  };

  // ── Role helpers ───────────────────────────────────────────────────────────
  // Derived from app_metadata (set server-side) — cannot be forged by the client.
  const isAdmin    = () => user?.type === 'admin';
  const isManager  = () => user?.type === 'admin' || user?.role === 'manager';
  const isEmployee = () => user?.type === 'employee';

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin,
    isManager,
    isEmployee,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
