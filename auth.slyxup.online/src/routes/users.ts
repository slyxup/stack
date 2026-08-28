import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../lib/db';
import { sanitizeUser } from '../lib/sanitize';
import { users as usersTable } from '../lib/schema';
import { requireSession } from '../middleware/auth';
import {
  changePasswordSchema,
  disableTOTPSchema,
  enableTOTPSchema,
  updateUserSchema,
} from '../schemas/users';
import {
  listConnectedAccounts,
  unlinkAccount,
} from '../services/accounts.service';
import {
  disableTOTP,
  enableTOTP,
  startTOTPSetup,
  verifyCurrentTOTP,
} from '../services/twofa.service';
import {
  changePassword,
  deleteUser,
  updateUser,
} from '../services/user.service';
import { dispatchWebhooks } from '../services/webhook.service';

const users = new Hono<{
  Bindings: { DB: D1Database; KV: KVNamespace };
  Variables: { userId: string };
}>();

users.use('*', requireSession);

users.get('/', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .get();
  if (!user) return c.json({ ok: false, error: 'User not found' }, 404);
  return c.json({ ok: true, user: sanitizeUser(user) });
});

users.patch('/', zValidator('json', updateUserSchema), async (c) => {
  const input = c.req.valid('json');
  try {
    const updated = await updateUser(c.env, c.get('userId'), input);
    if (updated) {
      void dispatchWebhooks(c.env, updated.projectId, 'user.updated', {
        id: updated.id,
        email: updated.email,
      });
    }
    return c.json({ ok: true, user: updated ? sanitizeUser(updated) : null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 400);
  }
});

// Change password (email/password accounts only)
users.post('/password', zValidator('json', changePasswordSchema), async (c) => {
  const { currentPassword, newPassword } = c.req.valid('json');
  try {
    await changePassword(c.env, c.get('userId'), currentPassword, newPassword);
    return c.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 400);
  }
});

users.delete('/', async (c) => {
  const userId = c.get('userId');
  const db = getDb(c.env);
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .get();
  await deleteUser(c.env, userId);
  if (user) {
    void dispatchWebhooks(c.env, user.projectId, 'user.deleted', {
      id: user.id,
      email: user.email,
    });
  }
  return c.json({ ok: true });
});

// ── Two-factor authentication (TOTP / authenticator) ──

// Start setup: return a fresh secret + provisioning URI (nothing persisted yet).
users.get('/2fa/setup', async (c) => {
  const setup = await startTOTPSetup(c.env, c.get('userId'));
  return c.json({ ok: true, ...setup });
});

// Verify a TOTP code against the user's current secret (used by UI to confirm state).
users.get('/2fa/status', async (c) => {
  const db = getDb(c.env);
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, c.get('userId')))
    .get();
  return c.json({ ok: true, enabled: !!user?.twoFactorEnabled });
});

// Confirm & enable 2FA with the code from the authenticator app.
users.post('/2fa/enable', zValidator('json', enableTOTPSchema), async (c) => {
  const { secret, code } = c.req.valid('json');
  try {
    const result = await enableTOTP(c.env, c.get('userId'), secret, code);
    const db = getDb(c.env);
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, c.get('userId')))
      .get();
    if (user) {
      void dispatchWebhooks(c.env, user.projectId, '2fa.enabled', {
        id: user.id,
        email: user.email,
      });
    }
    return c.json({ ok: true, recoveryCodes: result.recoveryCodes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 400);
  }
});

// Verify a code (no state change) — e.g. CLI or pre-check before disable.
users.post(
  '/2fa/verify',
  zValidator('json', enableTOTPSchema.pick({ code: true })),
  async (c) => {
    const { code } = c.req.valid('json');
    const ok = await verifyCurrentTOTP(c.env, c.get('userId'), code);
    return c.json({ ok, valid: ok });
  }
);

// Disable 2FA (requires a valid current code).
users.post('/2fa/disable', zValidator('json', disableTOTPSchema), async (c) => {
  const { code } = c.req.valid('json');
  try {
    await disableTOTP(c.env, c.get('userId'), code);
    const db = getDb(c.env);
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, c.get('userId')))
      .get();
    if (user) {
      void dispatchWebhooks(c.env, user.projectId, '2fa.disabled', {
        id: user.id,
        email: user.email,
      });
    }
    return c.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 400);
  }
});

// ── Connected accounts (linked OAuth providers) ──

// List OAuth accounts linked to this user.
users.get('/accounts', async (c) => {
  const accounts = await listConnectedAccounts(c.env, c.get('userId'));
  return c.json({ ok: true, accounts });
});

// Unlink an OAuth account (requires the user to retain at least one method).
users.delete('/accounts/:id', async (c) => {
  const id = c.req.param('id');
  const provider = c.req.query('provider') as 'google' | 'github' | undefined;
  if (!provider)
    return c.json({ ok: false, error: 'provider query required' }, 400);
  try {
    await unlinkAccount(c.env, c.get('userId'), id, provider);
    const db = getDb(c.env);
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, c.get('userId')))
      .get();
    if (user) {
      void dispatchWebhooks(c.env, user.projectId, 'oauth.unlinked', {
        id: user.id,
        provider,
      });
    }
    return c.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 400);
  }
});

export default users;
