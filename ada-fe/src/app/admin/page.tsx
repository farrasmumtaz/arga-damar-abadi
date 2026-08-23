import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Boxes, ClipboardList, FileText, PackageCheck, ShoppingBag, UsersRound } from 'lucide-react';
import { getSession } from '@/lib/api';
import { getAdminDashboard } from '@/lib/admin-api';
import { formatPrice } from '@/lib/catalog';

const allowed = new Set(['STAFF', 'ADMIN', 'SUPER_ADMIN']);
export default async function AdminDashboardPage() {
  const user = await getSession();
  if (!user) redirect('/login?returnTo=%2Fadmin');
  if (!allowed.has(user.role)) redirect('/');
  const dashboard = await getAdminDashboard();
  const metrics = [
    ['Pendapatan', formatPrice(Number(dashboard.metrics.revenue)), ShoppingBag],
    ['Order pending', dashboard.metrics.pendingOrders, ClipboardList],
    ['Quotation aktif', dashboard.metrics.openQuotations, FileText],
    ['Stok menipis', dashboard.metrics.lowStock, Boxes],
    ['Produk aktif', dashboard.metrics.activeProducts, PackageCheck],
    ['Customer', dashboard.metrics.customers, UsersRound],
  ] as const;
  return <section className="admin-shell container section">
    <div className="admin-heading"><div><p className="eyebrow"><span /> Control center</p><h1>Dashboard operasional</h1><p>Selamat datang, {user.fullName}.</p></div><nav><Link href="/admin">Overview</Link><Link href="/admin/inventory">Inventory</Link><Link href="/admin/orders">Orders</Link><Link href="/admin/quotations">Quotation</Link></nav></div>
    <div className="metric-grid">{metrics.map(([label, value, Icon]) => <article key={label}><Icon/><span>{label}</span><strong>{value}</strong></article>)}</div>
    <div className="admin-panels"><section><div className="panel-title"><h2>Order terbaru</h2><Link href="/admin/orders">Lihat semua</Link></div><div className="admin-table">{dashboard.recentOrders.map((order) => <div key={order.id}><span><strong>{order.orderNumber}</strong><small>{order.user.fullName} · {order._count.items} item</small></span><span className={`status status-${order.status.toLowerCase()}`}>{order.status.replaceAll('_', ' ')}</span><strong>{formatPrice(Number(order.total))}</strong></div>)}</div></section>
      <section><div className="panel-title"><h2>Quotation terbaru</h2><Link href="/admin/quotations">Lihat semua</Link></div><div className="admin-table">{dashboard.recentQuotations.map((quote) => <div key={quote.id}><span><strong>{quote.quotationNumber}</strong><small>{quote.user.fullName} · {quote.projectName}</small></span><span className={`status status-${quote.status.toLowerCase()}`}>{quote.status}</span></div>)}</div></section></div>
  </section>;
}
