'use client';
import { useState, useTransition } from 'react';
import { shippingQuoteAction, type ShippingEstimate } from '@/actions/shipping.actions';
import { formatPrice } from '@/lib/catalog';
export function ShippingQuote({ productId }: { productId?: string }) {
  const [quote,setQuote] = useState<ShippingEstimate>();
  const [error,setError] = useState(''); const [pending,startTransition] = useTransition();
  return <fieldset><legend>Estimasi pengiriman</legend><input type="hidden" name="shippingQuote" value={quote?.token ?? ''}/>
    <button type="button" className="button button-secondary" disabled={pending} onClick={event => {
      const form = event.currentTarget.form; if (!form) return;
      const addressId = String(new FormData(form).get('addressId') ?? '');
      setQuote(undefined); setError('');
      startTransition(async () => { const result = await shippingQuoteAction(addressId, productId); setQuote(result.quote); setError(result.error ?? ''); });
    }}>{pending ? 'Memeriksa...' : 'Periksa ongkir alamat terpilih'}</button>
    <p role="status">{error || (quote ? `${quote.provider} · ${formatPrice(quote.amount)}. Berlaku 10 menit untuk alamat dan isi keranjang ini.` : 'Tarif internal berlaku secara default. Jika kurir API diaktifkan, periksa ongkir setelah memilih alamat tersimpan.')}</p>
  </fieldset>;
}
