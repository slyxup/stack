/**
 * Structured JSON logger (Week 7: monitoring).
 * Workers logs are scraped by Cloudflare observability — single-line JSON
 * with evt/service fields keeps them queryable. Never log secrets, password
 * hashes, tokens, or PII beyond user IDs.
 */

type Fields = Record<string, string | number | boolean | null | undefined>;

function emit(
  level: 'info' | 'warn' | 'error',
  evt: string,
  fields: Fields = {}
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: 'auth',
    evt,
    ...fields,
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  info: (evt: string, fields?: Fields) => emit('info', evt, fields),
  warn: (evt: string, fields?: Fields) => emit('warn', evt, fields),
  error: (evt: string, fields?: Fields) => emit('error', evt, fields),
};
