import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

const PASSWORD = 'admin888';
const AUTH_TOKEN = 'inv_7xK9mP2qR5vL8nB3wJ6fD4hT1cY0a';
const SECRET = 'invoice-secret-2026';

// Generate time-limited token: base64(payload).hmac_sig
async function signPayload(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${btoa(payload)}.${sigB64}`;
}

async function verifyPayload(token: string): Promise<{ exp?: number } | null> {
  try {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sig = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(atob(payloadB64)));
    if (!valid) return null;
    return JSON.parse(atob(payloadB64));
  } catch { return null; }
}

function verifyTokenLegacy(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 2 && parts[0] === AUTH_TOKEN;
}

async function verifyToken(token: string): Promise<boolean> {
  // Try new signed token first
  const payload = await verifyPayload(token);
  if (payload) {
    // Check expiry
    if (payload.exp && payload.exp < Date.now()) return false;
    return true;
  }
  // Fall back to legacy simple token
  return verifyTokenLegacy(token);
}

export async function authMiddleware(c: Context, next: Next) {
  // Check cookie first, then Authorization header
  const cookieToken = getCookie(c, 'auth_token') || '';
  const authHeader = c.req.header('Authorization') || '';
  const headerToken = authHeader.replace('Bearer ', '');
  const token = cookieToken || headerToken;

  if (await verifyToken(token)) return next();
  return c.json({ error: 'Unauthorized' }, 401);
}

export async function loginHandler(c: Context) {
  const { password } = await c.req.json().catch(() => ({}));
  if (password === PASSWORD) {
    const token = AUTH_TOKEN + '.' + Date.now().toString(36);
    setCookie(c, 'auth_token', token, {
      httpOnly: false, secure: true, sameSite: 'Strict', path: '/', maxAge: 86400,
    });
    return c.json({ token });
  }
  return c.json({ error: 'Invalid password' }, 401);
}

// Generate time-limited API token (for AI agents / skills)
export async function tokenGenHandler(c: Context) {
  const { hours } = await c.req.json().catch(() => ({}));
  const duration = Math.min(Number(hours) || 24, 720); // max 30 days
  const exp = Date.now() + duration * 3600 * 1000;
  const token = await signPayload(JSON.stringify({ exp, gen: Date.now() }));
  return c.json({ token, expiresIn: `${duration}h`, expiresAt: new Date(exp).toISOString() });
}
