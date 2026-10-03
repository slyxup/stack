import type { PaddleConfig } from './paddle.service';

export type BillingEnvironment = 'test' | 'live';

type BillingBindings = {
  AUTH_DB?: D1Database;
  AUTH_URL?: string;
  PADDLE_API_KEY?: string;
  PADDLE_CLIENT_TOKEN?: string;
  PADDLE_WEBHOOK_SECRET?: string;
  PADDLE_SANDBOX_API_KEY?: string;
  PADDLE_SANDBOX_CLIENT_TOKEN?: string;
  PADDLE_SANDBOX_WEBHOOK_SECRET?: string;
  PADDLE_PRODUCTION_API_KEY?: string;
  PADDLE_PRODUCTION_CLIENT_TOKEN?: string;
  PADDLE_PRODUCTION_WEBHOOK_SECRET?: string;
  PADDLE_DEFAULT_ENVIRONMENT?: string;
};

export function getPaddleConfig(
  env: BillingBindings,
  environment: BillingEnvironment
): PaddleConfig {
  const apiKey =
    environment === 'live'
      ? env.PADDLE_PRODUCTION_API_KEY
      : (env.PADDLE_SANDBOX_API_KEY ?? env.PADDLE_API_KEY);
  if (!apiKey) {
    throw new Error(
      environment === 'live'
        ? 'Paddle production API key is not configured'
        : 'Paddle sandbox API key is not configured'
    );
  }
  return {
    apiKey,
    environment: environment === 'live' ? 'production' : 'sandbox',
  };
}

export function getPaddleClientToken(
  env: BillingBindings,
  environment: BillingEnvironment
): string | undefined {
  return environment === 'live'
    ? env.PADDLE_PRODUCTION_CLIENT_TOKEN
    : (env.PADDLE_SANDBOX_CLIENT_TOKEN ?? env.PADDLE_CLIENT_TOKEN);
}

export function getPaddleWebhookSecrets(env: BillingBindings): string[] {
  return [
    env.PADDLE_PRODUCTION_WEBHOOK_SECRET,
    env.PADDLE_SANDBOX_WEBHOOK_SECRET,
    env.PADDLE_WEBHOOK_SECRET,
  ].filter((secret): secret is string => Boolean(secret));
}

export function getDefaultBillingEnvironment(
  env: BillingBindings
): BillingEnvironment {
  return env.PADDLE_DEFAULT_ENVIRONMENT === 'production' ? 'live' : 'test';
}

export async function resolveProjectEnvironment(
  env: BillingBindings,
  projectId: string
): Promise<BillingEnvironment> {
  try {
    const row = env.AUTH_DB
      ? await env.AUTH_DB
          .prepare('SELECT environment FROM projects WHERE id = ? LIMIT 1')
          .bind(projectId)
          .first<{ environment: BillingEnvironment }>()
      : null;
    if (row?.environment === 'live' || row?.environment === 'test') {
      return row.environment;
    }
  } catch {
    // Cross-account deployments use the Auth Worker fallback below.
  }

  if (env.AUTH_URL) {
    try {
      const response = await fetch(
        `${env.AUTH_URL.replace(/\/$/, '')}/v1/project-environment/${encodeURIComponent(projectId)}`
      );
      const data = (await response.json().catch(() => ({}))) as {
        environment?: BillingEnvironment;
      };
      if (
        response.ok &&
        (data.environment === 'live' || data.environment === 'test')
      ) {
        return data.environment;
      }
    } catch {
      // Fall back to the explicitly configured safe default.
    }
  }

  return getDefaultBillingEnvironment(env);
}

export function selectPlanPrice(
  plan: {
    paddlePriceId: string;
    paddleTestPriceId?: string | null;
    paddleLivePriceId?: string | null;
  },
  environment: BillingEnvironment
): string {
  const priceId =
    environment === 'live' ? plan.paddleLivePriceId : plan.paddleTestPriceId;
  if (priceId) return priceId;
  if (environment === 'test' && plan.paddlePriceId) return plan.paddlePriceId;
  throw new Error(
    environment === 'live'
      ? 'This live project has no Paddle production price configured for this plan'
      : 'This test project has no Paddle sandbox price configured for this plan'
  );
}
