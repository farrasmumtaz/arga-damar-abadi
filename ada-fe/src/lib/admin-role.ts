import type { SessionUser } from './types';

export function isStoreStaff(role: SessionUser['role']): boolean {
  return role === 'STAFF' || role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export function destinationAfterLogin(role: SessionUser['role'], returnTo: string): string {
  if (!isStoreStaff(role)) return returnTo;
  return returnTo === '/admin' || returnTo.startsWith('/admin/') ? returnTo : '/admin';
}
