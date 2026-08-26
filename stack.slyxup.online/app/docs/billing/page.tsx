import { CodeBlock, CopyForLLM } from '../copy';
const LLM = `# Billing — Paddle
npm install @slyxup/billing
import { BillingClient } from '@slyxup/billing';
const billing = new BillingClient();
const plans = await billing.listPlans(projectId);
await billing.checkout(planId); // redirects to Paddle
`;
export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>Billing Overview</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Full billing system built on Paddle — plans, subscriptions, checkout, webhooks, and invoices. No Stripe needed.</p>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Plans</h2>
      <CodeBlock>{`// Create in D1: plans table
// amount in cents, interval month/year, trialDays, features[]
const plans = await billing.listPlans(projectId);
// → [{ id, name: "Pro", amount: 1999, currency: "USD", interval: "month", features: ["Unlimited projects"] }]`}</CodeBlock>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Checkout</h2>
      <CodeBlock>{`import { BillingClient } from '@slyxup/billing';
const billing = new BillingClient();
await billing.checkout(planId); // redirects to Paddle
// redirect user to url — Paddle handles payment, then webhook creates subscription`}</CodeBlock>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Webhooks</h2>
      <p style={{ color: '#7c8195', fontSize: 14 }}>Configure in Paddle: <code>https://billing.slyxup.online/v1/webhooks/paddle</code> — handles <code>subscription.created</code> <code>subscription.canceled</code> <code>transaction.completed</code></p>
    </div>
  );
}
