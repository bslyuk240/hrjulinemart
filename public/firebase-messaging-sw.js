importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAP23B4a7P7GxCh25RItkq_Rg_EpFpoWhI",
  authDomain: "hr-app-c0346.firebaseapp.com",
  projectId: "hr-app-c0346",
  storageBucket: "hr-app-c0346.firebasestorage.app",
  messagingSenderId: "741953152967",
  appId: "1:741953152967:web:8b8865300579e2bb29dbe2",
});

const messaging = firebase.messaging();

// Handle background messages (app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'JulineMart HR';
  const options = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: payload.data || {},
    tag: payload.data?.type || 'general',
  };
  self.registration.showNotification(title, options);
});

// Handle notification click — navigate to the relevant page
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
