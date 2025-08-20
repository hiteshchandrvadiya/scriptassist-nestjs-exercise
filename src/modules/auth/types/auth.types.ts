// ---------- User ----------
export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: string;
}

// ---------- Auth Responses ----------
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds until expiration
  user: UserDto;
}

export type LoginResponse = AuthResponse;
export type RegisterResponse = AuthResponse;

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds until expiration
}

export interface LogoutResponse {
  message: string; // e.g., "Successfully logged out"
}

// ---------- JWT ----------
export interface JwtPayload {
  sub: string; // subject (user id)
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number; // issued at (epoch seconds)
  exp?: number; // expiry (epoch seconds)
  iss?: string; // issuer
  aud?: string; // audience
  jti?: string; // JWT ID (optional but useful for token revocation)
}

// ---------- Lockout ----------
export interface LockoutData {
  attempts: number; // failed attempts count
  lockedUntil: number; // epoch ms until unlock
}
