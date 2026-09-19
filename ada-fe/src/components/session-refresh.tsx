'use client';
import { useEffect } from 'react';
import { refreshBrowserSession } from '@/lib/session-client';

export function SessionRefresh({ expiresAt, available }: { expiresAt?: number; available: boolean }) {
  useEffect(() => {
    if (!available) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let scheduledExpiry = expiresAt ?? 0;
    const schedule = (delay: number) => { if (timer) clearTimeout(timer); timer = setTimeout(() => { void renew(); }, Math.max(1000, Math.min(delay, 2_000_000_000))); };
    const renew = async () => {
      if (document.visibilityState === 'hidden') return;
      const result = await refreshBrowserSession();
      if (stopped) return;
      if (result.ok && result.expiresAt) { scheduledExpiry = result.expiresAt; schedule(scheduledExpiry - Date.now() - 30_000); }
      else if (result.status !== 401 && result.status !== 403) schedule(30_000);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') schedule(scheduledExpiry - Date.now() - 30_000); };
    schedule(scheduledExpiry - Date.now() - 30_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [expiresAt, available]);
  return null;
}
