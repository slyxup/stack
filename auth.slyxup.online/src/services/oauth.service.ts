import { randomToken, randomUUID } from '../lib/crypto';

export interface OAuthState {
  state: string;
  provider: 'google' | 'github';
  redirectUrl?: string;
  pkceVerifier?: string;
  createdAt: number;
}

export function buildAuthUrl(
  provider: 'google' | 'github',
  env: {
    GOOGLE_CLIENT_ID?: string;
    GITHUB_CLIENT_ID?: string;
    APP_URL: string;
  },
  state: string,
  redirectUri: string
): string {
  if (provider === 'google') {
    const clientId = env.GOOGLE_CLIENT_ID ?? '';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  const clientId = env.GITHUB_CLIENT_ID ?? '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export function newState(
  provider: 'google' | 'github',
  redirectUrl?: string
): OAuthState {
  return {
    state: randomToken(16),
    provider,
    redirectUrl,
    pkceVerifier: randomToken(32),
    createdAt: Date.now(),
  };
}

export function isStateExpired(
  state: OAuthState,
  ttlMs = 1000 * 60 * 10
): boolean {
  return Date.now() - state.createdAt > ttlMs;
}
