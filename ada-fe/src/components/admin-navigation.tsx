'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Boxes, ClipboardList, FileText, FolderTree, LayoutDashboard, Package, ShoppingBag, Tag, Users, Warehouse, Bell, UserRound } from 'lucide-react';

export function AdminNavigation({ role }: { role: string }) {
  const path = usePathname();
  const groups = [
    { title: 'Toko', items: [
      { href: '/admin', label: 'Ringkasan', icon: LayoutDashboard },
      { href: '/admin/orders', label: 'Pesanan', icon: ShoppingBag },
      { href: '/admin/quotations', label: 'Penawaran', icon: ClipboardList },
    ] },
    { title: 'Persediaan', items: [
      { href: '/admin/products', label: 'Produk', icon: Package },
      { href: '/admin/catalog', label: 'Kategori & brand', icon: FolderTree },
      { href: '/admin/inventory', label: 'Stok', icon: Boxes },
      { href: '/admin/warehouses', label: 'Gudang & transfer', icon: Warehouse },
      { href: '/admin/procurement', label: 'Supplier & pembelian', icon: ShoppingBag },
    ] },
    { title: 'Pengelolaan', items: [
      { href: '/admin/profile', label: 'Profil admin', icon: UserRound },
      ...(role === 'STAFF' ? [] : [
        { href: '/admin/analytics', label: 'Analitik', icon: BarChart3 },
        { href: '/admin/promotions', label: 'Voucher', icon: Tag },
        { href: '/admin/notifications', label: 'Notifikasi', icon: Bell },
        { href: '/admin/users', label: 'Pengguna', icon: Users },
      ]),
      { href: '/admin/reports/orders', label: 'Laporan & audit', icon: FileText },
    ] },
  ];
  return <nav className="admin-navigation" aria-label="Navigasi admin">{groups.map(group => <div className="admin-nav-group" key={group.title}><p>{group.title}</p>{group.items.map(item => {
    const current = item.href === '/admin' ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
    return <Link href={item.href} aria-current={current ? 'page' : undefined} key={item.href}><item.icon size={18} aria-hidden="true"/><span>{item.label}</span></Link>;
  })}</div>)}</nav>;
}
