import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getSession } from '@/lib/api';
import { getAdminDashboard } from '@/lib/admin-api';
import { formatPrice } from '@/lib/catalog';

export default async function AdminDashboardPage() {
  const user = await getSession();
  if (!user) redirect('/login?returnTo=%2Fadmin');
  if (!['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) redirect('/');
  const dashboard = await getAdminDashboard();
  const metrics = [
    ['Pendapatan', formatPrice(Number(dashboard.metrics.revenue))],
    ['Pesanan menunggu', dashboard.metrics.pendingOrders],
    ['Penawaran terbuka', dashboard.metrics.openQuotations],
    ['Stok menipis', dashboard.metrics.lowStock],
    ['Produk aktif', dashboard.metrics.activeProducts],
    ['Pelanggan', dashboard.metrics.customers],
  ] as const;
  return <section className="admin-shell section">
    <div className="admin-heading"><div><h1>Ringkasan toko</h1><p>Pantau pesanan, penawaran, dan persediaan dari satu tempat.</p></div><Link className="button button-primary" href="/admin/orders">Kelola pesanan <ArrowRight size={16}/></Link></div>
    <div className="metric-grid" aria-label="Ringkasan operasional">{metrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
    <div className="admin-panels"><section><div className="panel-title"><div><h2>Pesanan terbaru</h2><p>Pesanan yang baru masuk ke toko.</p></div><Link href="/admin/orders">Lihat semua <ArrowRight size={15}/></Link></div><div className="admin-table">{dashboard.recentOrders.length ? dashboard.recentOrders.map(order => <Link href={`/admin/orders/${order.id}`} className="admin-overview-row" key={order.id}><span><strong>{order.orderNumber}</strong><small>{order.user.fullName} · {order._count.items} item</small></span><span className={`status status-${order.status.toLowerCase()}`}>{order.status.replaceAll('_', ' ')}</span><strong>{formatPrice(Number(order.total))}</strong></Link>) : <p className="admin-empty">Belum ada pesanan. Pesanan baru akan muncul di sini.</p>}</div></section>
      <section><div className="panel-title"><div><h2>Penawaran terbaru</h2><p>Permintaan pengadaan dari pelanggan.</p></div><Link href="/admin/quotations">Lihat semua <ArrowRight size={15}/></Link></div><div className="admin-table">{dashboard.recentQuotations.length ? dashboard.recentQuotations.map(quote => <Link href={`/admin/quotations/${quote.id}`} className="admin-overview-row" key={quote.id}><span><strong>{quote.quotationNumber}</strong><small>{quote.user.fullName} · {quote.projectName}</small></span><span className={`status status-${quote.status.toLowerCase()}`}>{quote.status.replaceAll('_', ' ')}</span></Link>) : <p className="admin-empty">Belum ada permintaan penawaran.</p>}</div></section>
    </div>
  </section>;
}
