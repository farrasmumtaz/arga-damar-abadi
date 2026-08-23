import Link from 'next/link';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';

export default async function PaymentFinishPage({ searchParams }: { searchParams: Promise<{ transaction_status?: string; order_id?: string }> }) {
  const query = await searchParams;
  const success = ['settlement', 'capture'].includes(query.transaction_status ?? '');
  const pending = query.transaction_status === 'pending';
  const Icon = success ? CheckCircle2 : pending ? Clock3 : XCircle;
  return <section className="container section payment-result"><Icon/><h1>{success ? 'Pembayaran berhasil' : pending ? 'Pembayaran diproses' : 'Pembayaran belum selesai'}</h1><p>Status final akan diperbarui otomatis setelah konfirmasi Midtrans diterima.</p><Link className="button button-primary" href="/account/orders">Lihat pesanan saya</Link></section>;
}
