import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { getProducts, getCatalogOptions } from '@/lib/catalog-api';

export default async function HomePage() {
  const [catalog, options] = await Promise.all([
    getProducts().then(products => ({ products, unavailable: false })).catch(() => ({ products: [], unavailable: true })),
    getCatalogOptions().catch(() => null),
  ]);
  const categories = options?.categories.slice(0, 6) ?? [];
  const brands = options?.brands.slice(0, 6) ?? [];
  return <>
    <section className="store-hero">
      <div className="container store-hero-grid">
        <div className="store-hero-copy">
          <h1>Material listrik<br />untuk proyek</h1>
          <p>Temukan material, perlengkapan listrik, dan perkakas kerja dalam satu katalog. Lihat harga dan ketersediaan tanpa masuk.</p>
          <div className="store-hero-actions"><Link className="button button-primary" href="/products">Jelajahi katalog <ArrowRight size={18} /></Link><Link className="store-text-link" href="/quotation">Minta penawaran proyek</Link></div>
          <div className="store-hero-note"><strong>Belanja sesuai kebutuhan</strong><span>Pilih produk langsung, atau kirim daftar kebutuhan proyek kepada tim kami.</span></div>
        </div>
        <div className="hero-gallery" aria-label="Ilustrasi instalasi dan perlengkapan proyek">
          <figure className="hero-photo hero-photo-main"><img src="/images/electrical.webp" alt="Teknisi melakukan pekerjaan instalasi listrik" width="1000" height="668" fetchPriority="high" /></figure>
          <figure className="hero-photo hero-photo-product"><img src="/images/drill.webp" alt="Perkakas bor listrik" width="900" height="506" /></figure>
          <figure className="hero-photo hero-photo-work"><img src="/images/tools.webp" alt="Peralatan tangan di meja kerja" width="800" height="533" loading="lazy" /></figure>
          <figure className="hero-photo hero-photo-project"><img src="/images/project.webp" alt="Pekerjaan konstruksi di lokasi proyek" width="1000" height="758" loading="lazy" /></figure>
        </div>
      </div>
    </section>

    <section className="container home-categories section" id="categories">
      <div className="home-section-heading"><div><h2>Mulai dari kategori</h2><p>Temukan kebutuhan sesuai jenis pekerjaan.</p></div><Link className="store-text-link" href="/products">Lihat semua produk <ArrowRight size={16} /></Link></div>
      {categories.length ? <div className="category-list">{categories.map(category => <Link href={`/products?categoryId=${category.id}`} className="category-link" key={category.id}><span>{category.name}</span><ArrowRight size={18} /></Link>)}</div> : <p className="catalog-notice" role="status">{options ? 'Kategori belum tersedia.' : 'Kategori belum dapat dimuat. Silakan coba kembali.'}</p>}
    </section>

    <section className="home-products section" id="products">
      <div className="container"><div className="home-section-heading"><div><h2>Produk terbaru</h2><p>Pilihan terbaru dari katalog Arga Damar.</p></div><Link className="store-text-link" href="/products">Lihat semua produk <ArrowRight size={16} /></Link></div>
        {catalog.products.length ? <div className="product-grid">{catalog.products.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="catalog-notice" role="status"><strong>{catalog.unavailable ? 'Katalog sementara tidak tersedia' : 'Belum ada produk ditampilkan'}</strong><p>{catalog.unavailable ? 'Silakan coba kembali beberapa saat lagi.' : 'Produk akan tampil setelah ditambahkan dan diaktifkan oleh admin.'}</p><Link className="store-text-link" href="/products">Buka katalog</Link></div>}
      </div>
    </section>

    <section className="home-project section"><div className="container home-project-grid">
      <div className="home-project-copy"><h2>Pengadaan proyek, lebih terarah</h2><p>Butuh beberapa barang sekaligus atau spesifikasi khusus? Kirim daftar kebutuhan Anda dan tim kami akan menyiapkan penawaran.</p><Link className="button button-primary" href="/quotation">Buat permintaan penawaran <ArrowRight size={18} /></Link></div>
      <div className="home-project-steps"><div><strong>Pilih kebutuhan</strong><span>Cari produk atau tuliskan spesifikasi yang Anda perlukan.</span></div><div><strong>Kirim permintaan</strong><span>Tambahkan jumlah, detail proyek, dan lampiran bila tersedia.</span></div><div><strong>Tinjau penawaran</strong><span>Periksa harga dan masa berlaku di akun Anda.</span></div></div>
    </div></section>

    {brands.length > 0 && <section className="container home-brands section"><div><h2>Brand di katalog</h2><p>Jelajahi pilihan berdasarkan brand.</p></div><div className="brand-list">{brands.map(brand => <Link href={`/products?brandId=${brand.id}`} key={brand.id}>{brand.name}</Link>)}</div></section>}
  </>;
}
