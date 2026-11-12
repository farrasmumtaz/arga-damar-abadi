import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { QuotationForm } from '@/components/quotation-form';
export const metadata: Metadata = { title: 'Minta Penawaran' };

export default function QuotationPage() {
  return (
    <section className="quotation-page container section">
      <div className="quotation-intro">
        <h1>Minta penawaran proyek</h1>
        <p>Sampaikan produk, jumlah, dan detail proyek. Tim kami akan menghubungi Anda dengan penawaran terbaik.</p>
        <ul><li><CheckCircle2 /> Harga khusus pembelian volume</li><li><CheckCircle2 /> Konsultasi spesifikasi produk</li><li><CheckCircle2 /> Dukungan jadwal pengiriman</li></ul>
      </div>
      <QuotationForm />
      <Link href="/" className="back-home">Kembali ke beranda</Link>
    </section>
  );
}
