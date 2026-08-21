'use client';

import { useActionState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { checkoutAction, type CheckoutState } from '@/actions/checkout.actions';
import type { Address } from '@/lib/user-api';

export function CheckoutForm({ addresses, productId }: { addresses: Address[]; productId?: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, {});
  return (
    <form action={action} className="checkout-address-form">
      {productId && <input type="hidden" name="productId" value={productId} />}
      <h3>Alamat pengiriman</h3>
      {addresses.length ? addresses.map((address) => (
        <label className="address-option" key={address.id}>
          <input type="radio" name="addressId" value={address.id} defaultChecked={address.isDefault} required />
          <span><strong>{address.label} · {address.recipient}</strong><small>{address.addressLine}, {address.district}, {address.city}, {address.province} {address.postalCode}</small></span>
        </label>
      )) : (
        <div className="address-fields">
          <input name="label" placeholder="Label alamat" required />
          <input name="recipient" placeholder="Nama penerima" required />
          <input name="phone" placeholder="+628123456789" required />
          <textarea name="addressLine" placeholder="Alamat lengkap" required />
          <input name="district" placeholder="Kecamatan" required />
          <input name="city" placeholder="Kota/Kabupaten" required />
          <input name="province" placeholder="Provinsi" required />
          <input name="postalCode" placeholder="Kode pos" required />
        </div>
      )}
      <textarea name="customerNote" placeholder="Catatan pesanan (opsional)" maxLength={500} />
      {state.error && <p className="form-error">{state.error}</p>}
      <button className="button button-primary" disabled={pending}>
        <LockKeyhole size={17} /> {pending ? 'Memproses...' : 'Bayar dengan Midtrans'}
      </button>
    </form>
  );
}
