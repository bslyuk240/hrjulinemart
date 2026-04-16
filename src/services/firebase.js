import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAP23B4a7P7GxCh25RItkq_Rg_EpFpoWhI",
  authDomain: "hr-app-c0346.firebaseapp.com",
  projectId: "hr-app-c0346",
  storageBucket: "hr-app-c0346.firebasestorage.app",
  messagingSenderId: "741953152967",
  appId: "1:741953152967:web:8b8865300579e2bb29dbe2",
  measurementId: "G-3P001YKY4D",
};

const app = initializeApp(firebaseConfig);

let messagingInstance = null;

export const getFirebaseMessaging = async () => {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
};

export default app;
