import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { randomUUID } from '../lib/crypto';
import { getDb } from '../lib/db';
import { hashPassword, verifyPassword } from '../lib/password';
import { developers } from '../lib/schema';

const developersRoute = new Hono<{ Bindings: { DB: D1Database } }>();

/** Register a developer (CLI `slyxup login --new`). */
developersRoute.post('/register', async (c) => {
  const body = await c.req
    .json<{ email?: string; password?: string; name?: string }>()
    .catch(() => ({ email: undefined, password: undefined, name: undefined }));
  if (!body.email || !body.password)
    return c.json({ ok: false, error: 'email and password required' }, 400);
  const db = getDb(c.env);
  const existing = await db
    .select()
    .from(developers)
    .where(eq(developers.email, body.email))
    .get();
  if (existing) return c.json({ ok: true, developerId: existing.id });
  const now = new Date();
  const id = randomUUID();
  await db.insert(developers).values({
    id,
    email: body.email,
    emailVerified: false,
    passwordHash: await hashPassword(body.password),
    name: body.name ?? null,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  });
  return c.json({ ok: true, developerId: id }, 201);
});

/**
 * Resolve a developerId by email+password (CLI login).
 * Validates credentials then returns the id used as Bearer token.
 */
developersRoute.post('/lookup', async (c) => {
  const body = await c.req
    .json<{ email?: string; password?: string }>()
    .catch(() => ({ email: undefined, password: undefined, name: undefined }));
  if (!body.email || !body.password)
    return c.json({ ok: false, error: 'email and password required' }, 400);
  const db = getDb(c.env);
  const dev = await db
    .select()
    .from(developers)
    .where(eq(developers.email, body.email))
    .get();
  // Silent success with no id when account missing — do not reveal existence
  if (!dev || !dev.passwordHash) return c.json({ ok: true, developerId: null });
  const ok = await verifyPassword(body.password, dev.passwordHash);
  if (!ok) return c.json({ ok: false, error: 'Invalid credentials' }, 401);
  return c.json({ ok: true, developerId: dev.id });
});

/** Current developer profile by Bearer id. */
developersRoute.get('/me', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer '))
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  const db = getDb(c.env);
  const dev = await db
    .select()
    .from(developers)
    .where(eq(developers.id, auth.slice(7).trim()))
    .get();
  if (!dev) return c.json({ ok: false, error: 'Unauthorized' }, 401);
  return c.json({
    ok: true,
    developer: { id: dev.id, email: dev.email, name: dev.name },
  });
});

export default developersRoute;
