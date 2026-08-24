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
  /** Developer ID used as Bearer token for management API */
  developerId: string;
  email: string;
  apiUrl: string;
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
  writeFileSync(CREDENTIALS_PATH, `${JSON.stringify(creds, null, 2)}\n`);
}

export function clearCredentials(): boolean {
  if (!existsSync(CREDENTIALS_PATH)) return false;
  unlinkSync(CREDENTIALS_PATH);
  return true;
}
