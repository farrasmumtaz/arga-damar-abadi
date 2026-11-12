'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { checkoutAction, type CheckoutState } from '@/actions/checkout.actions';
import { formatPrice } from '@/lib/catalog';
import type { Address } from '@/lib/user-api';

export function CheckoutForm({ addresses, productId, idempotencyKey }: { addresses: Address[]; productId?: string; idempotencyKey: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, {});
  const [changed, setChanged] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(addresses.find(row => row.isDefault)?.id ?? addresses[0]?.id ?? '');
  const [promotionCode, setPromotionCode] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const reviewed = Boolean(state.review && !changed);
  return <form action={action} onSubmit={() => setChanged(false)} className="checkout-address-form" onChange={() => setChanged(true)}>
    <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
    {productId && <input type="hidden" name="productId" value={productId} />}
    <fieldset disabled={pending || Boolean(state.orderId)}>
      <legend>Alamat pengiriman</legend>
      {addresses.length ? addresses.map((address) => <label className="address-option" key={address.id}>
        <input type="radio" name="addressId" value={address.id} checked={selectedAddress === address.id} onChange={() => setSelectedAddress(address.id)} required />
        <span><strong>{address.label} · {address.recipient}</strong><small>{address.addressLine}, {address.district}, {address.city}, {address.province} {address.postalCode}</small></span>
      </label>) : state.addressId ? <><input type="hidden" name="addressId" value={state.addressId} /><p role="status">Alamat pengiriman: {state.addressSummary ?? 'Alamat tersimpan'}</p></> : <div className="address-fields">
        <label>Label alamat<input name="label" autoComplete="off" required maxLength={50} /></label>
        <label>Nama penerima<input name="recipient" autoComplete="shipping name" required /></label>
        <label>Telepon penerima<input name="phone" type="tel" autoComplete="shipping tel" placeholder="+628123456789" required /></label>
        <label>Alamat lengkap<textarea name="addressLine" autoComplete="shipping street-address" required /></label>
        <label>Kecamatan<input name="district" autoComplete="shipping address-level3" required /></label>
        <label>Kota/Kabupaten<input name="city" autoComplete="shipping address-level2" required /></label>
        <label>Provinsi<input name="province" autoComplete="shipping address-level1" required /></label>
        <label>Kode pos<input name="postalCode" autoComplete="shipping postal-code" inputMode="numeric" required pattern="[0-9]{5}" /></label>
      </div>}
      <Link href="/account/profile">Kelola alamat</Link>
      <label>Catatan pesanan (opsional)<textarea name="customerNote" maxLength={500} value={customerNote} onChange={event => setCustomerNote(event.target.value)} /></label>
      <label>Voucher (opsional)<input name="promotionCode" autoComplete="off" maxLength={40} placeholder="Kode voucher" value={promotionCode} onChange={event => setPromotionCode(event.target.value)} /></label>
      <small>Kuota voucher dikonfirmasi saat order dibuat; pembatalan tidak mengembalikan kuota.</small>
    </fieldset>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.review && <div className="checkout-review" role="status" aria-live="polite">
      <h3>Rincian pembayaran</h3>
      <p><span>Subtotal</span><strong>{formatPrice(Number(state.review.subtotal))}</strong></p>
      <p><span>Diskon</span><strong>−{formatPrice(Number(state.review.discountAmount))}</strong></p>
      <p><span>Ongkir ({state.review.provider === 'INTERNAL' ? 'Pengiriman toko' : state.review.provider})</span><strong>{formatPrice(state.review.amount)}</strong></p>
      <p className="total"><span>Total bayar</span><strong>{formatPrice(Number(state.review.total))}</strong></p>
      <small>{changed ? 'Isian berubah. Hitung ulang sebelum membayar.' : 'Harga dan ongkir diperiksa kembali saat konfirmasi pembayaran.'}</small>
    </div>}
    {state.orderId ? <><p role="status">Order sudah dibuat. <Link href={`/account/orders/${state.orderId}`}>Lihat detail dan total order</Link>. Pembayaran ulang menggunakan order yang sama.</p><button name="intent" value="pay" className="button button-primary" disabled={pending}>Coba pembayaran kembali</button></> : <>
      <button name="intent" value="review" className="button button-secondary" disabled={pending}>{pending ? 'Memproses…' : 'Hitung ongkir & total'}</button>
      <button name="intent" value="pay" className="button button-primary" disabled={pending || !reviewed}>{pending ? 'Memproses…' : 'Konfirmasi & bayar dengan Midtrans'}</button>
    </>}
  </form>;
}
