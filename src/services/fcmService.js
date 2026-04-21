import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';
import { supabase } from './supabase';

/**
 * Default: nested scope so `/sw.js` (PWA) can own `/`.
 * Set VITE_FCM_ROOT_SERVICE_WORKER=true (and usually VITE_DISABLE_PWA_SERVICE_WORKER=true)
 * on a preview build to test FCM with messaging SW at `/` only.
 */
const FCM_SW_SCOPE =
  import.meta.env.VITE_FCM_ROOT_SERVICE_WORKER === 'true'
    ? '/'
    : '/firebase-cloud-messaging-push-scope/';

function maskKey(key) {
  const s = String(key || '');
  if (s.length < 12) return s ? '(too short)' : '(empty)';
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function hintForFirebaseCode(code, message) {
  const c = String(code || '');
  const m = String(message || '').toLowerCase();
  if (c.includes('token-subscribe-failed') || m.includes('token-subscribe')) {
    return [
      'Google rejected FCM registration (often HTTP 401 on fcmregistrations.googleapis.com).',
      'Check GCP: FCM Registration API enabled; browser API key allows that API + Firebase Installations; billing on project.',
      'Not related to Supabase or FIREBASE_PRIVATE_KEY (those are for sending only).',
    ].join(' ');
  }
  if (c.includes('failed-service-worker-registration')) {
    return 'Service worker registration failed. Check firebase-messaging-sw.js is served and scope is correct.';
  }
  if (m.includes('vapid') || c.includes('invalid-vapid')) {
    return 'Regenerate Web Push certificate (VAPID) in Firebase Console → Cloud Messaging and update VITE_FIREBASE_VAPID_KEY.';
  }
  return 'Search Firebase error code in Firebase docs or paste debug JSON for support.';
}

/**
 * Safe snapshot for logs (no full secrets). Call from console: getFcmClientDebugSnapshot()
 */
export function getFcmClientDebugSnapshot() {
  const pid = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
  return {
    t: new Date().toISOString(),
    origin: typeof window !== 'undefined' ? window.location.origin : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    vite: {
      VITE_FIREBASE_PROJECT_ID: pid || null,
      VITE_FIREBASE_API_KEY_masked: maskKey(import.meta.env.VITE_FIREBASE_API_KEY),
      VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || null,
      VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || null,
      VITE_FIREBASE_VAPID_KEY_len: String(import.meta.env.VITE_FIREBASE_VAPID_KEY || '').length,
      VITE_FCM_ROOT_SERVICE_WORKER:
        import.meta.env.VITE_FCM_ROOT_SERVICE_WORKER === 'true',
      VITE_DISABLE_PWA_SERVICE_WORKER:
        import.meta.env.VITE_DISABLE_PWA_SERVICE_WORKER === 'true',
    },
    fcmRegistrationsUrl: pid
      ? `https://fcmregistrations.googleapis.com/v1/projects/${pid}/registrations`
      : null,
  };
}

function attachDebugToWindow(payload) {
  if (typeof window !== 'undefined') {
    window.__FCM_DEBUG_LAST = payload;
  }
}

/**
 * Register the Firebase messaging worker in its own scope (not `navigator.serviceWorker.ready`,
 * which is the app’s `/sw.js` PWA worker — passing that to FCM breaks token subscription).
 */
async function getFcmServiceWorkerRegistration() {
  if (import.meta.env.VITE_FCM_ROOT_SERVICE_WORKER === 'true') {
    console.warn(
      '[FCM] VITE_FCM_ROOT_SERVICE_WORKER: registering firebase-messaging-sw.js at scope / (diagnostic).',
    );
  }
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
 * The messaging service worker is built from Vite env at build time. If those vars
 * were missing, the SW sends an empty API key to Google and registration returns 401.
 */
async function assertFirebaseMessagingSwConfigured() {
  const res = await fetch('/firebase-messaging-sw.js', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(
      `firebase-messaging-sw.js HTTP ${res.status}. Rebuild the app so Vite emits this file.`,
    );
  }
  const text = await res.text();
  const apiKey = (text.match(/apiKey:\s*"([^"]*)"/) || [])[1] || '';
  const projectId = (text.match(/projectId:\s*"([^"]*)"/) || [])[1] || '';
  if (!apiKey || apiKey.length < 10) {
    throw new Error(
      'Firebase Web config is missing in the messaging service worker. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_MESSAGING_SENDER_ID, and VITE_FIREBASE_APP_ID in the build environment, then rebuild and redeploy.',
    );
  }
  if (!projectId) {
    throw new Error(
      'Firebase projectId is missing in firebase-messaging-sw.js. Set VITE_FIREBASE_PROJECT_ID and redeploy.',
    );
  }

  const envProject = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
  const envKey = String(import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
  if (envProject && projectId !== envProject) {
    throw new Error(
      `firebase-messaging-sw.js uses projectId "${projectId}" but this bundle has VITE_FIREBASE_PROJECT_ID "${envProject}". Same deploy must rebuild JS and SW together — you may be caching an old worker or mixing two Firebase projects.`,
    );
  }
  if (envKey && apiKey !== envKey) {
    throw new Error(
      'firebase-messaging-sw.js apiKey does not match VITE_FIREBASE_API_KEY. Hard-refresh (Ctrl+Shift+R), unregister service workers for this site, rebuild, and redeploy so the app and messaging SW share one Firebase web config.',
    );
  }
  console.log('[FCM Debug] SW config matches bundle (projectId + apiKey).');
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
      /** Structured diagnostics — paste JSON when asking for help */
      debug: null,
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

    const vapidKey = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();
    if (!vapidKey) {
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
      await assertFirebaseMessagingSwConfigured();
    } catch (swErr) {
      console.error('[FCM Debug] FCM service worker registration failed:', swErr);
      result.permission = Notification.permission;
      result.error =
        swErr?.message ||
        'Could not register the Firebase messaging service worker.';
      result.debug = {
        stage: 'service_worker',
        snapshot: getFcmClientDebugSnapshot(),
        cause: swErr?.message || String(swErr),
      };
      attachDebugToWindow(result.debug);
      console.error('[FCM Debug] Full:', result.debug);
      return result;
    }

    let token;
    try {
      token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swRegistration,
      });
    } catch (tokenErr) {
      const code = tokenErr?.code || tokenErr?.name || 'unknown';
      const msg = tokenErr?.message || String(tokenErr);
      const snapshot = getFcmClientDebugSnapshot();
      result.permission = Notification.permission;
      result.error = `${msg} (code: ${code})`;
      result.debug = {
        stage: 'getToken',
        firebaseErrorCode: code,
        firebaseMessage: msg,
        hint: hintForFirebaseCode(code, msg),
        snapshot,
        stack: tokenErr?.stack || null,
      };
      attachDebugToWindow(result.debug);
      console.error('[FCM Debug] getToken failed:', code, msg);
      console.error('[FCM Debug] Paste for support:', result.debug);
      return result;
    }

    if (!token) {
      result.error = 'FCM token could not be created. Check your VAPID key and service worker.';
      console.warn('FCM: getToken returned null (SW not ready or VAPID mismatch?)');
      result.debug = {
        stage: 'getToken_null',
        snapshot: getFcmClientDebugSnapshot(),
      };
      attachDebugToWindow(result.debug);
      return result;
    }

    result.token = token;

    const saveResult = await saveFCMToken(userId, token);
    const saved = saveResult.ok;
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
      result.error =
        saveResult.errorMessage ||
        'The device token was created, but saving it to the database failed.';
      result.debug = {
        stage: 'supabase_insert',
        snapshot: getFcmClientDebugSnapshot(),
        supabase: saveResult.errorDetail || null,
        hint: 'Check fcm_tokens RLS and that user_id matches JWT app_metadata.employee_id.',
      };
      attachDebugToWindow(result.debug);
      console.error('[FCM Debug] DB save failed:', result.debug);
      console.error('FCM: token obtained but DB save failed for user', userId);
    }

    return result;
  } catch (err) {
    console.warn('FCM init error:', err);
    const debug = {
      stage: 'unexpected',
      snapshot: getFcmClientDebugSnapshot(),
      message: err?.message || String(err),
      code: err?.code || err?.name,
      stack: err?.stack,
    };
    attachDebugToWindow(debug);
    console.error('[FCM Debug] unexpected:', debug);
    return {
      success: false,
      saved: false,
      permission: Notification?.permission || 'unknown',
      token: null,
      error: err?.message || 'Failed to initialize push notifications.',
      debug,
    };
  }
};

/**
 * Persist an FCM token in the fcm_tokens table.
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
      return {
        ok: false,
        errorMessage: `Token lookup failed: ${lookupError.message}`,
        errorDetail: {
          step: 'select',
          message: lookupError.message,
          code: lookupError.code,
          details: lookupError.details,
          hint: lookupError.code === '42501' ? 'RLS blocked SELECT on fcm_tokens.' : null,
        },
      };
    }

    if ((existingRows || []).length > 0) {
      return { ok: true };
    }

    const { error } = await supabase
      .from('fcm_tokens')
      .insert([{ user_id: userId, token, updated_at: timestamp }]);
    if (error) {
      console.error('FCM token save error:', error.message, error.details);
      return {
        ok: false,
        errorMessage: `Database save failed: ${error.message}`,
        errorDetail: {
          step: 'insert',
          message: error.message,
          code: error.code,
          details: error.details,
          hint:
            error.code === '42501'
              ? 'RLS blocked INSERT — check fcm_tokens policies vs app_metadata.employee_id.'
              : error.message?.includes('violates foreign key')
                ? 'user_id may not exist in referenced table — check fcm_tokens schema.'
                : null,
        },
      };
    }
    return { ok: true };
  } catch (err) {
    console.warn('FCM token save exception:', err);
    return {
      ok: false,
      errorMessage: err?.message || String(err),
      errorDetail: { step: 'exception', message: err?.message },
    };
  }
};

export const removeFCMTokens = async (userId) => {
  try {
    await supabase.from('fcm_tokens').delete().eq('user_id', userId);
  } catch (err) {
    console.warn('FCM token remove error:', err);
  }
};
