import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { sessions } from '../lib/schema';

const sessionsRoute = new Hono<{ Bindings: { DB: D1Database } }>();

/** List sessions for current user (requires auth via requireSession upstream, but also standalone). */
sessionsRoute.get('/', async (c) => {
  // For now, placeholder — real impl would use requireSession and filter by userId
  const db = getDb(c.env);
  const all = await db.select().from(sessions).all();
  return c.json({ ok: true, sessions: all.slice(0, 20) });
});

export default sessionsRoute;
