'use client';

import { useActionState } from 'react';
import type { QuotationActionState } from '@/actions/admin-quotation.actions';
import type { AdminQuotation } from '@/lib/admin-api';
const transitions: Record<string, string[]> = { SUBMITTED: ['REVIEWING', 'REJECTED'], REVIEWING: ['QUOTED', 'REJECTED'], QUOTED: ['EXPIRED'] };
export function QuotationReviewForm({ quotation, action }: { quotation: AdminQuotation; action: (state: QuotationActionState, formData: FormData) => Promise<QuotationActionState> }) {
  const [state, formAction, pending] = useActionState(action, {}); const options = transitions[quotation.status] ?? [];
  if (!options.length) return <p className="empty-copy">Quotation sudah berada pada status final.</p>;
  return <form action={formAction} className="admin-form quotation-review"><h2>Review quotation</h2><label className="field"><span>Status berikutnya</span><select name="status" required>{options.map((status) => <option key={status}>{status}</option>)}</select></label><label className="field"><span>Berlaku sampai (wajib saat QUOTED)</span><input name="validUntil" type="datetime-local"/></label><div className="quote-price-list">{quotation.items.map((item) => <label key={item.id}><input type="hidden" name="itemId" value={item.id}/><span>{item.product?.name ?? item.description}<small>{item.quantity} unit</small></span><input name="unitPrice" type="number" min="0.01" step="0.01" defaultValue={item.unitPrice ?? ''} placeholder="Harga/unit"/></label>)}</div>{state.error && <p className="form-error">{state.error}</p>}{state.success && <p className="form-success">{state.success}</p>}<button className="button button-primary" disabled={pending}>{pending ? 'Memproses...' : 'Simpan perubahan'}</button></form>;
}
