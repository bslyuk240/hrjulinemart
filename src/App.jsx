import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Profile from './pages/Profile';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import EmployeeDashboard from './components/dashboard/EmployeeDashboard';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import EmployeeList from './components/employees/EmployeeList';
import EmployeeForm from './components/employees/EmployeeForm';
import Payroll from './components/payroll/Payroll';
import Leave from './components/leave/Leave';
import Attendance from './components/attendance/Attendance';
import Performance from './components/performance/Performance';
import Resignation from './components/resignation/Resignation';
import ArchivePage from './components/archive/ArchivePage';
import Settings from './pages/Settings';
import EmployeePayslip from './pages/EmployeePayslip';
import Requisitions from './pages/Requisitions';
import RequisitionManagement from './pages/RequisitionManagement';
import VendorResponsesList from './components/vendor/VendorResponsesList';
import VendorSourcingForm from './components/vendor/VendorSourcingForm';
import TrainingPortal from './pages/TrainingPortal';
import TrainingCoursePlayer from './pages/TrainingCoursePlayer';
import TrainingResults from './pages/TrainingResults';
import TrainingAdminDashboard from './pages/TrainingAdminDashboard';
import TrainingCourseEditor from './pages/TrainingCourseEditor';
import TrainingReports from './pages/TrainingReports';

// ✨ NEW: Onboarding imports
import Announcements from './pages/Announcements';
import StaffAnnouncements from './pages/StaffAnnouncements';
import OnboardingDashboard from './pages/OnboardingDashboard';
import OnboardingFormPage from './pages/OnboardingFormPage';
import ReferenceFormPage from './pages/ReferenceFormPage';
import OnboardingSuccessPage from './pages/OnboardingSuccessPage';
import PublicVendorSourcingPage from './pages/PublicVendorSourcingPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import './styles/index.css';

/**
 * Handles Supabase PASSWORD_RECOVERY redirects.
 *
 * Two entry points:
 *  1. Email link goes to /reset-password directly (our edge-function button) → no action needed.
 *  2. Email link goes to the site root (Supabase dashboard test emails use the Site URL) →
 *     the URL hash contains `type=recovery`; we catch it immediately on mount AND via the
 *     onAuthStateChange event so there is no flash of the dashboard.
 */
function AuthEventRouter() {
  const { authEvent, clearAuthEvent } = useAuth();
  const navigate = useNavigate();

  // ── Immediate hash check on mount ─────────────────────────────────────────
  // Only redirects when NOT already on /reset-password — navigating to the
  // same path with { replace: true } strips the hash fragment, which breaks
  // Supabase's detectSessionInUrl before it can exchange the access token.
  useEffect(() => {
    const hash = window.location.hash || '';
    const onResetPage = window.location.pathname === '/reset-password';
    if (hash.includes('type=recovery') && !onResetPage) {
      navigate('/reset-password', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth-event fallback ────────────────────────────────────────────────────
  // Catches PASSWORD_RECOVERY fired by onAuthStateChange (e.g. token already
  // consumed and session restored via cookie/storage). Same guard: skip if
  // already on the reset page — the page itself handles the session.
  useEffect(() => {
    if (authEvent === 'PASSWORD_RECOVERY') {
      clearAuthEvent();
      const onResetPage = window.location.pathname === '/reset-password';
      if (!onResetPage) {
        navigate('/reset-password', { replace: true });
      }
    }
  }, [authEvent, clearAuthEvent, navigate]);

  return null;
}

// Role-based Dashboard Router
function DashboardRouter() {
  const { isAdmin } = useAuth();
  
  if (isAdmin()) {
    return <Dashboard />;
  }
  
  return <EmployeeDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          {/* Handles PASSWORD_RECOVERY event → navigates to /reset-password */}
          <AuthEventRouter />
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Password reset — public so the recovery session link always works */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ✨ Public routes (no login required) */}
            <Route path="/onboarding/:token" element={<OnboardingFormPage />} />
            <Route path="/reference/:token" element={<ReferenceFormPage />} />
            <Route path="/onboarding-success" element={<OnboardingSuccessPage />} />
            <Route path="/source-vendor" element={<PublicVendorSourcingPage />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              
              {/* Dashboard - Shows different dashboard based on role */}
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute requiredRole="employee">
                    <DashboardRouter />
                  </ProtectedRoute>
                } 
              /> 

              {/* Employee Requisitions */}
              <Route 
                path="requisitions" 
                element={
                  <ProtectedRoute requiredRole="employee">
                    <Requisitions />
                  </ProtectedRoute>
                } 
              />

              {/* Admin + Manager Requisition Management */}
              <Route
                path="requisition-management"
                element={
                  <ProtectedRoute requiredRole="manager">
                    <RequisitionManagement />
                  </ProtectedRoute>
                }
              />
              
              {/* ✨ NEW: Onboarding - Admin only */}
              <Route 
                path="onboarding" 
                element={
                  <ProtectedRoute requiredRole="manager">
                    <OnboardingDashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Employee Routes - Admin (full access), Manager (view only) */}
              <Route 
                path="employees" 
                element={
                  <ProtectedRoute requiredRole="manager">
                    <EmployeeList />
                  </ProtectedRoute>
                } 
              />
              
              {/* Payroll - Admin only */}
              <Route 
                path="payroll" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Payroll />
                  </ProtectedRoute>
                } 
              />
              
              {/* Leave - All roles (Manager & Employee see own only) */}
              <Route 
                path="leave" 
                element={
                  <ProtectedRoute requiredRole="employee">
                    <Leave />
                  </ProtectedRoute>
                } 
              />
              
              {/* Attendance - All roles */}
              <Route 
                path="attendance" 
                element={
                  <ProtectedRoute requiredRole="employee">
                    <Attendance />
                  </ProtectedRoute>
                } 
              />
              
              {/* Vendor sourcing */}
              <Route 
                path="vendor-sourcing" 
                element={
                  <ProtectedRoute requiredRole="employee">
                    <VendorResponsesList />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="vendor-sourcing/new" 
                element={
                  <ProtectedRoute requiredRole="employee">
                    <VendorSourcingForm />
                  </ProtectedRoute>
                } 
              />

              {/* Training - Employee Portal */}
              <Route
                path="training"
                element={
                  <ProtectedRoute requiredRole="employee">
                    <TrainingPortal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="training/course/:courseId"
                element={
                  <ProtectedRoute requiredRole="employee">
                    <TrainingCoursePlayer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="training/results"
                element={
                  <ProtectedRoute requiredRole="employee">
                    <TrainingResults />
                  </ProtectedRoute>
                }
              />

              {/* Training - Admin Builder */}
              <Route
                path="training/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <TrainingAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="training/admin/editor"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <TrainingCourseEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="training/admin/editor/:courseId"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <TrainingCourseEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="training/admin/reports"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <TrainingReports />
                  </ProtectedRoute>
                }
              />
              
              {/* Performance - Admin & Manager */}
              <Route 
                path="performance" 
                element={
                  <ProtectedRoute requiredRole="manager">
                    <Performance />
                  </ProtectedRoute>
                } 
              />
              
              {/* Resignation - Admin only */}
              <Route 
                path="resignation" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Resignation />
                  </ProtectedRoute>
                } 
              />
              
              {/* Archive - Admin only */}
              <Route 
                path="archive" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ArchivePage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Settings - All roles */}
              <Route 
                path="settings" 
                element={
                  <ProtectedRoute requiredRole="employee">
                    <Settings />
                  </ProtectedRoute>
                } 
              />

              {/* Profile - All roles */}
              <Route 
                path="profile" 
                element={
                  <ProtectedRoute requiredRole="employee">
                    <Profile />
                  </ProtectedRoute>
                } 
              />

              {/* Announcements - Admin composer */}
              <Route
                path="announcements/manage"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Announcements />
                  </ProtectedRoute>
                }
              />

              {/* Announcements - Staff board */}
              <Route
                path="announcements"
                element={
                  <ProtectedRoute requiredRole="employee">
                    <StaffAnnouncements />
                  </ProtectedRoute>
                }
              />

              {/* Payslips - All roles */}
              <Route 
                path="payslips" 
                element={
                  <ProtectedRoute requiredRole="employee">
                    <EmployeePayslip />
                  </ProtectedRoute>
                } 
              />

            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
