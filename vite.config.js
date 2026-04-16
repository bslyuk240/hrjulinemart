import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function buildSwContent(env) {
  return `importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "${env.VITE_FIREBASE_API_KEY}",
  authDomain:        "${env.VITE_FIREBASE_AUTH_DOMAIN}",
  projectId:         "${env.VITE_FIREBASE_PROJECT_ID}",
  storageBucket:     "${env.VITE_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
  appId:             "${env.VITE_FIREBASE_APP_ID}",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'JulineMart HR';
  const options = {
    body:  payload.notification?.body || '',
    icon:  '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data:  payload.data || {},
    tag:   payload.data?.type || 'general',
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  const targetUrl = self.location.origin + link;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (client.url !== targetUrl) client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
`;
}

/**
 * Vite plugin:
 * - Dev: serves firebase-messaging-sw.js dynamically via middleware
 * - Build: emits firebase-messaging-sw.js as a static asset
 * Either way, env vars are injected at runtime — nothing hardcoded.
 */
function firebaseSwPlugin(env) {
  const swContent = buildSwContent(env);
  return {
    name: 'firebase-sw-generator',

    // DEV — serve the SW dynamically so Firebase can register it
    configureServer(server) {
      server.middlewares.use('/firebase-messaging-sw.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Service-Worker-Allowed', '/');
        res.end(swContent);
      });
    },

    // PROD — emit the SW as a build artifact
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'firebase-messaging-sw.js',
        source: swContent,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      firebaseSwPlugin(env),
    ],
    optimizeDeps: {
      include: ['lucide-react'],
    },
    css: {
      postcss: './postcss.config.js',
    },
    server: {
      port: 5173,
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
  }
})
