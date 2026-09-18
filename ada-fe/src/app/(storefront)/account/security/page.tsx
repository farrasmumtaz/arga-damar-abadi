import { redirect } from 'next/navigation';
import { AccountNav } from '@/components/account-nav';
import { AccountSecurityForm } from '@/components/account-security-form';
import { getProfile } from '@/lib/user-api';
export default async function AccountSecurityPage() {
  const user = await getProfile();
  if (!user) redirect('/login?returnTo=%2Faccount%2Fsecurity');
  return <section className="container section"><div className="account-heading"><h1>Keamanan akun</h1><AccountNav /></div><div className="account-grid"><section className="admin-form"><h2>Verifikasi email</h2><p>{user.email}</p>{user.emailVerified ? <p className="form-success">Email terverifikasi</p> : <AccountSecurityForm operation="verification/request" />}</section><section className="admin-form"><h2>Ubah password</h2><AccountSecurityForm operation="change-password" /></section></div></section>;
}
