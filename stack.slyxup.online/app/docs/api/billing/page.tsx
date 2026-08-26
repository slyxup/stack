import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Billing API
Paddle-backed billing under /v1.

GET  /v1/billing/plans?project_id=...   -> [{ id, name, price, interval }]
POST /v1/billing/checkout               { planId, sessionToken } -> { url }
GET  /v1/billing/subscription           -> current subscription | null
POST /v1/webhooks/paddle                Paddle events (HMAC verified)

Webhook events handled:
subscription.created | updated | canceled, transaction.completed
Secret: wrangler secret put PADDLE_WEBHOOK_SECRET
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>Billing API</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Plans and checkouts for your project, plus the single signed webhook endpoint Paddle calls. You never store card data.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Endpoints</h2>
      <div style={{ border: '1px solid #232635', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#12141d', textAlign: 'left' }}><th style={{ padding: '10px 14px' }}>Method</th><th style={{ padding: '10px 14px' }}>Path</th><th style={{ padding: '10px 14px', color: '#7c8195' }}>Description</th></tr></thead>
          <tbody>
            {[
              ['GET', '/v1/billing/plans', 'List plans for a project'],
              ['POST', '/v1/billing/checkout', 'Create Paddle checkout URL'],
              ['GET', '/v1/billing/subscription', 'Current user subscription'],
              ['POST', '/v1/webhooks/paddle', 'Paddle events (HMAC verified)'],
            ].map(([m, p, d]) => (
              <tr key={p + m} style={{ borderTop: '1px solid #1d2130' }}>
                <td style={{ padding: '8px 14px' }}><span className="mono" style={{ fontSize: 11, fontWeight: 700, color: m === 'GET' ? '#34d399' : '#a5b4fc' }}>{m}</span></td>
                <td style={{ padding: '8px 14px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{p}</td>
                <td style={{ padding: '8px 14px', color: '#7c8195' }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Example — create checkout</h2>
      <CodeBlock>{`curl -X POST https://auth.slyxup.online/v1/billing/checkout \\
  -H 'Content-Type: application/json' \\
  -d '{"planId":"plan_pro_monthly","sessionToken":"<slyxup session>"}'
# 200 -> { "url": "https://buy.paddle.com/checkout/..." }`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Webhook security</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, lineHeight: 1.7 }}>
        The raw body is HMAC-verified with <code>PADDLE_WEBHOOK_SECRET</code> using a timing-safe compare before any parsing. Invalid signatures get <code>401</code>. See <a href="/docs/billing/webhooks" style={{ color: '#6366f1' }}>Webhooks</a>.
      </p>
    </div>
  );
}
