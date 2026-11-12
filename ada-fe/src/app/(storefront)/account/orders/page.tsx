import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';
import { getOrders } from '@/lib/order-api';

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!(await getSession())) redirect('/login?returnTo=%2Faccount%2Forders');
  const page = Math.max(1, Math.min(100000, Number.parseInt((await searchParams).page ?? '1', 10) || 1));
  const orders = await getOrders(page);
  return <section className="container section orders-page">
    <p className="eyebrow"><span /> Akun customer</p><h1>Pesanan saya</h1>
    <div className="order-list">{orders.data.map((order) => <Link href={`/account/orders/${order.id}`} className="order-row" key={order.id}>
      <div><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</small></div>
      <span className={`status status-${order.status.toLowerCase()}`}>{order.status.replaceAll('_', ' ')}</span>
      <strong>{formatPrice(Number(order.total))}</strong>
    </Link>)}</div>
    {!orders.data.length && <div className="empty-state"><h2>Belum ada pesanan</h2><Link className="button button-primary" href="/#products">Mulai belanja</Link></div>}
    <nav className="catalog-pagination" aria-label="Halaman pesanan">
      {page > 1 && <Link href={`/account/orders?page=${page - 1}`}>Sebelumnya</Link>}
      <span>Halaman {page} dari {Math.max(1, orders.meta.totalPages)} · {orders.meta.total} pesanan</span>
      {page < orders.meta.totalPages && <Link href={`/account/orders?page=${page + 1}`}>Berikutnya</Link>}
    </nav>
  </section>;
}
