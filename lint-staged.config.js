import { existsSync } from 'node:fs';

// lint-staged passes staged DELETED files too, and Biome hard-fails on
// paths that no longer exist ("No such file", exit 1) — blocking every
// commit that renames or removes files. Filter to files on disk so the
// hook only ever checks real code. Real lint/format errors still fail.
const quote = (f) => `"${f.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export default {
  '*.*': (files) => {
    const existing = files.filter((f) => existsSync(f));
    if (existing.length === 0) return [];
    return `biome check --write --no-errors-on-unmatched ${existing.map(quote).join(' ')}`;
  },
};
