import { and, eq, ne } from 'drizzle-orm';
import { getDb } from '../lib/db';
import { oauthAccounts, users } from '../lib/schema';

export interface ConnectedAccount {
  id: string;
  provider: 'google' | 'github';
  providerAccountId: string;
  createdAt: string;
}

/** List a user's linked OAuth accounts (providers only — never surface tokens). */
export async function listConnectedAccounts(
  env: { DB: D1Database },
  userId: string
): Promise<ConnectedAccount[]> {
  const db = getDb(env);
  const rows = await db
    .select({
      id: oauthAccounts.id,
      provider: oauthAccounts.provider,
      providerAccountId: oauthAccounts.providerAccountId,
      createdAt: oauthAccounts.createdAt,
    })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId))
    .all();
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    providerAccountId: r.providerAccountId,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

/**
 * Unlink an OAuth account from the user. Protection: a user with a password
 * can unlink freely; a password-less user cannot unlink their last remaining
 * login method (unless they set a password first).
 */
export async function unlinkAccount(
  env: { DB: D1Database },
  userId: string,
  accountId: string,
  provider: string
): Promise<void> {
  const db = getDb(env);
  const account = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(eq(oauthAccounts.id, accountId), eq(oauthAccounts.userId, userId))
    )
    .get();
  if (!account) throw new Error('Account not found');
  if (account.provider !== provider) throw new Error('Provider mismatch');

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  const hasPassword = !!user?.passwordHash;
  if (!hasPassword) {
    // Count remaining login methods for this user.
    const remaining = await db
      .select({ id: oauthAccounts.id })
      .from(oauthAccounts)
      .where(
        and(eq(oauthAccounts.userId, userId), ne(oauthAccounts.id, accountId))
      )
      .all();
    if (remaining.length === 0) {
      throw new Error(
        'Cannot unlink: you need at least one sign-in method. Set a password first.'
      );
    }
  }

  await db.delete(oauthAccounts).where(eq(oauthAccounts.id, accountId));
}
