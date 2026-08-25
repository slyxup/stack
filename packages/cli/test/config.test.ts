import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: () => '/home/testuser',
}));

import { CREDENTIALS_PATH, loadCredentials, saveCredentials, clearCredentials } from '../src/config.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';

describe('CREDENTIALS_PATH', () => {
  it('should resolve to ~/.config/slyxup/credentials.json', () => {
    expect(CREDENTIALS_PATH).toBe('/home/testuser/.config/slyxup/credentials.json');
  });
});

describe('loadCredentials', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return parsed credentials when file exists', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ developerId: 'd1', email: 'a@b.com', apiUrl: 'http://localhost' })
    );
    const creds = loadCredentials();
    expect(creds).toEqual({ developerId: 'd1', email: 'a@b.com', apiUrl: 'http://localhost' });
  });

  it('should return null when file does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(loadCredentials()).toBeNull();
  });

  it('should return null on JSON parse error', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue('not json');
    expect(loadCredentials()).toBeNull();
  });
});

describe('saveCredentials', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should create directory and write JSON', () => {
    const creds = { developerId: 'd1', email: 'a@b.com', apiUrl: 'http://localhost' };
    saveCredentials(creds);
    expect(mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(writeFileSync).toHaveBeenCalledWith(
      CREDENTIALS_PATH,
      `${JSON.stringify(creds, null, 2)}\n`
    );
  });
});

describe('clearCredentials', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete and return true when file exists', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    expect(clearCredentials()).toBe(true);
    expect(unlinkSync).toHaveBeenCalledWith(CREDENTIALS_PATH);
  });

  it('should return false when file does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(clearCredentials()).toBe(false);
  });
});
