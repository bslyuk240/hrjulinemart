import { supabase, TABLES } from './supabase';

/**
 * Login — delegates entirely to the `auth-login` Edge Function.
 * The edge function handles bcrypt comparison server-side and auto-migrates
 * plaintext passwords to bcrypt hashes on first successful login.
 * The password column is NEVER sent to or compared in the browser.
 */
export const login = async (identifier, password) => {
  try {
    const { data, error } = await supabase.functions.invoke('auth-login', {
      body: { identifier, password },
    });

    if (error) {
      console.warn('auth-login network error:', error);
      return { success: false, error: 'Login failed. Please check your connection.' };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Invalid credentials. Please try again.' };
    }

    localStorage.setItem('user', JSON.stringify(data.data));
    return { success: true, data: data.data };
  } catch (err) {
    console.error('login error:', err);
    return { success: false, error: 'Login failed. Please try again.' };
  }
};

/**
 * Logout — clears session
 */
export const logout = () => {
  localStorage.removeItem('user');
  return { success: true };
};

/**
 * Get Current User from localStorage
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const user = getCurrentUser();
  return user !== null;
};

/**
 * Check if user is admin
 */
export const isAdmin = () => {
  const user = getCurrentUser();
  return user && user.type === 'admin';
};

/**
 * Check if user is manager
 */
export const isManager = () => {
  const user = getCurrentUser();
  return user && (user.type === 'admin' || user.is_manager === true);
};

/**
 * Check if user is employee
 */
export const isEmployee = () => {
  const user = getCurrentUser();
  return user && user.type === 'employee';
};
