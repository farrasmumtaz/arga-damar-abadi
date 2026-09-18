'use client';
import { useState, useTransition } from 'react';
import { previewVoucherAction, type VoucherState } from '@/actions/promotions.actions';
import { formatPrice } from '@/lib/catalog';

export function VoucherInput({ productId, disabled }: { productId?: string; disabled?: boolean }) {
  const [code, setCode] = useState('');
  const [state, setState] = useState<VoucherState>({});
  const [pending, startTransition] = useTransition();
  return <fieldset disabled={disabled}>
    <legend>Voucher (opsional)</legend>
    <label className="field">Kode voucher<input name="promotionCode" value={code} maxLength={40} onChange={(event) => { setCode(event.target.value.toUpperCase()); setState({}); }} autoComplete="off" placeholder="Contoh: HEMAT10" /></label>
    <button type="button" className="button button-outline" disabled={pending || !code.trim()} onClick={() => startTransition(async () => setState(await previewVoucherAction(code, productId)))}>{pending ? 'Memeriksa...' : 'Periksa voucher'}</button>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    {state.discountAmount && <div role="status"><p>Potongan: <strong>{formatPrice(Number(state.discountAmount))}</strong></p><p>Subtotal setelah diskon: <strong>{formatPrice(Number(state.discountedSubtotal))}</strong></p><small>{state.note}</small></div>}
    <small>Satu voucher per order. Kuota dihitung saat order dibuat dan tidak kembali jika order dibatalkan.</small>
  </fieldset>;
}
