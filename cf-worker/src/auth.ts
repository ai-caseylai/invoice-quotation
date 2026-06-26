import type { Context, Next } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';

const PASSWORD = 'admin888';
const SECRET_KEY = 'invoice-secret-key-2026';

async function generateToken(): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(SECRET_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const payload = JSON.stringify({ exp: Date.now() + 24 * 60 * 60 * 1000, iat: Date.now() });
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${btoa(payload)}.${sigB64}`;
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const [payloadB64, sigB64] = token.split('.');
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(SECRET_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const payload = atob(payloadB64);
    const sig = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(payload));
    if (!valid) return false;
    const data = JSON.parse(payload);
    return data.exp > Date.now();
  } catch { return false; }
}

export async function authMiddleware(c: Context, next: Next) {
  const auth = c.req.header('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (await verifyToken(token)) return next();
  return c.json({ error: 'Unauthorized' }, 401);
}

export async function loginHandler(c: Context) {
  const { password } = await c.req.json().catch(() => ({}));
  if (password === PASSWORD) {
    const token = await generateToken();
    return c.json({ token });
  }
  return c.json({ error: 'Invalid password' }, 401);
}
