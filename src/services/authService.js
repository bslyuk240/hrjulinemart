import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

/**
 * Admin Login
 * Authenticates admin users from admin_users table
 */
export const loginAdmin = async (username, password) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ADMIN_USERS)
      .select('*')
      .eq('username', username)
      .eq('password', password) // Note: In production, use hashed passwords
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    if (!data) {
      return {
        success: false,
        error: 'Invalid username or password',
      };
    }

    // Store user info in localStorage
    const userData = {
      id: data.id,
      username: data.username,
      role: data.role || 'admin',
      type: 'admin',
      loginTime: new Date().toISOString(),
    };

    localStorage.setItem('user', JSON.stringify(userData));

    return handleSupabaseSuccess(userData);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Employee Login
 * Authenticates employees from employees table
 */
export const loginEmployee = async (email, password) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('*')
      .eq('email', email)
      .eq('password', password) // Note: In production, use hashed passwords
      .eq('can_login', true) // Only allow employees with login permission
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    if (!data) {
      return {
        success: false,
        error: 'Invalid email or password, or login not permitted',
      };
    }

    // Store user info in localStorage
    const userData = {
      id: data.id,
      name: data.name,
      email: data.email,
      position: data.position,
      department: data.department,
      profile_pic: data.profile_pic,
      role: data.is_manager ? 'manager' : 'employee',
      type: 'employee',
      is_manager: data.is_manager,
      manager_permissions: data.manager_permissions,
      loginTime: new Date().toISOString(),
    };

    localStorage.setItem('user', JSON.stringify(userData));

    return handleSupabaseSuccess(userData);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Unified Login
 * Tries admin login first, then employee login
 */
export const login = async (identifier, password) => {
  // Try admin login first (using username)
  const adminResult = await loginAdmin(identifier, password);
  if (adminResult.success) {
    return adminResult;
  }

  // If admin login fails, try employee login (using email)
  const employeeResult = await loginEmployee(identifier, password);
  return employeeResult;
};

/**
 * Logout
 * Clears user session
 */
export const logout = () => {
  localStorage.removeItem('user');
  return { success: true };
};

/**
 * Get Current User
 * Returns currently logged in user from localStorage
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    return user;
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