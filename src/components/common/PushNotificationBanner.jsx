import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, X, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { initFCM } from '../../services/fcmService';

const DISMISSED_KEY = 'fcm_banner_dismissed';

export default function PushNotificationBanner() {
  const { user } = useAuth();
  const [permission, setPermission] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [dismissed, setDismissed]   = useState(false);
  const [status, setStatus]         = useState(''); // 'success' | 'error'
  const syncedForUser = useRef(null);

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) { setDismissed(true); return; }
    if (!('Notification' in window)) { setPermission('unsupported'); return; }
    setPermission(Notification.permission);
  }, [user]);

  useEffect(() => {
    if (!user || permission !== 'granted') return;
    if (syncedForUser.current === user.id) return;

    syncedForUser.current = user.id;
    initFCM(user.id, { promptForPermission: false })
      .then((result) => {
        if (!result.success) {
          console.warn('FCM silent sync failed:', result.error);
          setStatus('error');
        }
      })
      .catch((err) => {
        console.warn('FCM silent sync failed:', err);
        setStatus('error');
      });
  }, [user, dismissed, permission]);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  const handleEnable = async () => {
    setLoading(true);
    setStatus('');
    try {
      const result = await initFCM(user.id, { promptForPermission: true });
      if (result.success) {
        setPermission('granted');
        setStatus('success');
        // Auto-hide after 3 s
        setTimeout(dismiss, 3000);
      } else {
        setPermission(result.permission || Notification.permission);
        setStatus('error');
      }
    } catch (err) {
      console.warn('FCM enable error:', err);
      setStatus('error');
    }
    setLoading(false);
  };

  // Nothing to show
  if (!user || dismissed || permission === null || permission === 'unsupported') return null;

  /* ── Granted (show brief success before dismissing) ── */
  if (permission === 'granted' && status === 'success') {
    return (
      <div className="fixed top-16 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg pointer-events-auto">
          <Bell className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Push notifications enabled ✓</p>
        </div>
      </div>
    );
  }

  if (permission === 'granted' && status === 'error') {
    return (
      <div className="fixed top-16 inset-x-0 z-40 flex justify-center px-4">
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 text-orange-900 px-4 py-3 rounded-xl shadow-md max-w-sm w-full">
          <BellOff className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" />
          <div className="flex-1 text-sm min-w-0">
            <p className="font-semibold">Permission granted, token sync failed</p>
            <p className="text-xs mt-0.5 text-orange-700">
              Open Profile → Notifications and try enabling again.
            </p>
          </div>
          <button onClick={dismiss} className="p-1 rounded hover:bg-orange-100 flex-shrink-0">
            <X className="w-4 h-4 text-orange-500" />
          </button>
        </div>
      </div>
    );
  }

  if (permission === 'granted') return null;

  /* ── Denied ── */
  if (permission === 'denied') {
    return (
      <div className="fixed top-16 inset-x-0 z-40 flex justify-center px-4">
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 text-orange-900 px-4 py-3 rounded-xl shadow-md max-w-sm w-full">
          <BellOff className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Notifications blocked</p>
            <p className="text-xs mt-0.5 text-orange-700">
              Go to your browser / OS settings and allow notifications for this site.
            </p>
          </div>
          <button onClick={dismiss} className="p-1 rounded hover:bg-orange-100">
            <X className="w-4 h-4 text-orange-500" />
          </button>
        </div>
      </div>
    );
  }

  /* ── Default — ask user to enable ── */
  return (
    <div className="fixed top-16 inset-x-0 z-40 flex justify-center px-4">
      <div className="flex items-center gap-3 bg-white border border-purple-200 shadow-lg px-4 py-3 rounded-xl max-w-sm w-full">
        <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
          <Bell className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Enable push notifications</p>
          <p className="text-xs text-gray-500 mt-0.5">Stay updated on leave, payroll & more</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
            {loading ? 'Enabling…' : 'Enable'}
          </button>
          <button onClick={dismiss} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
