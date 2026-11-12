import Link from 'next/link';
import { getSession } from '@/lib/api';
import { getOrders } from '@/lib/order-api';
import { paymentResult } from '@/lib/payment-result';

export default async function PaymentFinishPage({ searchParams }: { searchParams: Promise<{ order_id?: string }> }) {
  const query = await searchParams;
  const orderNumber = typeof query.order_id === 'string' ? query.order_id.slice(0, 100) : '';
  const user = await getSession();
  let order;
  let unavailable = false;
  if (user && orderNumber) {
    try { order = (await getOrders(1, orderNumber)).data.find(item => item.orderNumber === orderNumber); }
    catch { unavailable = true; }
  }
  const result = paymentResult(order?.status);
  const href = `/payment/finish?${new URLSearchParams({ order_id: orderNumber })}`;
  return <section className="container section payment-result">
    <h1>{result.title}</h1><p role="status">{unavailable ? 'Status belum dapat dimuat. Coba periksa kembali.' : result.message}</p>
    {order && <p>Pesanan {order.orderNumber}</p>}
    {!user ? <Link className="button button-primary" href={`/login?returnTo=${encodeURIComponent(href)}`}>Masuk untuk memeriksa pembayaran</Link> : <>
      {orderNumber && <Link className="button button-secondary" href={href}>Periksa status terbaru</Link>}
      <Link className="button button-primary" href={order ? `/account/orders/${order.id}` : '/account/orders'}>Lihat pesanan saya</Link>
    </>}
  </section>;
}
