import { NextRequest, NextResponse } from 'next/server';
import { accessExpiresAt, safeReturnTo } from './lib/session-security';

export function proxy(request: NextRequest) {
  // GET is read-only: no refresh token is consumed from navigation/prefetch requests.
  if (request.method !== 'GET' || request.headers.has('next-router-prefetch') || request.headers.get('purpose') === 'prefetch') return NextResponse.next();
  const expiry = accessExpiresAt(request.cookies.get('access_token')?.value);
  if (expiry && expiry > Date.now() + 5000) return NextResponse.next();
  const destination = request.nextUrl.clone();
  destination.pathname = request.cookies.has('refresh_token') ? '/session/renew' : '/login';
  destination.search = new URLSearchParams({ returnTo: safeReturnTo(`${request.nextUrl.pathname}${request.nextUrl.search}`) }).toString();
  const response = NextResponse.redirect(destination);
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}

export const config = { matcher: ['/account/:path*', '/admin/:path*', '/cart', '/checkout', '/quotation'] };
