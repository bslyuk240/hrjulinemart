import { supabase } from './supabase';

/**
 * Build a normalised user object from a Supabase Auth session user.
 *
 * Security model:
 *  - app_metadata  (type, role, employee_id) is set ONLY by the service role during
 *    migration / admin operations — it cannot be tampered with by the client.
 *  - user_metadata (name, position, …) is user-editable and used for display only.
 *  - user.id is kept equal to employee_id (bigint) so every existing service call
 *    that does `user.id` continues to work without modification.
 */
export function buildUserFromSession(authUser) {
  if (!authUser) return null;
  const meta = authUser.app_metadata || {};
  const empId = meta.employee_id;

  // Users without a configured employee_id are not allowed in
  if (!empId) return null;

  return {
    // ── Core identity ──────────────────────────────────────────────────────────
    id: empId,                                   // backward compat: all services use user.id
    auth_id: authUser.id,                        // UUID in auth.users
    email: authUser.email,

    // ── Role / type (tamper-proof — from app_metadata) ────────────────────────
    type: meta.type || 'employee',               // 'admin' | 'employee'
    role: meta.role || 'employee',               // 'admin' | 'manager' | 'employee'
    is_manager: meta.role === 'manager' || meta.type === 'admin',
    manager_permissions: meta.manager_permissions || null,
    employee_id: empId,
    username: meta.username || authUser.email,

    // ── Display fields (from user_metadata — display only) ────────────────────
    name: authUser.user_metadata?.name || '',
    position: authUser.user_metadata?.position || '',
    department: authUser.user_metadata?.department || '',
    profile_pic: authUser.user_metadata?.profile_pic || '',
  };
}

/**
 * Login via Supabase Auth.
 * Called by AuthContext — returns { success, data } or { success, error }.
 */
export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const isCredentialError =
      error.message?.toLowerCase().includes('invalid login') ||
      error.message?.toLowerCase().includes('invalid credentials') ||
      error.status === 400;
    return {
      success: false,
      error: isCredentialError
        ? 'Invalid email or password. Please try again.'
        : (error.message || 'Login failed. Please check your connection.'),
    };
  }

  const user = buildUserFromSession(data.user);
  if (!user) {
    // Auth succeeded but account has no app_metadata — not provisioned
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Account not configured. Please contact your administrator.',
    };
  }

  return { success: true, data: user };
};

/**
 * Logout — clears the Supabase session.
 */
export const logout = async () => {
  await supabase.auth.signOut();
  return { success: true };
};

/**
 * Get the current session user synchronously from the in-memory cache.
 * Returns null if no active session.
 */
export const getCurrentUser = () => {
  // supabase.auth.getSession() is async; this helper is kept for backward-compat
  // call sites. AuthContext is the canonical source — prefer useAuth() in components.
  return null;
};

// These are kept for import compatibility but are no longer used —
// AuthContext now derives roles directly from the user object.
export const isAdmin    = () => false;
export const isManager  = () => false;
export const isEmployee = () => false;
