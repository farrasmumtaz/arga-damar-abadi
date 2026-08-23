'use client';

import { useActionState } from 'react';
import type { OrderStatusActionState } from '@/actions/admin-order.actions';
const nextStatus: Record<string, string | undefined> = { PAID: 'PROCESSING', PROCESSING: 'SHIPPED', SHIPPED: 'DELIVERED' };
export function OrderStatusForm({ status, action }: { status: string; action: (state: OrderStatusActionState, formData: FormData) => Promise<OrderStatusActionState> }) {
  const [state, formAction, pending] = useActionState(action, {}); const next = nextStatus[status];
  if (!next) return <p className="empty-copy">Order tidak memiliki aksi fulfillment berikutnya.</p>;
  return <form action={formAction} className="admin-form compact-form"><h2>Update fulfillment</h2><input type="hidden" name="status" value={next}/><p>Status berikutnya: <strong>{next}</strong></p>{next === 'SHIPPED' && <div className="form-row"><label className="field"><span>Kurir</span><input name="shippingProvider" required placeholder="JNE / J&T / Internal"/></label><label className="field"><span>Nomor resi</span><input name="trackingNumber" required/></label></div>}<label className="field"><span>Catatan internal</span><textarea name="note" rows={3} maxLength={300}/></label>{state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}<button className="button button-primary" disabled={pending}>{pending ? 'Memproses...' : `Ubah ke ${next}`}</button></form>;
}
