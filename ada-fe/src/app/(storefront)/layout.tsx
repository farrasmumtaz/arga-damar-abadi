import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export default function StorefrontLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><a className="skip-link" href="#main-content">Langsung ke konten</a><SiteHeader/><main id="main-content">{children}</main><SiteFooter/></>;
}
