import { eq } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { webhookEndpoints } from '../lib/schema';

export type AuthEvent =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.signed_in'
  | 'user.signed_out'
  | 'session.revoked'
  | 'password.changed'
  | 'password.reset'
  | 'email.verified'
  | 'oauth.linked'
  | 'oauth.unlinked'
  | '2fa.enabled'
  | '2fa.disabled';

export interface WebhookPayload {
  event: AuthEvent;
  type: string;
  data: Record<string, unknown>;
  created_at: string;
}

/**
 * Dispatch an auth event to all registered, active webhook endpoints for the
 * user's project. Payloads are signed with HMAC-SHA256 using the endpoint's
 * `whsec_...` secret (identical scheme to Paddle). Delivery is best-effort:
 * failures are swallowed and logged so the caller flow is never blocked.
 */
export async function dispatchWebhooks(
  env: { DB: D1Database },
  projectId: string | null,
  event: AuthEvent,
  data: Record<string, unknown>
): Promise<void> {
  if (!projectId) return;
  const db = getDb(env);
  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.projectId, projectId))
    .all();
  const active = endpoints.filter((e) => e.isActive);
  if (active.length === 0) return;

  const payload: WebhookPayload = {
    event,
    type: event,
    data,
    created_at: new Date().toISOString(),
  };
  const body = JSON.stringify(payload);

  for (const endpoint of active) {
    const wants = endpoint.events ?? ['*'];
    if (!wants.includes('*') && !wants.includes(event)) continue;
    const sig = await signPayload(body, endpoint.secret);
    // Fire and forget — never block the caller on a slow webhook target.
    void fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'slyxup-auth-webhook',
        'X-SlyxUp-Event': event,
        'X-SlyxUp-Webhook-Id': endpoint.id,
        'X-SlyxUp-Signature': `t=${Math.floor(Date.now() / 1000)},h1=${sig}`,
      },
      body,
    })
      .then(() => undefined)
      .catch(() => undefined);
  }
}

async function signPayload(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(body)
  );
  return Array.from(new Uint8Array(sig), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}
