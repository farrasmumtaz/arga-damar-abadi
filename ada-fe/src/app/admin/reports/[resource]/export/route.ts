import { cookies } from 'next/headers';
export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!['orders', 'quotations', 'users', 'audit'].includes(resource)) return new Response(null, { status: 404 });
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return new Response(null, { status: 401 });
  const input = new URL(request.url).searchParams; const query = new URLSearchParams();
  for (const key of ['page', 'limit', 'search', 'status']) if (input.has(key)) query.set(key, input.get(key)!);
  const result = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/api/v1'}/admin/reports/${resource}/export?${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!result.ok) return new Response('Export tidak dapat diproses', { status: result.status });
  return new Response(result.body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${resource}.csv"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
