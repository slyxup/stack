import { and, desc, eq } from 'drizzle-orm';
import { sha256Hex } from '../lib/crypto';
import { getDb } from '../lib/db';
import { recoveryCodes, users } from '../lib/schema';
import {
  generateTOTPSecret,
  totpProvisioningUri,
  verifyTOTP,
} from '../lib/totp';

export interface TOTPSetup {
  secret: string;
  provisioningUri: string;
  accountName: string;
}

/** Start 2FA setup: generate a secret + provisioning URI (not yet saved). */
export async function startTOTPSetup(
  env: { DB: D1Database },
  userId: string
): Promise<TOTPSetup> {
  const db = getDb(env);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new Error('User not found');
  const accountName = user.email || userId;
  const secret = generateTOTPSecret();
  return {
    secret,
    provisioningUri: totpProvisioningUri({ secretBase32: secret, accountName }),
    accountName,
  };
}

/**
 * Confirm & enable 2FA after the user scanned the QR / entered the secret.
 * Verifies the current code, persists the secret, and emits fresh recovery codes.
 */
export async function enableTOTP(
  env: { DB: D1Database },
  userId: string,
  secret: string,
  code: string
): Promise<{ recoveryCodes: string[] }> {
  const db = getDb(env);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new Error('User not found');

  const ok = await verifyTOTP(secret, code);
  if (!ok) throw new Error('Invalid authenticator code');

  await db
    .update(users)
    .set({
      totpSecret: secret,
      twoFactorEnabled: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Generate 10 single-use recovery codes (hashed at rest).
  const codes: string[] = [];
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const codeValue = generateRecoveryCode();
    codes.push(codeValue);
    await db.insert(recoveryCodes).values({
      id: crypto.randomUUID(),
      userId,
      codeHash: await hashCode(codeValue),
      used: false,
      createdAt: now,
    });
  }
  return { recoveryCodes: codes };
}

/** Verify the currently-enabled TOTP for a user (e.g. before disabling). */
export async function verifyCurrentTOTP(
  env: { DB: D1Database },
  userId: string,
  code: string
): Promise<boolean> {
  const db = getDb(env);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || !user.totpSecret) return false;
  return verifyTOTP(user.totpSecret, code);
}

/** Disable 2FA (requires a valid current code). Removes secret + recovery codes. */
export async function disableTOTP(
  env: { DB: D1Database },
  userId: string,
  code: string
): Promise<void> {
  const db = getDb(env);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new Error('User not found');
  if (!user.twoFactorEnabled) throw new Error('2FA is not enabled');

  const ok = code ? await verifyTOTP(user.totpSecret ?? '', code) : false;
  if (!ok) throw new Error('Invalid authenticator code');

  await db
    .update(users)
    .set({
      totpSecret: null,
      twoFactorEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
}

/** List remaining (unused) recovery codes, masked. */
export async function listRecoveryCodes(
  env: { DB: D1Database },
  userId: string
): Promise<number> {
  const db = getDb(env);
  const rows = await db
    .select({ id: recoveryCodes.id })
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.userId, userId), eq(recoveryCodes.used, false)))
    .all();
  return rows.length;
}

function generateRecoveryCode(): string {
  // Format: XXXX-XXXX-XXXX (12 chars, 16-bit groups).
  const block = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(2)), (b) =>
      b.toString(16).padStart(2, '0')
    ).join('');
  return `${block()}-${block()}-${block()}`.toUpperCase();
}

async function hashCode(code: string): Promise<string> {
  return sha256Hex(code);
}
