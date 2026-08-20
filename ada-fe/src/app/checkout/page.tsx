import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { ProductVisual } from '@/components/product-visual';
import { getSession } from '@/lib/api';
import { formatPrice } from '@/lib/catalog';
import { getProduct } from '@/lib/catalog-api';

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const query = await searchParams;
  const returnTo = `/checkout${query.product ? `?product=${encodeURIComponent(query.product)}` : ''}`;
  const user = await getSession();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);

  const product = query.product ? await getProduct(query.product) : undefined;
  return (
    <section className="container checkout-page section">
      <div className="checkout-heading"><p className="eyebrow"><span /> Checkout aman</p><h1>Ringkasan pembayaran</h1><p>Halo, {user.fullName}. Periksa kembali pesanan Anda.</p></div>
      {product ? (
        <div className="checkout-grid">
          <div className="checkout-item"><ProductVisual product={product} /><div><small>{product.brand} · {product.sku}</small><h2>{product.name}</h2><p>1 {product.unit}</p></div><strong>{formatPrice(product.price)}</strong></div>
          <aside className="order-summary"><h3>Total pesanan</h3><p><span>Subtotal</span><strong>{formatPrice(product.price)}</strong></p><p><span>Pengiriman</span><span>Dihitung berikutnya</span></p><hr /><p className="total"><span>Total sementara</span><strong>{formatPrice(product.price)}</strong></p><button className="button button-primary"><LockKeyhole size={17} /> Pilih alamat & bayar</button><small><CheckCircle2 size={14} /> Pembayaran terenkripsi dan aman</small></aside>
        </div>
      ) : (
        <div className="empty-state"><h2>Belum ada produk dipilih</h2><p>Pilih produk terlebih dahulu untuk melanjutkan pembayaran.</p><Link className="button button-primary" href="/#products">Lihat produk</Link></div>
      )}
    </section>
  );
}
