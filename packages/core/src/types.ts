// SlyxUp Core SDK — shared types

export interface SlyxupUser {
  id: string;
  projectId: string | null;
  email: string;
  emailVerified: boolean;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  preferences: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  /** Extended profile bio (from the auth worker user_profiles table). */
  bio?: string | null;
}

export interface SlyxupSession {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface SignInInput {
  email?: string;
  username?: string;
  password: string;
  projectId?: string;
}

export interface SignUpInput extends Omit<SignInInput, 'username'> {
  firstName?: string;
  lastName?: string;
  username?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  username?: string | null;
  preferences?: Record<string, unknown>;
  bio?: string | null;
}

export interface SessionResponse {
  ok: true;
  user: Pick<SlyxupUser, 'id' | 'email'> & {
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
  };
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
  user: Pick<SlyxupUser, 'id' | 'email'> & {
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
  };
  sessionToken?: string;
  expiresAt?: string;
}

/** Returned by signIn when the account has 2FA enabled. */
export interface TwoFactorRequiredResponse {
  ok: false;
  code: '2FA_REQUIRED';
  challengeToken: string;
}

/** Union returned by client.auth.signIn. */
export type SignInResponse = AuthResponse | TwoFactorRequiredResponse;

export interface TOTPSetupResponse {
  ok: true;
  secret: string;
  provisioningUri: string;
  accountName: string;
}

export interface EnableTOTPResponse {
  ok: true;
  recoveryCodes: string[];
}

export interface TwoFactorStatusResponse {
  ok: boolean;
  enabled: boolean;
}

export interface ConnectedAccount {
  id: string;
  provider: 'google' | 'github';
  providerAccountId: string;
  createdAt: string;
}

export interface ConnectedAccountsResponse {
  ok: true;
  accounts: ConnectedAccount[];
}

/** Input for completing a 2FA sign-in challenge. */
export interface CompleteSignInInput {
  challengeToken: string;
  code?: string;
  recoveryCode?: string;
}

export interface ErrorResponse {
  ok: false;
  error: string;
}

export type Result<T> = T | ErrorResponse;

export interface SlyxupClientOptions {
  /** Publishable key — pk_test_xxx / pk_live_xxx */
  publishableKey?: string;
  /** Secret key — sk_test_xxx / sk_live_xxx (server-side admin API) */
  secretKey?: string;
  /** API base URL, default https://auth.slyxup.online */
  apiUrl?: string;
}
