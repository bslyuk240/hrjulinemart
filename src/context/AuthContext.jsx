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

const AuthContext = createContext(null);

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

    // 🔹 Clear stale admin cache if employee_id is missing or outdated
  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem("user"));
    if (cached && cached.username === "admin" && (!cached.employee_id || cached.employee_id !== 8)) {
      console.log("🧹 Clearing stale admin cache...");
      localStorage.removeItem("user");
    }
  }, []);

  // Check for existing user session on mount
  // Replace your checkUserSession() call with this version:
useEffect(() => {
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
    }
  } catch (error) {
    console.warn("Auth load error, resetting storage:", error);
    localStorage.clear();
  } finally {
    setLoading(false);
  }
}, []);

  const checkUserSession = () => {
    try {
      const currentUser = getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Error checking user session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    try {
      setLoading(true);
      setError(null);

      const result = await loginService(identifier, password);

      if (result.success) {
  let userData = result.data;

  // ✅ Attach employee_id for local admin account
  if (userData.username === 'admin' || userData.email === 'info@julinemart.com') {
    userData = {
      ...userData,
      employee_id: 8,  // matches employees.id for your Admin record
      role: 'admin',
    };
  }

  setUser(userData);
  // Save to localStorage for session persistence
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
    
    // Update localStorage
    const currentUser = getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // Role checking helpers
  const isAdmin = () => checkIsAdmin();
  const isManager = () => checkIsManager();
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