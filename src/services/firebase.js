import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missingFirebaseEnv = [];
if (!import.meta.env.VITE_FIREBASE_API_KEY) missingFirebaseEnv.push('VITE_FIREBASE_API_KEY');
if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) missingFirebaseEnv.push('VITE_FIREBASE_PROJECT_ID');
if (!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) {
  missingFirebaseEnv.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
}
if (!import.meta.env.VITE_FIREBASE_APP_ID) missingFirebaseEnv.push('VITE_FIREBASE_APP_ID');

const app = initializeApp(firebaseConfig);

let messagingInstance = null;

export const getFirebaseMessaging = async () => {
  if (messagingInstance) return messagingInstance;
  if (missingFirebaseEnv.length > 0) {
    console.error(
      '[FCM] Missing Vite env vars:',
      missingFirebaseEnv.join(', '),
      '— rebuild after setting them in .env',
    );
    return null;
  }
  const supported = await isSupported();
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
};

export default app;
