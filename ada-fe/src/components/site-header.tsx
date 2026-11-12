import Link from 'next/link';
import { LogOut, Search, ShoppingBag, UserRound } from 'lucide-react';
import { MobileNavigation } from './mobile-navigation';
import { logoutAction } from '@/actions/auth.actions';
import { getSession } from '@/lib/api';
import { getCart } from '@/lib/cart-api';
import { isStoreStaff } from '@/lib/admin-role';

export async function SiteHeader() {
  const user = await getSession();
  const managesStore = Boolean(user && isStoreStaff(user.role));
  const cart = user && !managesStore ? await getCart().catch(() => null) : null;
  return <header className="site-header">
    <div className="announcement"><div className="container announcement-inner"><span>Kebutuhan material untuk rumah, usaha, dan proyek</span><Link href="/quotation">Butuh penawaran proyek?</Link></div></div>
    <div className="container nav-wrap">
      <MobileNavigation label="Navigasi">{managesStore ? <><Link href="/admin">Dashboard toko</Link><Link href="/admin/profile">Profil admin</Link><Link href="/">Lihat toko</Link></> : <><Link href="/">Beranda</Link><Link href="/products">Semua produk</Link><Link href="/#categories">Kategori</Link><Link href="/quotation">Penawaran proyek</Link><Link href="/#about">Tentang kami</Link>{user && <Link href="/account/profile">Akun saya</Link>}</>}</MobileNavigation>
      <Link href="/" className="brand-mark" aria-label="Arga Damar Abadi, beranda"><span className="brand-symbol">AD</span><span><strong>ARGA DAMAR</strong><small>Material & peralatan listrik</small></span></Link>
      {!managesStore && <form className="header-search" action="/products" method="get" role="search"><label className="sr-only" htmlFor="header-search">Cari produk atau SKU</label><Search size={19} aria-hidden="true" /><input id="header-search" name="search" type="search" placeholder="Cari produk atau SKU" /><button type="submit">Cari</button></form>}
      <div className="nav-actions">
        {!managesStore && <Link className="header-action cart-action" href="/cart" aria-label={user && !cart ? 'Keranjang, jumlah belum tersedia' : `Keranjang, ${cart?.itemCount ?? 0} item`}><ShoppingBag size={20}/><span>Keranjang</span><span className="cart-badge" aria-hidden="true">{user && !cart ? '–' : cart?.itemCount ?? 0}</span></Link>}
        {user ? <div className="user-menu">{managesStore && <Link className="dashboard-link" href="/admin">Dashboard toko</Link>}<Link className="header-action account-action" href={managesStore ? '/admin/profile' : '/account/profile'}><UserRound size={20}/><span>{managesStore ? 'Profil admin' : user.fullName.split(' ')[0]}</span></Link><form action={logoutAction}><button className="header-logout" aria-label="Keluar"><LogOut size={18}/></button></form></div> : <Link className="header-login" href="/login"><UserRound size={19}/> <span>Masuk</span></Link>}
      </div>
    </div>
    {!managesStore && <nav className="store-nav" aria-label="Navigasi utama"><div className="container store-nav-inner"><Link href="/">Beranda</Link><Link href="/products">Semua produk</Link><Link href="/#categories">Kategori</Link><Link href="/quotation">Penawaran proyek</Link><Link href="/#about">Tentang kami</Link></div></nav>}
  </header>;
}
