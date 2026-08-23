import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { getProducts } from '@/lib/catalog-api';
import { submitQuotationAction } from '@/actions/quotation.actions';

export const metadata: Metadata = { title: 'Minta Penawaran' };

export default async function QuotationPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const products = await getProducts();
  const query = await searchParams;
  return (
    <section className="quotation-page container section">
      <div className="quotation-intro">
        <p className="eyebrow"><span /> Kebutuhan proyek</p>
        <h1>Dapatkan penawaran<br />yang sesuai kebutuhan.</h1>
        <p>Sampaikan produk, jumlah, dan detail proyek. Tim kami akan menghubungi Anda dengan penawaran terbaik.</p>
        <ul><li><CheckCircle2 /> Harga khusus pembelian volume</li><li><CheckCircle2 /> Konsultasi spesifikasi produk</li><li><CheckCircle2 /> Dukungan jadwal pengiriman</li></ul>
      </div>
      <form className="quotation-form" action={submitQuotationAction}>
        <h2>Detail permintaan</h2>
        {query.success && <p className="form-success">Permintaan penawaran berhasil dikirim.</p>}
        {query.error && <p className="form-error">Permintaan gagal dikirim. Periksa data dan coba kembali.</p>}
        <label className="field"><span>Nama proyek</span><input name="projectName" placeholder="Pengadaan instalasi listrik" required /></label>
        <label className="field"><span>Produk</span><select name="productId" required><option value="">Pilih produk</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <div className="form-row"><label className="field"><span>Jumlah</span><input name="quantity" type="number" min="1" placeholder="Contoh: 50" required /></label><label className="field"><span>Nama perusahaan</span><input name="companyName" placeholder="PT / CV / Personal" /></label></div>
        <div className="form-row"><label className="field"><span>Nama kontak</span><input name="contactName" placeholder="Nama lengkap" required /></label><label className="field"><span>WhatsApp</span><input name="contactPhone" placeholder="+628123456789" required /></label></div>
        <label className="field"><span>Catatan kebutuhan</span><textarea name="notes" rows={5} placeholder="Spesifikasi, lokasi, dan target waktu pengadaan" /></label>
        <button className="button button-primary">Kirim permintaan <ArrowRight size={17} /></button>
        <small>Dengan mengirim form, Anda menyetujui tim kami menghubungi kontak yang diberikan.</small>
      </form>
      <Link href="/" className="back-home">Kembali ke beranda</Link>
    </section>
  );
}
