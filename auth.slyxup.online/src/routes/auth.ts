import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  clearSessionCookie,
  getSessionToken,
  setSessionCookie,
} from '../lib/cookies';
import { signInSchema, signUpSchema } from '../schemas/auth';
import * as AuthService from '../services/auth.service';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  SESSION_SECRET: string;
  ENCRYPTION_KEY: string;
  APP_URL: string;
  CORS_ORIGINS: string;
};

const auth = new Hono<{ Bindings: Bindings }>();

auth.post('/sign-up', zValidator('json', signUpSchema), async (c) => {
  const input = c.req.valid('json');
  try {
    const { sessionToken, expiresAt, user } = await AuthService.signUp(
      c.env,
      input
    );
    setSessionCookie(c, sessionToken, expiresAt);
    return c.json({ ok: true, user }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 400);
  }
});

auth.post('/sign-in', zValidator('json', signInSchema), async (c) => {
  const input = c.req.valid('json');
  try {
    const { user, sessionToken, expiresAt } = await AuthService.signIn(
      c.env,
      input
    );
    setSessionCookie(c, sessionToken, expiresAt);
    return c.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 401);
  }
});

auth.post('/sign-out', async (c) => {
  const token = getSessionToken(c);
  if (token) await AuthService.signOut(c.env, token);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

auth.get('/session', async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'No session' }, 401);
  const data = await AuthService.getSession(c.env, token);
  if (!data) return c.json({ ok: false, error: 'Invalid session' }, 401);
  return c.json({
    ok: true,
    user: { id: data.user.id, email: data.user.email },
    session: { id: data.session.id, expiresAt: data.session.expiresAt },
  });
});

auth.get('/user', async (c) => {
  const token = getSessionToken(c);
  if (!token) return c.json({ ok: false, error: 'No session' }, 401);
  const data = await AuthService.getSession(c.env, token);
  if (!data) return c.json({ ok: false, error: 'Invalid session' }, 401);
  return c.json({ ok: true, user: data.user });
});

export default auth;
