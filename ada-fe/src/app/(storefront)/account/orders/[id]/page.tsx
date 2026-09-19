import { OrderTracking } from '@/components/order-tracking';
import { notFound, redirect } from 'next/navigation';
import { cancelOrderAction, payOrderAction } from '@/actions/order.actions';
import { getSession } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';
import { getOrder } from '@/lib/order-api';

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  if (!(await getSession())) redirect('/login?returnTo=%2Faccount%2Forders');
  const { id } = await params; const query = await searchParams;
  const order = await getOrder(id); if (!order) notFound();
  const address = order.shippingAddress;
  return <section className="container section order-detail">
    <p className="eyebrow"><span /> Detail pesanan</p><div className="order-title"><div><h1>{order.orderNumber}</h1><p>{new Date(order.createdAt).toLocaleString('id-ID')}</p></div><span className={`status status-${order.status.toLowerCase()}`}>{order.status.replaceAll('_', ' ')}</span></div>
    {query.error && <p className="form-error">Sesi pembayaran tidak dapat dibuat. Coba kembali.</p>}
    <div className="order-detail-grid"><div className="order-lines">{order.items.map((item) => <article key={item.id}><div><strong>{item.productName}</strong><small>{item.sku} · {item.quantity} unit</small></div><strong>{formatPrice(Number(item.subtotal))}</strong></article>)}</div>
      <aside className="order-summary"><h3>Ringkasan</h3><p><span>Subtotal</span><strong>{formatPrice(Number(order.subtotal))}</strong></p><p><span>Pengiriman</span><strong>{formatPrice(Number(order.shippingCost))}</strong></p>{Number(order.discountAmount ?? 0) > 0 && <p><span>Diskon voucher</span><strong>-{formatPrice(Number(order.discountAmount))}</strong></p>}<hr/><p className="total"><span>Total</span><strong>{formatPrice(Number(order.total))}</strong></p>
      {order.status === 'PENDING_PAYMENT' && <><form action={payOrderAction.bind(null, order.id)}><button className="button button-primary">Lanjutkan pembayaran</button></form><form action={cancelOrderAction.bind(null, order.id)}><button className="cancel-order">Batalkan pesanan</button></form></>}</aside></div>
    <div className="shipping-card"><h2>Alamat pengiriman</h2><strong>{String(address.recipient ?? '')}</strong><p>{String(address.addressLine ?? '')}, {String(address.district ?? '')}, {String(address.city ?? '')}, {String(address.province ?? '')} {String(address.postalCode ?? '')}</p><small>{String(address.phone ?? '')}</small>{order.trackingNumber && <p><strong>{order.shippingProvider}</strong> · Resi {order.trackingNumber}</p>}</div>
  <OrderTracking orderId={order.id}/></section>;
}
