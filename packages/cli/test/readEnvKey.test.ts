import { describe, it, expect, vi, beforeEach } from 'vitest';

const files = new Map<string, string | boolean>();

vi.mock('node:fs', () => ({
  existsSync(p: string) {
    const val = files.get(p);
    return typeof val === 'boolean' ? val : false;
  },
  readFileSync(p: string) {
    const val = files.get(p);
    return typeof val === 'string' ? val : '';
  },
  mkdirSync() {},
  writeFileSync() {},
  unlinkSync() {},
}));

import { readEnvKey } from '../src/detectors/framework.js';

function setFs(entries: [string, string | boolean][]) {
  files.clear();
  for (const [k, v] of entries) files.set(k, v);
}

describe('readEnvKey', () => {
  beforeEach(() => files.clear());

  it('should read from .env.local first', () => {
    setFs([
      ['/project/.env.local', 'NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=pk_test_local\n'],
      ['/project/.env', 'NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=pk_test_env\n'],
    ]);
    expect(readEnvKey('/project')).toBe('pk_test_local');
  });

  it('should fall back to .env', () => {
    setFs([
      ['/project/.env', 'NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=pk_test_env\n'],
    ]);
    expect(readEnvKey('/project')).toBe('pk_test_env');
  });

  it('should return undefined when neither exists', () => {
    setFs([]);
    expect(readEnvKey('/project')).toBeUndefined();
  });
});
