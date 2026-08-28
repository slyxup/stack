import { describe, it, expect } from 'vitest';
import { BillingClient } from '../src/index.js';

describe('billing', () => {
  it('exports BillingClient class', () => {
    expect(typeof BillingClient).toBe('function');
    const client = new BillingClient({ apiUrl: 'http://localhost:8787' });
    expect(client.apiUrl).toBe('http://localhost:8788');
    expect(typeof client.listPlans).toBe('function');
    expect(typeof client.getSubscription).toBe('function');
    expect(typeof client.checkout).toBe('function');
    expect(typeof client.cancelSubscription).toBe('function');
    expect(typeof client.listInvoices).toBe('function');
  });
});
