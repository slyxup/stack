#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SlyxupClient } from '@slyxup/core';
import { Command } from 'commander';
import { CliApiError, api } from './api.js';
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
} from './config.js';
import { detectFramework, readEnvKey } from './detectors/framework.js';

const DEFAULT_API_URL =
  process.env.SLYXUP_API_URL ?? 'https://auth.slyxup.online';

const program = new Command();
program
  .name('slyxup')
  .description('SlyxUp Stack CLI — auth platform management')
  .version('0.1.0');

function needCreds() {
  const creds = loadCredentials();
  if (!creds) {
    console.error('Not logged in. Run: slyxup login');
    process.exit(1);
  }
  return creds;
}

// ── login ──
program
  .command('login')
  .description('Log in as a SlyxUp developer')
  .option('--new', 'Create a new developer account first')
  .option('-e, --email <email>')
  .option('-p, --password <password>')
  .option('--api-url <url>', `API base (default ${DEFAULT_API_URL})`)
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    let email: string = opts.email;
    let password: string = opts.password;

    if (!email) {
      process.stdout.write('Email: ');
      email = await readLine();
    }
    if (!password) {
      password = await readHidden('Password: ');
    }

    try {
      // Developers are a separate entity from app users — use only the
      // developers endpoints. lookup validates creds; register creates.
      let devId: string | null | undefined;
      if (!opts.new) {
        devId = await lookupDeveloper(apiUrl, email, password);
      }
      if (!devId) {
        const res = await fetch(`${apiUrl}/v1/developers/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          developerId?: string;
          error?: string;
        };
        if (!res.ok || !data.developerId) {
          throw new CliApiError(
            data.error ?? `Registration failed (${res.status})`,
            res.status
          );
        }
        devId = data.developerId;
        console.log(`Account created for ${email}`);
      }

      saveCredentials({ developerId: devId, email, apiUrl });
      console.log(
        `Logged in as ${email}. Credentials saved to ~/.config/slyxup/credentials.json`
      );
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  });

/** Validate developer credentials and resolve id; null when no account. */
async function lookupDeveloper(
  apiUrl: string,
  email: string,
  password: string
): Promise<string | null> {
  const res = await fetch(`${apiUrl}/v1/developers/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  const data = (await res.json()) as { developerId?: string | null };
  return data.developerId ?? null;
}

async function resolveDeveloperId(
  apiUrl: string,
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${apiUrl}/v1/developers/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok)
    throw new Error(`Could not resolve developer identity (${res.status})`);
  const data = (await res.json()) as { developerId?: string };
  if (!data.developerId) throw new Error('Server returned no developerId');
  return data.developerId;
}

function readLine(): Promise<string> {
  return new Promise((resolve) => {
    process.stdin.once('data', (d) => resolve(String(d).trim()));
  });
}

async function readHidden(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      stdin.once('data', (d) => resolve(String(d).trim()));
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    let out = '';
    const onData = (ch: Buffer) => {
      const c = String(ch);
      if (c === '\n' || c === '\r') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(out);
      } else if (c === '\u0003') {
        process.exit(1);
      } else {
        out += c;
      }
    };
    stdin.on('data', onData);
  });
}

// ── logout ──
program
  .command('logout')
  .description('Clear stored credentials')
  .action(() => {
    clearCredentials()
      ? console.log('Logged out.')
      : console.log('Already logged out.');
  });

// ── whoami ──
program
  .command('whoami')
  .description('Show current developer')
  .action(() => {
    const creds = needCreds();
    console.log(`${creds.email}  (${creds.apiUrl})`);
  });

// ── project ──
const project = program.command('project').description('Manage projects');

project
  .command('create <name>')
  .option('-s, --slug <slug>', 'URL slug (default: kebab-case name)')
  .option('-d, --description <desc>')
  .action(async (name: string, opts) => {
    const creds = needCreds();
    try {
      const slug = opts.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await api.createProject(creds, {
        name,
        slug,
        description: opts.description,
      });
      console.log(`Project created: ${res.project.id}`);
      console.log(`Slug: ${res.project.slug}`);
      console.log(
        `\nNext: slyxup keys create --project-id ${res.project.id} --type publishable`
      );
    } catch (e) {
      fail(e);
    }
  });

project.command('list').action(async () => {
  const creds = needCreds();
  try {
    const res = await api.listProjects(creds);
    if (res.projects.length === 0)
      return console.log(
        'No projects yet. Create one: slyxup project create <name>'
      );
    for (const p of res.projects)
      console.log(`${p.id}  ${p.name}  (${p.slug})`);
  } catch (e) {
    fail(e);
  }
});

project.command('delete <id>').action(async (id: string) => {
  void id;
  console.error(
    'Project delete requires DELETE /v1/projects/:id — coming soon.'
  );
  process.exit(1);
});

// ── keys ──
const keys = program.command('keys').description('Manage API keys');

keys
  .command('create')
  .requiredOption('--project-id <id>')
  .option('--type <type>', 'publishable | secret', 'publishable')
  .option('--env <environment>', 'test | live', 'test')
  .option('--name <name>', 'key name', 'default')
  .action(async (opts) => {
    const creds = needCreds();
    try {
      const res = await api.createKey(creds, {
        projectId: opts.projectId,
        type: opts.type,
        environment: opts.env,
        name: opts.name,
      });
      console.log(`Key created (${res.prefix}):`);
      console.log(res.key);
      console.log('\nSave it now — secret keys are shown only once.');
    } catch (e) {
      fail(e);
    }
  });

keys
  .command('list')
  .requiredOption('--project-id <id>')
  .action(async (opts) => {
    const creds = needCreds();
    try {
      const res = await api.listKeys(creds, opts.projectId);
      if (res.keys.length === 0) return console.log('No keys.');
      for (const k of res.keys)
        console.log(
          `${k.id}  ${k.prefix}_…  ${k.type}  ${k.environment}  ${k.name}`
        );
    } catch (e) {
      fail(e);
    }
  });

keys.command('revoke <id>').action(async (id: string) => {
  const creds = needCreds();
  try {
    await api.revokeKey(creds, id);
    console.log('Key revoked.');
  } catch (e) {
    fail(e);
  }
});

// ── domains ──
const domains = program
  .command('domains')
  .description('Manage project domains for CORS');

domains
  .command('list')
  .requiredOption('--project-id <id>')
  .action(async (opts) => {
    const creds = needCreds();
    try {
      const res = await api.getDomains(creds, opts.projectId);
      console.log(`Environment: ${res.environment}`);
      if (res.domains.length === 0)
        return console.log(
          'No custom domains. Test projects work on localhost only.'
        );
      for (const d of res.domains) console.log(`  ${d}`);
    } catch (e) {
      fail(e);
    }
  });

domains
  .command('add <domain>')
  .requiredOption('--project-id <id>')
  .action(async (domain: string, opts) => {
    const creds = needCreds();
    try {
      const res = await api.addDomain(creds, opts.projectId, domain);
      console.log(
        `Domain added. Allowed: ${res.domains.join(', ') || '(none)'}`
      );
      const env = await api.getDomains(creds, opts.projectId);
      if (env.environment === 'test')
        console.log(
          '\nNote: Project is still in TEST mode. Run `slyxup domains go-live --project-id <id>` to enable custom domains.'
        );
    } catch (e) {
      fail(e);
    }
  });

domains
  .command('remove <domain>')
  .requiredOption('--project-id <id>')
  .action(async (domain: string, opts) => {
    const creds = needCreds();
    try {
      const res = await api.removeDomain(creds, opts.projectId, domain);
      console.log(
        `Domain removed. Allowed: ${res.domains.join(', ') || '(none)'}`
      );
    } catch (e) {
      fail(e);
    }
  });

domains
  .command('go-live')
  .requiredOption('--project-id <id>')
  .description('Upgrade project from test to live (enables custom domain CORS)')
  .action(async (opts) => {
    const creds = needCreds();
    try {
      const res = await api.goLive(creds, opts.projectId);
      console.log(
        `Project is now ${res.environment.toUpperCase()}. Custom domains are active.`
      );
    } catch (e) {
      fail(e);
    }
  });

// ── init ──
program
  .command('init')
  .description('Detect framework and connect this app to a SlyxUp project')
  .option('--api-url <url>', DEFAULT_API_URL)
  .action(async (opts) => {
    const cwd = process.cwd();
    const d = detectFramework(cwd);

    console.log('Detected:');
    console.log(
      `  Framework:       ${d.framework === 'unknown' ? 'unknown (generic React)' : d.framework}`
    );
    if (d.router)
      console.log(
        `  Router:          ${d.router === 'app' ? 'App Router' : 'Pages Router'}`
      );
    console.log(`  Language:        ${d.language.toUpperCase()}`);
    console.log(`  Package manager: ${d.packageManager}`);

    const existingKey = readEnvKey(cwd);
    if (existingKey) {
      console.log(
        `\nPublishable key already configured (${existingKey.slice(0, 12)}…). Nothing to do.`
      );
      return;
    }

    const creds = needCreds();

    console.log('\n? Create a new project or use an existing one?');
    console.log('  ❯ create  (slyxup project create)');
    console.log('    select  (slyxup project list → slyxup keys create)');
    console.log('\nNon-interactive flow for now:');
    console.log('  1. slyxup project create "My App"');
    console.log('  2. slyxup keys create --project-id <id> --type publishable');
    console.log('  3. add NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY to .env.local');
    console.log('  4. npm i @slyxup/react @slyxup/ui   (or pnpm/yarn/bun)');

    void creds;
    void opts;
  });

// ── env pull ──
program
  .command('env')
  .description('Print env vars to copy into your app')
  .requiredOption('--publishable-key <key>')
  .option('--out <file>', 'write to file instead of stdout')
  .action(async (opts) => {
    const lines = [
      `NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=${opts.publishableKey}`,
      `NEXT_PUBLIC_SLYXUP_API_URL=${loadCredentials()?.apiUrl ?? DEFAULT_API_URL}`,
    ];
    if (opts.out) {
      mkdirSync(dirname(opts.out), { recursive: true });
      appendFileSync(opts.out, `${lines.join('\n')}\n`);
      console.log(`Wrote ${lines.length} lines to ${opts.out}`);
    } else {
      console.log(lines.join('\n'));
    }
  });

// ── doctor ──
program
  .command('doctor')
  .description('Check local setup health')
  .action(async () => {
    const creds = loadCredentials();
    const d = detectFramework();
    const checks: Array<[string, boolean, string]> = [
      ['Logged in', !!creds, 'run: slyxup login'],
      [
        'Framework detected',
        d.framework !== 'unknown',
        'not a Next.js/React project root?',
      ],
      ['TypeScript', d.language === 'ts', 'add tsconfig.json'],
      [
        'Publishable key in env',
        !!readEnvKey(),
        'add NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY to .env.local',
      ],
      ['API reachable', false, 'checking…'],
    ];
    try {
      const apiBase = creds?.apiUrl ?? DEFAULT_API_URL;
      const res = await fetch(`${apiBase}/v1/health`);
      checks[4] = [
        'API reachable',
        res.ok,
        `${apiBase}/v1/health → ${res.status}`,
      ];
    } catch {
      checks[4] = ['API reachable', false, 'network error'];
    }

    let ok = true;
    for (const [label, pass, note] of checks) {
      console.log(`${pass ? '✓' : '✗'} ${label}${pass ? '' : ` — ${note}`}`);
      if (!pass && label !== 'Framework detected') ok = false;
    }
    process.exit(ok ? 0 : 1);
  });

function openBrowser(url: string) {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'cmd'
        : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.unref();
    child.on('error', () => {
      console.log(`Open this URL in your browser:\n${url}`);
    });
  } catch {
    console.log(`Open this URL in your browser:\n${url}`);
  }
  // Never block the CLI on a browser
  setTimeout(() => process.exit(0), 1500).unref();
}

// ── auth (SDK-based, with verification + OAuth) ──
const authCmd = program
  .command('auth')
  .description('App-user auth via SDK (email + OAuth)');

authCmd
  .command('signup')
  .description('Sign up as app user (sends verification email)')
  .option('-e, --email <email>')
  .option('-p, --password <password>')
  .option('--api-url <url>', DEFAULT_API_URL)
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    let email: string = opts.email;
    let password: string = opts.password;
    if (!email) {
      process.stdout.write('Email: ');
      email = await readLine();
    }
    if (!password) password = await readHidden('Password: ');
    const client = new SlyxupClient({ apiUrl });
    try {
      const res = await client.auth.signUp({ email, password });
      console.log(`Signed up: ${res.user.email} (id: ${res.user.id})`);
      console.log(
        'Check your email for verification link (Brevo noreply@slyxup.online).'
      );
      console.log(
        `Verify: curl -X POST ${apiUrl}/v1/verification/verify -H "Content-Type: application/json" -d '{"token":"<from email>"}'`
      );
    } catch (e) {
      fail(e);
    }
  });

authCmd
  .command('signin')
  .description('Sign in as app user')
  .option('-e, --email <email>')
  .option('-p, --password <password>')
  .option('--api-url <url>', DEFAULT_API_URL)
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    let email: string = opts.email;
    let password: string = opts.password;
    if (!email) {
      process.stdout.write('Email: ');
      email = await readLine();
    }
    if (!password) password = await readHidden('Password: ');
    const client = new SlyxupClient({ apiUrl });
    try {
      const res = await client.auth.signIn({ email, password });
      console.log(`Signed in: ${res.user.email}`);
      const sess = await client.sessions.get();
      console.log(
        `Session: ${sess.session.id} expires ${sess.session.expiresAt}`
      );
    } catch (e) {
      fail(e);
    }
  });

authCmd
  .command('verify')
  .description('Verify email with token from Brevo email')
  .requiredOption('--token <token>')
  .option('--api-url <url>', DEFAULT_API_URL)
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    const res = await fetch(`${apiUrl}/v1/verification/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: opts.token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(
        (data as { error?: string }).error ?? `Verify failed (${res.status})`
      );
      process.exit(1);
    }
    console.log(`Verified: ${(data as { email?: string }).email ?? 'ok'}`);
  });

authCmd
  .command('oauth')
  .description('Start OAuth in browser (Google/GitHub)')
  .option('--provider <provider>', 'google | github', 'google')
  .option('--api-url <url>', DEFAULT_API_URL)
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    if (!['google', 'github'].includes(opts.provider)) {
      console.error('provider must be google or github');
      process.exit(1);
    }
    const url = `${apiUrl}/v1/oauth/${opts.provider}`;
    console.log(`Opening ${url} ...`);
    openBrowser(url);
  });

// ── helpers ──
function fail(e: unknown): never {
  console.error(
    e instanceof CliApiError
      ? e.message
      : e instanceof Error
        ? e.message
        : String(e)
  );
  process.exit(1);
}

if (existsSync(join(process.cwd(), '.env'))) {
  // noop guard so bundlers keep fs import when used programmatically
  void writeFileSync;
}

program.parseAsync(process.argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
