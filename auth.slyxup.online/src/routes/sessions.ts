import { Hono } from 'hono';
import { requireSession } from '../middleware/auth';
import {
  listSessions,
  revokeOtherSessions,
  revokeSession,
} from '../services/user.service';

type Env = {
  Bindings: { DB: D1Database; KV: KVNamespace };
  Variables: { userId: string; sessionToken: string };
};

const sessionsRoute = new Hono<Env>();

sessionsRoute.use('*', requireSession);

/** List the current user's active sessions (current one flagged). */
sessionsRoute.get('/', async (c) => {
  const items = await listSessions(
    c.env,
    c.get('userId'),
    c.get('sessionToken')
  );
  return c.json({
    ok: true,
    sessions: items.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      isCurrent: s.isCurrent,
    })),
  });
});

/** Revoke all other sessions ("sign out everywhere else"). */
sessionsRoute.delete('/', async (c) => {
  const result = await revokeOtherSessions(
    c.env,
    c.get('userId'),
    c.get('sessionToken')
  );
  return c.json(result);
});

/** Revoke one session by id — ownership enforced in service. */
sessionsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    return c.json(await revokeSession(c.env, c.get('userId'), id));
  } catch {
    return c.json({ ok: false, error: 'Failed to revoke' }, 400);
  }
});

export default sessionsRoute;
