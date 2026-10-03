import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ensurePaddle, openCheckout } from '../lib/paddle';

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const transactionId = params.get('_ptxn') ?? params.get('transaction_id');
  const projectId = params.get('project_id') ?? '';
  const origin = params.get('origin');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setError('This checkout link is missing its transaction reference.');
      return;
    }
    void ensurePaddle(projectId)
      .then(() => openCheckout(transactionId))
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Checkout could not be opened.');
      });
  }, [projectId, transactionId]);

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
