import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';
import { supabase } from './supabase';

const VAPID_KEY = 'BLWHVdSWd5P-_Xc_OHMJa5IdbM2LkRbYOuulxHA7hBe8xdH-9uq6zZjfwOR52mgqAaW97mThO89gVwyQ8RTdpsU';

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

    // Ask permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('Push notification permission denied');
      return null;
    }

    // Get device token
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return null;

    // Persist token
    await saveFCMToken(userId, token);

    // Show foreground push as native browser notification
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
 * Save (or upsert) an FCM token for a user
 */
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

/**
 * Remove all FCM tokens for a user (call on logout)
 */
export const removeFCMTokens = async (userId) => {
  try {
    await supabase.from('fcm_tokens').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('FCM token remove error:', err);
  }
};
