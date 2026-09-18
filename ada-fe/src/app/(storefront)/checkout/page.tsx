import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { CheckoutForm } from '@/components/checkout-form';
import { ProductVisual } from '@/components/product-visual';
import { getSession } from '@/lib/api';
import { getCart } from '@/lib/cart-api';
import { formatPrice } from '@/lib/catalog';
import { getProduct } from '@/lib/catalog-api';
import { getAddresses } from '@/lib/user-api';
import { randomUUID } from 'node:crypto';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const query = await searchParams;
  const returnTo = `/checkout${
    query.product ? `?product=${encodeURIComponent(query.product)}` : ''
  }`;
  const user = await getSession();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);

  const product = query.product ? await getProduct(query.product) : undefined;
  const cart = await getCart();
  const addresses = await getAddresses();
  const checkoutItems = [...(cart?.items ?? [])].map((item) => ({ id: item.id, product: item.product, quantity: item.quantity, subtotal: item.subtotal }));
  if (product) {
    const existing = checkoutItems.find((item) => item.product.id === product.id);
    if (existing) { existing.quantity += 1; existing.subtotal += product.price; }
    else checkoutItems.push({ id: product.id, product, quantity: 1, subtotal: product.price });
  }
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <section className="container checkout-page section">
      <div className="checkout-heading">
        <p className="eyebrow"><span /> Checkout aman</p>
        <h1>Ringkasan pembayaran</h1>
        <p>Halo, {user.fullName}. Periksa kembali pesanan Anda.</p>
      </div>
      {checkoutItems.length ? (
        <div className="checkout-grid">
          <div className="checkout-products">
            {checkoutItems.map((item) => (
              <div className="checkout-item" key={item.id}>
                <ProductVisual product={item.product} />
                <div>
                  <small>{item.product.brand} · {item.product.sku}</small>
                  <h2>{item.product.name}</h2>
                  <p>{item.quantity} {item.product.unit}</p>
                </div>
                <strong>{formatPrice(item.subtotal)}</strong>
              </div>
            ))}
          </div>
          <aside className="order-summary">
            <h3>Total pesanan</h3>
            <p><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
            <p><span>Pengiriman</span><span>Dihitung dari berat</span></p>
            <hr />
            <p className="total">
              <span>Total sementara</span><strong>{formatPrice(subtotal)}</strong>
            </p>
            <CheckoutForm addresses={addresses} productId={product?.id} idempotencyKey={randomUUID()} />
            <small><CheckCircle2 size={14} /> Pembayaran terenkripsi dan aman</small>
          </aside>
        </div>
      ) : (
        <div className="empty-state">
          <h2>Belum ada produk dipilih</h2>
          <p>Pilih produk terlebih dahulu untuk melanjutkan pembayaran.</p>
          <Link className="button button-primary" href="/#products">Lihat produk</Link>
        </div>
      )}
    </section>
  );
}
