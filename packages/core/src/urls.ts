/** Canonical SlyxUp production endpoints. Override them with env or client options for local/self-hosted deployments. */
export const DEFAULT_AUTH_API_URL = 'https://auth-slyxup-com.auth-0f4.workers.dev';
export const DEFAULT_BILLING_API_URL = 'https://billing-slyxup-com.billing-86c.workers.dev';

export function normalizeApiUrl(value: string): string {
  return value.replace(/\/+$/, '');
}
