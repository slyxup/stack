import { describe, expect, it } from 'vitest';
import {
  CURRENT_HASH_VERSION,
  getHashVersion,
  hashPassword,
  needsRehash,
  verifyPassword,
} from '../src/lib/password';

describe('versioned password hashing (Week 1 Day 1)', () => {
  it('hashes new passwords in the current versioned format', async () => {
    const hash = await hashPassword('CorrectHorse123!');
    expect(hash.startsWith('pbkdf2$600000$')).toBe(true);
    expect(getHashVersion(hash)).toBe('pbkdf2-600k');
    expect(CURRENT_HASH_VERSION).toBe('pbkdf2-600k');
  });

  it('verifies current hashes', async () => {
    const hash = await hashPassword('s3cret-pass');
    expect(await verifyPassword('s3cret-pass', hash)).toBe(true);
    expect(await verifyPassword('wrong-pass', hash)).toBe(false);
  });

  it('still verifies legacy salt:hash (100k) passwords', async () => {
    // Legacy format produced by the pre-V4 hasher.
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('legacy-pass'),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      key,
      256
    );
    const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
    const legacy = `${b64(salt)}:${b64(new Uint8Array(bits))}`;
    expect(await verifyPassword('legacy-pass', legacy)).toBe(true);
    expect(await verifyPassword('nope', legacy)).toBe(false);
    expect(getHashVersion(legacy)).toBe('pbkdf2');
  });

  it('flags legacy hashes for rehash, current ones not', async () => {
    const current = await hashPassword('x'.repeat(12));
    expect(needsRehash(current)).toBe(false);
    expect(needsRehash('c2FsdA==:aGFzaA==')).toBe(true);
    expect(needsRehash('garbage')).toBe(true);
  });

  it('rejects malformed and future-argond2id hashes safely', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', 'pbkdf2$broken')).toBe(false);
    expect(await verifyPassword('anything', '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA==')).toBe(false);
  });
});
