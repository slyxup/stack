import type { ReactNode } from 'react';
import ThemeInit from './theme-init';

export const metadata = { title: 'Shrinkr — URL Shortener' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
            *{box-sizing:border-box;margin:0;padding:0}
            body{font-family:"Inter",sans-serif;background:#09090b;color:#fafafa}
            a{color:inherit;text-decoration:none}
          `,
          }}
        />
      </head>
      <body>
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
