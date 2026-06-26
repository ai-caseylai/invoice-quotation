import type { Context, Next } from 'hono';

const PASSWORD = 'admin888';
const AUTH_TOKEN = 'inv_7xK9mP2qR5vL8nB3wJ6fD4hT1cY0a';

function generateToken(): string {
  // Simple token: fixed prefix + timestamp signature
  const ts = Date.now().toString(36);
  return `${AUTH_TOKEN}.${ts}`;
}

function verifyToken(token: string): boolean {
  // Token format: inv_7xK9...aY0a.timestamp
  const parts = token.split('.');
  return parts.length === 2 && parts[0] === AUTH_TOKEN;
}

export async function authMiddleware(c: Context, next: Next) {
  const auth = c.req.header('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (verifyToken(token)) return next();
  return c.json({ error: 'Unauthorized' }, 401);
}

export async function loginHandler(c: Context) {
  const { password } = await c.req.json().catch(() => ({}));
  if (password === PASSWORD) {
    return c.json({ token: generateToken() });
  }
  return c.json({ error: 'Invalid password' }, 401);
}
