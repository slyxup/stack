import { and, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import { setSessionCookie } from '../lib/cookies';
import { randomToken, randomUUID } from '../lib/crypto';
import { getDb } from '../lib/db';
import {
  oauthAccounts,
  projectDomains,
  projects,
  sessions,
  users,
} from '../lib/schema';
import {
  consumeChallenge,
  issueChallenge,
  pkceChallenge,
  readChallenge,
} from '../services/challenge.service';
import { buildAuthUrl, newState } from '../services/oauth.service';
import { verifyApiKey } from '../services/project.service';
import { dispatchWebhooks } from '../services/webhook.service';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  APP_URL: string;
  HOSTED_AUTH_URL: string;
  ALLOWED_REDIRECT_ORIGINS?: string;
  BOOTSTRAP_ADMIN_EMAIL?: string;
  BOOTSTRAP_SECRET?: string;
  INITIAL_ADMIN_EMAIL?: string;
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
  redirectUri: string,
  verifier: string
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
        code_verifier: verifier,
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
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    if (!p.email || p.email_verified !== true)
      throw new Error('Google account has no verified email');
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
      code_verifier: verifier,
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

  let email: string | null = null;
  {
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
    email: email.toLowerCase(),
    name: u.name ?? u.login,
    avatarUrl: u.avatar_url ?? null,
    accessToken: token.access_token,
  };
}

function safeRedirect(
  url: string | undefined,
  fallback: string,
  env?: { ALLOWED_REDIRECT_ORIGINS?: string }
): string {
  if (!url) return fallback;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return fallback;
    // Also allow any origin explicitly listed in ALLOWED_REDIRECT_ORIGINS
    const allowed = (env?.ALLOWED_REDIRECT_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowed.includes(u.origin) || u.origin === new URL(fallback).origin)
      return url;
    // Allow custom domains that are registered as live project domains (best effort via exact origin check)
    // Note: full dynamic check would need DB lookup; for now allow any https origin that matches allowed list pattern
    // If ALLOWED_REDIRECT_ORIGINS contains the origin's host as substring, allow
    // This fallback enables local dev with custom domains without redeploy
  } catch {
    /* fallthrough */
  }
  return fallback;
}

const exchangeInput = z.object({
  code: z.string().regex(/^[a-f0-9]{64}$/),
  verifier: z.string().min(43).max(128),
});

/** Exchange a one-time app code with the verifier retained by the initiating tab. */
oauth.post('/exchange', async (c) => {
  const input = exchangeInput.safeParse(await c.req.json().catch(() => null));
  if (!input.success)
    return c.json({ ok: false, error: 'Invalid exchange input' }, 400);
  const pending = await readChallenge(c.env, 'oauth_exchange', input.data.code);
  const payload = pending?.payload;
  if (
    !payload ||
    (await pkceChallenge(input.data.verifier)) !== payload.appChallenge
  )
    return c.json({ ok: false, error: 'Invalid OAuth exchange' }, 401);
  const key = c.req.header('X-Publishable-Key');
  const keyInfo = key ? await verifyApiKey(c.env, key) : null;
  if (
    payload.projectId &&
    (!keyInfo ||
      keyInfo.type !== 'publishable' ||
      keyInfo.projectId !== payload.projectId)
  )
    return c.json({ ok: false, error: 'Wrong project key' }, 403);
  const origin = c.req.header('Origin');
  if (origin && origin !== new URL(String(payload.redirectUrl)).origin)
    return c.json({ ok: false, error: 'Wrong exchange origin' }, 403);
  if (!(await consumeChallenge(c.env, 'oauth_exchange', input.data.code)))
    return c.json({ ok: false, error: 'OAuth code already used' }, 401);
  const db = getDb(c.env);
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, String(payload.userId)))
    .get();
  if (
    !user ||
    user.blocked ||
    !user.emailVerified ||
    user.mustChangePassword ||
    user.projectId !== payload.projectId
  )
    return c.json({ ok: false, error: 'Account unavailable' }, 403);
  c.header('Cache-Control', 'no-store');
  if (user.twoFactorEnabled) {
    const challengeToken = await issueChallenge(
      c.env,
      'two_factor',
      { userId: user.id, projectId: user.projectId, scope: user.projectId },
      300
    );
    return c.json({ ok: false, code: '2FA_REQUIRED', challengeToken }, 403);
  }
  const sessionToken = randomToken(32);
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db
    .insert(sessions)
    .values({
      userId: user.id,
      projectId: user.projectId,
      token: sessionToken,
      expiresAt,
    });
  if (!user.projectId) setSessionCookie(c, sessionToken, expiresAt);
  return c.json({
    ok: true,
    user: { id: user.id, email: user.email },
    sessionToken,
    expiresAt: expiresAt.toISOString(),
  });
});

/** Start OAuth — redirects to provider */
oauth.get('/:provider', async (c) => {
  const provider = c.req.param('provider') as 'google' | 'github';
  if (!['google', 'github'].includes(provider))
    return c.json({ ok: false, error: 'Unsupported provider' }, 400);
  const key =
    c.req.query('publishable_key') ?? c.req.header('X-Publishable-Key');
  const keyInfo = key ? await verifyApiKey(c.env, key) : null;
  if (key && (!keyInfo || keyInfo.type !== 'publishable'))
    return c.json({ ok: false, error: 'Invalid publishable key' }, 401);
  const projectId = keyInfo?.projectId ?? null;
  const appChallenge = c.req.query('code_challenge');
  if (appChallenge && !/^[A-Za-z0-9_-]{43}$/.test(appChallenge))
    return c.json({ ok: false, error: 'Invalid S256 challenge' }, 400);
  if (projectId && (!appChallenge || !/^[A-Za-z0-9_-]{43}$/.test(appChallenge)))
    return c.json(
      { ok: false, error: 'Project OAuth requires an S256 app challenge' },
      400
    );
  let redirectUrl = safeRedirect(
    c.req.query('redirect_url'),
    c.env.APP_URL,
    c.env
  );
  if (projectId) {
    const candidate = new URL(c.req.query('redirect_url') ?? c.env.APP_URL);
    const db = getDb(c.env);
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();
    const domain = await db
      .select()
      .from(projectDomains)
      .where(
        and(
          eq(projectDomains.projectId, projectId),
          eq(projectDomains.domain, candidate.hostname)
        )
      )
      .get();
    const local =
      project?.environment === 'test' &&
      ['localhost', '127.0.0.1'].includes(candidate.hostname) &&
      ['http:', 'https:'].includes(candidate.protocol);
    if (
      !local &&
      !(
        candidate.protocol === 'https:' &&
        (domain || project?.allowedDomains?.includes(candidate.hostname))
      )
    )
      return c.json(
        {
          ok: false,
          error: 'Register the OAuth return domain on this project',
        },
        403
      );
    redirectUrl = candidate.href;
  }
  const stateObj = newState(provider, redirectUrl);
  const browserBinding = randomToken(32);
  const state = await issueChallenge(
    c.env,
    'oauth_state',
    {
      ...stateObj,
      projectId,
      appChallenge: appChallenge ?? null,
      browserBinding,
    },
    600
  );
  const cookieName = `slyxup_oauth_${state.slice(0, 16)}`;
  setCookie(c, cookieName, browserBinding, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/v1/oauth',
    maxAge: 600,
  });
  const base = c.env.HOSTED_AUTH_URL ?? c.env.APP_URL;
  const redirectUri = `${base}/v1/oauth/callback/${provider}`;
  const url = buildAuthUrl(
    provider,
    c.env,
    state,
    redirectUri,
    await pkceChallenge(stateObj.pkceVerifier)
  );
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
  const pending = await readChallenge(c.env, 'oauth_state', state);
  if (!pending) return c.redirect(`${base}/sign-in?error=invalid_state`);
  const cookieName = `slyxup_oauth_${state.slice(0, 16)}`;
  if (getCookie(c, cookieName) !== pending.payload.browserBinding)
    return c.redirect(`${base}/sign-in?error=browser_mismatch`);
  if (!(await consumeChallenge(c.env, 'oauth_state', state)))
    return c.redirect(`${base}/sign-in?error=used_state`);
  deleteCookie(c, cookieName, { path: '/v1/oauth' });
  const stateObj = pending.payload as {
    provider: string;
    redirectUrl?: string;
    projectId: string | null;
    appChallenge: string | null;
    pkceVerifier: string;
  };
  if (stateObj.provider !== provider)
    return c.redirect(`${base}/sign-in?error=state_mismatch`);

  try {
    const profile = await exchangeAndProfile(
      provider,
      c.env,
      code,
      redirectUri,
      stateObj.pkceVerifier
    );

    const db = getDb(c.env);
    const now = new Date();

    // Link by oauth_accounts first, then by email
    const scope = stateObj.projectId
      ? eq(users.projectId, stateObj.projectId)
      : isNull(users.projectId);
    const linkedRow = await db
      .select({ account: oauthAccounts })
      .from(oauthAccounts)
      .innerJoin(users, eq(users.id, oauthAccounts.userId))
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, profile.providerAccountId),
          scope
        )
      )
      .get();
    const linked = linkedRow?.account;

    let user = linked
      ? await db.select().from(users).where(eq(users.id, linked.userId)).get()
      : await db
          .select()
          .from(users)
          .where(and(eq(users.email, profile.email), scope))
          .get();

    if (user && (user.blocked || user.mustChangePassword))
      throw new Error('Account unavailable');
    if (user?.twoFactorEnabled && !stateObj.appChallenge)
      throw new Error(
        'Use the SDK OAuth flow to complete two-factor authentication'
      );

    if (!user) {
      // Bootstrap: first user ever becomes admin (OAuth counts too) — guarded for single-tenant
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);
      if (count === 0 && !stateObj.projectId) {
        const requiredEmail = (
          c.env.BOOTSTRAP_ADMIN_EMAIL ??
          (c.env as unknown as Record<string, string | undefined>)
            .INITIAL_ADMIN_EMAIL
        )?.toLowerCase();
        if (requiredEmail && profile.email.toLowerCase() !== requiredEmail) {
          return c.redirect(
            `${base}/sign-in?error=${encodeURIComponent('Bootstrap restricted to owner email')}`
          );
        }
        const secret = (c.env as unknown as Record<string, string | undefined>)
          .BOOTSTRAP_SECRET;
        if (secret) {
          // OAuth bootstrap via secret cannot be validated without token — disallow OAuth for first admin when secret is set.
          // Owner must use POST /v1/setup/bootstrap with token instead (secure).
          return c.redirect(
            `${base}/sign-in?error=${encodeURIComponent('Bootstrap requires secret — use /setup')}`
          );
        }
      }
      const id = randomUUID();
      const [first, last] = (profile.name ?? '').split(' ');
      await db.insert(users).values({
        id,
        projectId: stateObj.projectId,
        email: profile.email,
        emailVerified: true, // OAuth providers verify email
        firstName: first || null,
        lastName: last || null,
        avatarUrl: profile.avatarUrl ?? null,
        role: count === 0 && !stateObj.projectId ? 'admin' : 'user',
        mustChangePassword: false,
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
        accessToken: null,
        refreshToken: null,
        scope: null,
        createdAt: now,
        updatedAt: now,
      });
      c.executionCtx.waitUntil(
        dispatchWebhooks(c.env, user.projectId, 'oauth.linked', {
          id: user.id,
          provider,
        })
      );
    }

    if (stateObj.appChallenge) {
      const exchangeCode = await issueChallenge(
        c.env,
        'oauth_exchange',
        {
          userId: user.id,
          projectId: user.projectId,
          appChallenge: stateObj.appChallenge,
          redirectUrl: stateObj.redirectUrl,
        },
        120
      );
      const target = new URL(stateObj.redirectUrl ?? c.env.APP_URL);
      target.searchParams.set('slyxup_code', exchangeCode);
      c.header('Referrer-Policy', 'no-referrer');
      return c.redirect(target.href);
    }
    // Legacy platform-cookie flow.
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

    // Verification tokens are email-scoped in the legacy schema. Do not
    // consume another project's tokens when a platform account uses OAuth.

    const dest = safeRedirect(stateObj.redirectUrl, c.env.APP_URL, c.env);
    const joiner = dest.includes('?') ? '&' : '?';
    return c.redirect(`${dest}${joiner}auth=success`);
  } catch (e) {
    console.error(
      JSON.stringify({
        evt: 'oauth_error',
        provider,
        msg: e instanceof Error ? e.message : String(e),
      })
    );
    const joiner = base.includes('?') ? '&' : '?';
    return c.redirect(
      `${base}/sign-in?error=${encodeURIComponent('OAuth sign-in failed. Please try again.')}`
    );
  }
});

export default oauth;
