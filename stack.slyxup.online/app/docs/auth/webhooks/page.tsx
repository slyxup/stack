import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Auth Webhooks
// Register an endpoint (auth worker, authenticated management API)
POST /v1/audit/webhooks   { "projectId": "...", "url": "https://app.example.com/hook", "events": ["*"] }
// -> 201 { ok:true, id, url, secret: "whsec_...", events }

// Signed delivery (HMAC-SHA256, Paddle-compatible)
X-SlyxUp-Event: user.created
X-SlyxUp-Signature: t=<unix>,h1=<hex hmac-sha256(whsec, body)>
X-SlyxUp-Webhook-Id: <endpoint id>

{
  "event": "user.created",
  "type": "user.created",
  "data": { "id": "...", "email": "ada@example.com" },
  "created_at": "2026-01-01T00:00:00.000Z"
}

// Events: user.created/updated/deleted/signed_in/signed_out,
//   session.revoked, password.changed/reset, email.verified,
//   oauth.linked/unlinked, 2fa.enabled/disabled
`;

export default function Page() {
  return (
    <div>
      <div className="fw-head">
        <h1 className="h-doc">Webhooks</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p className="prose-p">
        Auth events are delivered to registered endpoints as signed HTTP POSTs. Use them to sync user state into your
        own database, trigger welcome emails, or alert on security events.
      </p>

      <h2 className="h-sec">Register an endpoint</h2>
      <p className="prose-p">
        Create a webhook endpoint for a project via the management API. SlyxUp returns a <code className="inl">whsec_</code>{' '}
        secret you use to verify deliveries.
      </p>
      <CodeBlock>{`POST https://auth.slyxup.online/v1/audit/webhooks
{ "projectId": "proj_xxx", "url": "https://app.example.com/slyxup-hook", "events": ["*"] }

// 201
{
  "ok": true,
  "id": "whk_xxx",
  "url": "https://app.example.com/slyxup-hook",
  "secret": "whsec_<random>",
  "events": ["*"]
}`}</CodeBlock>
      <div className="prose-note">
        <b>Subscribe selectively:</b> pass <code className="inl">events</code> (e.g.{' '}
        <code className="inl">{`["user.created", "2fa.enabled"]`}</code>) instead of{' '}
        <code className="inl">{`["*"]`}</code> to receive only the events you care about.
      </div>

      <h2 className="h-sec">Verify the signature</h2>
      <p className="prose-p">
        Each delivery is signed with <b>HMAC-SHA256</b> over the raw request body using the endpoint's{' '}
        <code className="inl">whsec_</code> secret — the same scheme Paddle uses. Verify to be sure the request really
        came from SlyxUp, then parse <code className="inl">X-SlyxUp-Event</code> for the event name.
      </p>
      <CodeBlock
        variants={{
          js: `import { createHmac, timingSafeEqual, createHash } from 'node:crypto';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('X-SlyxUp-Signature') ?? ''; // "t=...,h1=..."
  const event = req.headers.get('X-SlyxUp-Event');
  const h1 = sig.split(',').find((p) => p.startsWith('h1='))?.slice(3) ?? '';

  const expected = createHmac('sha256', WH_SECRET).update(body).digest('hex');
  const a = Buffer.from(h1);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response('invalid signature', { status: 401 });
  }

  const payload = JSON.parse(body); // { event, type, data, created_at }
  switch (event) {
    case 'user.created': await onUserCreated(payload.data); break;
    // ...
  }
  return new Response('ok', { status: 200 });
}`,
        }}
      />

      <h2 className="h-sec">Events</h2>
      <CodeBlock>{`user.created        user.signed_in
user.updated        user.signed_out
user.deleted        session.revoked
password.changed    password.reset
email.verified      oauth.linked
                    oauth.unlinked
2fa.enabled         2fa.disabled`}</CodeBlock>
      <p className="prose-p">
        The payload body always follows the shape{' '}
        <code className="inl">{`{ event, type, data, created_at }`}</code>, where{' '}
        <code className="inl">data</code> carries the relevant identifiers (e.g.{' '}
        <code className="inl">{`{ id, email }`}</code> for user events,{' '}
        <code className="inl">{`{ provider }`}</code> for OAuth events).
      </p>
    </div>
  );
}
