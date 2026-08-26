import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Checkout
import { BillingClient } from '@slyxup/billing';
const billing = new BillingClient();

const plans   = await billing.listPlans(projectId);
const session = await client.sessions.get();          // need auth first
await billing.checkout(planId); // redirects to hosted Paddle checkout
window.location.href = url;                            // Paddle hosted checkout

// After payment: Paddle fires webhook -> subscription.created
// -> subscription row in D1 -> useSubscription() reflects it
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>Checkout</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Payments run through Paddle-hosted checkout — you never touch card data and never need a payment PCI scope. SlyxUp creates the checkout session and maps the webhook back to your project.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>1. List plans</h2>
      <CodeBlock>{`import { BillingClient } from '@slyxup/billing';
const billing = new BillingClient();
const plans = await billing.listPlans('prj_your-project-id');
// [{ id, name, price, interval, features[] }]`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>2. Get a checkout URL</h2>
      <p style={{ color: '#7c8195', fontSize: 14, lineHeight: 1.7 }}>The user must be signed in — the session token is what links the eventual subscription to the buyer:</p>
      <CodeBlock>{`const { sessionToken } = await client.sessions.get();
await billing.checkout(planId); // redirects to Paddle
window.location.href = url;`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>3. React hook shortcut</h2>
      <CodeBlock>{`import { usePlans, useSubscription } from '@slyxup/react';
const { plans } = usePlans(projectId);
const { subscription } = useSubscription();
<button onClick={() => checkout(plans[0].id)}>Upgrade to Pro</button>`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>After payment</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, lineHeight: 1.7 }}>
        Paddle calls your webhook (<code>POST /v1/webhooks/paddle</code>), the signature is verified, and a subscription row is written to D1. The user is redirected back to your <code>success_url</code>. See <a href="/docs/billing/webhooks" style={{ color: '#6366f1' }}>Webhooks</a> for the event lifecycle.
      </p>
    </div>
  );
}
