import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import {
  removeCartItemAction,
  updateCartItemAction,
} from '@/actions/cart.actions';
import { ProductVisual } from '@/components/product-visual';
import { getSession } from '@/lib/api';
import { getCart } from '@/lib/cart-api';
import { formatPrice } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Keranjang' };

export default async function CartPage() {
  const user = await getSession();
  if (!user) redirect('/login?returnTo=%2Fcart');
  const cart = await getCart();

  return (
    <section className="container cart-page section">
      <div className="checkout-heading">
        <p className="eyebrow"><span /> Keranjang belanja</p>
        <h1>Produk pilihan Anda</h1>
        <p>{cart?.itemCount ?? 0} item dalam keranjang.</p>
      </div>
      {!cart?.items.length ? (
        <div className="empty-state">
          <ShoppingBag size={40} />
          <h2>Keranjang masih kosong</h2>
          <p>Jelajahi katalog dan tambahkan produk yang Anda butuhkan.</p>
          <Link className="button button-primary" href="/#products">Lihat produk</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div className="cart-items">
            {cart.items.map((item) => (
              <article className="cart-item" key={item.id}>
                <ProductVisual product={item.product} />
                <div className="cart-item-copy">
                  <small>{item.product.brand} · {item.product.sku}</small>
                  <h2><Link href={`/products/${item.product.slug}`}>{item.product.name}</Link></h2>
                  <p>{formatPrice(item.product.price)} / {item.product.unit}</p>
                  <div className="cart-item-actions">
                    <form action={updateCartItemAction.bind(null, item.id)}>
                      <label>Jumlah <input name="quantity" type="number" min="1" max={item.product.stock} defaultValue={item.quantity} /></label>
                      <button className="text-link">Perbarui</button>
                    </form>
                    <form action={removeCartItemAction.bind(null, item.id)}><button className="remove-button"><Trash2 size={15} /> Hapus</button></form>
                  </div>
                </div>
                <strong>{formatPrice(item.subtotal)}</strong>
              </article>
            ))}
          </div>
          <aside className="order-summary">
            <h3>Ringkasan belanja</h3>
            <p><span>Total item</span><span>{cart.itemCount}</span></p>
            <p><span>Subtotal</span><strong>{formatPrice(cart.subtotal)}</strong></p>
            <p><span>Pengiriman</span><span>Dihitung dari berat saat checkout</span></p>
            <hr />
            <p className="total"><span>Total sementara</span><strong>{formatPrice(cart.subtotal)}</strong></p>
            <Link className="button button-primary" href="/checkout">Lanjut checkout <ArrowRight size={17} /></Link>
            <Link className="continue-shopping" href="/#products">Lanjut belanja</Link>
          </aside>
        </div>
      )}
    </section>
  );
}
