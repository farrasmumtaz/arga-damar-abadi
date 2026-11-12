'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export function AccountNav() { const path = usePathname(); return <nav className="account-nav" aria-label="Navigasi akun">{[['/account/profile','Profil & Alamat'],['/account/security','Keamanan'],['/account/orders','Pesanan'],['/account/quotations','Penawaran']].map(([href,label]) => <Link key={href} href={href} aria-current={path === href || path.startsWith(`${href}/`) ? 'page' : undefined}>{label}</Link>)}</nav>; }
