// SlyxUp Billing — Paddle Billing API client (Workers fetch, no SDK dep)
// Docs: https://developer.paddle.com/api-reference

export interface PaddleConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
}

const BASE_URL = (env: string) =>
  env === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';

async function paddleFetch<T>(
  config: PaddleConfig,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL(config.environment)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: unknown;
  };
  if (!res.ok || data.error) {
    throw new Error(
      `Paddle API error (${res.status}): ${JSON.stringify(data.error ?? data)}`
    );
  }
  return data.data as T;
}

// ── Customers ──

interface PaddleCustomer {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * B8: Create a Paddle customer by email (used only when no local row exists).
 * The primary lookup is now done in checkout.ts via our `customers` table by userId,
 * avoiding cross-user email collisions.
 */
export async function createPaddleCustomer(
  config: PaddleConfig,
  email: string,
  name?: string
): Promise<PaddleCustomer> {
  try {
    return await paddleFetch<PaddleCustomer>(config, 'POST', '/customers', {
      email,
      name,
    });
  } catch (err) {
    // If customer already exists in Paddle (e.g. previous sandbox run with same email but different local DB),
    // fetch the existing Paddle customer by email and reuse it
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('customer_already_exists') || msg.includes('409')) {
      const list = await paddleFetch<{ data: PaddleCustomer[] }>(
        config,
        'GET',
        `/customers?email=${encodeURIComponent(email)}`
      );
      const found =
        (list as unknown as { data: PaddleCustomer[] })?.data?.[0] ??
        (Array.isArray(list) ? (list as unknown as PaddleCustomer[])[0] : null);
      if (found) return found;
      // Fallback: try to get the conflicting customer ID from the error detail and fetch it
      const match = msg.match(/customer of id (ctm_[a-z0-9]+)/);
      if (match) {
        return paddleFetch<PaddleCustomer>(
          config,
          'GET',
          `/customers/${match[1]}`
        );
      }
    }
    throw err;
  }
}

/**
 * B8: Find an existing Paddle customer by email (returns null when not found).
 * Used in checkout.ts to avoid duplicate paddle_customer_id inserts.
 */
export async function findPaddleCustomerByEmail(
  config: PaddleConfig,
  email: string
): Promise<PaddleCustomer | null> {
  try {
    const list = await paddleFetch<{ data: PaddleCustomer[] }>(
      config,
      'GET',
      `/customers?email=${encodeURIComponent(email)}`
    );
    const found =
      (list as unknown as { data: PaddleCustomer[] })?.data?.[0] ??
      (Array.isArray(list) ? (list as unknown as PaddleCustomer[])[0] : null);
    return found ?? null;
  } catch {
    // Paddle returns 404 for no-match — not an error we need to surface
    return null;
  }
}

// ── Products & Prices ──

interface PaddleProduct {
  id: string;
  name: string;
  description?: string | null;
}

interface PaddlePrice {
  id: string;
  productId: string;
  amount: string;
  currencyCode: string;
  billingCycle: { interval: string; frequency: number } | null;
}

/** Create a product in Paddle */
export async function createPaddleProduct(
  config: PaddleConfig,
  name: string,
  description?: string
): Promise<PaddleProduct> {
  return paddleFetch<PaddleProduct>(config, 'POST', '/products', {
    name,
    tax_category: 'saas',
    description: description || `${name} subscription plan`,
  });
}

/** Create a recurring price in Paddle for a product */
export async function createPaddlePrice(
  config: PaddleConfig,
  productId: string,
  amount: number,
  currency: string,
  interval: 'month' | 'year'
): Promise<PaddlePrice> {
  return paddleFetch<PaddlePrice>(config, 'POST', '/prices', {
    description: `${interval}ly price for ${productId}`,
    product_id: productId,
    unit_price: {
      amount: String(amount),
      currency_code: currency,
    },
    billing_cycle: {
      interval: interval === 'month' ? 'month' : 'year',
      frequency: 1,
    },
    tax_mode: 'account_setting',
  });
}

// ── Checkout ──

export interface CheckoutCustomData {
  userId: string;
  projectId: string;
  planId?: string;
}

interface PaddleTransaction {
  id: string;
  status?: string;
  checkout?: { url?: string };
  custom_data?: Record<string, unknown> | null;
}

/** Fetch a transaction by id — used to VERIFY payment before celebrating. */
export async function getTransaction(
  config: PaddleConfig,
  transactionId: string
): Promise<PaddleTransaction> {
  return paddleFetch<PaddleTransaction>(
    config,
    'GET',
    `/transactions/${encodeURIComponent(transactionId)}`
  );
}

/** Create a checkout transaction; returns hosted checkout URL + transaction id.
 *  `paymentLinkUrl` MUST be a page that hosts Paddle.js (our /pay page) on a
 *  Paddle-approved domain — Paddle appends `?_ptxn=<id>` and returns it as
 *  `checkout.url`. Never pass a non-Paddle.js page here: the buyer would land
 *  on it with no way to pay (this caused the "instant success without payment"
 *  bug — billing GET / forwarded straight to /checkout/success).
 *  Post-payment redirect is configured client-side via
 *  Paddle.Checkout.open({ settings: { successUrl } }), NOT here. */
export async function createCheckout(
  config: PaddleConfig,
  priceId: string,
  customerId: string,
  paymentLinkUrl: string,
  customData: CheckoutCustomData
): Promise<{ checkoutUrl: string; transactionId: string }> {
  const body = {
    items: [{ price_id: priceId, quantity: 1 }],
    customer_id: customerId,
    custom_data: customData,
    checkout: { url: paymentLinkUrl },
  };

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'paddle_create_transaction',
      environment: config.environment,
      priceId,
      customerId,
      paymentLinkUrl,
      body: JSON.stringify(body),
    })
  );

  const tx = await paddleFetch<PaddleTransaction>(
    config,
    'POST',
    '/transactions',
    body
  );

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'paddle_transaction_response',
      transactionId: tx.id,
      checkoutUrl: tx.checkout?.url ?? null,
      hasCheckout: !!tx.checkout,
    })
  );

  // checkout.url is ALWAYS our /pay payment-link page (+ ?_ptxn=) when Paddle
  // accepts the approved domain. If Paddle ever omits it, fall back to our
  // /pay page with an explicit transaction id — NEVER to a page that cannot
  // collect payment.
  const sep = paymentLinkUrl.includes('?') ? '&' : '?';
  const checkoutUrl =
    tx.checkout?.url ?? `${paymentLinkUrl}${sep}_ptxn=${tx.id}`;

  return { checkoutUrl, transactionId: tx.id };
}

// ── Subscription lifecycle ──

/** Cancel subscription at the end of the current billing period */
export async function cancelSubscriptionAtPeriodEnd(
  config: PaddleConfig,
  paddleSubscriptionId: string
): Promise<void> {
  await paddleFetch(
    config,
    'POST',
    `/subscriptions/${paddleSubscriptionId}/cancel`,
    {}
  );
}

/**
 * Resume a subscription with a scheduled cancellation — removes the
 * scheduled change so it renews normally.
 */
export async function resumeSubscription(
  config: PaddleConfig,
  paddleSubscriptionId: string
): Promise<void> {
  await paddleFetch(config, 'PATCH', `/subscriptions/${paddleSubscriptionId}`, {
    scheduled_change: null,
  });
}

// ── Webhook signature verification ──

/**
 * Verify `Paddle-Signature: ts=<unix>;h1=<hex>` header.
 * Signed payload = `${ts}:${rawBody}` with HMAC-SHA256(webhookSecret).
 * Returns null if valid, or an error reason.
 * Docs: https://developer.paddle.com/webhooks/verify
 */
export async function verifyWebhookSignature(
  signatureHeader: string | undefined,
  rawBody: string,
  secret: string,
  maxSkewSec = 300 // replay window: 5 min (Paddle recommends short tolerance)
): Promise<string | null> {
  if (!signatureHeader) return 'missing Paddle-Signature header';

  const parts = Object.fromEntries(
    signatureHeader.split(';').map((kv) => {
      const idx = kv.indexOf('=');
      return [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
    })
  ) as { ts?: string; h1?: string };

  if (!parts.ts || !parts.h1) return 'malformed signature header';

  const ts = Number(parts.ts);
  if (!Number.isFinite(ts)) return 'invalid timestamp';
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > maxSkewSec)
    return 'signature timestamp outside tolerance window';

  const { hmacSha256Hex, timingSafeEqualStr } = await import('../lib/crypto');
  const expected = await hmacSha256Hex(secret, `${ts}:${rawBody}`);
  if (!timingSafeEqualStr(expected, parts.h1.toLowerCase()))
    return 'signature mismatch';

  return null;
}
