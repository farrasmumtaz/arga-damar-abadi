import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { getProducts } from '@/lib/catalog-api';

export const metadata: Metadata = { title: 'Minta Penawaran' };

export default async function QuotationPage() {
  const products = await getProducts();
  return (
    <section className="quotation-page container section">
      <div className="quotation-intro">
        <p className="eyebrow"><span /> Kebutuhan proyek</p>
        <h1>Dapatkan penawaran<br />yang sesuai kebutuhan.</h1>
        <p>Sampaikan produk, jumlah, dan detail proyek. Tim kami akan menghubungi Anda dengan penawaran terbaik.</p>
        <ul><li><CheckCircle2 /> Harga khusus pembelian volume</li><li><CheckCircle2 /> Konsultasi spesifikasi produk</li><li><CheckCircle2 /> Dukungan jadwal pengiriman</li></ul>
      </div>
      <form className="quotation-form">
        <h2>Detail permintaan</h2>
        <label className="field"><span>Produk</span><select name="product" required><option value="">Pilih produk</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <div className="form-row"><label className="field"><span>Jumlah</span><input name="quantity" type="number" min="1" placeholder="Contoh: 50" required /></label><label className="field"><span>Nama perusahaan</span><input name="company" placeholder="PT / CV / Personal" required /></label></div>
        <div className="form-row"><label className="field"><span>Nama kontak</span><input name="name" placeholder="Nama lengkap" required /></label><label className="field"><span>WhatsApp</span><input name="phone" placeholder="+628123456789" required /></label></div>
        <label className="field"><span>Catatan kebutuhan</span><textarea name="notes" rows={5} placeholder="Spesifikasi, lokasi, dan target waktu pengadaan" /></label>
        <button className="button button-primary">Kirim permintaan <ArrowRight size={17} /></button>
        <small>Dengan mengirim form, Anda menyetujui tim kami menghubungi kontak yang diberikan.</small>
      </form>
      <Link href="/" className="back-home">Kembali ke beranda</Link>
    </section>
  );
}
