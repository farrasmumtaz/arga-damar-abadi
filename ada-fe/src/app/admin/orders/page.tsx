import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminOrders } from '@/lib/admin-api';
import { getSession } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';

export default async function AdminOrdersPage() {
  const user = await getSession(); if (!user || user.role === 'CUSTOMER') redirect('/');
  const orders = await getAdminOrders();
  return <section className="container section admin-list-page"><div className="admin-heading"><div><p className="eyebrow"><span/> Operasional</p><h1>Orders</h1></div></div><div className="data-table">{orders.map((order) => <div key={order.id}><span><strong>{order.orderNumber}</strong><small>{order.user.fullName} · {order.user.email}</small></span><span>{order.items.length} item</span><span className={`status status-${order.status.toLowerCase()}`}>{order.status}</span><strong>{formatPrice(Number(order.total))}</strong><Link className="table-link" href={`/admin/orders/${order.id}`}>Detail</Link></div>)}</div></section>;
}
