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
  .description('Log in with your SlyxUp account (email must be verified)')
  .option('--new', 'Create a new account first (requires email verification)')
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
      if (opts.new) {
        const res = await fetch(`${apiUrl}/v1/auth/sign-up`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok)
          throw new CliApiError(
            data.error ?? `Sign-up failed (${res.status})`,
            res.status
          );
        console.log(`Account created for ${email}.`);
        console.log(
          'Check your inbox and verify your email, then run: slyxup login'
        );
        return;
      }

      const res = await fetch(`${apiUrl}/v1/auth/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sessionToken?: string;
        user?: { role?: string; emailVerified?: boolean };
        code?: string;
        error?: string;
      };
      if (!res.ok || !data.sessionToken) {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          console.error(`✗ ${email} is not verified.`);
          console.error('  Check your inbox, or resend:');
          console.error(`  slyxup auth resend -e ${email} --api-url ${apiUrl}`);
          process.exit(1);
        }
        throw new CliApiError(
          data.error ?? `Login failed (${res.status})`,
          res.status
        );
      }

      saveCredentials({
        token: data.sessionToken,
        developerId: undefined,
        email,
        apiUrl,
      });
      console.log(
        `Logged in as ${email}${data.user?.role === 'admin' ? ' (admin)' : ''}.`
      );
      console.log('Credentials saved to ~/.config/slyxup/credentials.json');
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  });

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
  .description(
    'Connect this app to a SlyxUp project — creates project, key, and .env'
  )
  .option('--api-url <url>', DEFAULT_API_URL)
  .option('--project-id <id>', 'use an existing project (skips selection)')
  .option('--new <name>', 'create a new project with this name')
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
        `\n✓ Publishable key already configured (${existingKey.slice(0, 12)}…). Nothing to do.`
      );
      return;
    }

    const creds = needCreds();
    try {
      // Resolve project: --project-id > --new > single existing > first
      let projectId = opts.projectId as string | undefined;
      let projectName = opts.new as string | undefined;

      if (!projectId && !projectName) {
        const res = await api.listProjects(creds);
        if (res.projects.length === 1) {
          projectId = res.projects[0].id;
          projectName = res.projects[0].name;
          console.log(
            `\nUsing your only project: ${projectName} (${projectId})`
          );
        } else if (res.projects.length > 1) {
          console.log('\nYour projects:');
          res.projects.forEach((p, i) =>
            console.log(`  [${i}] ${p.name} (${p.slug})`)
          );
          process.stdout.write(
            'Pick a project number, or type a new project name: '
          );
          const answer = await readLine();
          const idx = Number(answer);
          if (!Number.isNaN(idx) && res.projects[idx]) {
            projectId = res.projects[idx].id;
            projectName = res.projects[idx].name;
          } else if (answer.trim()) {
            projectName = answer.trim();
          } else {
            throw new Error('No project selected.');
          }
        }
      }

      if (!projectId) {
        const name = projectName ?? 'My App';
        const created = await api.createProject(creds, {
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        });
        projectId = created.project.id;
        projectName = created.project.name;
        console.log(`✓ Project created: ${projectName} (${projectId})`);
      }

      // Publishable test key
      const key = await api.createKey(creds, {
        projectId,
        type: 'publishable',
        environment: 'test',
        name: 'default',
      });
      console.log(`✓ Publishable key created: ${key.key.slice(0, 16)}…`);

      // Write env file
      const envFile = d.framework === 'nextjs' ? '.env.local' : '.env.local';
      const envPath = join(cwd, envFile);
      const line1 = `NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=${key.key}`;
      const line2 = `NEXT_PUBLIC_SLYXUP_API_URL=${creds.apiUrl}`;
      let content = '';
      if (existsSync(envPath)) {
        const { readFileSync } = await import('node:fs');
        content = readFileSync(envPath, 'utf8');
        if (!content.endsWith('\n')) content += '\n';
      }
      appendFileSync(
        envPath,
        `${line1}\n${line2}\n${content.includes('SLYXUP') ? '' : ''}`
      );
      console.log(`✓ Wrote ${envFile}`);

      // Install SDKs
      const pm = d.packageManager;
      const installCmd =
        pm === 'npm'
          ? 'npm i @slyxup/react @slyxup/ui'
          : pm === 'yarn'
            ? 'yarn add @slyxup/react @slyxup/ui'
            : pm === 'bun'
              ? 'bun add @slyxup/react @slyxup/ui'
              : 'pnpm add @slyxup/react @slyxup/ui';

      console.log(`
Done! Next steps:
  1. ${installCmd}
  2. Add to your app:

     import { SlyxUpProvider } from '@slyxup/react';
     import { SignIn } from '@slyxup/ui';

     <SlyxUpProvider publishableKey={process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY}>
       <SignIn />
     </SlyxUpProvider>

Project: ${projectName} (${projectId})
Docs: https://stack.slyxup.online/docs/quick-start`);
    } catch (e) {
      fail(e);
    }
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
  .command('resend')
  .description('Resend the verification email')
  .requiredOption('-e, --email <email>')
  .option('--api-url <url>', DEFAULT_API_URL)
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    const res = await fetch(`${apiUrl}/v1/verification/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: opts.email }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    // Server responds ok even for unknown emails (no enumeration)
    console.log(
      data.ok
        ? `If ${opts.email} exists, a verification email was sent.`
        : 'Resend failed.'
    );
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
