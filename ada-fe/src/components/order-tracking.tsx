import { cookies } from 'next/headers';
import { apiRequest } from '@/lib/api';
import { linkTrackingAction } from '@/actions/tracking.actions';
interface Tracking { waybill: string | null; courier: string | null; status: string; message: string; history: Array<{ status: string; note: string; updatedAt: string }> }
export async function OrderTracking({ orderId, admin = false }: { orderId: string; admin?: boolean }) {
  const token = (await cookies()).get('access_token')?.value;
  const tracking = await apiRequest<Tracking>(`/orders/${encodeURIComponent(orderId)}/tracking`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  return <section className="shipping-card"><h2>Tracking pengiriman</h2>
    {!tracking ? <p>Tracking kurir belum dapat dimuat. Coba kembali beberapa saat lagi.</p> : <><p>{tracking.message}</p>{tracking.waybill && <p>{tracking.courier} · {tracking.waybill}</p>}<ol>{tracking.history.map((item,index) => <li key={`${item.updatedAt}-${index}`}><strong>{item.status}</strong> · <time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleString('id-ID')}</time><p>{item.note}</p></li>)}</ol></>}
    {admin && tracking?.waybill && <form action={linkTrackingAction.bind(null,orderId)} className="admin-form"><label className="field"><span>Biteship tracking ID (bukan nomor resi)</span><input name="trackingId" required pattern="[a-zA-Z0-9_-]+" maxLength={120}/></label><small>Gunakan tracking ID dari shipment yang dibuat melalui Biteship. Resi harus cocok dengan order ini.</small><button className="button button-primary">Hubungkan tracking</button></form>}
  </section>;
}
