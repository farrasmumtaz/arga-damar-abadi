import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { getCatalogOptions, getCatalogPage } from '@/lib/catalog-api';
import { catalogPageHref, catalogSortOptions, parseCatalogFilters, type CatalogSearchParams } from '@/lib/catalog-query';

export const metadata: Metadata = { title: 'Katalog produk' };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<CatalogSearchParams> }) {
  const filters = parseCatalogFilters(await searchParams);
  const invalidRange = Boolean(filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice));
  const [result, options] = await Promise.all([
    invalidRange ? Promise.resolve(null) : getCatalogPage(filters).catch(() => null),
    getCatalogOptions().catch(() => null),
  ]);
  const categories = options?.categories ?? []; const brands = options?.brands ?? [];
  return <section className="container section catalog-page">
    <div className="section-heading"><div><p className="eyebrow"><span/>Katalog toko</p><h1>Temukan produk Anda</h1><p>Lihat produk dan harga tanpa login.</p></div></div>
    <form action="/products" method="get" className="catalog-filters">
      <label>Cari produk<input type="search" name="search" defaultValue={filters.search} maxLength={200} placeholder="Nama produk atau SKU"/></label>
      <label>Kategori<select name="categoryId" defaultValue={filters.categoryId}><option value="">Semua kategori</option>{filters.categoryId && !categories.some(item => item.id === filters.categoryId) && <option value={filters.categoryId}>Kategori terpilih</option>}{categories.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Brand<select name="brandId" defaultValue={filters.brandId}><option value="">Semua brand</option>{filters.brandId && !brands.some(item => item.id === filters.brandId) && <option value={filters.brandId}>Brand terpilih</option>}{brands.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Harga minimum<input type="number" name="minPrice" min="0" max="9999999999999.99" step="0.01" defaultValue={filters.minPrice} placeholder="Rp"/></label>
      <label>Harga maksimum<input type="number" name="maxPrice" min="0" max="9999999999999.99" step="0.01" defaultValue={filters.maxPrice} placeholder="Rp"/></label>
      <label>Urutkan<select name="sort" defaultValue={filters.sort}>{catalogSortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <div className="catalog-filter-actions"><button className="button button-primary">Terapkan</button><Link href="/products" className="text-link">Reset filter</Link></div>
    </form>
    {!options && <p role="status">Pilihan kategori dan brand belum dapat dimuat. Pencarian nama tetap dapat digunakan.</p>}
    {invalidRange ? <p className="form-error" role="alert">Harga minimum tidak boleh melebihi harga maksimum.</p> : !result ? <div className="empty-state" role="alert"><h2>Katalog belum dapat dimuat</h2><p>Silakan coba kembali beberapa saat lagi.</p><Link className="button button-secondary" href={catalogPageHref(filters, filters.page)}>Coba kembali</Link></div> : <>
      <p className="catalog-result-count" role="status">{result.meta.total} produk ditemukan{filters.search && ` untuk “${filters.search}”`}.</p>
      {result.data.length ? <div className="product-grid">{result.data.map(product => <ProductCard key={product.id} product={product}/>)}</div> : <div className="empty-state"><h2>Tidak ada produk pada halaman ini</h2><p>Ubah kata pencarian atau filter Anda.</p><Link className="button button-secondary" href={catalogPageHref(filters, 1)}>Kembali ke halaman pertama</Link></div>}
      {(result.meta.totalPages > 1 || filters.page > 1) && <nav className="catalog-pagination" aria-label="Halaman katalog">
        {filters.page > 1 && <Link href={catalogPageHref(filters, filters.page - 1)} rel="prev">← Sebelumnya</Link>}
        <span>Halaman {filters.page} dari {Math.max(1, result.meta.totalPages)}</span>
        {filters.page < result.meta.totalPages && <Link href={catalogPageHref(filters, filters.page + 1)} rel="next">Berikutnya →</Link>}
      </nav>}
    </>}
  </section>;
}
