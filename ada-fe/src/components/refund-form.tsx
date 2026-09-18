'use client';
import { useActionState } from 'react';
import { refundAction } from '@/actions/refund.actions';
export function RefundForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(refundAction.bind(null, orderId), {});
  return <form action={action} className="admin-form"><h2>Refund penuh</h2><p>Refund berlaku untuk seluruh nilai order yang sudah settled. Restock hanya dipilih jika barang telah diterima kembali dan layak dijual.</p><label className="field">Alasan refund<textarea name="reason" required maxLength={255} /></label><label className="check-field"><input type="checkbox" name="restock" />Kembalikan seluruh item ke stok setelah refund dikonfirmasi</label><label className="check-field"><input name="confirm" type="checkbox" required />Saya mengonfirmasi refund penuh untuk order ini.</label>{state.error && <p role="alert" className="form-error">{state.error}</p>}{state.success && <p role="status" className="form-success">{state.success}</p>}<button className="button button-primary" disabled={pending}>{pending ? 'Memproses...' : 'Ajukan refund'}</button></form>;
}
