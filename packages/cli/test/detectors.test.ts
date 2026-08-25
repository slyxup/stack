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

import { detectFramework } from '../src/detectors/framework.js';

function setFs(entries: [string, string | boolean][]) {
  files.clear();
  for (const [k, v] of entries) files.set(k, v);
}

describe('detectFramework', () => {
  beforeEach(() => files.clear());

  it('should detect Next.js with app router', () => {
    setFs([
      ['/project/next.config.js', true],
      ['/project/tsconfig.json', true],
      ['/project/src/app', true],
      ['/project/pnpm-lock.yaml', true],
    ]);
    const detected = detectFramework('/project');
    expect(detected.framework).toBe('nextjs');
    expect(detected.router).toBe('app');
    expect(detected.language).toBe('ts');
    expect(detected.packageManager).toBe('pnpm');
    expect(detected.srcDir).toBe('src');
  });

  it('should detect Next.js with pages router', () => {
    setFs([
      ['/project/next.config.mjs', true],
      ['/project/pages', true],
    ]);
    const detected = detectFramework('/project');
    expect(detected.framework).toBe('nextjs');
    expect(detected.router).toBe('pages');
  });

  it('should detect React project', () => {
    setFs([
      ['/project/src', true],
      ['/project/tsconfig.json', true],
    ]);
    const detected = detectFramework('/project');
    expect(detected.framework).toBe('react');
    expect(detected.router).toBeNull();
  });

  it('should detect unknown framework', () => {
    setFs([]);
    const detected = detectFramework('/project');
    expect(detected.framework).toBe('unknown');
  });

  it('should detect JavaScript when no tsconfig', () => {
    setFs([]);
    const detected = detectFramework('/project');
    expect(detected.language).toBe('js');
  });

  it('should detect npm by default', () => {
    setFs([]);
    const detected = detectFramework('/project');
    expect(detected.packageManager).toBe('npm');
  });

  it('should detect yarn', () => {
    setFs([['/project/yarn.lock', true]]);
    const detected = detectFramework('/project');
    expect(detected.packageManager).toBe('yarn');
  });

  it('should detect bun', () => {
    setFs([['/project/bun.lockb', true]]);
    const detected = detectFramework('/project');
    expect(detected.packageManager).toBe('bun');
  });
});
