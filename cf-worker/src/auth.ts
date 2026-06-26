import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

const PASSWORD = 'admin888';
const AUTH_TOKEN = 'inv_7xK9mP2qR5vL8nB3wJ6fD4hT1cY0a';

function generateToken(): string {
  const ts = Date.now().toString(36);
  return `${AUTH_TOKEN}.${ts}`;
}

function verifyToken(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 2 && parts[0] === AUTH_TOKEN;
}

export async function authMiddleware(c: Context, next: Next) {
  // Check cookie first, then Authorization header
  const cookieToken = getCookie(c, 'auth_token') || '';
  const authHeader = c.req.header('Authorization') || '';
  const headerToken = authHeader.replace('Bearer ', '');
  const token = cookieToken || headerToken;

  if (verifyToken(token)) return next();
  return c.json({ error: 'Unauthorized' }, 401);
}

export async function loginHandler(c: Context) {
  const { password } = await c.req.json().catch(() => ({}));
  if (password === PASSWORD) {
    const token = generateToken();
    setCookie(c, 'auth_token', token, {
      httpOnly: false,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: 86400, // 24h
    });
    return c.json({ token });
  }
  return c.json({ error: 'Invalid password' }, 401);
}
