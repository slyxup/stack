/**
 * Central Worker configuration (Week 2: self-hosting).
 *
 * All deployment-specific values come from `env` (wrangler `vars` for public
 * config, `wrangler secret put` for secrets). Nothing here hardcodes a
 * deployment URL — self-hosters only edit wrangler.jsonc `vars` + secrets.
 */

export interface AuthConfig {
  appUrl: string;
  apiUrl: string;
  corsOrigins: string[];
  allowedRedirectOrigins: string[];
  sessionSecret: string | undefined;
  encryptionKey: string | undefined;
  googleClientId: string | undefined;
  githubClientId: string | undefined;
  emailFrom: string;
  emailFromName: string;
  singleTenantMode: boolean;
  allowPublicDeveloperRegistration: boolean;
  bootstrapAdminEmail: string | undefined;
}

function splitList(v: string | undefined): string[] {
  return (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function flag(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  return v === 'true' || v === '1';
}

export function getConfig(env: Record<string, string | undefined>): AuthConfig {
  return {
    appUrl: env.APP_URL ?? 'http://localhost:5173',
    apiUrl: env.API_URL ?? 'http://localhost:8787',
    corsOrigins: splitList(env.CORS_ORIGINS),
    allowedRedirectOrigins: splitList(env.ALLOWED_REDIRECT_ORIGINS),
    sessionSecret: env.SESSION_SECRET,
    encryptionKey: env.ENCRYPTION_KEY,
    googleClientId: env.GOOGLE_CLIENT_ID,
    githubClientId: env.GITHUB_CLIENT_ID,
    emailFrom: env.EMAIL_FROM ?? 'noreply@localhost',
    emailFromName: env.EMAIL_FROM_NAME ?? 'SlyxUp',
    singleTenantMode: flag(env.SINGLE_TENANT_MODE, false),
    allowPublicDeveloperRegistration: flag(
      env.ALLOW_PUBLIC_DEVELOPER_REGISTRATION,
      true
    ),
    bootstrapAdminEmail: env.BOOTSTRAP_ADMIN_EMAIL,
  };
}

/** Fail fast on missing secrets required for secure operation. */
export function requireSecrets(config: AuthConfig): void {
  const missing: string[] = [];
  if (!config.sessionSecret) missing.push('SESSION_SECRET');
  if (!config.encryptionKey) missing.push('ENCRYPTION_KEY');
  if (missing.length > 0) {
    throw new Error(
      `Missing required secrets: ${missing.join(', ')}. Run ./scripts/setup-secrets.sh local (dev) or store via 'wrangler secret put' (deploy).`
    );
  }
}
