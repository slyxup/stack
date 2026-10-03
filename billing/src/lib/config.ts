/**
 * Central Billing Worker configuration (Week 2: self-hosting).
 * All deployment values from env — no hardcoded URLs.
 */

export interface BillingConfig {
  appUrl: string;
  apiUrl: string;
  authUrl: string;
  corsOrigins: string[];
  paddleEnvironment: 'sandbox' | 'production';
  paddleSandboxApiKey: string | undefined;
  paddleSandboxWebhookSecret: string | undefined;
  paddleProductionApiKey: string | undefined;
  paddleProductionWebhookSecret: string | undefined;
}

function splitList(v: string | undefined): string[] {
  return (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getBillingConfig(
  env: Record<string, string | undefined>
): BillingConfig {
  const paddleEnv =
    env.PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
  return {
    appUrl: env.APP_URL ?? 'http://localhost:5173',
    apiUrl: env.BILLING_API_URL ?? env.API_URL ?? 'http://localhost:8788',
    authUrl: env.AUTH_URL ?? 'http://localhost:8787',
    corsOrigins: splitList(env.CORS_ORIGINS),
    paddleEnvironment: paddleEnv as 'sandbox' | 'production',
    paddleSandboxApiKey: env.PADDLE_SANDBOX_API_KEY ?? env.PADDLE_API_KEY,
    paddleSandboxWebhookSecret: env.PADDLE_SANDBOX_WEBHOOK_SECRET,
    paddleProductionApiKey: env.PADDLE_PRODUCTION_API_KEY,
    paddleProductionWebhookSecret: env.PADDLE_PRODUCTION_WEBHOOK_SECRET,
  };
}
