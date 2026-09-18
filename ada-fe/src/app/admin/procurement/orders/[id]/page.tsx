import { PurchaseOrderForm, PurchaseTransitionForm } from '@/components/procurement-forms';
import { procurementRequest } from '@/lib/procurement-api';
import type { PurchaseOrder } from '@/lib/procurement-api';
export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const order = await procurementRequest<PurchaseOrder>(`/orders/${encodeURIComponent(id)}`);
  return <section className="section"><h1>{order.purchaseNumber}</h1><p>{order.supplierName} · {order.status}</p><p>Total pembelian: Rp {order.total}</p>{order.status === 'DRAFT' ? <PurchaseOrderForm order={order}/> : <><p>{order.note}</p><div className="data-table">{order.items.map(item => <div key={item.id}><span>{item.sku} — {item.productName}</span><span>{item.quantity} × Rp {item.unitCost}</span><span>Rp {item.subtotal}</span></div>)}</div></>}{order.status === 'DRAFT' && <PurchaseTransitionForm id={id} action="issue"/>}{order.status === 'ISSUED' && <PurchaseTransitionForm id={id} action="receive"/>}{['DRAFT', 'ISSUED'].includes(order.status) && <PurchaseTransitionForm id={id} action="cancel"/>}{order.receivedAt && <p>Diterima {new Date(order.receivedAt).toLocaleString('id-ID')}. Stok telah ditambahkan; penerimaan ulang tidak menambah stok.</p>}</section>;
}
