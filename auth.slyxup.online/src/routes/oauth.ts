import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { setSessionCookie } from '../lib/cookies';
import { randomToken, randomUUID } from '../lib/crypto';
import { getDb } from '../lib/db';
import {
  oauthAccounts,
  sessions,
  users,
  verificationTokens,
} from '../lib/schema';
import { buildAuthUrl, newState } from '../services/oauth.service';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  APP_URL: string;
  HOSTED_AUTH_URL: string;
};

const oauth = new Hono<{ Bindings: Bindings }>();

interface Profile {
  providerAccountId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
}

/** Exchange authorization code for tokens + fetch profile. */
async function exchangeAndProfile(
  provider: 'google' | 'github',
  env: Bindings,
  code: string,
  redirectUri: string
): Promise<Profile> {
  if (provider === 'google') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID ?? '',
        client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const token = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      error_description?: string;
    };
    if (!tokenRes.ok || !token.access_token)
      throw new Error(
        token.error_description ?? 'Google token exchange failed'
      );
    const pRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!pRes.ok) throw new Error('Google profile fetch failed');
    const p = (await pRes.json()) as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
    };
    if (!p.email) throw new Error('Google account has no email');
    return {
      providerAccountId: p.sub,
      email: p.email.toLowerCase(),
      name: p.name ?? null,
      avatarUrl: p.picture ?? null,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
    };
  }

  // GitHub
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      code,
      client_id: env.GITHUB_CLIENT_ID ?? '',
      client_secret: env.GITHUB_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri,
    }),
  });
  const token = (await tokenRes.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !token.access_token)
    throw new Error(token.error_description ?? 'GitHub token exchange failed');

  const headers = {
    Authorization: `Bearer ${token.access_token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'slyxup-auth',
  };
  const uRes = await fetch('https://api.github.com/user', { headers });
  if (!uRes.ok) throw new Error('GitHub profile fetch failed');
  const u = (await uRes.json()) as {
    id: number;
    login: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string;
  };

  let email = u.email?.toLowerCase() ?? null;
  if (!email) {
    // Private emails — need the emails endpoint
    const eRes = await fetch('https://api.github.com/user/emails', { headers });
    if (eRes.ok) {
      const list = (await eRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      email =
        list.find((e) => e.primary && e.verified)?.email ??
        list.find((e) => e.verified)?.email ??
        null;
    }
  }
  if (!email) throw new Error('GitHub account has no verified email');

  return {
    providerAccountId: String(u.id),
    email,
    name: u.name ?? u.login,
    avatarUrl: u.avatar_url ?? null,
    accessToken: token.access_token,
  };
}

function safeRedirect(url: string | undefined, fallback: string): string {
  if (!url) return fallback;
  try {
    const u = new URL(url);
    const allowedHosts = new Set(['localhost', '127.0.0.1']);
    if (
      allowedHosts.has(u.hostname) ||
      u.hostname.endsWith('.pages.dev') ||
      u.hostname.endsWith('.workers.dev')
    )
      return url;
  } catch {
    /* fallthrough */
  }
  return fallback;
}

/** Start OAuth — redirects to provider */
oauth.get('/:provider', async (c) => {
  const provider = c.req.param('provider') as 'google' | 'github';
  if (!['google', 'github'].includes(provider))
    return c.json({ ok: false, error: 'Unsupported provider' }, 400);
  const redirectUrl = c.req.query('redirect_url');
  const stateObj = newState(provider, redirectUrl);
  await c.env.KV.put(
    `oauth_state:${stateObj.state}`,
    JSON.stringify(stateObj),
    {
      expirationTtl: 600,
    }
  );
  const base = c.env.HOSTED_AUTH_URL ?? c.env.APP_URL;
  const redirectUri = `${base}/v1/oauth/callback/${provider}`;
  const url = buildAuthUrl(provider, c.env, stateObj.state, redirectUri);
  return c.redirect(url);
});

/** OAuth callback — validates state, exchanges code, upserts user, creates session */
oauth.get('/callback/:provider', async (c) => {
  const provider = c.req.param('provider') as 'google' | 'github';
  const code = c.req.query('code');
  const state = c.req.query('state');
  const base = c.env.HOSTED_AUTH_URL ?? c.env.APP_URL;
  const redirectUri = `${base}/v1/oauth/callback/${provider}`;

  if (!code || !state) return c.redirect(`${base}/sign-in?error=missing_code`);
  const raw = await c.env.KV.get(`oauth_state:${state}`);
  if (!raw) return c.redirect(`${base}/sign-in?error=invalid_state`);
  await c.env.KV.delete(`oauth_state:${state}`);
  const stateObj = JSON.parse(raw) as {
    provider: string;
    redirectUrl?: string;
  };
  if (stateObj.provider !== provider)
    return c.redirect(`${base}/sign-in?error=state_mismatch`);

  try {
    const profile = await exchangeAndProfile(
      provider,
      c.env,
      code,
      redirectUri
    );

    const db = getDb(c.env);
    const now = new Date();

    // Link by oauth_accounts first, then by email
    const linked = await db
      .select()
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, profile.providerAccountId)
        )
      )
      .get();

    let user = linked
      ? await db.select().from(users).where(eq(users.id, linked.userId)).get()
      : await db
          .select()
          .from(users)
          .where(eq(users.email, profile.email))
          .get();

    if (!user) {
      // Bootstrap: first user ever becomes admin (OAuth counts too)
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      const id = randomUUID();
      const [first, last] = (profile.name ?? '').split(' ');
      await db.insert(users).values({
        id,
        email: profile.email,
        emailVerified: true, // OAuth providers verify email
        firstName: first || null,
        lastName: last || null,
        avatarUrl: profile.avatarUrl ?? null,
        role: count === 0 ? 'admin' : 'user',
        createdAt: now,
        updatedAt: now,
      });
      const inserted = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .get();
      if (!inserted) throw new Error('User creation failed');
      user = inserted;
    } else {
      // Sync profile + ensure verified (provider-verified)
      await db
        .update(users)
        .set({
          emailVerified: true,
          avatarUrl: user.avatarUrl ?? profile.avatarUrl ?? null,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
      if (user.blocked) return c.redirect(`${base}/sign-in?error=blocked`);
    }

    if (!linked) {
      await db.insert(oauthAccounts).values({
        id: randomUUID(),
        userId: user.id,
        provider,
        providerAccountId: profile.providerAccountId,
        accessToken: profile.accessToken ?? null,
        refreshToken: profile.refreshToken ?? null,
        scope: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create session
    const sessionToken = randomToken(32);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await db.insert(sessions).values({
      id: randomUUID(),
      userId: user.id,
      token: sessionToken,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    setSessionCookie(c, sessionToken, expiresAt);

    // Consume any pending verification tokens for this email
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.email, user.email));

    const dest = safeRedirect(stateObj.redirectUrl, c.env.APP_URL);
    const joiner = dest.includes('?') ? '&' : '?';
    return c.redirect(`${dest}${joiner}auth=success`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OAuth failed';
    console.error(JSON.stringify({ evt: 'oauth_error', provider, msg }));
    const joiner = base.includes('?') ? '&' : '?';
    return c.redirect(`${base}/sign-in?error=${encodeURIComponent(msg)}`);
  }
});

export default oauth;
