import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { ProductVisual } from '@/components/product-visual';
import { getSession } from '@/lib/api';
import { getCart } from '@/lib/cart-api';
import { formatPrice } from '@/lib/catalog';
import { getProduct } from '@/lib/catalog-api';

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
  const cart = product ? null : await getCart();
  const subtotal = product?.price ?? cart?.subtotal ?? 0;
  const checkoutItems = product
    ? [{ id: product.id, product, quantity: 1, subtotal: product.price }]
    : (cart?.items ?? []);

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
            <p><span>Pengiriman</span><span>Dihitung berikutnya</span></p>
            <hr />
            <p className="total">
              <span>Total sementara</span><strong>{formatPrice(subtotal)}</strong>
            </p>
            <button className="button button-primary">
              <LockKeyhole size={17} /> Pilih alamat & bayar
            </button>
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
