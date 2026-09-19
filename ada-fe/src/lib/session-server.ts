import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import type { AuthResponse } from './types';
import { accessExpiresAt, parseAuthResponse, parseRefreshCookie, sessionCookieOptions, type RefreshCookie } from './session-security';
import { SessionSingleFlight } from './session-single-flight';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
export interface RenewedSession { data: AuthResponse; refresh: RefreshCookie }
export class SessionRefreshError extends Error {
  constructor(public readonly status: number) { super(status === 401 ? 'Sesi berakhir. Silakan login kembali.' : 'Sesi belum dapat diperbarui. Coba kembali sebentar lagi.'); }
}
const rotations = new SessionSingleFlight<RenewedSession>();

export function rotateSession(refreshToken: string): Promise<RenewedSession> {
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(refreshToken) || refreshToken.length > 8192) return Promise.reject(new SessionRefreshError(401));
  return rotations.run(createHash('sha256').update(refreshToken).digest('hex'), async () => {
    let response: Response;
    try { response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { Cookie: `refresh_token=${refreshToken}` } }); }
    catch { throw new SessionRefreshError(503); }
    if (!response.ok) throw new SessionRefreshError(response.status === 401 || response.status === 403 ? 401 : 503);
    const payload: unknown = await response.json().catch(() => null);
    const data = parseAuthResponse(payload);
    const refresh = parseRefreshCookie(response.headers);
    if (!data || !refresh) throw new SessionRefreshError(503);
    return { data, refresh };
  });
}

export async function writeSession(session: RenewedSession): Promise<void> {
  const store = await cookies();
  store.set('access_token', session.data.accessToken, sessionCookieOptions(session.data.expiresIn));
  store.set('refresh_token', session.refresh.value, sessionCookieOptions(session.refresh.maxAge));
}

/** Server Actions only: Server Components must never rotate because they cannot commit Set-Cookie. */
export async function getActionAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  const access = store.get('access_token')?.value;
  if ((accessExpiresAt(access) ?? 0) > Date.now() + 10_000) return access;
  const refresh = store.get('refresh_token')?.value;
  if (!refresh) return undefined;
  try { const session = await rotateSession(refresh); await writeSession(session); return session.data.accessToken; }
  catch (error: unknown) {
    // Do not clear cookies here: another tab/instance may have already written the winning rotation.
    if (error instanceof SessionRefreshError && error.status === 401) return undefined;
    throw error;
  }
}
