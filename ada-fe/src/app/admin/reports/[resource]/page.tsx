import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { apiRequest, getSession } from '@/lib/api';
interface Report { data: Array<{ id: string; reference: string; name: string; status: string; amount: string; createdAt: string }>; meta: { page: number; total: number; totalPages: number } }
const statuses: Record<string, string[]> = { orders: ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'], quotations: ['SUBMITTED', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'], users: ['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'], audit: [] };
export default async function ReportPage({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<{ page?: string; search?: string; status?: string }> }) {
  const { resource } = await params;
  if (!Object.hasOwn(statuses, resource)) notFound();
  const user = await getSession();
  if (!user || user.role === 'CUSTOMER' || (['users', 'audit'].includes(resource) && user.role === 'STAFF')) redirect('/admin');
  const filter = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(filter.page ?? '1', 10) || 1));
  const query = new URLSearchParams({ page: String(page), limit: '25', ...(filter.search ? { search: filter.search } : {}), ...(filter.status ? { status: filter.status } : {}) });
  const token = (await cookies()).get('access_token')?.value;
  const report = await apiRequest<Report>(`/admin/reports/${resource}?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  const href = (number: number) => { const next = new URLSearchParams(query); next.set('page', String(number)); return `?${next}`; };
  return <section className="section admin-list-page"><h1>Laporan {resource}</h1>
    <nav className="account-nav">{Object.keys(statuses).filter(r => user.role !== 'STAFF' || !['users', 'audit'].includes(r)).map(r => <Link key={r} href={`/admin/reports/${r}`}>{r}</Link>)}</nav>
    <form className="admin-form report-filter" method="get"><label className="field">Cari<input name="search" defaultValue={filter.search} maxLength={120} /></label><label className="field">Status<select name="status" defaultValue={filter.status ?? ''}><option value="">Semua</option>{statuses[resource].map(status => <option key={status}>{status}</option>)}</select></label><button className="button button-primary">Terapkan filter</button></form>
    <p>{report.meta.total} data · halaman {page} dari {Math.max(1, report.meta.totalPages)}</p>
    <a className="button button-secondary" href={`/admin/reports/${resource}/export?${query}`}>Export halaman ini (CSV)</a>
    <div className="data-table">{report.data.map(row => <div key={row.id}><span><strong>{row.reference || row.id}</strong><small>{row.name}</small></span><span>{row.status}</span><span>{row.amount}</span><small>{new Date(row.createdAt).toLocaleString('id-ID')}</small>{['orders', 'quotations'].includes(resource) && <span className="row-actions"><Link href={`/admin/${resource}/${row.id}`}>Detail</Link>{resource === 'orders' && user.role !== 'STAFF' && ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(row.status) && <Link href={`/admin/orders/${row.id}/refund`}>Refund</Link>}{resource === 'quotations' && <Link href={`/admin/quotations/${row.id}/attachment`}>BOQ</Link>}</span>}</div>)}</div>
    {report.data.length === 0 && <p>Tidak ada data untuk filter ini.</p>}
    <nav className="account-nav" aria-label="Pagination">{page > 1 && <Link href={href(page - 1)}>Sebelumnya</Link>}{page < report.meta.totalPages && <Link href={href(page + 1)}>Berikutnya</Link>}</nav>
  </section>;
}
