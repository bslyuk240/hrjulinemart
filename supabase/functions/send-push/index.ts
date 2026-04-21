import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
};

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v || !v.trim()) {
    throw new Error(`Missing required secret/env: ${name}`);
  }
  return v.trim();
}

// ─── OAuth2 access token via service-account JWT ──────────────────────────────
async function getAccessToken(): Promise<string> {
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  const rawKey = requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);

  const jwtHeader = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const jwtPayload = b64url(
    JSON.stringify({
      iss: clientEmail,
      sub: clientEmail,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    }),
  );

  const signingInput = `${jwtHeader}.${jwtPayload}`;

  const pemBody = rawKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${b64url(null, new Uint8Array(sig))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`OAuth2 exchange failed: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

// Base64url encode — accepts a string or raw bytes
function b64url(str: string | null, bytes?: Uint8Array): string {
  let base64: string;
  if (bytes) {
    base64 = btoa(String.fromCharCode(...bytes));
  } else {
    base64 = btoa(unescape(encodeURIComponent(str as string)));
  }
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// ─── Send one FCM message ─────────────────────────────────────────────────────
async function sendOne(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<boolean> {
  const message = {
    message: {
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)]),
      ),
      webpush: {
        notification: {
          title,
          body,
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          requireInteraction: false,
        },
        fcm_options: {
          link: data.link || "/",
        },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.warn(`FCM token ${token.slice(0, 20)}… failed:`, err);
  }
  return res.ok;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const projectId =
      Deno.env.get("FCM_PROJECT_ID")?.trim() ||
      Deno.env.get("FIREBASE_PROJECT_ID")?.trim() ||
      "";
    if (!projectId) {
      throw new Error(
        "Set FCM_PROJECT_ID or FIREBASE_PROJECT_ID as a Supabase function secret",
      );
    }

    const { tokens, title, body, data = {} } = await req.json();

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, total: 0 }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();

    const results = await Promise.allSettled(
      tokens.map((t: string) =>
        sendOne(accessToken, projectId, t, title, body, data),
      ),
    );

    const sent = results.filter((r) =>
      r.status === "fulfilled" &&
      (r as PromiseFulfilledResult<boolean>).value
    ).length;
    const failed = tokens.length - sent;

    return new Response(JSON.stringify({ sent, failed, total: tokens.length }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-push error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
