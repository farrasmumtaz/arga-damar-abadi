import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer" id="about">
      <div className="container footer-grid">
        <div>
          <div className="brand-mark footer-brand"><span className="brand-symbol">AD</span><span><strong>ARGA DAMAR</strong><small>Industrial Supply</small></span></div>
          <p>Partner pengadaan material dan peralatan terpercaya untuk kebutuhan rumah, usaha, dan proyek Anda.</p>
        </div>
        <div><h4>Belanja</h4><Link href="/#products">Semua produk</Link><Link href="/#categories">Kategori</Link><Link href="/login">Akun saya</Link></div>
        <div><h4>Bantuan</h4><span>Senin–Sabtu, 08.00–17.00</span><span>sales@argadamar.co.id</span><span>+62 21 555 0188</span></div>
      </div>
      <div className="container footer-bottom">© 2026 PT Arga Damar Abadi <span>Harga transparan · Produk terkurasi · Dukungan teknis</span></div>
    </footer>
  );
}
