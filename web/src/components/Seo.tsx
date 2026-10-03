import { useEffect } from 'react';

export const SITE_URL = 'https://stack.slyxup.com';
const SITE_NAME = 'SlyxUp Stack';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Per-route SEO: title, description, canonical, OG/Twitter + optional JSON-LD. */
export function Seo({
  title,
  description,
  path = '/',
  type = 'website',
  jsonLd,
  robots = 'index, follow',
}: {
  title: string;
  description: string;
  path?: string;
  type?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  robots?: string;
}) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    const fullTitle =
      path === '/' ? title : `${title} — ${SITE_NAME}`;
    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', robots);
    let canon =
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement('link');
      canon.setAttribute('rel', 'canonical');
      document.head.appendChild(canon);
    }
    canon.setAttribute('href', url);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);

    const existing = document.getElementById('seo-jsonld');
    existing?.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = 'seo-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, path, type, jsonLd]);

  return null;
}

export function orgJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SlyxUp Stack',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    sameAs: ['https://github.com/slyxup/stack'],
  };
}

export function softwareJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SlyxUp Stack',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cloudflare Workers',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: SITE_URL,
    description:
      'Open-source auth and Paddle billing on Cloudflare Workers. MIT licensed, self-hostable with drop-in React components.',
  };
}

export function articleJsonLd(opts: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: opts.title,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    author: { '@type': 'Person', name: 'Yasir Hameed', url: 'https://ysr-hameed.github.io/' },
  };
}
