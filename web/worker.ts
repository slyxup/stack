interface Env {
  ASSETS: Fetcher;
  BILLING_UPSTREAM: string;
}

async function proxyBillingPay(request: Request, env: Env): Promise<Response> {
  const incoming = new URL(request.url);
  const upstreamPath = incoming.pathname === '/pay/' ? '/pay' : incoming.pathname;
  const target = new URL(upstreamPath, env.BILLING_UPSTREAM);
  target.search = incoming.search;
  const upstream = await fetch(new Request(target, request));
  const headers = new Headers(upstream.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/v1/billing/'))
      return proxyBillingPay(request, env);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
