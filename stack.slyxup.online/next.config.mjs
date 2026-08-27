/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: not `output: 'export'` — the dashboard (/dashboard/[projectId]/*) is
  // an authenticated, data-driven app rendered on demand. opennextjs-cloudflare
  // handles both static marketing pages and these dynamic routes.
  images: { unoptimized: true },
};
export default nextConfig;
