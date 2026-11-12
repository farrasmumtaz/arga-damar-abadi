'use client';

import Link from 'next/link';
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="section empty-state" role="alert"><h1>Data belum dapat dimuat</h1><p>Periksa koneksi dan coba kembali. Perubahan yang belum dikonfirmasi tidak dianggap berhasil.</p><button className="button button-primary" onClick={reset}>Coba kembali</button><Link href="/admin">Kembali ke dashboard</Link></section>;
}
