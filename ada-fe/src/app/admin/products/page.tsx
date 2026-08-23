import { getAdminProducts } from '@/lib/admin-api';
import { formatPrice } from '@/lib/catalog';
import Link from 'next/link';
import { deleteProductAction } from '@/actions/admin-product.actions';

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const products = await getAdminProducts();
  const query = await searchParams;
  return <section className="section admin-list-page"><div className="admin-heading"><div><p className="eyebrow"><span/> Catalog</p><h1>Produk</h1><p>Kelola katalog dan status publikasi produk.</p></div><Link href="/admin/products/new" className="button button-primary">Tambah produk</Link></div>{query.error && <p className="form-error admin-message">{query.error}</p>}<div className="data-table product-admin-table">{products.data.map((product) => <div key={product.id}><span><strong>{product.name}</strong><small>{product.sku} · {product.category.name} · {product.brand?.name ?? 'Tanpa brand'}</small></span><span className={`status status-${product.status.toLowerCase()}`}>{product.status}</span><span>Stok <strong>{product.inventory ? product.inventory.quantity - product.inventory.reserved : 0}</strong></span><strong>{formatPrice(Number(product.price))}</strong><span className="row-actions"><Link href={`/admin/products/${product.id}/edit`}>Edit</Link><form action={deleteProductAction.bind(null, product.id)}><button>Hapus</button></form></span></div>)}</div></section>;
}
