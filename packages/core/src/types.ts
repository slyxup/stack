// SlyxUp Core SDK — shared types

export interface SlyxupUser {
  id: string;
  projectId: string | null;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  preferences: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlyxupSession {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface SignInInput {
  email: string;
  password: string;
  projectId?: string;
}

export interface SignUpInput extends SignInInput {
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
}

export interface SessionResponse {
  ok: true;
  user: Pick<SlyxupUser, 'id' | 'email'>;
  session: Pick<SlyxupSession, 'id' | 'expiresAt'>;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface SlyxupSessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
  /** true when this session belongs to the caller's current cookie */
  isCurrent: boolean;
}

export interface SessionsResponse {
  ok: true;
  sessions: SlyxupSessionInfo[];
  total: number;
  limit: number;
  offset: number;
}

export interface RevokeSessionsResponse {
  ok: true;
  revoked: number;
}

export interface UserResponse {
  ok: true;
  user: SlyxupUser;
}

export interface AuthResponse {
  ok: true;
  user: Pick<SlyxupUser, 'id' | 'email'>;
  sessionToken?: string;
  expiresAt?: string;
}

export interface ErrorResponse {
  ok: false;
  error: string;
}

export type Result<T> = T | ErrorResponse;

export interface SlyxupClientOptions {
  /** Publishable key — pk_test_xxx / pk_live_xxx */
  publishableKey?: string;
  /** API base URL, default https://auth.slyxup.online */
  apiUrl?: string;
}
