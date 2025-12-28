import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// ✨ NEW: Onboarding imports
import OnboardingDashboard from './pages/OnboardingDashboard';
import OnboardingFormPage from './pages/OnboardingFormPage';
import ReferenceFormPage from './pages/ReferenceFormPage';
import OnboardingSuccessPage from './pages/OnboardingSuccessPage';

import './styles/index.css';

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
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* ✨ NEW: Public Onboarding & Reference Routes (No Login Required) */}
            <Route path="/onboarding/:token" element={<OnboardingFormPage />} />
            <Route path="/reference/:token" element={<ReferenceFormPage />} />
            <Route path="/onboarding-success" element={<OnboardingSuccessPage />} />
            
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

              {/* Admin Requisition Management */}
              <Route 
                path="requisition-management" 
                element={
                  <ProtectedRoute requiredRole="admin">
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
