import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { SlyxupClient } from '@slyxup/core';
import { AuthContext, type AuthContextValue } from '../src/react/context/auth-context';
import { useBilling, useInvoices } from '../src/react/hooks/useBilling';
import { InvoicesTable } from '../src/components/InvoicesTable/InvoicesTable';

afterEach(() => vi.unstubAllGlobals());
describe('billing UI integration', () => {
  it('inherits auth configuration and the current session', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ invoices: [] }));
    vi.stubGlobal('fetch', fetcher);
    const client = new SlyxupClient({ publishableKey: 'pk_project', sessionToken: 'session' });
    const context = { client, billingApiUrl: 'https://billing.example', userId: 'user' } as AuthContextValue;
    const { result } = renderHook(() => useBilling(), { wrapper: ({ children }) => <AuthContext.Provider value={context}>{children}</AuthContext.Provider> });
    await result.current.client.listInvoices();
    expect(fetcher.mock.calls[0][0]).toBe('https://billing.example/v1/billing/invoices');
    const headers = new Headers(fetcher.mock.calls[0][1].headers);
    expect(headers.get('Authorization')).toBe('Bearer session');
    expect(headers.get('X-Publishable-Key')).toBe('pk_project');
  });
  it('reports invoice load failures and supports retry', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(Response.json({ invoices: [{ id: 'invoice' }] }));
    vi.stubGlobal('fetch', fetcher);
    const { result } = renderHook(() => useInvoices());
    await waitFor(() => expect(result.current.error).toBeTruthy());
    await act(() => result.current.reload());
    expect(result.current.error).toBeNull();
    expect(result.current.invoices).toEqual([{ id: 'invoice' }]);
  });
  it('keeps paid totals in separate currencies', () => {
    render(<InvoicesTable invoices={[
      { id: 'a', amount: 1000, currency: 'USD', status: 'paid', billedAt: null },
      { id: 'b', amount: 2000, currency: 'EUR', status: 'paid', billedAt: null },
    ]} />);
    expect(screen.getAllByText('Total paid')).toHaveLength(2);
    expect(screen.queryByText(/30\.00/)).toBeNull();
  });
});
