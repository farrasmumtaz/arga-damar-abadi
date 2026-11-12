import Link from 'next/link';

export function SiteFooter() {
  return <footer className="site-footer" id="about"><div className="container footer-grid">
    <div className="footer-intro"><Link href="/" className="footer-wordmark">ARGA DAMAR<span>ABADI</span></Link><p>Material dan peralatan listrik untuk kebutuhan rumah, usaha, dan proyek.</p></div>
    <div><h2>Jelajahi</h2><Link href="/products">Katalog produk</Link><Link href="/#categories">Kategori</Link><Link href="/quotation">Penawaran proyek</Link></div>
    <div><h2>Akun</h2><Link href="/account/profile">Profil & alamat</Link><Link href="/account/orders">Pesanan saya</Link><Link href="/account/quotations">Penawaran saya</Link></div>
    <div><h2>Hubungi kami</h2><a href="mailto:sales@argadamar.co.id">sales@argadamar.co.id</a><a href="tel:+62215550188">+62 21 555 0188</a><span>Senin–Sabtu, 08.00–17.00</span></div>
  </div><div className="container footer-bottom"><span>© {new Date().getFullYear()} PT Arga Damar Abadi</span><span>Foto ilustrasi dari <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a></span></div></footer>;
}
