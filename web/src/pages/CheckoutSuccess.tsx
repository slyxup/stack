import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getTransactionStatus } from '../lib/api';

type State =
  | { kind: 'verifying' }
  | { kind: 'paid' }
  | { kind: 'pending'; checkoutUrl: string | null; status: string }
  | { kind: 'failed'; error: string };

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const txId = params.get('transaction_id');
  const projectId = params.get('project_id');
  // Where the user came from — redirect back to that platform (e.g. an SDK app).
  const origin = params.get('origin');
  const [state, setState] = useState<State>({ kind: 'verifying' });
  const [countdown, setCountdown] = useState(8);

  const backTo = projectId ? `/admin/projects/${projectId}` : '/admin';
  const returnHref = origin ?? null;

  // NEVER trust a bare ?transaction_id= URL — verify with Paddle first.
  const verify = useCallback(async () => {
    if (!txId) {
      setState({
        kind: 'failed',
        error: 'No transaction reference in this URL.',
      });
      return;
    }
    setState({ kind: 'verifying' });
    const r = await getTransactionStatus(txId);
    if (!r.ok) {
      setState({ kind: 'failed', error: r.error });
      return;
    }
    if (r.data.paid) {
      setState({ kind: 'paid' });
    } else {
      setState({
        kind: 'pending',
        checkoutUrl: r.data.checkoutUrl,
        status: r.data.status,
      });
    }
  }, [txId]);

  useEffect(() => {
    void verify();
  }, [verify]);

  // Auto-redirect ONLY after verified payment.
  useEffect(() => {
    if (state.kind !== 'paid') return;
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          if (origin) window.location.assign(origin);
          else navigate(backTo);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [state.kind, navigate, origin, backTo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
      <div className="text-center space-y-5 max-w-md mx-auto px-4">
        {state.kind === 'verifying' && (
          <>
            <div className="inline-flex items-center justify-center rounded-full bg-black/[0.04] p-4">
              <Loader2 className="size-10 text-[#63666f] animate-spin" />
            </div>
            <h1 className="text-[22px] font-bold">Verifying payment…</h1>
            <p className="text-[14px] text-[#63666f] leading-relaxed">
              Checking with the payment provider. This takes a few seconds.
            </p>
            {txId && (
              <p className="text-[12px] text-[#a1a3ab] font-mono">
                Transaction {txId}
              </p>
            )}
          </>
        )}

        {state.kind === 'paid' && (
          <>
            <div className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-4">
              <CheckCircle2 className="size-10 text-emerald-600" />
            </div>
            <h1 className="text-[22px] font-bold">Payment successful</h1>
            <p className="text-[14px] text-[#63666f] leading-relaxed">
              {origin
                ? 'Your subscription is now active. We are taking you back.'
                : 'Your subscription is now active. You can manage it from your project billing settings.'}
            </p>
            {txId && (
              <p className="text-[12px] text-[#a1a3ab] font-mono">
                Transaction {txId}
              </p>
            )}
            <div className="pt-2 space-y-2">
              {returnHref ? (
                <a
                  href={returnHref}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-[13px] font-semibold hover:bg-[#1a1a2e] transition"
                >
                  Back to app <ArrowRight className="size-3.5" />
                </a>
              ) : (
                <Link
                  to={backTo}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-[13px] font-semibold hover:bg-[#1a1a2e] transition"
                >
                  Back to project <ArrowRight className="size-3.5" />
                </Link>
              )}
              <div className="text-[12px] text-[#a1a3ab]">
                Redirecting in {countdown}s...
              </div>
            </div>
          </>
        )}

        {state.kind === 'pending' && (
          <>
            <div className="inline-flex items-center justify-center rounded-full bg-amber-50 p-4">
              <AlertTriangle className="size-10 text-amber-600" />
            </div>
            <h1 className="text-[22px] font-bold">Payment not completed</h1>
            <p className="text-[14px] text-[#63666f] leading-relaxed">
              No payment was recorded for this checkout
              <span className="font-mono text-[12px]"> ({state.status})</span>.
              Your plan has <strong>not</strong> changed — complete the payment
              to activate it.
            </p>
            {txId && (
              <p className="text-[12px] text-[#a1a3ab] font-mono">
                Transaction {txId}
              </p>
            )}
            <div className="pt-2 space-y-2">
              {state.checkoutUrl && (
                <a
                  href={state.checkoutUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-[13px] font-semibold hover:bg-[#1a1a2e] transition"
                >
                  Complete payment <ArrowRight className="size-3.5" />
                </a>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => void verify()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-black/[0.12] bg-white text-[13px] font-semibold hover:bg-[#f4f4f5] transition cursor-pointer"
                >
                  <RefreshCw className="size-3.5" /> I&apos;ve paid — check
                  again
                </button>
              </div>
              {returnHref ? (
                <div>
                  <a
                    href={returnHref}
                    className="text-[13px] font-medium text-[#63666f] hover:text-black underline underline-offset-4"
                  >
                    Return without paying
                  </a>
                </div>
              ) : (
                <div>
                  <Link
                    to={backTo}
                    className="text-[13px] font-medium text-[#63666f] hover:text-black underline underline-offset-4"
                  >
                    Back to project
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

        {state.kind === 'failed' && (
          <>
            <div className="inline-flex items-center justify-center rounded-full bg-red-50 p-4">
              <AlertTriangle className="size-10 text-red-600" />
            </div>
            <h1 className="text-[22px] font-bold">Could not verify payment</h1>
            <p className="text-[14px] text-[#63666f] leading-relaxed">
              {state.error} Nothing was charged by this page — if you did pay,
              your subscription activates automatically once the payment
              provider confirms it.
            </p>
            <div className="pt-2 space-y-2">
              <div>
                <button
                  type="button"
                  onClick={() => void verify()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-[13px] font-semibold hover:bg-[#1a1a2e] transition cursor-pointer"
                >
                  <RefreshCw className="size-3.5" /> Try again
                </button>
              </div>
              {returnHref ? (
                <div>
                  <a
                    href={returnHref}
                    className="text-[13px] font-medium text-[#63666f] hover:text-black underline underline-offset-4"
                  >
                    Return to app
                  </a>
                </div>
              ) : (
                <div>
                  <Link
                    to={backTo}
                    className="text-[13px] font-medium text-[#63666f] hover:text-black underline underline-offset-4"
                  >
                    Back to project
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
