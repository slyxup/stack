import { BillingClient } from './client.js';
import type { BillingClientOptions } from './client.js';

export { BillingClient };
export type { BillingClientOptions };
export type { Plan, Subscription, Invoice } from './types.js';

export function createBillingClient(options?: Partial<BillingClientOptions>): BillingClient {
  return new BillingClient(options);
}
