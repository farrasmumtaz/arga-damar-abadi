'use client';

export default function StorefrontError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="container empty-state" role="alert"><h1>Halaman belum dapat dimuat</h1><p>Koneksi ke layanan toko sedang bermasalah. Silakan coba kembali.</p><button className="button button-primary" onClick={reset}>Coba kembali</button></section>;
}
