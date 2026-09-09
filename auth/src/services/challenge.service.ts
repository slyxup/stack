import { and, eq, gt } from 'drizzle-orm';
import { randomToken, sha256Hex } from '../lib/crypto';
import { getDb } from '../lib/db';
import { authChallenges } from '../lib/schema';

type Purpose = typeof authChallenges.$inferSelect.purpose;

export async function issueChallenge(
  env: { DB: D1Database },
  purpose: Purpose,
  payload: Record<string, unknown>,
  ttlSeconds: number
) {
  const token = randomToken(32);
  await getDb(env)
    .insert(authChallenges)
    .values({
      tokenHash: await sha256Hex(token),
      purpose,
      payload,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    });
  return token;
}

export async function readChallenge(
  env: { DB: D1Database },
  purpose: Purpose,
  token: string
) {
  return getDb(env)
    .select()
    .from(authChallenges)
    .where(
      and(
        eq(authChallenges.tokenHash, await sha256Hex(token)),
        eq(authChallenges.purpose, purpose),
        gt(authChallenges.expiresAt, new Date())
      )
    )
    .get();
}

/** DELETE RETURNING is one D1 operation: at most one concurrent caller wins. */
export async function consumeChallenge(
  env: { DB: D1Database },
  purpose: Purpose,
  token: string
) {
  const rows = await getDb(env)
    .delete(authChallenges)
    .where(
      and(
        eq(authChallenges.tokenHash, await sha256Hex(token)),
        eq(authChallenges.purpose, purpose),
        gt(authChallenges.expiresAt, new Date())
      )
    )
    .returning();
  return rows[0];
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
