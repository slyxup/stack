/**
 * Paddle.js v2 (overlay checkout) bootstrap.
 * Loads the script once, initializes with the billing worker's client token,
 * and opens the overlay for a prepared transaction id.
 */
import { getBillingConfig } from './api';

type PaddleCheckoutEvent =
  | { name: 'checkout.completed'; transactionId?: string }
  | { name: 'checkout.closed'; transactionId?: string }
  | { name: 'checkout.error'; error?: unknown };

type PaddleGlobal = {
  Environment: { set: (env: 'sandbox' | 'production') => void };
  Initialize: (opts: { token: string }) => void;
  Checkout: {
    open: (opts: {
      transactionId: string;
      settings?: Record<string, unknown>;
    }) => void;
    on?: (name: string, cb: (e: PaddleCheckoutEvent) => void) => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

let initPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="paddle/v2/paddle.js"]')) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Paddle.js'));
    document.head.appendChild(s);
  });
}

/** Idempotent: load script + fetch client token + initialize. */
export async function ensurePaddle(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await loadScript();
    const r = await getBillingConfig();
    if (!r.ok) throw new Error(r.error);
    if (!window.Paddle)
      throw new Error('Paddle.js loaded but Paddle global missing');
    // Initialize is safe to call again; Paddle ignores duplicates.
    // Paddle.js defaults to PRODUCTION — set env explicitly BEFORE Initialize,
    // or test_ tokens get `invalid_client_token` from the live hosts.
    window.Paddle.Environment.set(
      r.data.environment === 'production' ? 'production' : 'sandbox'
    );
    window.Paddle.Initialize({ token: r.data.clientToken });
  })();
  return initPromise;
}

export function openCheckout(transactionId: string) {
  if (!window.Paddle)
    throw new Error('Paddle not initialized — call ensurePaddle() first');
  window.Paddle.Checkout.open({
    transactionId,
    settings: { displayMode: 'overlay' },
  });
}

export function onCheckoutResult(
  cb: (e: PaddleCheckoutEvent) => void
): (() => void) | undefined {
  if (!window.Paddle?.Checkout?.on) return undefined;
  const handler = (e: PaddleCheckoutEvent) => cb(e);
  window.Paddle.Checkout.on('checkout.completed', handler);
  window.Paddle.Checkout.on('checkout.closed', handler);
  window.Paddle.Checkout.on('checkout.error', handler);
  return () => {
    // Paddle v2 has no off() — listeners are fire-and-forget per page load.
    // In practice this component lives on one page, so a no-op cleanup is fine.
  };
}
