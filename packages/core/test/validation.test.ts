import { describe, expect, it } from 'vitest';
import {
  getErrorHint,
  isRetryableCode,
  ERROR_CATALOG,
} from '../src/errors.js';
import {
  validateEmail,
  validatePassword,
  validateSignIn,
  validateSignUp,
} from '../src/validation.js';

describe('client-side validation (Week 5)', () => {
  it('accepts valid signup input', () => {
    expect(validateSignUp({ email: 'Ada@Example.com', password: 'long-enough-1' })).toEqual([]);
  });

  it('rejects bad emails, short passwords, bad usernames', () => {
    expect(validateEmail('not-an-email')).toBeTruthy();
    expect(validateEmail('')).toBeTruthy();
    expect(validateEmail(undefined)).toBeTruthy();
    expect(validatePassword('short')).toBeTruthy();
    const issues = validateSignUp({ email: 'bad', password: 'x', username: 'has space!' });
    expect(issues.map((i) => i.field).sort()).toEqual(['email', 'password', 'username']);
  });

  it('requires email or username on sign-in', () => {
    expect(validateSignIn({ password: 'long-enough-1' })[0].field).toBe('email');
    expect(validateSignIn({ username: 'ada', password: 'long-enough-1' })).toEqual([]);
  });
});

describe('error catalog (Week 5)', () => {
  it('covers the codes the workers actually emit', () => {
    for (const code of [
      'CSRF_TOKEN_INVALID',
      'TOO_MANY_REQUESTS',
      'EMAIL_NOT_VERIFIED',
      'PASSWORD_CHANGE_REQUIRED',
      '2FA_REQUIRED',
      'ACCOUNT_BLOCKED',
      'INVALID_PUBLISHABLE_KEY',
    ]) {
      expect(ERROR_CATALOG[code]?.hint, code).toBeTruthy();
    }
  });

  it('marks rate limits retryable, auth failures not', () => {
    expect(isRetryableCode('TOO_MANY_REQUESTS')).toBe(true);
    expect(isRetryableCode('CSRF_TOKEN_INVALID')).toBe(true);
    expect(isRetryableCode('ACCOUNT_BLOCKED')).toBe(false);
    expect(isRetryableCode('nope')).toBe(false);
    expect(getErrorHint(undefined)).toBeUndefined();
  });
});
