import { getAdminProducts } from '@/lib/admin-api';
import { formatPrice } from '@/lib/catalog';

export default async function AdminProductsPage() {
  const products = await getAdminProducts();
  return <section className="section admin-list-page"><div className="admin-heading"><div><p className="eyebrow"><span/> Catalog</p><h1>Produk</h1><p>Kelola katalog dan status publikasi produk.</p></div><button className="button button-primary">Tambah produk</button></div><div className="data-table">{products.data.map((product) => <div key={product.id}><span><strong>{product.name}</strong><small>{product.sku} · {product.category.name} · {product.brand?.name ?? 'Tanpa brand'}</small></span><span className={`status status-${product.status.toLowerCase()}`}>{product.status}</span><span>Stok <strong>{product.inventory ? product.inventory.quantity - product.inventory.reserved : 0}</strong></span><strong>{formatPrice(Number(product.price))}</strong></div>)}</div></section>;
}
