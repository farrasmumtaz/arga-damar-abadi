interface RefreshResult { ok: boolean; expiresAt?: number; status: number }
let pending: Promise<RefreshResult> | undefined;

export function refreshBrowserSession(): Promise<RefreshResult> {
  if (pending) return pending;
  const send = async (): Promise<RefreshResult> => {
    try {
      const response = await fetch('/api/session/refresh', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' } });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !body || typeof body !== 'object' || !('expiresAt' in body) || typeof body.expiresAt !== 'number') return { ok: false, status: response.status };
      return { ok: true, expiresAt: body.expiresAt, status: 200 };
    } catch { return { ok: false, status: 503 }; }
  };
  // Web Locks serialize browser tabs; the server sees cookies from the preceding winning request.
  const request: Promise<RefreshResult> = (async () => {
    if ('locks' in navigator) return await navigator.locks.request('ada-session-renew', send);
    return send();
  })().finally(() => { pending = undefined; });
  pending = request;
  return request;
}
