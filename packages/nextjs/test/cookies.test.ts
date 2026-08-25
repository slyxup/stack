import { describe, it, expect } from 'vitest';
import {
  SESSION_COOKIE_NAME,
  createSessionCookie,
  clearSessionCookie,
} from '../src/cookies.js';

describe('SESSION_COOKIE_NAME', () => {
  it('equals slyxup_session', () => {
    expect(SESSION_COOKIE_NAME).toBe('slyxup_session');
  });
});

describe('createSessionCookie', () => {
  it('should produce default cookie string', () => {
    const cookie = createSessionCookie('abc123');
    expect(cookie).toContain('slyxup_session=abc123');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Max-Age=604800');
  });

  it('should URL-encode the token', () => {
    const cookie = createSessionCookie('a b=c&d');
    expect(cookie).toContain('slyxup_session=a%20b%3Dc%26d');
  });

  it('should use custom maxAge', () => {
    const cookie = createSessionCookie('tok', { maxAge: 3600 });
    expect(cookie).toContain('Max-Age=3600');
  });

  it('should include domain when provided', () => {
    const cookie = createSessionCookie('tok', { domain: '.example.com' });
    expect(cookie).toContain('Domain=.example.com');
  });

  it('should omit Secure when secure=false', () => {
    const cookie = createSessionCookie('tok', { secure: false });
    expect(cookie).not.toContain('Secure');
  });
});

describe('clearSessionCookie', () => {
  it('should produce clear cookie string', () => {
    const cookie = clearSessionCookie();
    expect(cookie).toContain('slyxup_session=');
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('Secure');
  });

  it('should include domain when provided', () => {
    const cookie = clearSessionCookie({ domain: '.example.com' });
    expect(cookie).toContain('Domain=.example.com');
  });

  it('should omit Secure when secure=false', () => {
    const cookie = clearSessionCookie({ secure: false });
    expect(cookie).not.toContain('Secure');
  });
});
