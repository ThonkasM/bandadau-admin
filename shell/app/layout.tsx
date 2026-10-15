import './globals.css';

import { themeScript } from '@bandada/ui-tokens/theme-script';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: { default: 'Bandada U — Admin', template: '%s · Bandada U' },
  description: 'Panel de administración de Bandada U',
  icons: { icon: '/favicon.svg' },
  // Los códigos de traspaso SSO viajan en la URL de /sso/callback: nada de Referer.
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `data-theme` lo fija el script inline antes del primer pintado (sin parpadeo).
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F7F7F5" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0F1419" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
