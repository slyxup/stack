import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ensurePaddle, onCheckoutResult, openCheckout } from '../lib/paddle';

/**
 * Web checkout entry (/pay): opens the Paddle overlay for a prepared
 * transaction, then routes to the verified success page — never leaves the
 * buyer stranded on a spinner. The success page re-verifies with Paddle and
 * returns the buyer to ?origin= (the project that started checkout).
 */
export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const transactionId = params.get('_ptxn') ?? params.get('transaction_id');
  const projectId = params.get('project_id') ?? '';
  const origin = params.get('origin');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setError('This checkout link is missing its transaction reference.');
      return;
    }
    let cancelled = false;
    const successParams = new URLSearchParams();
    if (projectId) successParams.set('project_id', projectId);
    if (origin) successParams.set('origin', origin);
    successParams.set('transaction_id', transactionId);
    const successUrl = `/checkout/success?${successParams}`;

    void ensurePaddle(projectId)
      .then(() => {
        if (cancelled) return;
        // Paddle redirects here on payment; the overlay event covers the
        // in-page completion without a full navigation.
        const off = onCheckoutResult?.((e) => {
          if (cancelled) return;
          if (e.name === 'checkout.completed') navigate(successUrl);
          else if (e.name === 'checkout.error')
            setError('Payment failed. Please try again.');
        });
        void off;
        openCheckout(transactionId, { successUrl });
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Checkout could not be opened.'
          );
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, transactionId, origin, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafbfc] px-6 text-center text-[#111]">
      <section className="max-w-md">
        <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-2 border-[#e4e4e7] border-t-[#09090b]" />
        <p className="font-mono text-[13px] text-[#71717a]">
          {error ?? 'Opening secure checkout…'}
        </p>
        {error ? (
          <a
            href={origin || 'https://prompt.slyxup.com/pro'}
            className="mt-5 inline-flex rounded-full bg-[#09090b] px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            Return to app
          </a>
        ) : null}
      </section>
    </main>
  );
}
