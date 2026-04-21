import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';
import { supabase } from './supabase';

/** Scope separate from `/sw.js` so both service workers can coexist. */
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope/';

/**
 * Register the Firebase messaging worker in its own scope (not `navigator.serviceWorker.ready`,
 * which is the app’s `/sw.js` PWA worker — passing that to FCM breaks token subscription).
 */
async function getFcmServiceWorkerRegistration() {
  let reg = await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE);
  if (!reg) {
    reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: FCM_SW_SCOPE,
    });
  }
  await reg.update();
  if (reg.active) return reg;

  const sw = reg.installing || reg.waiting;
  if (!sw) return reg;

  await new Promise((resolve) => {
    if (sw.state === 'activated') {
      resolve();
      return;
    }
    sw.addEventListener('statechange', function onState() {
      if (sw.state === 'activated') {
        sw.removeEventListener('statechange', onState);
        resolve();
      }
    });
  });
  return reg;
}

/**
 * Initialize FCM for a logged-in user:
 * 1. Optionally request browser notification permission
 * 2. Register `firebase-messaging-sw.js` under a dedicated scope (alongside `/sw.js`)
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

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey || String(vapidKey).trim() === '') {
      result.permission = Notification.permission;
      result.error =
        'Missing VITE_FIREBASE_VAPID_KEY (Web Push certificate in Firebase Console → Cloud Messaging).';
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

    let swRegistration;
    try {
      swRegistration = await getFcmServiceWorkerRegistration();
    } catch (swErr) {
      console.error('[FCM Debug] FCM service worker registration failed:', swErr);
      result.permission = Notification.permission;
      result.error =
        swErr?.message ||
        'Could not register the Firebase messaging service worker.';
      return result;
    }

    const token = await getToken(messaging, {
      vapidKey,
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

    // Avoid delete permissions entirely. If the exact token already exists,
    // keep it; otherwise insert a fresh row.
    const { data: existingRows, error: lookupError } = await supabase
      .from('fcm_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', token)
      .limit(1);
    if (lookupError) {
      console.error('FCM token lookup error:', lookupError.message, lookupError.details);
      return false;
    }

    if ((existingRows || []).length > 0) {
      return true;
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
