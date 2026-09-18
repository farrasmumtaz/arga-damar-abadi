import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';
import { getPromotions } from '@/lib/promotions-api';
import { togglePromotionAction } from '@/actions/promotions.actions';
import { formatPrice } from '@/lib/catalog';

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; error?: string }> }) {
  const user = await getSession();
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) redirect('/admin');
  const query = await searchParams;
  const numericPage = Number(query.page ?? 1);
  const page = Number.isSafeInteger(numericPage) && numericPage > 0 ? numericPage : 1;
  const search = (query.search ?? '').slice(0, 150);
  const result = await getPromotions(page, search);
  const href = (next: number) => `/admin/promotions?${new URLSearchParams({ page: String(next), search })}`;
  return <><div className="admin-page-heading"><div><p className="eyebrow">Marketing</p><h1>Voucher & promosi</h1></div><Link className="button button-primary" href="/admin/promotions/new">Buat voucher</Link></div>
    <p>Aturan dihitung ulang di backend saat checkout. Kuota termasuk order pending, batal, dan refund; jangan menjanjikan pemakaian ulang setelah pembatalan.</p>
    {query.error && <p role="alert" className="form-error">{query.error}</p>}
    <form method="get"><label>Cari voucher<input name="search" defaultValue={search} maxLength={150} /></label><button className="button button-outline">Cari</button></form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Kode</th><th>Potongan</th><th>Masa berlaku</th><th>Kuota</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{result.data.map((promotion) => <tr key={promotion.id}><td><Link href={`/admin/promotions/${promotion.id}`}><strong>{promotion.code}</strong></Link><br />{promotion.name}</td><td>{promotion.kind === 'PERCENTAGE' ? `${promotion.amount}%` : formatPrice(Number(promotion.amount))}<br /><small>Min. {formatPrice(Number(promotion.minSubtotal))}</small></td><td>{new Date(promotion.startsAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}<br />s/d {new Date(promotion.endsAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</td><td>{promotion.usedCount}/{promotion.usageLimit}<br /><small>Maks. {promotion.perUserLimit}/akun</small></td><td>{!promotion.isActive ? 'Nonaktif' : new Date(promotion.endsAt) <= new Date() ? 'Kedaluwarsa' : new Date(promotion.startsAt) > new Date() ? 'Terjadwal' : 'Aktif'}</td><td><Link href={`/admin/promotions/${promotion.id}`}>Edit</Link><form action={togglePromotionAction.bind(null, promotion.id, !promotion.isActive)}><button className="button button-outline">{promotion.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button></form></td></tr>)}</tbody></table></div>
    {!result.data.length && <p>Belum ada voucher untuk filter ini.</p>}
    <nav aria-label="Halaman voucher">{page > 1 && <Link href={href(page - 1)}>Sebelumnya</Link>} <span>Halaman {page} dari {Math.max(1, result.meta.totalPages)} ({result.meta.total} voucher)</span> {page < result.meta.totalPages && <Link href={href(page + 1)}>Berikutnya</Link>}</nav>
  </>;
}
