import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  DollarSign,
  Calendar,
  Clock,
  TrendingUp,
  UserX,
  Archive,
  FileText,
  Settings,
  ChevronLeft,
  X,
  User,
  ShoppingCart,
  GraduationCap,
  ClipboardList,
  BarChart3,
} from 'lucide-react';

export default function Sidebar() {
  const { user, isAdmin, isManager } = useAuth();
  const { sidebarOpen, toggleSidebar } = useApp();


  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'employee'],
    },
    {
      name: 'My Profile',
      path: '/profile',
      icon: User,
      roles: ['admin', 'manager', 'employee'],
    },
    {
      name: 'Onboarding',
      path: '/onboarding',
      icon: UserPlus,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Employees',
      path: '/employees',
      icon: Users,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Payroll',
      path: '/payroll',
      icon: DollarSign,
      roles: ['admin'],
    },
    {
      name: 'Leave Requests',
      path: '/leave',
      icon: Calendar,
      roles: ['admin', 'manager', 'employee'],
    },
    {
      name: 'Attendance',
      path: '/attendance',
      icon: Clock,
      roles: ['admin', 'manager', 'employee'],
    },
    {
      name: 'Vendor Sourcing',
      path: '/vendor-sourcing',
      icon: ShoppingCart,
      roles: ['admin', 'manager', 'employee'],
    },
    {
      name: 'Training Portal',
      path: '/training',
      icon: GraduationCap,
      roles: ['admin', 'manager', 'employee'],
    },
    {
      name: 'My Training Results',
      path: '/training/results',
      icon: ClipboardList,
      roles: ['manager', 'employee'],
    },
    {
      name: 'My Payslips',
      path: '/payslips',
      icon: FileText,
      roles: ['manager', 'employee'],
    },
    {
      name: 'Performance',
      path: '/performance',
      icon: TrendingUp,
      roles: ['admin', 'manager'],
    }, 
    {
      name: 'My Requisitions',
      path: '/requisitions',
      icon: FileText,
      roles: ['employee', 'manager'],
    },
    {
      name: 'Requisition Management',
      path: '/requisition-management',
      icon: DollarSign,
      roles: ['admin'],
    },
    {
      name: 'Resignations',
      path: '/resignation',
      icon: UserX,
      roles: ['admin'],
    },
    {
      name: 'Archive',
      path: '/archive',
      icon: Archive,
      roles: ['admin'],
    },
    {
      name: 'Training Builder',
      path: '/training/admin',
      icon: GraduationCap,
      roles: ['admin'],
    },
    {
      name: 'Training Reports',
      path: '/training/admin/reports',
      icon: BarChart3,
      roles: ['admin'],
    },
  ];

  // Filter navigation based on user role
  const normalizedRole = (user?.role || '').toLowerCase();
  const isManagerRole = normalizedRole === 'manager' || user?.is_manager === true;

  const filteredNavigation = navigationItems.filter((item) => {
    if (isManagerRole) {
      return item.roles.includes('manager') || item.roles.includes('employee');
    }

    if (normalizedRole === 'admin' || user?.type === 'admin' || isAdmin()) {
      return item.roles.includes('admin');
    }

    return item.roles.includes('employee');
  });


  return (
    <>
      {/* Overlay for mobile - only show when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-safe h-full w-64 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'block translate-x-0' : 'hidden -translate-x-full'}
          lg:block lg:translate-x-0
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-white shadow-sm">
              <img 
                src={import.meta.env.VITE_COMPANY_LOGO || "https://res.cloudinary.com/dupgdbwrt/image/upload/v1759971092/icon-512x512.png_ygtda9.png"} 
                alt={`${import.meta.env.VITE_COMPANY_NAME || 'JulineMart'} Logo`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to letter if logo fails to load
                  e.target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center';
                  fallback.innerHTML = '<span class="text-white font-bold text-xl">J</span>';
                  e.target.parentNode.appendChild(fallback);
                }}
              />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">
                {import.meta.env.VITE_COMPANY_NAME || 'JulineMart'}
              </h2>
              <p className="text-xs text-gray-500">HR System</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-gray-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              {user?.profile_pic ? (
                <img
                  src={user.profile_pic}
                  alt={user.name || user.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-lg">
                  {(user?.name || user?.username || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">
                {user?.name || user?.username}
              </p>
              <p className="text-sm text-gray-600 capitalize">
                {user?.role || user?.type}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  // Close sidebar on mobile when a link is clicked
                  if (window.innerWidth < 1024) {
                    toggleSidebar();
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span className="text-sm md:text-base font-medium">{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <NavLink
            to="/settings"
            onClick={() => {
              // Close sidebar on mobile when settings is clicked
              if (window.innerWidth < 1024) {
                toggleSidebar();
              }
            }}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-100 text-purple-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-sm md:text-base font-medium">Settings</span>
          </NavLink>

          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              © 2025 {import.meta.env.VITE_COMPANY_NAME || 'JulineMart'} HR System
            </p>
            <p className="text-xs text-gray-500 text-center mt-1">
              Version 2.1.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
