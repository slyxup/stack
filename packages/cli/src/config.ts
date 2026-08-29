import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.config', 'slyxup');
export const CREDENTIALS_PATH = join(CONFIG_DIR, 'credentials.json');

export interface Credentials {
  /** Session token from POST /v1/auth/sign-in — used as Bearer for the management API */
  token: string;
  /** Legacy field kept for older configs; superseded by `token` */
  developerId?: string;
  email: string;
  apiUrl: string;
}

/** The credential to send as Bearer — prefers session tokens. */
export function bearerOf(creds: Credentials): string {
  return creds.token ?? creds.developerId ?? '';
}

export function loadCredentials(): Credentials | null {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8')) as Credentials;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: Credentials): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CREDENTIALS_PATH, `${JSON.stringify(creds, null, 2)}\n`, {
    mode: 0o600,
  });
  // Ensure restrictive permissions even if file existed with looser perms
  try {
    const { chmodSync } = require('node:fs');
    chmodSync(CREDENTIALS_PATH, 0o600);
  } catch {}
}

export function clearCredentials(): boolean {
  if (!existsSync(CREDENTIALS_PATH)) return false;
  unlinkSync(CREDENTIALS_PATH);
  return true;
}
