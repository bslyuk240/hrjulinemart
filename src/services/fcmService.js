import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';
import { supabase } from './supabase';

/**
 * Initialize FCM for a logged-in user:
 * 1. Request browser notification permission
 * 2. Get FCM device token
 * 3. Save token to Supabase so the edge function can target this device
 * 4. Listen for foreground messages and show them as native notifications
 */
export const initFCM = async (userId) => {
  try {
    if (!('Notification' in window)) return null;

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('Push notification permission denied');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    if (!token) return null;

    await saveFCMToken(userId, token);

    // Show foreground messages as native browser notifications
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || 'JulineMart HR';
      const body  = payload.notification?.body  || '';
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          tag:  payload.data?.type || 'general',
        });
      }
    });

    return token;
  } catch (err) {
    console.warn('FCM init error:', err);
    return null;
  }
};

export const saveFCMToken = async (userId, token) => {
  try {
    await supabase
      .from('fcm_tokens')
      .upsert(
        { user_id: userId, token, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      );
  } catch (err) {
    console.warn('FCM token save error:', err);
  }
};

export const removeFCMTokens = async (userId) => {
  try {
    await supabase.from('fcm_tokens').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('FCM token remove error:', err);
  }
};
