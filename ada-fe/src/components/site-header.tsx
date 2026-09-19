import Link from 'next/link';
import { LogOut, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { logoutAction } from '@/actions/auth.actions';
import { getSession } from '@/lib/api';
import { getCart } from '@/lib/cart-api';

export async function SiteHeader() {
  const user = await getSession();
  const cart = user ? await getCart().catch(() => null) : null;
  return (
    <header className="site-header">
      <div className="announcement">
        <span>Pengiriman Jabodetabek & seluruh Indonesia</span>
        <span>Butuh penawaran proyek? <strong>Hubungi tim kami</strong></span>
      </div>
      <div className="nav-wrap container">
        <details className="mobile-menu">
          <summary aria-label="Buka navigasi"><Menu size={21} /></summary>
          <div className="mobile-drawer">
            <div className="drawer-heading"><strong>Menu</strong><X size={20} /></div>
            <Link href="/">Beranda</Link><Link href="/products">Produk</Link><Link href="/#categories">Kategori</Link><Link href="/quotation">Penawaran</Link><Link href="/#about">Tentang Kami</Link>
          </div>
        </details>
        <Link href="/" className="brand-mark">
          <span className="brand-symbol">AD</span>
          <span><strong>ARGA DAMAR</strong><small>Industrial Supply</small></span>
        </Link>
        <nav className="desktop-nav" aria-label="Navigasi utama">
          <Link href="/">Beranda</Link>
          <Link href="/products">Produk</Link>
          <Link href="/#categories">Kategori</Link>
          <Link href="/quotation">Penawaran</Link>
          <Link href="/#about">Tentang Kami</Link>
        </nav>
        <div className="nav-actions">
          <Link href="/products" className="icon-button" aria-label="Cari produk"><Search size={19} /></Link>
          <Link className="icon-button" href="/cart" aria-label="Keranjang">
            <ShoppingBag size={19} /><span className="cart-badge" aria-label={user && !cart ? 'Jumlah keranjang belum tersedia' : `${cart?.itemCount ?? 0} item dalam keranjang`}>{user && !cart ? '–' : cart?.itemCount ?? 0}</span>
          </Link>
          {user ? (
            <div className="user-menu">
              {['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(user.role) && <Link href="/admin">Admin</Link>}
              <Link href="/account/profile"><UserRound size={17} /> {user.fullName.split(' ')[0]}</Link>
              <form action={logoutAction}>
                <button aria-label="Keluar"><LogOut size={16} /></button>
              </form>
            </div>
          ) : (
            <Link className="nav-login" href="/login">Masuk</Link>
          )}
        </div>
      </div>
    </header>
  );
}
