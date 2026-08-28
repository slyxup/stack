// Paddle.js loader — lazy-loads Paddle.js and initializes overlay checkout
// Docs: https://developer.paddle.com/paddle-js

declare global {
  interface Window {
    Paddle?: {
      Initialize: (config: {
        token: string;
        eventCallback?: (data: Record<string, unknown>) => void;
      }) => void;
      Environment: { set: (env: 'sandbox' | 'production') => void };
      Checkout: {
        open: (options: {
          items: Array<{ priceId: string; quantity: number }>;
          customer?: { email?: string };
          settings?: Record<string, unknown>;
          customData?: Record<string, unknown>;
        }) => void;
      };
    };
  }
}

const PADDLE_JS_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';
let paddleLoaded = false;
let paddleInitPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Derive billing URL from auth API URL.
 * localhost:8787 → localhost:8788, auth.slyxup.online → billing.slyxup.online
 */
function deriveBillingUrl(authApiUrl: string): string {
  if (/^https?:\/\/localhost(:\d+)?$/.test(authApiUrl)) {
    return authApiUrl.replace(/:(\d+)$/, ':8788');
  }
  return authApiUrl.replace('auth.slyxup.online', 'billing.slyxup.online');
}

interface BillingConfig {
  environment: 'sandbox' | 'production';
  clientToken: string;
}

let cachedConfig: BillingConfig | null = null;

/**
 * Fetch Paddle config from billing Worker's /v1/billing/config endpoint.
 * Cached after first fetch.
 */
async function fetchBillingConfig(billingUrl: string): Promise<BillingConfig> {
  if (cachedConfig) return cachedConfig;
  const res = await fetch(`${billingUrl}/v1/billing/config`);
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    environment?: string;
    clientToken?: string;
  };
  if (!res.ok || !data.ok || !data.clientToken) {
    throw new Error('Failed to fetch billing config');
  }
  cachedConfig = {
    environment: (data.environment as 'sandbox' | 'production') ?? 'sandbox',
    clientToken: data.clientToken,
  };
  return cachedConfig;
}

/**
 * Load Paddle.js and initialize with config from billing Worker.
 * Safe to call multiple times — only loads the script once.
 */
export async function initPaddle(authApiUrl: string): Promise<void> {
  if (paddleLoaded && window.Paddle) return;

  if (!paddleInitPromise) {
    paddleInitPromise = (async () => {
      const billingUrl = deriveBillingUrl(authApiUrl);
      const config = await fetchBillingConfig(billingUrl);
      await loadScript(PADDLE_JS_URL);
      if (!window.Paddle) throw new Error('Paddle.js failed to load');
      window.Paddle.Environment.set(config.environment);
      window.Paddle.Initialize({
        token: config.clientToken,
        eventCallback: (data) => {
          if (data && data.name === 'checkout.completed') {
            // Subscription is created via webhook. Notify the host app so it can
            // refresh billing state and show a success confirmation.
            window.dispatchEvent(new CustomEvent('slyxup:checkout-completed'));
          }
        },
      });
      paddleLoaded = true;
    })();
  }
  return paddleInitPromise;
}

/**
 * Open Paddle overlay checkout for a given price ID.
 * `customData` is copied to the created transaction (and, for recurring
 * items, to the related subscription) — the billing webhook uses it to
 * attribute the subscription to a SlyxUp user + project + plan.
 */
export function openPaddleCheckout(
  priceId: string,
  customerEmail?: string,
  customData?: Record<string, unknown>
): void {
  if (!window.Paddle) {
    throw new Error('Paddle.js not initialized — call initPaddle() first');
  }
  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    ...(customerEmail ? { customer: { email: customerEmail } } : {}),
    ...(customData ? { customData } : {}),
  });
}
