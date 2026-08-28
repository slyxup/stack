import { and, asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { plans } from '../lib/schema';
import type { Env } from '../middleware/auth';

// ── Resolve publishable key → projectId via AUTH_DB, with HTTP fallback ──
async function resolveProjectFromKey(
  authDb: D1Database,
  publishableKey: string,
  authUrl?: string
): Promise<string | null> {
  try {
    const enc = new TextEncoder();
    const keyData = enc.encode(publishableKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    const hashedKey = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const row = await authDb
      .prepare(
        'SELECT project_id FROM api_keys WHERE hashed_key = ? AND type = ? LIMIT 1'
      )
      .bind(hashedKey, 'publishable')
      .first<{ project_id: string }>();
    if (row?.project_id) return row.project_id;
  } catch {
    // AUTH_DB may not have auth tables in local dev — fall through to HTTP
  }

  // Fallback: query auth Worker over HTTP (works for local dev with separate D1 instances)
  if (authUrl) {
    try {
      const res = await fetch(
        `${authUrl}/v1/key/resolve?key=${encodeURIComponent(publishableKey)}`
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        projectId?: string;
      };
      if (res.ok && data.ok && data.projectId) return data.projectId;
    } catch {
      // auth Worker not reachable
    }
  }
  return null;
}

// ── Public: list active plans for a project (no auth required).
// Plans are public-facing product info; requiring auth here would break
// pre-login plan selection in the SDK checkout flow. ──
const app = new Hono<{ Bindings: Env['Bindings'] }>();

app.get('/', async (c) => {
  let projectId = c.req.query('projectId');

  // If no projectId, try to resolve from X-Publishable-Key header
  if (!projectId || projectId.trim() === '') {
    const pubKey = c.req.header('X-Publishable-Key');
    if (pubKey) {
      projectId =
        (await resolveProjectFromKey(c.env.AUTH_DB, pubKey, c.env.AUTH_URL)) ??
        undefined;
    }
  }

  if (!projectId || projectId.trim() === '') {
    // In test/local (localhost or X-Environment: test), return empty list instead of 400
    // so the UI doesn't show an error when projectId is not yet available (e.g. during loading)
    const origin = c.req.header('Origin') ?? '';
    const isTest =
      c.req.header('X-Environment') === 'test' ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');
    if (isTest) {
      return c.json({ ok: true, plans: [] });
    }
    return c.json({ ok: false, error: 'projectId required' }, 400);
  }

  const db = getDb(c.env);
  const list = await db
    .select()
    .from(plans)
    .where(and(eq(plans.projectId, projectId), eq(plans.isActive, true)))
    .orderBy(asc(plans.sortOrder))
    .all();

  return c.json({
    ok: true,
    plans: list.map((p) => ({
      id: p.id,
      name: p.name,
      paddlePriceId: p.paddlePriceId,
      amount: p.amount,
      currency: p.currency,
      interval: p.interval,
      trialDays: p.trialDays > 0 ? p.trialDays : null,
      features: p.features ?? [],
      isPopular: p.isPopular,
    })),
  });
});

export default app;
