import type { UserRole } from './enums';

export interface JwtPayload {
  id: string;
  roles: UserRole[];
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface LoginSignupResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string | null;
    role: UserRole;
  };
}
