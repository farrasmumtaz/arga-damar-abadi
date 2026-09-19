import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Boxes, FileText, FolderTree, LayoutDashboard, LogOut, Package, ShoppingBag, Users } from 'lucide-react';
import { logoutAction } from '@/actions/auth.actions';
import { getSession } from '@/lib/api';

const allowedRoles = new Set(['STAFF', 'ADMIN', 'SUPER_ADMIN']);
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSession();
  if (!user) redirect('/login?returnTo=%2Fadmin');
  if (!allowedRoles.has(user.role)) redirect('/');
  return <div className="admin-app">
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-brand"><span>AD</span><strong>ARGA DAMAR<small>Admin Console</small></strong></Link>
      <nav><Link href="/admin"><LayoutDashboard/>Overview</Link><Link href="/admin/products"><Package/>Produk</Link><Link href="/admin/catalog"><FolderTree/>Kategori & Brand</Link><Link href="/admin/inventory"><Boxes/>Inventory</Link><Link href="/admin/warehouses"><Boxes/>Gudang & Transfer</Link><Link href="/admin/procurement"><ShoppingBag/>Supplier & PO</Link>{user.role !== 'STAFF' && <><Link href="/admin/analytics"><LayoutDashboard/>Analytics</Link><Link href="/admin/promotions"><ShoppingBag/>Voucher</Link><Link href="/admin/notifications"><FileText/>Notifikasi</Link></>}<Link href="/admin/orders"><ShoppingBag/>Orders</Link><Link href="/admin/quotations"><FileText/>Quotation</Link>{user.role !== 'STAFF' && <Link href="/admin/users"><Users/>Pengguna</Link>}<Link href="/admin/reports/orders"><FileText/>Laporan & Audit</Link></nav>
      <div className="admin-profile"><span><strong>{user.fullName}</strong><small>{user.role.replaceAll('_', ' ')}</small></span><form action={logoutAction}><button aria-label="Keluar"><LogOut/></button></form></div>
    </aside>
    <div className="admin-workspace"><header><Link href="/">Lihat storefront</Link><span>{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span></header><main>{children}</main></div>
  </div>;
}
