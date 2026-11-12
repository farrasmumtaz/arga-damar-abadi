import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/user-api';
import { AccountSecurityForm } from '@/components/account-security-form';

export default async function AdminProfilePage() {
  const user = await getProfile();
  if (!user) redirect('/login?returnTo=%2Fadmin%2Fprofile');
  return <section className="admin-shell section"><div className="admin-heading"><div><h1>Profil admin</h1><p>Identitas dan keamanan akun pengelola toko.</p></div></div><div className="admin-form admin-identity"><div><strong>Nama lengkap</strong><p>{user.fullName}</p></div><div><strong>Email</strong><p>{user.email}</p></div><div><strong>Nomor telepon</strong><p>{user.phone || 'Belum ditambahkan'}</p></div><div><strong>Peran</strong><p>{user.role.replaceAll('_', ' ')}</p></div></div><section className="admin-form"><h2>Ubah password</h2><AccountSecurityForm operation="change-password" /></section></section>;
}
