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

export interface UserResponse {
  ok: true;
  user: SlyxupUser;
}

export interface AuthResponse {
  ok: true;
  user: Pick<SlyxupUser, 'id' | 'email'>;
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
