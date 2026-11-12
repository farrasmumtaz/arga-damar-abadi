'use client';

import { useActionState, useState, useTransition } from 'react';
import { searchQuotationProducts, submitQuotationAction } from '@/actions/quotation.actions';
import { MediaUpload } from './media-upload';

interface ProductOption { id: string; name: string; sku: string }
interface Line { key: number; productId: string; description: string; quantity: string }
export function QuotationForm() {
  const [state, action, pending] = useActionState(submitQuotationAction, {});
  const [fields, setFields] = useState({ projectName: '', companyName: '', contactName: '', contactPhone: '', notes: '' });
  const [lines, setLines] = useState<Line[]>([]);
  const [sequence, setSequence] = useState(0);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{ products: ProductOption[]; totalPages: number; error?: string }>();
  const [page, setPage] = useState(1);
  const [searching, startSearch] = useTransition();
  const [lastSearch, setLastSearch] = useState('');
  function find(next: number, term = search) {
    startSearch(async () => { setResult(await searchQuotationProducts(term, next)); setPage(next); setLastSearch(term); });
  }
  function add(product?: ProductOption) {
    setLines(current => [...current, { key: sequence, productId: product?.id ?? '', description: product?.name ?? '', quantity: '1' }]);
    setSequence(current => current + 1);
  }
  function update(key: number, data: Partial<Line>) { setLines(current => current.map(line => line.key === key ? { ...line, ...data } : line)); }
  return <form className="quotation-form" action={action}>
    <h2>Detail permintaan</h2>
    <fieldset disabled={pending}>
      <legend>Informasi proyek</legend>
      <label className="field">Nama proyek<input name="projectName" value={fields.projectName} onChange={event => setFields({ ...fields, projectName: event.target.value })} minLength={2} maxLength={200} required /></label>
      <label className="field">Nama perusahaan (opsional)<input name="companyName" value={fields.companyName} onChange={event => setFields({ ...fields, companyName: event.target.value })} maxLength={200} /></label>
      <label className="field">Nama kontak<input name="contactName" value={fields.contactName} onChange={event => setFields({ ...fields, contactName: event.target.value })} autoComplete="name" minLength={2} maxLength={150} required /></label>
      <label className="field">WhatsApp<input name="contactPhone" type="tel" value={fields.contactPhone} onChange={event => setFields({ ...fields, contactPhone: event.target.value })} autoComplete="tel" placeholder="+628123456789" required /></label>
      <fieldset><legend>Cari produk katalog</legend>
        <label className="field">Nama atau SKU<input value={search} onChange={event => setSearch(event.target.value)} maxLength={200} /></label>
        <button type="button" className="button button-secondary" disabled={searching} onClick={() => find(1)}>{searching ? 'Mencari…' : 'Cari produk'}</button>
        {result?.error && <p role="alert">{result.error}</p>}
        {result && !result.products.length && !result.error && <p role="status">Tidak ada produk yang sesuai.</p>}
        {result?.products.map(product => <div className="quotation-search-result" key={product.id}><span>{product.name} · {product.sku}</span><button type="button" disabled={lines.length >= 100} onClick={() => add(product)}>Tambahkan</button></div>)}
        {result && result.totalPages > 1 && <nav aria-label="Halaman pencarian produk"><button type="button" disabled={searching || page === 1} onClick={() => find(page - 1, lastSearch)}>Sebelumnya</button><span>Halaman {page} dari {result.totalPages}</span><button type="button" disabled={searching || page >= result.totalPages} onClick={() => find(page + 1, lastSearch)}>Berikutnya</button></nav>}
      </fieldset>
      <button type="button" className="button button-secondary" disabled={lines.length >= 100} onClick={() => add()}>Tambah kebutuhan di luar katalog</button>
      <p>{lines.length}/100 kebutuhan. Tambahkan produk katalog atau tulis spesifikasi khusus.</p>
      {lines.map((line, index) => <fieldset key={line.key}><legend>Kebutuhan {index + 1}</legend>
        <input type="hidden" name="productId" value={line.productId} />
        <label className="field">Deskripsi / spesifikasi<textarea name="description" value={line.description} onChange={event => update(line.key, { description: event.target.value })} minLength={2} maxLength={300} required /></label>
        <label className="field">Jumlah<input name="quantity" type="number" value={line.quantity} onChange={event => update(line.key, { quantity: event.target.value })} min={1} step={1} required /></label>
        <button type="button" onClick={() => setLines(current => current.filter(row => row.key !== line.key))}>Hapus kebutuhan {index + 1}</button>
      </fieldset>)}
      <MediaUpload purpose="boq" />
      <label className="field">Catatan kebutuhan (opsional)<textarea name="notes" value={fields.notes} onChange={event => setFields({ ...fields, notes: event.target.value })} rows={5} maxLength={1000} /></label>
    </fieldset>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className="button button-primary" disabled={pending || !lines.length}>{pending ? 'Mengirim…' : 'Kirim permintaan'}</button>
    <small>Dengan mengirim form, Anda menyetujui tim kami menghubungi kontak yang diberikan.</small>
  </form>;
}
