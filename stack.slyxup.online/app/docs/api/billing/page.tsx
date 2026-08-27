import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Billing API
Paddle-backed billing, served by billing.slyxup.online (dedicated billing Worker).

GET  https://billing.slyxup.online/v1/billing/plans?projectId=...   -> [{ id, name, amount, interval }]
POST https://billing.slyxup.online/v1/billing/checkout              { planId, successUrl? } -> { checkoutUrl }
GET  https://billing.slyxup.online/v1/billing/subscription          -> current subscription | null
POST https://billing.slyxup.online/v1/billing/subscription/cancel   -> cancel at period end
POST https://billing.slyxup.online/v1/billing/subscription/resume   -> undo scheduled cancellation
GET  https://billing.slyxup.online/v1/billing/invoices              -> [{ id, amount, status, billedAt }]
POST https://billing.slyxup.online/v1/webhooks/paddle               Paddle events (HMAC verified)

Admin plan management (requires BILLING_ADMIN_SECRET):
GET    https://billing.slyxup.online/v1/admin/plans?projectId=
POST   https://billing.slyxup.online/v1/admin/plans                  { projectId, name, paddlePriceId, ... }
PATCH  https://billing.slyxup.online/v1/admin/plans/:id             { name?, amount?, ... }
DELETE https://billing.slyxup.online/v1/admin/plans/:id              -> soft-delete (isActive=false)

Webhook events handled:
subscription.created | updated | canceled, transaction.completed
Secret: wrangler secret put PADDLE_WEBHOOK_SECRET --config billing.slyxup.online/wrangler.jsonc
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>Billing API</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Plans and checkouts for your project, plus the single signed webhook endpoint Paddle calls. Served by the dedicated billing Worker at <code>billing.slyxup.online</code> — sessions issued by <code>auth.slyxup.online</code> are validated directly against its D1. You never store card data.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Endpoints</h2>
      <div style={{ border: '1px solid #232635', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#12141d', textAlign: 'left' }}><th style={{ padding: '10px 14px' }}>Method</th><th style={{ padding: '10px 14px' }}>Path</th><th style={{ padding: '10px 14px', color: '#7c8195' }}>Description</th></tr></thead>
          <tbody>
            {[
              ['GET', '/v1/billing/plans', 'List plans for a project'],
              ['POST', '/v1/billing/checkout', 'Create Paddle checkout URL'],
              ['GET', '/v1/billing/subscription', 'Current user subscription'],
              ['POST', '/v1/billing/subscription/cancel', 'Cancel at period end'],
              ['POST', '/v1/billing/subscription/resume', 'Undo scheduled cancellation'],
              ['GET', '/v1/billing/invoices', 'Invoice history'],
              ['POST', '/v1/webhooks/paddle', 'Paddle events (HMAC verified)'],
              ['GET', '/v1/admin/plans', 'List all plans (admin)'],
              ['POST', '/v1/admin/plans', 'Create plan (admin)'],
              ['PATCH', '/v1/admin/plans/:id', 'Update plan (admin)'],
              ['DELETE', '/v1/admin/plans/:id', 'Deactivate plan (admin)'],
            ].map(([m, p, d]) => (
              <tr key={p + m} style={{ borderTop: '1px solid #1d2130' }}>
                <td style={{ padding: '8px 14px' }}><span className="mono" style={{ fontSize: 11, fontWeight: 700, color: m === 'GET' ? '#34d399' : 'var(--accent)' }}>{m}</span></td>
                <td style={{ padding: '8px 14px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{p}</td>
                <td style={{ padding: '8px 14px', color: '#7c8195' }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Example — create checkout</h2>
      <CodeBlock>{`curl -X POST https://billing.slyxup.online/v1/billing/checkout \\
  -H 'Content-Type: application/json' \\
  -d '{"planId":"plan_pro_monthly","successUrl":"https://example.com/success"}'
# 200 -> { "ok": true, "checkoutUrl": "https://buy.paddle.com/checkout/..." }`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Webhook security</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, lineHeight: 1.7 }}>
        The raw body is HMAC-verified with <code>PADDLE_WEBHOOK_SECRET</code> using a timing-safe compare before any parsing. Invalid signatures get <code>401</code>. See <a href="/docs/billing/webhooks" style={{ color: 'var(--accent)' }}>Webhooks</a>.
      </p>
    </div>
  );
}
