// Real local D1/workerd integration tests. Never uses production bindings.
import { createRequire } from 'node:module';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
const require = createRequire(import.meta.url);
const tools = createRequire(require.resolve('wrangler/package.json'));
const { Miniflare, convertV4MiniflareOptions } = tools('miniflare');
const runtime = (options) => new Miniflare(convertV4MiniflareOptions({ ...options, workers: options.workers.map(worker => ({ ...worker, modulesRoot: '/tmp/opencode/slyxup-runtime-tests' })) }));
const esbuild = tools('esbuild');
const root = new URL('../', import.meta.url).pathname;
const temp = '/tmp/opencode/slyxup-runtime-tests';
await mkdir(temp, { recursive: true });

async function bundle(name, source) {
  const file = `${temp}/${name}.mjs`;
  await esbuild.build({ stdin: { contents: source, resolveDir: root, sourcefile: `${name}.ts`, loader: 'ts' }, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outfile: file });
  return file;
}
async function migrate(db, dir) {
  for (const name of (await readdir(dir)).filter(name => name.endsWith('.sql')).sort()) {
    const sql = (await readFile(`${dir}/${name}`, 'utf8')).replace(/^\s*--.*$/gm, '');
    // D1 exec expects one statement per line; use prepare for migration statements.
    for (const statement of sql.split('--> statement-breakpoint').flatMap(chunk => chunk.split(';')).map(s => s.replace(/\/\*[\s\S]*?\*\//g, '').trim()).filter(Boolean)) {
      try { await db.prepare(statement).run(); } catch (error) { throw new Error(`${name}: ${statement.slice(0, 180)}`, { cause: error }); }
    }
  }
}
const scriptPath = await bundle('auth-challenges', `
import { issueChallenge, consumeChallenge, pkceChallenge } from './auth/src/services/challenge.service';
import oauth from './auth/src/routes/oauth';
export default { async fetch(req, env, ctx) {
 const url = new URL(req.url);
 if (url.pathname === '/issue') return Response.json({token: await issueChallenge(env, 'two_factor', {userId:'fixture'}, 60)});
 if (url.pathname === '/consume') return Response.json({won: !!await consumeChallenge(env, 'two_factor', url.searchParams.get('token'))});
 if (url.pathname === '/issue-exchange') return Response.json({code: await issueChallenge(env, 'oauth_exchange', {userId:'fixture-user',projectId:null,redirectUrl:'https://app.example/callback',appChallenge:await pkceChallenge('a'.repeat(64))}, 120)});
 return oauth.fetch(req, env, ctx);
} };
`);
const auth = runtime({ workers: [{ name: 'auth', modules: true, scriptPath, compatibilityDate: '2025-07-18', d1Databases: ['DB'], bindings: { APP_URL: 'https://app.example', HOSTED_AUTH_URL: 'https://auth.example', GOOGLE_CLIENT_ID: 'fixture' } }] });
try {
  const db = await auth.getD1Database('DB');
  await migrate(db, `${root}auth/migrations`);
  const { token } = await (await auth.dispatchFetch('https://auth.example/issue')).json();
  const results = await Promise.all(Array.from({length: 10}, () => auth.dispatchFetch(`https://auth.example/consume?token=${token}`).then(r => r.json())));
  assert.equal(results.filter(r => r.won).length, 1, 'one-time challenge must have one winner');
  const response = await auth.dispatchFetch('https://auth.example/google?redirect_url=https://app.example', { redirect: 'manual' });
  assert.equal(response.status, 302);
  const provider = new URL(response.headers.get('Location'));
  assert.equal(provider.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(provider.searchParams.get('code_challenge').length, 43);
  assert.match(response.headers.get('Set-Cookie'), /HttpOnly/);
  const state = provider.searchParams.get('state');
  const mismatch = await auth.dispatchFetch(`https://auth.example/callback/google?state=${state}&code=fake`, { redirect: 'manual' });
  assert.match(mismatch.headers.get('Location'), /browser_mismatch/);
  await db.prepare("INSERT INTO users (id,email,email_verified,role,created_at,updated_at) VALUES ('fixture-user','fixture@example.com',1,'user',1,1)").run();
  const { code } = await (await auth.dispatchFetch('https://auth.example/issue-exchange')).json();
  const exchange = verifier => auth.dispatchFetch('https://auth.example/exchange', {method:'POST',headers:{'Content-Type':'application/json',Origin:'https://app.example'},body:JSON.stringify({code,verifier})});
  assert.equal((await exchange('b'.repeat(64))).status,401);
  const exchanges = await Promise.all([exchange('a'.repeat(64)),exchange('a'.repeat(64))]);
  assert.deepEqual(exchanges.map(r=>r.status).sort(),[200,401]);
  assert.equal((await db.prepare("SELECT count(*) AS n FROM sessions WHERE user_id='fixture-user'").first()).n,1);
  console.log('PASS real D1: concurrent challenge consumption, OAuth PKCE and browser-state binding');
} finally { await auth.dispose(); }

const billingPath = await bundle('billing-webhooks', `import routes from './billing/src/routes/webhooks'; export default {fetch:(req,env,ctx)=>routes.fetch(req,env,ctx)};`);
const secret = 'local-test-signature-secret';
const billing = runtime({ workers: [{ name: 'billing', modules: true, scriptPath: billingPath, compatibilityDate: '2025-07-18', d1Databases: ['DB'], bindings: { PADDLE_WEBHOOK_SECRET: secret, PADDLE_API_KEY: 'fixture', PADDLE_ENVIRONMENT: 'sandbox' } }] });
try {
  const db = await billing.getD1Database('DB');
  await migrate(db, `${root}billing/migrations`);
  await db.prepare("INSERT INTO plans (id,project_id,name,paddle_price_id,amount,currency,interval,trial_days,features,is_popular,is_active,sort_order,created_at,updated_at) VALUES ('plan','project','Pro','pri_fixture',1000,'USD','month',0,'[\"export\"]',0,1,0,1,1)").run();
  await db.prepare("INSERT INTO subscriptions (id,project_id,user_id,plan_id,paddle_subscription_id,status,created_at,updated_at) VALUES ('sub','project','user','plan','sub_fixture','active',1,1)").run();
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  async function deliver(id, occurred, status) {
    const body = JSON.stringify({event_id:id,event_type:'subscription.updated',occurred_at:occurred,data:{id:'sub_fixture',status,customer_id:'ctm_fixture',items:[{price:{id:'pri_fixture'}}],current_billing_period:{starts_at:'2026-09-01T00:00:00Z',ends_at:'2026-10-01T00:00:00Z'}}});
    const ts = Math.floor(Date.now()/1000);
    const signature = Buffer.from(await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}:${body}`))).toString('hex');
    return billing.dispatchFetch('https://billing.example/paddle', {method:'POST',headers:{'Paddle-Signature':`ts=${ts};h1=${signature}`},body});
  }
  assert.equal((await deliver('evt_new','2026-09-09T12:00:00Z','canceled')).status, 200);
  assert.equal((await deliver('evt_old','2026-09-09T11:00:00Z','active')).status, 200);
  assert.equal((await db.prepare("SELECT status FROM subscriptions WHERE id='sub'").first()).status,'canceled');
  await db.prepare("INSERT INTO webhook_events (id,paddle_event_id,event_type,status,created_at,lease_until,lease_token) VALUES ('stale','evt_stale','subscription.updated','pending',1,1,'dead-worker')").run();
  assert.equal((await deliver('evt_stale','2026-09-09T13:00:00Z','paused')).status, 200);
  const responses = await Promise.all(Array.from({length:5}, () => deliver('evt_concurrent','2026-09-09T14:00:00Z','active')));
  assert.ok(responses.every(r => r.status === 200 || r.status === 503));
  assert.equal((await db.prepare("SELECT status FROM webhook_events WHERE paddle_event_id='evt_concurrent'").first()).status,'completed');
  assert.equal((await db.prepare("SELECT status FROM subscriptions WHERE id='sub'").first()).status,'active');
  console.log('PASS real D1: webhook signature, out-of-order events, stale lease recovery and concurrent duplicate delivery');
} finally { await billing.dispose(); }
