import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sameCheckoutReview, type CheckoutReview } from '../src/lib/checkout-review.ts';
import { paymentResult } from '../src/lib/payment-result.ts';
import { listQuery } from '../src/lib/list-query.ts';
import { cartIntentProduct } from '../src/lib/cart-intent.ts';
import { formatPrice } from '../src/lib/catalog.ts';

const review: CheckoutReview = {
  addressId: 'address', productId: 'product', promotionCode: 'HEMAT',
  subtotal: '100000.00', discountAmount: '10000.00', amount: 20000, total: '110000.00',
  provider: 'jne:reg', token: 'signed', expiresAt: new Date(Date.now() + 600000).toISOString(),
};

test('checkout requires a current review of identical prices, shipping, voucher and address', () => {
  assert.equal(sameCheckoutReview(undefined, review), false);
  assert.equal(sameCheckoutReview(review, { ...review, token: 'new-signature' }), true);
  for (const change of [
    { addressId: 'another-address' }, { productId: 'another-product' }, { promotionCode: 'OTHER' },
    { subtotal: '101000.00' }, { discountAmount: '0.00' }, { amount: 25000 },
    { provider: 'jne:yes' }, { total: '115000.00' },
  ]) assert.equal(sameCheckoutReview(review, { ...review, ...change }), false);
  assert.equal(sameCheckoutReview({ ...review, expiresAt: '2000-01-01T00:00:00Z' }, review), false);
});

test('provider query values never become a verified payment status', () => {
  for (const value of [undefined, 'settlement', 'capture', 'pending', 'PENDING_PAYMENT']) {
    assert.equal(paymentResult(value).title, 'Periksa status pembayaran');
  }
  for (const status of ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
    assert.equal(paymentResult(status).title, 'Pembayaran terkonfirmasi');
  }
  assert.equal(paymentResult('CANCELLED').title, 'Pesanan dibatalkan');
  assert.equal(paymentResult('REFUNDED').title, 'Pembayaran dikembalikan');
});

test('operational list queries remain bounded and preserve normal search text', () => {
  for (const page of ['0', '-1', '1.5', 'Infinity', '100001']) assert.equal(listQuery({ page }).page, 1);
  assert.deepEqual(listQuery({ page: '3', search: '  kabel & lampu  ' }), { page: 3, search: 'kabel & lampu' });
  assert.equal(listQuery({ search: 'x'.repeat(200) }).search.length, 120);
});

test('only a valid product intent for the cart is resumed after authentication', () => {
  const id = '4b2f73a0-2f53-49fb-b3c9-766c3fc18276';
  assert.equal(cartIntentProduct('/cart', id), id);
  for (const target of ['/', '/admin', '//evil.example/cart', '/cart?other=1']) assert.equal(cartIntentProduct(target, id), undefined);
  for (const product of [undefined, 'not-a-uuid', `${id}/extra`]) assert.equal(cartIntentProduct('/cart', product), undefined);
});

test('displayed checkout amounts do not hide fractional rupiah', () => {
  assert.match(formatPrice(21000.25), /21\.000,25/);
  assert.match(formatPrice(21000), /21\.000$/);
});
