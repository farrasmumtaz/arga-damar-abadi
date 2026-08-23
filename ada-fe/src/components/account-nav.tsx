import Link from 'next/link';
export function AccountNav() { return <nav className="account-nav"><Link href="/account/profile">Profil & Alamat</Link><Link href="/account/orders">Pesanan</Link><Link href="/account/quotations">Penawaran</Link></nav>; }
