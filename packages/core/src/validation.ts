// SlyxUp Core — lightweight client-side validation (Week 5).
//
// Mirrors the server Zod schemas (auth/src/schemas/*) so forms fail fast
// before a network round-trip. Dependency-free: keeps the SDK bundle small.
// Server remains authoritative — these checks are convenience, not security.

export interface ValidationIssue {
  field: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]+$/i;

export function validateEmail(email: unknown): string | undefined {
  if (typeof email !== 'string' || !email.trim()) return 'Email is required';
  const v = email.trim();
  if (v.length > 255) return 'Email is too long';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return undefined;
}

export function validatePassword(password: unknown): string | undefined {
  if (typeof password !== 'string' || !password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password is too long';
  return undefined;
}

export function validateUsername(username: unknown): string | undefined {
  if (username === undefined || username === null || username === '')
    return undefined;
  if (typeof username !== 'string') return 'Username must be text';
  const v = username.trim();
  if (v.length < 3) return 'Username must be at least 3 characters';
  if (v.length > 30) return 'Username must be at most 30 characters';
  if (!USERNAME_RE.test(v))
    return 'Username may contain letters, numbers and underscores';
  return undefined;
}

export interface SignUpDraft {
  email?: unknown;
  password?: unknown;
  username?: unknown;
}

export function validateSignUp(input: SignUpDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const e = validateEmail(input.email);
  if (e) issues.push({ field: 'email', message: e });
  const p = validatePassword(input.password);
  if (p) issues.push({ field: 'password', message: p });
  const u = validateUsername(input.username);
  if (u) issues.push({ field: 'username', message: u });
  return issues;
}

export interface SignInDraft {
  email?: unknown;
  username?: unknown;
  password?: unknown;
}

export function validateSignIn(input: SignInDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!input.email && !input.username) {
    issues.push({ field: 'email', message: 'Email or username is required' });
  } else {
    if (input.email) {
      const e = validateEmail(input.email);
      if (e) issues.push({ field: 'email', message: e });
    }
  }
  const p = validatePassword(input.password);
  if (p) issues.push({ field: 'password', message: p });
  return issues;
}
