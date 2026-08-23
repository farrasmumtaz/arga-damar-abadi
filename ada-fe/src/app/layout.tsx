import type { Metadata } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Arga Damar Abadi', template: '%s — Arga Damar' },
  description: 'Material dan peralatan berkualitas untuk kebutuhan proyek Anda.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        {children}
      </body>
    </html>
  );
}
