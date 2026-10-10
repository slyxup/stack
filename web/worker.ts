import {
  DOC_GROUPS,
  DOC_MARKDOWN,
  DOC_PAGES,
  docsInGroup,
  getDoc,
} from './src/docs/manifest';

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

// ── AI-readable docs ──────────────────────────────────────────────
// /docs is a client-rendered SPA: browsers run JS, but AI agents, web-search
// fetchers and curl only read the raw HTML shell (empty). So when the caller
// looks like a bot/agent — or explicitly asks for markdown — this Worker
// serves the SAME /docs and /docs/:slug URLs as complete server-rendered
// content. Browsers are untouched (they still get the SPA).
// Just share https://stack.slyxup.com/docs with any agent — it can read it.

const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|gptbot|claudebot|anthropic|chatgpt|perplexity|ccbot|bytespider|facebookexternalhit|twitterbot|linkedinbot|embedly|semrush|ahrefs|mj12bot|dotbot|petalbot|yandex|baidu|sogou|exabot|curl|wget|python-requests|python-urllib|http\.client|axios|node-fetch|undici|headless|phantom|playwright|puppeteer|lighthouse|pagespeed|discordbot|slackbot|telegrambot|whatsapp|validator|rendertron|prerender/i;

function wantsReadableDocs(request: Request): 'html' | 'md' | null {
  const url = new URL(request.url);
  const fmt = url.searchParams.get('format') ?? url.searchParams.get('raw');
  if (fmt === 'md' || fmt === 'markdown' || fmt === '1') return 'md';
  const accept = request.headers.get('Accept') ?? '';
  if (/text\/markdown/.test(accept)) return 'md';
  if (/text\/plain/.test(accept) && !/text\/html/.test(accept)) return 'md';
  const ua = request.headers.get('User-Agent') ?? '';
  if (BOT_UA.test(ua)) return 'html';
  return null;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdInline(s: string): string {
  let out = escHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

/** Minimal Markdown → HTML (headings, lists, fences, paragraphs + inline). */
function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inList = false;
  let inCode = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      closeList();
      out.push(inCode ? '</code></pre>' : '<pre><code>');
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(escHtml(line));
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = Math.min(h[1].length + 1, 4);
      out.push(`<h${level}>${mdInline(h[2])}</h${level}>`);
      continue;
    }
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (li) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${mdInline(li[1])}</li>`);
      continue;
    }
    if (/^\s*$/.test(line)) {
      closeList();
      continue;
    }
    closeList();
    out.push(`<p>${mdInline(line)}</p>`);
  }
  closeList();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

const DOCS_CSS = `body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:860px;margin:0 auto;padding:32px 20px;color:#111;line-height:1.65;background:#fff}a{color:#0b5fff}pre{background:#f4f4f5;padding:12px;border-radius:8px;overflow:auto}code{font-family:ui-monospace,monospace;font-size:.9em}pre code{background:none}h1{font-size:28px}h2{font-size:22px;margin-top:32px}h3{font-size:18px}nav.toc{background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;padding:16px 20px;margin:20px 0}article{border-top:1px solid #e4e4e7;padding:24px 0}footer{margin-top:32px;color:#71717a;font-size:13px}`;

function docsShell(title: string, desc: string, canonical: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escHtml(title)} — SlyxUp Docs</title>
<meta name="description" content="${escHtml(desc)}" />
<link rel="canonical" href="${escHtml(canonical)}" />
<style>${DOCS_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function docsIndexBody(host: string): string {
  const toc = DOC_GROUPS.map((g) => {
    const items = docsInGroup(g)
      .map(
        (d) =>
          `<li><a href="https://${host}/docs/${d.slug}">${escHtml(d.title)}</a> — ${escHtml(d.excerpt)}</li>`
      )
      .join('\n');
    return `<h2>${escHtml(g)}</h2>\n<ul>\n${items}\n</ul>`;
  }).join('\n');
  const full = DOC_PAGES.map(
    (d) =>
      `<article id="${escHtml(d.slug)}">\n<h2>${escHtml(d.title)}</h2>\n<p><em>${escHtml(d.excerpt)}</em></p>\n${mdToHtml(DOC_MARKDOWN[d.slug] ?? d.excerpt)}\n<p><a href="https://${host}/docs/${d.slug}">Permalink</a></p>\n</article>`
  ).join('\n');
  return `<h1>SlyxUp Stack Documentation</h1>
<p>Open-source auth + billing on Cloudflare Workers. ${DOC_PAGES.length} guides below — the full text of every page is on this URL, so AI agents can read it directly with no bundle download.</p>
<nav class="toc"><strong>Contents</strong>${toc}</nav>
${full}
<footer>Auth + Billing docs · <a href="https://${host}/llms.txt">llms.txt</a> · <a href="https://${host}/docs">index</a></footer>`;
}

function docsIndexMarkdown(host: string): string {
  const parts = [
    '# SlyxUp Stack Documentation',
    '',
    `Open-source auth + billing on Cloudflare Workers. ${DOC_PAGES.length} guides — full text below, one file, no download needed.`,
    '',
  ];
  for (const g of DOC_GROUPS) {
    parts.push(`## ${g}`, '');
    for (const d of docsInGroup(g)) {
      parts.push(
        `### ${d.title}`,
        '',
        `${d.excerpt}`,
        '',
        `${DOC_MARKDOWN[d.slug] ?? ''}`,
        '',
        `Permalink: https://${host}/docs/${d.slug}`,
        ''
      );
    }
  }
  return parts.join('\n');
}

function docPageResponse(
  request: Request,
  kind: 'html' | 'md',
  slug: string
): Response | null {
  const meta = getDoc(slug);
  if (!meta) return null;
  const host = new URL(request.url).host;
  const canonical = `https://${host}/docs/${meta.slug}`;
  if (kind === 'md') {
    const md = `# ${meta.title}\n\n> ${meta.excerpt}\n\n${DOC_MARKDOWN[meta.slug] ?? ''}\n\n---\nCanonical: ${canonical}\n`;
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
  const i = DOC_PAGES.findIndex((d) => d.slug === slug);
  const prev = i > 0 ? DOC_PAGES[i - 1] : undefined;
  const next = i < DOC_PAGES.length - 1 ? DOC_PAGES[i + 1] : undefined;
  const nav = `<p>${prev ? `<a href="https://${host}/docs/${prev.slug}">← ${escHtml(prev.title)}</a>` : ''} · <a href="https://${host}/docs">All docs</a>${next ? ` · <a href="https://${host}/docs/${next.slug}">${escHtml(next.title)} →</a>` : ''}</p>`;
  const body = `<h1>${escHtml(meta.title)}</h1>\n<p><em>${escHtml(meta.excerpt)}</em></p>\n${nav}\n${mdToHtml(DOC_MARKDOWN[meta.slug] ?? meta.excerpt)}\n${nav}\n<footer>Canonical: <a href="${escHtml(canonical)}">${escHtml(canonical)}</a></footer>`;
  return new Response(docsShell(meta.title, meta.excerpt, canonical, body), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname.startsWith('/v1/billing/'))
      return proxyBillingPay(request, env);
    if (request.method === 'GET' && (pathname === '/docs' || pathname === '/docs/')) {
      const kind = wantsReadableDocs(request);
      if (kind === 'md')
        return Promise.resolve(
          new Response(docsIndexMarkdown(url.host), {
            headers: {
              'Content-Type': 'text/markdown; charset=utf-8',
              'Cache-Control': 'public, max-age=3600',
            },
          })
        );
      if (kind === 'html')
        return Promise.resolve(
          new Response(
            docsShell(
              'Documentation',
              `${DOC_PAGES.length} guides for SlyxUp auth + billing — full text on this page.`,
              `https://${url.host}/docs`,
              docsIndexBody(url.host)
            ),
            {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
              },
            }
          )
        );
      return env.ASSETS.fetch(request);
    }
    const slugMatch = /^\/docs\/([a-z0-9-]+)\/?$/.exec(pathname);
    if (request.method === 'GET' && slugMatch) {
      const kind = wantsReadableDocs(request);
      if (kind) {
        const res = docPageResponse(request, kind, slugMatch[1]);
        if (res) return Promise.resolve(res);
      }
      return env.ASSETS.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
