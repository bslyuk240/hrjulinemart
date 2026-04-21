import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';
import { supabase } from './supabase';

/**
 * Initialize FCM for a logged-in user:
 * 1. Request browser notification permission
 * 2. Register / reuse the existing service worker so Firebase uses it
 *    (avoids Firebase looking for the missing /firebase-messaging-sw.js)
 * 3. Get FCM device token
 * 4. Save token to Supabase so the send-push edge function can target it
 * 5. Listen for foreground messages and show them as native notifications
 */
export const initFCM = async (userId) => {
  try {
    if (!('Notification' in window))     return null;
    if (!('serviceWorker' in navigator)) return null;

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('Push notification permission denied');
      return null;
    }

    // Get (or register) our service worker and pass it to getToken so
    // Firebase doesn't fall back to looking for /firebase-messaging-sw.js
    let swRegistration;
    try {
      swRegistration = await navigator.serviceWorker.ready;
    } catch (_) {
      // In rare cases serviceWorker.ready rejects; fall back gracefully
      swRegistration = undefined;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });
    if (!token) {
      console.warn('FCM: getToken returned null (SW not ready or VAPID mismatch?)');
      return null;
    }

    const saved = await saveFCMToken(userId, token);
    if (!saved) {
      // Token was obtained but DB save failed — still return token so the
      // banner shows success, but log clearly for debugging.
      console.error('FCM: token obtained but DB save failed for user', userId);
    }

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

/**
 * Persist an FCM token in the fcm_tokens table.
 * Returns true on success, false on failure.
 */
export const saveFCMToken = async (userId, token) => {
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        { user_id: userId, token, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      );
    if (error) {
      console.error('FCM token save error:', error.message, error.details);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('FCM token save exception:', err);
    return false;
  }
};

export const removeFCMTokens = async (userId) => {
  try {
    await supabase.from('fcm_tokens').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('FCM token remove error:', err);
  }
};
