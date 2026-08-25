import type { ReactNode } from 'react';
import { SITE_CSS } from '../lib/site-css';

export const metadata = {
  title: 'SlyxUp — Auth for the edge. Open-source, self-hostable.',
  description:
    'Open-source authentication on Cloudflare Workers + D1. Email/password, Google & GitHub OAuth, sessions, SDKs for React and Next.js, prebuilt UI, CLI-first setup.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: SITE_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
