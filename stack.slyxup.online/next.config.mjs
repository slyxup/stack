/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dynamic dashboard needs SSR, not static export — deploy via opennext Workers
  images: { unoptimized: true },
};
export default nextConfig;
