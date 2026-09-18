'use client';
import { useActionState } from 'react';
import { savePromotionAction } from '@/actions/promotions.actions';
import type { Promotion } from '@/lib/promotions-api';

export function PromotionForm({ promotion }: { promotion?: Promotion }) {
  const [state, action, pending] = useActionState(savePromotionAction.bind(null, promotion?.id), {});
  return <form action={action} className="admin-form">
    <label className="field">Kode voucher<input name="code" defaultValue={promotion?.code} readOnly={Boolean(promotion)} pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,39}" maxLength={40} required /></label>
    <label className="field">Nama kampanye<input name="name" defaultValue={promotion?.name} maxLength={150} required /></label>
    <label className="field">Jenis potongan<select name="kind" defaultValue={promotion?.kind ?? 'FIXED'}><option value="FIXED">Nominal rupiah</option><option value="PERCENTAGE">Persentase (maks. 100%)</option></select></label>
    <label className="field">Nominal / persentase<input type="number" name="amount" min="0.01" max="9999999999999.99" step="0.01" defaultValue={promotion?.amount} required /></label>
    <label className="field">Minimum subtotal (Rp)<input type="number" name="minSubtotal" min="0" max="9999999999999.99" step="0.01" defaultValue={promotion?.minSubtotal ?? '0'} required /></label>
    <label className="field">Maksimal potongan (Rp, opsional)<input type="number" name="maxDiscount" min="0.01" max="9999999999999.99" step="0.01" defaultValue={promotion?.maxDiscount ?? ''} /></label>
    <label className="field">Mulai (UTC; WIB = UTC +7)<input type="datetime-local" name="startsAt" defaultValue={promotion?.startsAt.slice(0, 16)} required /></label>
    <label className="field">Selesai (UTC)<input type="datetime-local" name="endsAt" defaultValue={promotion?.endsAt.slice(0, 16)} required /></label>
    <label className="field">Kuota total order<input type="number" name="usageLimit" min={Math.max(1, promotion?.usedCount ?? 0)} max={1000000} defaultValue={promotion?.usageLimit ?? 100} required /></label>
    <label className="field">Maksimal penggunaan per akun<input type="number" name="perUserLimit" min={1} max={1000000} defaultValue={promotion?.perUserLimit ?? 1} required /></label>
    <label className="check-field"><input type="checkbox" name="isActive" defaultChecked={promotion?.isActive ?? true} />Aktif</label>
    <p>Potongan dibulatkan ke bawah ke rupiah penuh, tidak berlaku untuk ongkir, dan menyisakan minimal Rp1 subtotal. Kuota terpakai saat order dibuat; pembatalan/refund tidak mengembalikan kuota. Perubahan aturan hanya memengaruhi checkout berikutnya.</p>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className="button button-primary" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan voucher'}</button>
  </form>;
}
