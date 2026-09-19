import type { Metadata } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import './globals.css';
import { cookies } from 'next/headers';
import { SessionRefresh } from '@/components/session-refresh';
import { accessExpiresAt } from '@/lib/session-security';

export const metadata: Metadata = {
  title: { default: 'Arga Damar Abadi', template: '%s — Arga Damar' },
  description: 'Material dan peralatan berkualitas untuk kebutuhan proyek Anda.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessionCookies = await cookies();
  return (
    <html lang="id">
      <body>
        <SessionRefresh available={sessionCookies.has('refresh_token')} expiresAt={accessExpiresAt(sessionCookies.get('access_token')?.value)} />
        {children}
      </body>
    </html>
  );
}
