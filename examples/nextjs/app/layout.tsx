import type { ReactNode } from 'react';

export const metadata = { title: 'SlyxUp Demo — SaaS Platform' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            *{box-sizing:border-box;margin:0;padding:0}
            body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f7f7fa;color:#16161d}
            a{color:inherit;text-decoration:none}
          `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
