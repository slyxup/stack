import { describe, expect, it } from 'vitest';
import {
  extractDeviceInfo,
  generateFingerprint,
  normalizeUserAgent,
} from '../src/lib/fingerprint';

const UA_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('session fingerprinting (Week 1 Day 4)', () => {
  it('produces stable fingerprints for the same client', async () => {
    const meta = { ip: '1.2.3.4', userAgent: UA_CHROME };
    const a = await generateFingerprint(meta, 'secret');
    const b = await generateFingerprint(meta, 'secret');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when IP or UA changes', async () => {
    const base = { ip: '1.2.3.4', userAgent: UA_CHROME };
    const same = await generateFingerprint(base, 'secret');
    const diffIp = await generateFingerprint({ ...base, ip: '5.6.7.8' }, 'secret');
    const diffUa = await generateFingerprint(
      { ...base, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
      'secret'
    );
    expect(diffIp).not.toBe(same);
    expect(diffUa).not.toBe(same);
  });

  it('is keyed by the server secret (leaked table is not forgeable)', async () => {
    const meta = { ip: '1.2.3.4', userAgent: UA_CHROME };
    expect(await generateFingerprint(meta, 'secret-a')).not.toBe(
      await generateFingerprint(meta, 'secret-b')
    );
  });

  it('returns null without a secret (fingerprinting disabled, fail-open)', async () => {
    expect(
      await generateFingerprint({ ip: '1.2.3.4', userAgent: UA_CHROME }, undefined)
    ).toBeNull();
  });

  it('normalizes minor browser patch bumps', () => {
    const a = normalizeUserAgent(UA_CHROME);
    const b = normalizeUserAgent(UA_CHROME.replace('120.0.0.0', '121.0.0.0'));
    expect(a).toBe(b);
  });

  it('extracts device info', () => {
    expect(extractDeviceInfo(UA_CHROME)).toMatchObject({
      browser: 'Chrome',
      os: 'Windows',
      device: 'Desktop',
    });
    expect(
      extractDeviceInfo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')
    ).toMatchObject({ os: 'iOS', device: 'Mobile' });
  });
});
