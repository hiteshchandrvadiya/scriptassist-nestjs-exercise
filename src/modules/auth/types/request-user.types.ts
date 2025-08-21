// src/auth/interfaces/request-user.interface.ts
export interface RequestUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}
