import type { ReactNode } from 'react';

export const metadata = { title: 'SlyxUp Demo — SaaS Platform' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
            *{box-sizing:border-box;margin:0;padding:0}
            body{font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f7f7fa;color:#16161d}
            a{color:inherit;text-decoration:none}
          `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
