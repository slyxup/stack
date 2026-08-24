import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Detected {
  framework: 'nextjs' | 'react' | 'unknown';
  router: 'app' | 'pages' | null;
  language: 'ts' | 'js';
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun';
  srcDir: string;
}

export function detectFramework(cwd = process.cwd()): Detected {
  const ts = existsSync(join(cwd, 'tsconfig.json'));
  const nextConfig = [
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
  ].some((f) => existsSync(join(cwd, f)));
  const appDir =
    existsSync(join(cwd, 'app')) || existsSync(join(cwd, 'src', 'app'));
  const pagesDir =
    existsSync(join(cwd, 'pages')) || existsSync(join(cwd, 'src', 'pages'));

  let packageManager: Detected['packageManager'] = 'npm';
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
  else if (existsSync(join(cwd, 'yarn.lock'))) packageManager = 'yarn';
  else if (existsSync(join(cwd, 'bun.lockb'))) packageManager = 'bun';

  let framework: Detected['framework'] = 'unknown';
  if (nextConfig) framework = 'nextjs';
  else if (existsSync(join(cwd, 'src')) && !appDir && !pagesDir)
    framework = 'react';

  return {
    framework,
    router:
      framework === 'nextjs'
        ? appDir
          ? 'app'
          : pagesDir
            ? 'pages'
            : null
        : null,
    language: ts ? 'ts' : 'js',
    packageManager,
    srcDir: appDir || existsSync(join(cwd, 'src')) ? 'src' : '.',
  };
}

/** Read publishable key from .env / .env.local if present. */
export function readEnvKey(
  cwd = process.cwd(),
  key = 'NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY'
): string | undefined {
  for (const env of ['.env.local', '.env']) {
    const p = join(cwd, env);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
    if (m) return m[1].trim();
  }
  return undefined;
}
