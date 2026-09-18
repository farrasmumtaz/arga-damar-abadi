import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2, Headphones, PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { categories } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-api';

export default async function HomePage() {
  const catalog = await getProducts().then(products => ({ products, unavailable: false })).catch(() => ({ products: [], unavailable: true }));
  const products = catalog.products;
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Solusi pengadaan terpercaya</p>
            <h1>Material terbaik.<br /><em>Proyek tanpa kompromi.</em></h1>
            <p className="hero-lead">Produk teknik dan material terkurasi untuk menjaga pekerjaan Anda bergerak—tepat mutu, tepat waktu.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="#products">Lihat produk <ArrowRight size={18} /></Link>
              <Link className="button button-secondary" href="/quotation">Minta penawaran</Link>
            </div>
            <div className="hero-proof"><span><strong>500+</strong> Produk</span><span><strong>40+</strong> Brand</span><span><strong>12 th</strong> Pengalaman</span></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="blueprint-grid" />
            <div className="hero-disc"><span>AD</span></div>
            <div className="floating-label label-one"><small>Kualitas</small><strong>Teruji</strong></div>
            <div className="floating-label label-two"><small>Pengiriman</small><strong>Terpantau</strong></div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-grid">
          <span><BadgeCheck /> Produk original<small>Jaminan mutu terverifikasi</small></span>
          <span><Truck /> Pengiriman andal<small>Ke seluruh Indonesia</small></span>
          <span><Headphones /> Konsultasi teknis<small>Tim siap membantu</small></span>
          <span><PackageCheck /> Stok terpantau<small>Informasi selalu aktual</small></span>
        </div>
      </section>

      <section className="section container" id="categories">
        <div className="section-heading"><div><p className="eyebrow"><span /> Jelajahi</p><h2>Kategori pilihan</h2></div><Link className="text-link" href="#products">Semua produk <ArrowRight size={16} /></Link></div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link href={`/?category=${category.slug}#products`} className="category-card" key={category.slug}>
              <small>0{index + 1}</small><span className="category-icon">{category.icon}</span><div><h3>{category.name}</h3><p>{category.count} produk</p></div><ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className="products-section" id="products">
        <div className="container section">
          <div className="section-heading"><div><p className="eyebrow"><span /> Rekomendasi kami</p><h2>Produk unggulan</h2></div><p className="section-note">Dipilih berdasarkan kualitas, ketahanan, dan kebutuhan pelanggan.</p></div>
          <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          {!products.length && <div className="empty-state"><h3>{catalog.unavailable ? 'Katalog sementara tidak tersedia' : 'Belum ada produk ditampilkan'}</h3><p>{catalog.unavailable ? 'Silakan coba kembali beberapa saat lagi.' : 'Produk akan tampil setelah ditambahkan dan diaktifkan oleh admin.'}</p></div>}
        </div>
      </section>

      <section className="container cta-panel">
        <div><p className="eyebrow light"><span /> Kebutuhan proyek</p><h2>Butuh jumlah besar atau<br />spesifikasi khusus?</h2></div>
        <div><p>Tim kami siap menyiapkan penawaran terbaik sesuai kebutuhan dan jadwal proyek Anda.</p><Link className="button button-gold" href="mailto:sales@argadamar.co.id">Minta penawaran <ArrowRight size={18} /></Link></div>
      </section>

      <section className="brand-section container section" aria-label="Brand tersedia">
        <p className="eyebrow"><span /> Brand terpercaya</p>
        <div className="brand-row">
          {['PHILIPS', 'MAKITA', 'SUPREME', 'SHIMIZU', 'KYORITSU', 'MSA'].map((brand) => <span key={brand}>{brand}</span>)}
        </div>
      </section>

      <section className="advantages-section">
        <div className="container section">
          <div className="section-heading"><div><p className="eyebrow"><span /> Mengapa Arga Damar</p><h2>Partner teknis yang<br />dapat diandalkan</h2></div><p className="section-note">Lebih dari sekadar pemasok—kami membantu pelanggan memilih solusi yang tepat untuk setiap kebutuhan.</p></div>
          <div className="advantage-grid">
            <article><ShieldCheck /><span>01</span><h3>Kualitas terverifikasi</h3><p>Produk original dari brand dan distributor yang dapat dipertanggungjawabkan.</p></article>
            <article><Building2 /><span>02</span><h3>Siap kebutuhan proyek</h3><p>Penawaran volume, spesifikasi khusus, dan jadwal pengadaan yang terencana.</p></article>
            <article><Sparkles /><span>03</span><h3>Layanan profesional</h3><p>Informasi produk transparan dengan dukungan tim yang responsif.</p></article>
          </div>
        </div>
      </section>
    </>
  );
}
