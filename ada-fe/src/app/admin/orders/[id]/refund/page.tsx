import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';
import { getAdminOrder } from '@/lib/admin-api';
import { RefundForm } from '@/components/refund-form';
import { formatPrice } from '@/lib/catalog';
export default async function RefundPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) redirect('/admin');
  const { id } = await params; const order = await getAdminOrder(id);
  return <section className="section admin-editor"><h1>Refund {order.orderNumber}</h1><p>Total: {formatPrice(Number(order.total))} · Status: {order.status}</p>{['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) ? <RefundForm orderId={id} /> : <p>Order ini tidak dapat direfund.</p>}<Link href={`/admin/orders/${id}`}>Kembali ke order</Link></section>;
}
