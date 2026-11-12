import { redirect } from 'next/navigation';
import { getSession } from '@/lib/api';
import { isStoreStaff } from '@/lib/admin-role';

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSession();
  if (user && isStoreStaff(user.role)) redirect('/admin/profile');
  return children;
}
