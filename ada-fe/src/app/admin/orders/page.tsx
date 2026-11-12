import Link from 'next/link';
import { getAdminOrderPage } from '@/lib/admin-api';
import { formatPrice } from '@/lib/catalog';
import { listQuery } from '@/lib/list-query';
import { ListPagination } from '@/components/list-pagination';

const statuses = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string }> }) {
  const query = await searchParams;
  const { page, search } = listQuery(query);
  const status = statuses.includes(query.status ?? '') ? query.status! : '';
  const result = await getAdminOrderPage(page, search, status);
  const href = (next: number) => `/admin/orders?${new URLSearchParams({ page: String(next), search, status })}`;
  return <section className="section admin-list-page"><h1>Pesanan</h1>
    <form method="get" className="admin-form"><label className="field">Cari nomor pesanan / pelanggan<input name="search" defaultValue={search} maxLength={120}/></label>
      <label className="field">Status<select name="status" defaultValue={status}><option value="">Semua status</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label><button className="button button-secondary">Terapkan</button>
    </form>
    <div className="data-table">{result.data.map(order => <div key={order.id}><span><strong>{order.reference}</strong><small>{order.name}</small></span><span>{order.status}</span><strong>{formatPrice(Number(order.amount))}</strong><Link href={`/admin/orders/${order.id}`}>Detail</Link></div>)}</div>
    {!result.data.length && <p>Tidak ada pesanan yang sesuai.</p>}
    <ListPagination page={page} total={result.meta.total} totalPages={result.meta.totalPages} href={href}/>
  </section>;
}
