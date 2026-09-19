import type { AuthResponse, SessionUser } from './types';

export function safeReturnTo(value: string, fallback = '/'): string {
  if (value.length > 2048 || !value.startsWith('/') || value.startsWith('//')) return fallback;
  let decoded = value;
  for (let pass = 0; pass < 3; pass += 1) {
    if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith('//')) return fallback;
    try { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; } catch { return fallback; }
  }
  if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith('//')) return fallback;
  try {
    const target = new URL(value, 'https://store.invalid');
    if (target.origin !== 'https://store.invalid' || target.pathname.startsWith('/session/renew') || target.pathname.startsWith('/api/session/')) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch { return fallback; }
}

/** Scheduling hint only. JWT authentication and authorization remain in the backend. */
export function accessExpiresAt(token: string | undefined): number | undefined {
  if (!token || token.length > 8192) return undefined;
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const payload: unknown = JSON.parse(atob(parts[1].replaceAll('-', '+').replaceAll('_', '/')));
    if (!payload || typeof payload !== 'object' || !('exp' in payload) || typeof payload.exp !== 'number' || !Number.isSafeInteger(payload.exp) || payload.exp <= 0) return undefined;
    const expiresAt = payload.exp * 1000;
    return Number.isSafeInteger(expiresAt) ? expiresAt : undefined;
  } catch { return undefined; }
}

function validUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') return false;
  return 'id' in value && typeof value.id === 'string' && 'email' in value && typeof value.email === 'string' && 'fullName' in value && typeof value.fullName === 'string' && 'role' in value && typeof value.role === 'string' && ['CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(value.role);
}

export function parseAuthResponse(value: unknown): AuthResponse | undefined {
  if (!value || typeof value !== 'object' || !('user' in value) || !validUser(value.user) || !('accessToken' in value) || typeof value.accessToken !== 'string' || !accessExpiresAt(value.accessToken) || !('expiresIn' in value) || typeof value.expiresIn !== 'number' || !Number.isSafeInteger(value.expiresIn) || value.expiresIn <= 0 || value.expiresIn > 31_536_000) return undefined;
  return { user: value.user, accessToken: value.accessToken, expiresIn: value.expiresIn };
}

export interface RefreshCookie { value: string; maxAge: number }
export function parseRefreshCookie(headers: Headers): RefreshCookie | undefined {
  const values = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [headers.get('set-cookie') ?? ''];
  for (const header of values) {
    const match = /(?:^|,\s*)refresh_token=([A-Za-z0-9_.-]+);([^\n]*)/i.exec(header);
    if (!match || match[1].length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(match[1])) continue;
    const maxAge = Number(/(?:^|;)\s*Max-Age=(\d+)(?:;|$)/i.exec(match[2])?.[1]);
    if (Number.isSafeInteger(maxAge) && maxAge > 0 && maxAge <= 31_536_000) return { value: match[1], maxAge };
  }
  return undefined;
}

export function isSameOriginPost(request: { method: string; url: string; headers: Headers }): boolean {
  if (request.method !== 'POST') return false;
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if (!origin || (site !== null && site !== 'same-origin')) return false;
  try { return new URL(origin).origin === new URL(request.url).origin && origin === new URL(origin).origin; }
  catch { return false; }
}

export function sessionCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge };
}
