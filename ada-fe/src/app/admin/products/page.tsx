import { MutationButton } from '@/components/mutation-button';
import { ListPagination } from '@/components/list-pagination';
import { listQuery } from '@/lib/list-query';
import { getAdminProducts } from '@/lib/admin-api';
import { formatPrice } from '@/lib/catalog';
import Link from 'next/link';
import { deleteProductAction } from '@/actions/admin-product.actions';

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ error?: string; page?: string; search?: string }> }) {
  const query = await searchParams;
  const { page, search } = listQuery(query);
  const products = await getAdminProducts(page, search);
  const href = (next: number) => `/admin/products?${new URLSearchParams({ page: String(next), search })}`;
  return <section className="section admin-list-page"><div className="admin-heading"><div><p className="eyebrow"><span/> Catalog</p><h1>Produk</h1><p>Kelola katalog dan status publikasi produk.</p></div><Link href="/admin/products/new" className="button button-primary">Tambah produk</Link></div>{query.error && <p role="alert" className="form-error admin-message">{query.error}</p>}<form method="get" className="admin-form"><label className="field">Cari nama / SKU<input name="search" defaultValue={search} maxLength={120}/></label><button className="button button-secondary">Cari</button></form><div className="data-table product-admin-table">{products.data.map((product) => <div key={product.id}><span><strong>{product.name}</strong><small>{product.sku} · {product.category.name} · {product.brand?.name ?? 'Tanpa brand'}</small></span><span className={`status status-${product.status.toLowerCase()}`}>{product.status}</span><span>Stok <strong>{product.inventory ? product.inventory.quantity - product.inventory.reserved : 0}</strong></span><strong>{formatPrice(Number(product.price))}</strong><span className="row-actions"><Link href={`/admin/products/${product.id}/edit`}>Edit</Link><form action={deleteProductAction.bind(null, product.id)}><MutationButton confirmation={`Hapus produk ${product.name}? Produk akan dihapus dari katalog.`}>Hapus</MutationButton></form></span></div>)}</div>{!products.data.length && <p>Tidak ada produk yang sesuai.</p>}<ListPagination page={page} total={products.meta.total} totalPages={products.meta.totalPages} href={href}/></section>;
}
