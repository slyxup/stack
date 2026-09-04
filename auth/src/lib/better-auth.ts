import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, twoFactor } from 'better-auth/plugins';
import { getDb } from './db';

// Better-auth for Cloudflare Workers + D1 (lightweight, Argon2id, audited)
// Keep existing custom auth for project-scoped users; better-auth handles platform owner + sessions securely.
// This replaces the homegrown session/totp logic with audited plugins, but keeps our D1 schema.

export function createBetterAuth(env: {
  DB: D1Database;
  KV: KVNamespace;
  BETTER_AUTH_SECRET?: string;
  APP_URL?: string;
}) {
  const db = getDb(env as any);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      // Use existing tables where possible, fallback to better-auth defaults
      schema: undefined, // let adapter create its own tables (better_auth_user etc.) alongside our `users`
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // we handle via our verificationTokens for now
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 7 * 24 * 60 * 60, // 7 days
      },
    },
    secret: env.BETTER_AUTH_SECRET || (env as any).SESSION_SECRET,
    baseURL: env.APP_URL || 'http://localhost:8787',
    plugins: [
      twoFactor({
        issuer: 'SlyxUp',
      }),
      admin(),
    ],
    advanced: {
      // use default id generation (crypto.randomUUID)
    },
  });
}
