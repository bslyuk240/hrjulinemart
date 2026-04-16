import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import {
  login as loginService,
  logout as logoutService,
  getCurrentUser,
  isAdmin as checkIsAdmin,
  isManager as checkIsManager,
  isEmployee as checkIsEmployee,
} from '../services/authService';
import { removeFCMTokens } from '../services/fcmService';

const AuthContext = createContext(null);

// Session max age in milliseconds (8 hours)
const SESSION_MAX_MS = 8 * 60 * 60 * 1000;

/** Returns true if the stored session is still within the allowed time window */
function isSessionValid(storedUser) {
  if (!storedUser) return false;
  // Support both sessionExpiry (new) and loginTime (legacy) fields
  if (storedUser.sessionExpiry) {
    return new Date(storedUser.sessionExpiry) > new Date();
  }
  if (storedUser.loginTime) {
    return (Date.now() - new Date(storedUser.loginTime).getTime()) < SESSION_MAX_MS;
  }
  // No time info — treat as expired for safety
  return false;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load session from localStorage on mount — enforce expiry and sanitise legacy data
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);

        // Reject expired sessions
        if (!isSessionValid(parsed)) {
          console.info('[Auth] Session expired — logging out');
          localStorage.removeItem('user');
          setLoading(false);
          return;
        }

        // Sanitise legacy admin cache that had hardcoded employee_id
        // (employee_id now comes from the DB via authService)
        if (parsed.type === 'admin' && parsed.username === 'admin' && !parsed.sessionExpiry) {
          // Old format without expiry — treat as expired
          console.info('[Auth] Stale admin session without expiry — logging out');
          localStorage.removeItem('user');
          setLoading(false);
          return;
        }

        setUser(parsed);
      }
    } catch (err) {
      console.warn('[Auth] Load error, clearing storage:', err);
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  // Periodic session expiry check (every 5 minutes while app is open)
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = getCurrentUser();
      if (stored && !isSessionValid(stored)) {
        console.info('[Auth] Session expired during activity — logging out');
        localStorage.removeItem('user');
        setUser(null);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const login = async (identifier, password) => {
    try {
      setLoading(true);
      setError(null);

      const result = await loginService(identifier, password);

      if (result.success) {
        const userData = result.data;
        // authService already sets sessionExpiry — just store and set
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true, user: userData };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    try {
      const stored = getCurrentUser();
      if (stored?.id) removeFCMTokens(stored.id).catch(() => {});

      logoutService();
      setUser(null);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      return { success: false, error: err.message };
    }
  };

  const updateUser = (userData) => {
    setUser((prevUser) => ({
      ...prevUser,
      ...userData,
    }));

    const currentUser = getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // Role checking helpers — always read from localStorage (source of truth)
  const isAdmin    = () => checkIsAdmin();
  const isManager  = () => checkIsManager();
  const isEmployee = () => checkIsEmployee();

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
