import React from 'react';
import { Navigate, useLocation } from 'react-router-dom'; // ✨ Added useLocation
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading, isAdmin, isManager, isEmployee } = useAuth();
  const location = useLocation(); // ✨ NEW

  // ✨ NEW: Define public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/onboarding',       // Matches /onboarding/:token
    '/reference',        // Matches /reference/:token
    '/onboarding-success',
  ];

  // ✨ NEW: Check if current path is public
  const isPublicPath = publicPaths.some(path => 
    location.pathname.startsWith(path)
  );

  // ✨ NEW: Allow public paths without authentication
  if (isPublicPath) {
    return children;
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requiredRole) {
    const hasAccess = checkRoleAccess(requiredRole, { isAdmin, isManager, isEmployee });
    
    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // Render children if authenticated and authorized
  return children;
}

/**
 * Check if user has required role access
 */
function checkRoleAccess(requiredRole, { isAdmin, isManager, isEmployee }) {
  switch (requiredRole) {
    case 'admin':
      return isAdmin();
    case 'manager':
      return isAdmin() || isManager();
    case 'employee':
      return isAdmin() || isManager() || isEmployee();
    default:
      return true;
  }
}