import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut, ArrowUpRight } from 'lucide-react';
import { MobileNavigation } from '@/components/mobile-navigation';
import { AdminNavigation } from '@/components/admin-navigation';
import { logoutAction } from '@/actions/auth.actions';
import { getSession } from '@/lib/api';

const allowedRoles = new Set(['STAFF', 'ADMIN', 'SUPER_ADMIN']);
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSession();
  if (!user) redirect('/login?returnTo=%2Fadmin');
  if (!allowedRoles.has(user.role)) redirect('/');
  const navigation = <AdminNavigation role={user.role}/>;
  const profile = <div className="admin-profile"><span><strong>{user.fullName}</strong><small>{user.role.replaceAll('_', ' ')}</small></span><form action={logoutAction}><button aria-label="Keluar"><LogOut size={18}/></button></form></div>;
  return <div className="admin-app"><aside className="admin-sidebar">
    <Link href="/admin" className="admin-brand"><span>AD</span><strong>Arga Damar<small>Ruang pengelolaan</small></strong></Link>
    {navigation}{profile}
  </aside><div className="admin-workspace"><header>
    <div className="admin-mobile-nav"><MobileNavigation label="Menu admin">{navigation}{profile}</MobileNavigation></div>
    <span className="admin-context">Arga Damar <span>/</span> Pengelolaan toko</span>
    <Link className="admin-store-link" href="/">Lihat toko <ArrowUpRight size={15}/></Link>
  </header><main>{children}</main></div></div>;
}
