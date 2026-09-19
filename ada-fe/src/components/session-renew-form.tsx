'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { refreshBrowserSession } from '@/lib/session-client';

export function SessionRenewForm({ returnTo }: { returnTo: string }) {
  const [pending, setPending] = useState(true);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState('');
  const renew = useCallback(async () => {
    setPending(true); setError('');
    let result = await refreshBrowserSession();
    if (!result.ok && result.status === 401) result = await refreshBrowserSession();
    if (result.ok) { window.location.replace(returnTo); return; }
    setExpired(result.status === 401 || result.status === 403);
    setError(result.status === 401 || result.status === 403 ? 'Sesi Anda telah berakhir. Silakan masuk kembali.' : 'Server belum dapat memperbarui sesi. Coba kembali; data Anda tidak dihapus.');
    setPending(false);
  }, [returnTo]);
  useEffect(() => { void renew(); }, [renew]);
  return <div className="auth-card"><h1>Memperbarui sesi</h1><p role="status">{pending ? 'Menghubungkan kembali akun Anda dengan aman...' : error}</p>{!pending && !expired && <button type="button" className="button button-primary" onClick={() => { void renew(); }}>Coba lagi</button>}{!pending && <Link className="button button-outline" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Masuk kembali</Link>}<Link href="/">Kembali ke toko</Link></div>;
}
