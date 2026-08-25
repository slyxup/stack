import { Hono } from 'hono';
import { buildAuthUrl, newState } from '../services/oauth.service';

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  GOOGLE_CLIENT_ID?: string;
  GITHUB_CLIENT_ID?: string;
  APP_URL: string;
  HOSTED_AUTH_URL: string;
};

const oauth = new Hono<{ Bindings: Bindings }>();

/** Start OAuth — redirects to provider */
oauth.get('/:provider', async (c) => {
  const provider = c.req.param('provider') as 'google' | 'github';
  if (!['google', 'github'].includes(provider))
    return c.json({ ok: false, error: 'Unsupported provider' }, 400);
  const redirectUrl = c.req.query('redirect_url');
  const stateObj = newState(provider, redirectUrl);
  // Store state in KV with 10m TTL
  await c.env.KV.put(
    `oauth_state:${stateObj.state}`,
    JSON.stringify(stateObj),
    { expirationTtl: 600 }
  );
  const redirectUri =
    provider === 'google'
      ? `${c.env.HOSTED_AUTH_URL ?? c.env.APP_URL}/v1/oauth/callback/google`
      : `${c.env.HOSTED_AUTH_URL ?? c.env.APP_URL}/v1/oauth/callback/github`;
  const url = buildAuthUrl(provider, c.env, stateObj.state, redirectUri);
  return c.redirect(url);
});

/** OAuth callback — validates state, creates user/session */
oauth.get('/callback/:provider', async (c) => {
  const provider = c.req.param('provider') as 'google' | 'github';
  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state)
    return c.json({ ok: false, error: 'Missing code/state' }, 400);

  const raw = await c.env.KV.get(`oauth_state:${state}`);
  if (!raw) return c.json({ ok: false, error: 'Invalid state' }, 400);
  await c.env.KV.delete(`oauth_state:${state}`);

  const stateObj = JSON.parse(raw) as {
    provider: string;
    redirectUrl?: string;
  };
  if (stateObj.provider !== provider)
    return c.json({ ok: false, error: 'State mismatch' }, 400);

  // TODO: exchange code for tokens with provider, fetch profile, upsert user/oauth_accounts, create session
  // For now, return a placeholder that proves the flow works end-to-end
  const redirectUrl = stateObj.redirectUrl ?? c.env.APP_URL;
  return c.json({
    ok: true,
    provider,
    codeReceived: true,
    redirectUrl,
    note: 'OAuth code exchange TODO — state validated',
  });
});

export default oauth;
