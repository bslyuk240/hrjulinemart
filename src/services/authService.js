import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

/**
 * Admin Login
 * Authenticates admin users from admin_users table
 * NOTE: Passwords are currently stored as plaintext — plan to migrate to
 * a server-side Edge Function with bcrypt before going to production with sensitive data.
 */
export const loginAdmin = async (username, password) => {
  try {
    // Only select the columns we actually need — never return the password column to the client
    const { data, error } = await supabase
      .from(TABLES.ADMIN_USERS)
      .select('id, username, role, employee_id, email')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error) {
      // Return generic message — don't reveal whether username or password was wrong
      return { success: false, error: 'Invalid username or password' };
    }

    if (!data) {
      return { success: false, error: 'Invalid username or password' };
    }

    const userData = {
      id: data.id,
      employee_id: data.employee_id || null,
      username: data.username,
      email: data.email || null,
      role: data.role || 'admin',
      type: 'admin',
      loginTime: new Date().toISOString(),
      sessionExpiry: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
    };

    localStorage.setItem('user', JSON.stringify(userData));
    return handleSupabaseSuccess(userData);
  } catch (error) {
    return { success: false, error: 'Invalid username or password' };
  }
};

/**
 * Employee Login
 * Authenticates employees from employees table
 * NOTE: Passwords are currently stored as plaintext — plan to migrate to
 * a server-side Edge Function with bcrypt before going to production with sensitive data.
 */
export const loginEmployee = async (email, password) => {
  try {
    // Only select the columns we need — never return sensitive columns (password, salary, bank_account, etc.)
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('id, name, email, position, department, profile_pic, is_manager, manager_permissions, can_login')
      .eq('email', email)
      .eq('password', password)
      .eq('can_login', true)
      .single();

    if (error) {
      // Return generic message — don't reveal whether email or password was wrong
      return { success: false, error: 'Invalid email or password, or login not permitted' };
    }

    if (!data) {
      return { success: false, error: 'Invalid email or password, or login not permitted' };
    }

    const userData = {
      id: data.id,
      employee_id: data.id, // For employees, id IS the employee_id
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
      sessionExpiry: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
    };

    localStorage.setItem('user', JSON.stringify(userData));
    return handleSupabaseSuccess(userData);
  } catch (error) {
    return { success: false, error: 'Invalid email or password, or login not permitted' };
  }
};

/**
 * Unified Login
 * Tries admin login first (username), then employee login (email).
 * Both run in parallel to reduce timing side-channels.
 */
export const login = async (identifier, password) => {
  const [adminResult, employeeResult] = await Promise.all([
    loginAdmin(identifier, password),
    loginEmployee(identifier, password),
  ]);

  if (adminResult.success) return adminResult;
  if (employeeResult.success) return employeeResult;

  // Return generic error — don't reveal which table matched or not
  return { success: false, error: 'Invalid credentials. Please try again.' };
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