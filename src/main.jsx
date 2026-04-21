import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Service Worker & PWA update handling ─────────────────────────────────────
// Set VITE_DISABLE_PWA_SERVICE_WORKER=true at build time to skip /sw.js (FCM A/B test vs root-scoped messaging worker).
const disablePwaServiceWorker =
  import.meta.env.VITE_DISABLE_PWA_SERVICE_WORKER === 'true';
if (disablePwaServiceWorker) {
  console.warn('[PWA] VITE_DISABLE_PWA_SERVICE_WORKER: /sw.js will not register.');
}

if ('serviceWorker' in navigator && !disablePwaServiceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {

        // Signal to the React app that an update is waiting
        const notifyUpdate = () => {
          window.dispatchEvent(new Event('sw-update-available'));
        };

        // If a worker is already waiting (e.g. page refreshed after update)
        if (registration.waiting) {
          notifyUpdate();
        }

        // Listen for new workers being installed
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdate();
            }
          });
        });

        // Listen for the React app requesting the update to happen
        window.addEventListener('sw-do-update', () => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        });

        // Reload when the new worker takes control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      })
      .catch((error) => {
        console.warn('SW registration failed:', error);
      });
  });
}
