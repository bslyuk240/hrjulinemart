import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';
import { supabase } from './supabase';

/**
 * Initialize FCM for a logged-in user:
 * 1. Optionally request browser notification permission
 * 2. Register / reuse the existing service worker so Firebase uses it
 *    (avoids Firebase looking for the missing /firebase-messaging-sw.js)
 * 3. Get FCM device token
 * 4. Save token to Supabase so the send-push edge function can target it
 * 5. Listen for foreground messages and show them as native notifications
 */
export const initFCM = async (userId, options = {}) => {
  const { promptForPermission = true } = options;

  try {
    const result = {
      success: false,
      saved: false,
      permission: 'unsupported',
      token: null,
      error: null,
    };

    if (typeof window === 'undefined') {
      result.error = 'Push notifications are only available in the browser.';
      return result;
    }

    if (!('Notification' in window)) {
      result.error = 'This browser does not support notifications.';
      return result;
    }

    if (!('serviceWorker' in navigator)) {
      result.permission = Notification.permission;
      result.error = 'Service workers are not supported on this device.';
      return result;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      result.permission = Notification.permission;
      result.error = 'Push messaging is not supported in this browser.';
      return result;
    }

    const currentPermission = Notification.permission;
    const permission = currentPermission === 'granted'
      ? currentPermission
      : promptForPermission
        ? await Notification.requestPermission()
        : currentPermission;

    result.permission = permission;
    if (permission !== 'granted') {
      result.error = permission === 'denied'
        ? 'Notification permission is blocked.'
        : 'Notification permission is not granted.';
      return result;
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
      result.error = 'FCM token could not be created. Check your VAPID key and service worker.';
      console.warn('FCM: getToken returned null (SW not ready or VAPID mismatch?)');
      return result;
    }

    result.token = token;

    const saved = await saveFCMToken(userId, token);
    result.saved = saved;

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

    result.success = saved;
    if (!saved) {
      result.error = 'The device token was created, but saving it to the database failed.';
      console.error('FCM: token obtained but DB save failed for user', userId);
    }

    return result;
  } catch (err) {
    console.warn('FCM init error:', err);
    return {
      success: false,
      saved: false,
      permission: Notification?.permission || 'unknown',
      token: null,
      error: err?.message || 'Failed to initialize push notifications.',
    };
  }
};

/**
 * Persist an FCM token in the fcm_tokens table.
 * Returns true on success, false on failure.
 */
export const saveFCMToken = async (userId, token) => {
  try {
    const timestamp = new Date().toISOString();

    // Refresh the specific device token rather than relying on a conflict
    // constraint that may differ between environments.
    const { error: deleteError } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);
    if (deleteError) {
      console.error('FCM token cleanup error:', deleteError.message, deleteError.details);
      return false;
    }

    const { error } = await supabase
      .from('fcm_tokens')
      .insert([{ user_id: userId, token, updated_at: timestamp }]);
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
