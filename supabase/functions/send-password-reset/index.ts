import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

/**
 * Legacy proxy — forwards to the HR Netlify email function which uses the
 * same SMTP as all other HR emails and writes to email_logs.
 *
 * Prefer calling sendPasswordResetEmail() from the client directly.
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const { email, employeeName } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const hrAppUrl = Deno.env.get('HR_APP_URL') || 'https://hr.julinemart.com';
    const res = await fetch(`${hrAppUrl}/.netlify/functions/email/password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ email, employeeName }),
    });

    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('[send-password-reset] proxy error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
