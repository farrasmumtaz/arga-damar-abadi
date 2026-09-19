import { NextRequest, NextResponse } from 'next/server';
import { accessExpiresAt, isSameOriginPost, sessionCookieOptions } from '@/lib/session-security';
import { rotateSession, SessionRefreshError } from '@/lib/session-server';

export const runtime = 'nodejs';
const responseHeaders = { 'Cache-Control': 'no-store, private', 'Vary': 'Cookie, Origin', 'X-Content-Type-Options': 'nosniff' };

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request, process.env.FRONTEND_ORIGIN)) return NextResponse.json({ error: 'Permintaan sesi ditolak.' }, { status: 403, headers: responseHeaders });
  const currentExpiry = accessExpiresAt(request.cookies.get('access_token')?.value);
  if (currentExpiry && currentExpiry > Date.now() + 45_000) return NextResponse.json({ expiresAt: currentExpiry }, { headers: responseHeaders });
  const token = request.cookies.get('refresh_token')?.value;
  if (!token) return NextResponse.json({ error: 'Sesi berakhir. Silakan login kembali.' }, { status: 401, headers: responseHeaders });
  try {
    const session = await rotateSession(token);
    const response = NextResponse.json({ expiresAt: Date.now() + session.data.expiresIn * 1000 }, { headers: responseHeaders });
    response.cookies.set('access_token', session.data.accessToken, sessionCookieOptions(session.data.expiresIn));
    response.cookies.set('refresh_token', session.refresh.value, sessionCookieOptions(session.refresh.maxAge));
    return response;
  } catch (error: unknown) {
    const status = error instanceof SessionRefreshError ? error.status : 503;
    // A failed concurrent request must not erase the successful request's new cookies.
    return NextResponse.json({ error: status === 401 ? 'Sesi berakhir. Silakan login kembali.' : 'Sesi belum dapat diperbarui.' }, { status, headers: responseHeaders });
  }
}
