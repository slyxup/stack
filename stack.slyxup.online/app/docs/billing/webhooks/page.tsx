import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Webhooks (Paddle)
POST /v1/webhooks/paddle
Signature verified with PADDLE_WEBHOOK_SECRET (timing-safe compare).

Handled events:
subscription.created    -> create subscription row (active)
subscription.updated    -> sync plan / status / next_billed_at
subscription.canceled   -> mark canceled, keep access until period end
transaction.completed   -> attach invoice/receipt to subscription

Retry semantics: endpoint returns 2xx fast; processing happens inline.
Secret: wrangler secret put PADDLE_WEBHOOK_SECRET
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>Webhooks</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Paddle is the source of truth. Every subscription change arrives at one signed endpoint: <code>POST /v1/webhooks/paddle</code>.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Verification</h2>
      <CodeBlock>{`// Signature checked against raw body with HMAC-SHA256,
// timing-safe compare via crypto.subtle.timingSafeEqual.
// Mismatched or missing signature -> 401 before any parsing.`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Handled events</h2>
      <div style={{ border: '1px solid #232635', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#12141d', textAlign: 'left' }}><th style={{ padding: '10px 14px' }}>Event</th><th style={{ padding: '10px 14px', color: '#7c8195' }}>What SlyxUp does</th></tr></thead>
          <tbody>
            {[
              ['subscription.created', 'Creates an active subscription row linked to the buyer'],
              ['subscription.updated', 'Syncs plan, status, and next_billed_at'],
              ['subscription.canceled', 'Marks canceled — access continues until period end'],
              ['transaction.completed', 'Attaches invoice/receipt to the subscription'],
            ].map(([e, d]) => (
              <tr key={e} style={{ borderTop: '1px solid #1d2130' }}>
                <td style={{ padding: '8px 14px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{e}</td>
                <td style={{ padding: '8px 14px', color: '#7c8195' }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Configure the secret</h2>
      <CodeBlock>{`wrangler secret put PADDLE_WEBHOOK_SECRET`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Reading subscription state</h2>
      <CodeBlock>{`import { useSubscription } from '@slyxup/react';
const { subscription, isLoading } = useSubscription();
// { planId, status: 'active'|'canceled'|'past_due', renewsAt } | null`}</CodeBlock>
    </div>
  );
}
