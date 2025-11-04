import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'julinemart-hr-system',
    },
  },
});

// Helper function to handle Supabase errors
export const handleSupabaseError = (error) => {
  if (error) {
    console.error('Supabase Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      details: error,
    };
  }
  return null;
};

// Helper function for successful responses
export const handleSupabaseSuccess = (data) => {
  return {
    success: true,
    data,
    error: null,
  };
};

// Database table names (constants)
export const TABLES = {
  ADMIN_USERS: 'admin_users',
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  LEAVE_REQUESTS: 'leave_requests',
  PAYROLLS: 'payrolls',
  PERFORMANCE_RECORDS: 'performance_records',
  RESIGNATIONS: 'resignations',
  ARCHIVED_EMPLOYEES: 'archived_employees',
  COMPANY_SETTINGS: 'company_settings',
  BLOG_BANNERS: 'blog_banners',
  MANAGERS_VIEW: 'managers_view',
  NOTIFICATIONS: 'notifications',
};

// Export default client
export default supabase;