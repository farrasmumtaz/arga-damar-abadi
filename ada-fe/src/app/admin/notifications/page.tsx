import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiRequest, getSession } from '@/lib/api';
import { retryNotificationAction } from '@/actions/notifications.actions';
interface NotificationList { data: Array<{ id: string; subject: string; recipient: string; channel: string; status: string; attempts: number; createdAt: string }>; meta: { page: number; totalPages: number; total: number }; workerEnabled: boolean; whatsappEnabled: boolean }
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const user = await getSession(); if (!user || !['ADMIN','SUPER_ADMIN'].includes(user.role)) redirect('/admin');
  const query = await searchParams; const page = /^\d{1,6}$/.test(query.page ?? '') && Number(query.page) > 0 ? Number(query.page) : 1;
  const status = ['QUEUED','SENT','FAILED','CANCELLED'].includes(query.status ?? '') ? query.status! : '';
  const params = new URLSearchParams({ page: String(page) }); if (status) params.set('status',status);
  const token = (await cookies()).get('access_token')?.value;
  const result = await apiRequest<NotificationList>(`/admin/notifications?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  const href = (next: number) => `/admin/notifications?${new URLSearchParams({ page: String(next), ...(status ? { status } : {}) })}`;
  return <><div className="admin-page-heading"><h1>Antrean notifikasi</h1><p>Worker: {result.workerEnabled ? 'aktif' : 'nonaktif'} · WhatsApp: {result.whatsappEnabled ? 'aktif' : 'nonaktif'}. SENT berarti diterima provider, bukan bukti dibaca.</p></div>
    <form><label>Status <select name="status" defaultValue={status}><option value="">Semua</option>{['QUEUED','SENT','FAILED','CANCELLED'].map(value => <option key={value}>{value}</option>)}</select></label><button className="button button-primary">Filter</button></form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Pesan</th><th>Penerima</th><th>Kanal</th><th>Status</th><th>Percobaan</th><th>Aksi</th></tr></thead><tbody>{result.data.map(row => <tr key={row.id}><td>{row.subject}</td><td>{row.recipient}</td><td>{row.channel}</td><td>{row.status}</td><td>{row.attempts}</td><td>{row.status === 'FAILED' && <form action={retryNotificationAction.bind(null,row.id)}><button>Coba lagi</button></form>}</td></tr>)}</tbody></table></div>
    <nav className="catalog-pagination">{page > 1 && <Link href={href(page-1)}>Sebelumnya</Link>}<span>{result.meta.total} pesan · halaman {page}</span>{page < result.meta.totalPages && <Link href={href(page+1)}>Berikutnya</Link>}</nav>
  </>;
}
