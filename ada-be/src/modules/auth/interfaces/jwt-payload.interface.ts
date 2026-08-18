import type { UserRole } from '../../../generated/prisma/enums';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  tokenVersion: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  tokenVersion: number;
  type: 'refresh';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}
