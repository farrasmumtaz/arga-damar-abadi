import Link from 'next/link';

export function ListPagination({ page, total, totalPages, href }: { page: number; total: number; totalPages: number; href: (page: number) => string }) {
  return <nav className="catalog-pagination" aria-label="Halaman daftar">
    {page > 1 && <Link href={href(page - 1)}>Sebelumnya</Link>}
    <span>Halaman {page} dari {Math.max(1, totalPages)} · {total} data</span>
    {page < totalPages && <Link href={href(page + 1)}>Berikutnya</Link>}
  </nav>;
}
