import { ListPagination } from '@/components/list-pagination';
import { listQuery } from '@/lib/list-query';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminInventory } from '@/lib/admin-api';
import { getSession } from '@/lib/api';

export default async function AdminInventoryPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string }> }) {
  const user = await getSession();
  if (!user || user.role === 'CUSTOMER') redirect('/');
  const { page, search } = listQuery(await searchParams);
  const result = await getAdminInventory(page, search);
  const href = (next: number) => `/admin/inventory?${new URLSearchParams({ page: String(next), search })}`;
  return <section className="container section admin-list-page"><div className="admin-heading"><div><p className="eyebrow"><span/> Operasional</p><h1>Inventory</h1></div></div><form method="get" className="admin-form"><label className="field">Cari nama / SKU<input name="search" defaultValue={search} maxLength={120}/></label><button className="button button-secondary">Cari</button></form><div className="data-table">{result.data.map((item) => <div key={item.productId}><span><strong>{item.product.name}</strong><small>{item.product.sku}</small></span><span>Fisik <strong>{item.quantity}</strong></span><span>Reserved <strong>{item.reserved}</strong></span><span className={item.isLowStock ? 'stock-warning' : ''}>Tersedia <strong>{item.available}</strong></span><Link className="table-link" href={`/admin/inventory/${item.productId}`}>Kelola</Link></div>)}</div>{!result.data.length && <p>Tidak ada stok yang sesuai.</p>}<ListPagination page={page} total={result.meta.total} totalPages={result.meta.totalPages} href={href}/></section>;
}
