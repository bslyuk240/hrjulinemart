import React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { getAllEmployees } from '../services/employeeService';
import { getTodayAttendanceSummary } from '../services/attendanceService';
import { getPendingLeaveCount } from '../services/leaveService';
import { getPendingResignationsCount } from '../services/resignationService';

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Global state
  const [employees, setEmployees] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    pendingLeaves: 0,
    pendingResignations: 0,
  });
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);


  // Fetch initial data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const employeesResult = await getAllEmployees();
      if (employeesResult.success) {
        setEmployees(employeesResult.data);
      }

      const attendanceResult = await getTodayAttendanceSummary();
      const leavesResult = await getPendingLeaveCount();
      const resignationsResult = await getPendingResignationsCount();

      setDashboardStats({
        totalEmployees: employeesResult.success ? employeesResult.data.length : 0,
        presentToday: attendanceResult.success ? attendanceResult.data.present : 0,
        absentToday: attendanceResult.success ? attendanceResult.data.absent : 0,
        pendingLeaves: leavesResult.success ? leavesResult.data : 0,
        pendingResignations: resignationsResult.success ? resignationsResult.data : 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshEmployees = async () => {
    try {
      const result = await getAllEmployees();
      if (result.success) {
        setEmployees(result.data);
        setDashboardStats((prev) => ({
          ...prev,
          totalEmployees: result.data.length,
        }));
      }
    } catch (error) {
      console.error('Error refreshing employees:', error);
    }
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      ...notification,
    };
    setNotifications((prev) => [newNotification, ...prev]);

    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const showSuccess = (message) => {
    addNotification({ type: 'success', message });
  };

  const showError = (message) => {
    addNotification({ type: 'error', message });
  };

  const showInfo = (message) => {
    addNotification({ type: 'info', message });
  };

  const showWarning = (message) => {
    addNotification({ type: 'warning', message });
  };

  const value = {
    employees,
    dashboardStats,
    loading,
    notifications,
    sidebarOpen,
    fetchDashboardData,
    refreshEmployees,
    addNotification,
    removeNotification,
    clearNotifications,
    toggleSidebar,
    setSidebarOpen,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;