import Link from 'next/link';
import { AccountSecurityForm } from '@/components/account-security-form';
export default function ForgotPasswordPage() {
  return <section className="container section"><div className="auth-card"><h1>Lupa password</h1><p>Masukkan email akun Anda untuk menerima tautan reset.</p><AccountSecurityForm operation="forgot-password" /><Link href="/login">Kembali ke login</Link></div></section>;
}
