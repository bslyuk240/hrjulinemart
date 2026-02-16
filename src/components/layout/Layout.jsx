import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Header from './Header';
import Sidebar from './Sidebar';
import PullToRefresh from '../common/PullToRefresh';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function Layout() {
  const { sidebarOpen, notifications, removeNotification, setSidebarOpen } = useApp();
  const location = useLocation();

  // Ensure sidebar is closed by default on mobile and closes on route change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Close on mount for small screens
      if (window.innerWidth < 1024) setSidebarOpen(false);

      const handleResize = () => {
        if (window.innerWidth < 1024) setSidebarOpen(false);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [setSidebarOpen]);

  // Close sidebar on navigation for small screens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location, setSidebarOpen]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBgColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 transition-all duration-300 ml-0 lg:ml-64">
          <PullToRefresh onRefresh={() => window.location.reload()}>
            <div className="p-4 md:p-6">
              <Outlet />
            </div>
          </PullToRefresh>
        </main>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start space-x-3 p-4 rounded-lg shadow-lg border ${getNotificationBgColor(
              notification.type
            )} animate-slide-in`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">
                {notification.message}
              </p>
              {notification.description && (
                <p className="text-xs text-gray-600 mt-1">
                  {notification.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 ml-2 p-1 rounded hover:bg-white/50 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
