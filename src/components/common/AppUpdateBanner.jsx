import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * AppUpdateBanner
 * Shows a non-blocking in-app banner when a new service worker is waiting.
 * Replaces the ugly browser window.confirm() prompt.
 *
 * Usage: render <AppUpdateBanner /> once in Layout.
 * main.jsx fires a custom 'sw-update-available' event when a waiting worker exists.
 */
export default function AppUpdateBanner() {
  const [show, setShow]         = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const onUpdate = () => setShow(true);
    window.addEventListener('sw-update-available', onUpdate);
    return () => window.removeEventListener('sw-update-available', onUpdate);
  }, []);

  const handleUpdate = () => {
    setUpdating(true);
    // Tell the waiting SW to take over, then reload once it does
    window.dispatchEvent(new Event('sw-do-update'));
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl max-w-sm w-full pointer-events-auto">
        <RefreshCw className={`w-5 h-5 flex-shrink-0 text-purple-400 ${updating ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Update available</p>
          <p className="text-xs text-gray-400 mt-0.5">A new version of the app is ready.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors"
          >
            {updating ? 'Updating…' : 'Update now'}
          </button>
          <button
            onClick={() => setShow(false)}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
