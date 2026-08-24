import { createMiddleware } from 'hono/factory';
import { getSessionToken } from '../lib/cookies';
import { getSession } from '../services/auth.service';

type Env = {
  Bindings: { DB: D1Database; KV: KVNamespace };
  Variables: { userId: string; sessionToken: string };
};

export const requireSession = createMiddleware<Env>(async (c, next) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const data = await getSession(c.env, token);
  if (!data) return c.json({ ok: false, error: 'Invalid session' }, 401);
  c.set('userId', data.user.id);
  c.set('sessionToken', token);
  await next();
});
