interface Env {
  AUTH_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incoming = new URL(request.url);
    const origin = new URL(env.AUTH_ORIGIN);
    const target = new URL(incoming.pathname + incoming.search, origin);
    const headers = new Headers(request.headers);

    headers.delete('host');
    headers.set('x-forwarded-host', incoming.host);
    headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''));

    const upstream = await fetch(
      new Request(target, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      })
    );

    const responseHeaders = new Headers(upstream.headers);
    const location = responseHeaders.get('Location');
    if (location) {
      try {
        const redirect = new URL(location);
        if (redirect.hostname === origin.hostname) {
          redirect.protocol = incoming.protocol;
          redirect.hostname = incoming.hostname;
          redirect.port = incoming.port;
          responseHeaders.set('Location', redirect.toString());
        }
      } catch {
        // Preserve non-URL Location headers unchanged.
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler<Env>;
