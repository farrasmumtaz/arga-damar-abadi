import { notFound } from 'next/navigation';
import { updateOrderStatusAction } from '@/actions/admin-order.actions';
import { OrderStatusForm } from '@/components/order-status-form';
import { getAdminOrder } from '@/lib/admin-api';
import { formatPrice } from '@/lib/catalog';

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await getAdminOrder(id); const address = order.shippingAddress;
    return <section className="section admin-order-detail"><p className="eyebrow"><span/> Fulfillment</p><div className="admin-heading"><div><h1>{order.orderNumber}</h1><p>{order.user.fullName} · {order.user.email}</p></div><span className={`status status-${order.status.toLowerCase()}`}>{order.status}</span></div><div className="order-detail-grid"><div className="order-lines">{order.items.map((item) => <article key={item.id}><div><strong>{item.productName}</strong><small>{item.sku} · {item.quantity} unit</small></div><strong>{formatPrice(Number(item.subtotal))}</strong></article>)}</div><aside className="order-summary"><h3>Ringkasan</h3><p><span>Subtotal</span><strong>{formatPrice(Number(order.subtotal))}</strong></p><p><span>Ongkir</span><strong>{formatPrice(Number(order.shippingCost))}</strong></p><hr/><p className="total"><span>Total</span><strong>{formatPrice(Number(order.total))}</strong></p></aside></div><div className="fulfillment-grid"><OrderStatusForm status={order.status} action={updateOrderStatusAction.bind(null, order.id)}/><article className="shipping-card"><h2>Pengiriman</h2><strong>{String(address.recipient ?? '')}</strong><p>{String(address.addressLine ?? '')}, {String(address.district ?? '')}, {String(address.city ?? '')}, {String(address.province ?? '')}</p>{order.trackingNumber && <p><strong>{order.shippingProvider}</strong> · {order.trackingNumber}</p>}</article></div><section className="movement-panel"><h2>Riwayat status</h2><div className="data-table movement-table">{order.statusHistories?.map((history) => <div key={history.id}><span><strong>{history.fromStatus} → {history.toStatus}</strong><small>{history.actor?.fullName ?? 'System'} · {new Date(history.createdAt).toLocaleString('id-ID')}</small></span><span>{history.note ?? '-'}</span></div>)}</div></section></section>;
  } catch { notFound(); }
}
