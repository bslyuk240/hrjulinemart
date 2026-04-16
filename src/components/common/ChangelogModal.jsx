import React, { useState, useEffect } from 'react';
import { X, Sparkles, Shield, Bell, Users, FileText, Zap } from 'lucide-react';

// ── Bump this version string with every release ──────────────────────────────
export const APP_VERSION = '2.2.0';
const CHANGELOG_KEY = `changelog_seen_${APP_VERSION}`;

const CHANGELOG = [
  {
    icon: Shield,
    color: 'text-green-600 bg-green-100',
    title: 'Security upgrade — passwords now hashed',
    description:
      'All passwords are now stored as secure bcrypt hashes. Your password is automatically upgraded the next time you log in. Admin and employee logins are verified server-side only.',
  },
  {
    icon: Bell,
    color: 'text-purple-600 bg-purple-100',
    title: 'Push notifications',
    description:
      'Enable push alerts for leave requests, payroll, and more. Go to Profile → Notifications to enable on any device.',
  },
  {
    icon: Users,
    color: 'text-blue-600 bg-blue-100',
    title: 'Manager access to Requisition Management',
    description:
      'Managers can now approve or decline requisition requests. Admins retain exclusive access to Pay, Delete, and Revert actions.',
  },
  {
    icon: FileText,
    color: 'text-orange-600 bg-orange-100',
    title: 'Employee termination & layoff',
    description:
      'Admins can now terminate or lay off employees with a reason, date, and notes. The Archive page shows separation type for each record.',
  },
  {
    icon: Zap,
    color: 'text-yellow-600 bg-yellow-100',
    title: 'Session expiry & login protection',
    description:
      'Sessions now expire after 8 hours. Failed login attempts are tracked — accounts are temporarily locked after 5 consecutive failures.',
  },
];

export default function ChangelogModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show once per version, only after user is on a protected page (not login)
    if (!sessionStorage.getItem(CHANGELOG_KEY) && !localStorage.getItem(CHANGELOG_KEY)) {
      // Small delay so the app fully loads first
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = (dontShowAgain = false) => {
    sessionStorage.setItem(CHANGELOG_KEY, '1');
    if (dontShowAgain) localStorage.setItem(CHANGELOG_KEY, '1');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg leading-tight">What's new</h2>
              <p className="text-xs text-gray-500">Version {APP_VERSION}</p>
            </div>
          </div>
          <button
            onClick={() => dismiss(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {CHANGELOG.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={() => dismiss(true)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Don't show again
          </button>
          <button
            onClick={() => dismiss(false)}
            className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors shadow"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
