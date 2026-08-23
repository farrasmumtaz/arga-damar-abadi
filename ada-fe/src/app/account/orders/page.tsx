import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';
import { getOrders } from '@/lib/order-api';

export default async function OrdersPage() {
  if (!(await getSession())) redirect('/login?returnTo=%2Faccount%2Forders');
  const orders = await getOrders();
  return <section className="container section orders-page">
    <p className="eyebrow"><span /> Akun customer</p><h1>Pesanan saya</h1>
    <div className="order-list">{orders.data.map((order) => <Link href={`/account/orders/${order.id}`} className="order-row" key={order.id}>
      <div><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</small></div>
      <span className={`status status-${order.status.toLowerCase()}`}>{order.status.replaceAll('_', ' ')}</span>
      <strong>{formatPrice(Number(order.total))}</strong>
    </Link>)}</div>
    {!orders.data.length && <div className="empty-state"><h2>Belum ada pesanan</h2><Link className="button button-primary" href="/#products">Mulai belanja</Link></div>}
  </section>;
}
