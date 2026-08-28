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
 * Load Paddle.js and initialize with a client-side token.
 * Safe to call multiple times — only loads the script once.
 */
export async function initPaddle(
  clientToken: string,
  environment: 'sandbox' | 'production' = 'sandbox'
): Promise<void> {
  if (paddleLoaded && window.Paddle) return;

  if (!paddleInitPromise) {
    paddleInitPromise = (async () => {
      await loadScript(PADDLE_JS_URL);
      if (!window.Paddle) throw new Error('Paddle.js failed to load');
      window.Paddle.Environment.set(environment);
      window.Paddle.Initialize({
        token: clientToken,
        eventCallback: (data) => {
          if (data.name === 'checkout.completed') {
            // Subscription created via webhook — UI will refresh on next load
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
 */
export function openPaddleCheckout(
  priceId: string,
  customerEmail?: string
): void {
  if (!window.Paddle) {
    throw new Error('Paddle.js not initialized — call initPaddle() first');
  }
  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    ...(customerEmail ? { customer: { email: customerEmail } } : {}),
  });
}
