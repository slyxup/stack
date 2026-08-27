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

// ── tiny ANSI styling (no extra deps) ──
const noColor = !!process.env.NO_COLOR || process.argv.includes('--no-color');
const ansi = (code: string, s: string) =>
  noColor ? s : `\x1b[${code}m${s}\x1b[0m`;
const style = {
  bold: (s: string) => ansi('1', s),
  green: (s: string) => ansi('32', s),
  red: (s: string) => ansi('31', s),
  yellow: (s: string) => ansi('33', s),
  cyan: (s: string) => ansi('36', s),
  dim: (s: string) => ansi('2', s),
  ok: () => ansi('32', '✓'),
  err: () => ansi('31', '✗'),
  warn: () => ansi('33', '!'),
};

function isJsonOpts(opts: Record<string, unknown>): boolean {
  return !!opts.json || process.argv.includes('--json');
}

function jsonOut(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

function tableRow(cols: string[], widths: number[]): string {
  return cols.map((c, i) => c.padEnd(widths[i] ?? 20)).join('  ');
}

const program = new Command();
program
  .name('slyxup')
  .description(
    'SlyxUp Stack CLI — auth platform management (agent-friendly: add --json for machine output)'
  )
  .version('0.1.0')
  .option('--json', 'machine-readable JSON output (works on every command)')
  .option('--no-color', 'disable ANSI colors');

function needCreds() {
  const creds = loadCredentials();
  if (!creds) {
    const wantsJson = process.argv.includes('--json');
    if (wantsJson) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            code: 'NOT_LOGGED_IN',
            error:
              'Not logged in. Run: slyxup login -e you@example.com -p secret',
          },
          null,
          2
        )
      );
      process.exit(1);
    }
    console.error(
      `${style.err()} Not logged in. Run: ${style.cyan('slyxup login -e you@example.com -p secret --api-url https://auth.slyxup.online')}`
    );
    console.error(
      style.dim(
        '  Tip: for agents, use --json and one-line flags (-e, -p, --project-id).'
      )
    );
    process.exit(1);
  }
  return creds;
}

// ── login ──
// One-line agent example: slyxup login -e dev@acme.com -p secret --json --api-url http://localhost:8787
program
  .command('login')
  .description(
    'Log in with your SlyxUp account (email must be verified). Agents: use -e/-p --json for non-interactive.'
  )
  .option('--new', 'Create a new account first (requires email verification)')
  .option('-e, --email <email>')
  .option('-p, --password <password>')
  .option('--api-url <url>', `API base (default ${DEFAULT_API_URL})`)
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    const json = isJsonOpts(opts);
    let email: string = opts.email;
    let password: string = opts.password;

    // Non-interactive guard for agents: if TTY missing, require flags
    const isTTY = process.stdin.isTTY;
    if (!email && !isTTY && !json) {
      console.error(`${style.err()} --email required in non-interactive mode`);
      process.exit(1);
    }
    if (!email) {
      if (json) {
        console.error(JSON.stringify({ ok: false, error: 'email required' }));
        process.exit(1);
      }
      process.stdout.write('Email: ');
      email = await readLine();
    }
    if (!password) {
      if (!isTTY && opts.password === undefined) {
        // allow hidden prompt fallback even in non-TTY if password piped
      }
      if (json && !opts.password) {
        console.error(
          JSON.stringify({ ok: false, error: 'password required' })
        );
        process.exit(1);
      }
      password = await readHidden('Password: ');
    }

    try {
      if (opts.new) {
        // Use core SDK so rate-limit + verification flows are identical to the app
        const client = new SlyxupClient({ apiUrl });
        await client.auth.signUp({ email, password });
        const msg = `Account created for ${email}. Check inbox and verify, then run: slyxup login`;
        if (json) return jsonOut({ ok: true, email, message: msg });
        console.log(style.green(`✓ Account created for ${email}.`));
        console.log(
          style.dim(
            'Check your inbox and verify your email, then run: slyxup login'
          )
        );
        return;
      }

      // Use core SDK for consistent auth (handles cookies + bearer, rate limits)
      const client = new SlyxupClient({ apiUrl });
      const res = await client.auth.signIn({ email, password });

      saveCredentials({
        token: (res as unknown as { sessionToken?: string }).sessionToken ?? '',
        developerId: undefined,
        email,
        apiUrl,
      });
      // Re-read saved token if SDK stored it differently; fallback to direct fetch token
      const creds = loadCredentials();
      if (!creds?.token) {
        // fallback: direct fetch to get sessionToken (covers older SDK shape)
        const r = await fetch(`${apiUrl}/v1/auth/sign-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = (await r.json().catch(() => ({}))) as {
          sessionToken?: string;
          user?: { role?: string };
          error?: string;
          code?: string;
        };
        if (!r.ok || !data.sessionToken)
          throw new Error(data.error ?? `Login failed (${r.status})`);
        saveCredentials({
          token: data.sessionToken,
          developerId: undefined,
          email,
          apiUrl,
        });
        if (json)
          return jsonOut({
            ok: true,
            email,
            apiUrl,
            role: data.user?.role ?? 'user',
          });
        console.log(
          style.green(
            `✓ Logged in as ${email}${data.user?.role === 'admin' ? ' (admin)' : ''}.`
          )
        );
        console.log(
          style.dim('Credentials saved to ~/.config/slyxup/credentials.json')
        );
        return;
      }
      if (json) return jsonOut({ ok: true, email, apiUrl });
      console.log(style.green(`✓ Logged in as ${email}.`));
      console.log(
        style.dim('Credentials saved to ~/.config/slyxup/credentials.json')
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Map common SDK errors to helpful hints
      if (msg.includes('EMAIL_NOT_VERIFIED') || msg.includes('not verified')) {
        if (json)
          return jsonOut({
            ok: false,
            code: 'EMAIL_NOT_VERIFIED',
            error: msg,
            hint: `slyxup auth resend -e ${email} --api-url ${apiUrl}`,
          });
        console.error(style.red(`✗ ${email} is not verified.`));
        console.error(
          style.dim(
            `  Check your inbox, or resend: slyxup auth resend -e ${email} --api-url ${apiUrl}`
          )
        );
        process.exit(1);
      }
      if (json) {
        jsonOut({ ok: false, error: msg });
        process.exit(1);
      }
      console.error(style.red(`✗ ${msg}`));
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
  .option('--json', 'JSON output')
  .action((opts) => {
    const json = isJsonOpts(opts);
    const cleared = clearCredentials();
    if (json) return jsonOut({ ok: true, cleared });
    console.log(
      cleared ? style.green('✓ Logged out.') : style.dim('Already logged out.')
    );
  });

// ── whoami ──
program
  .command('whoami')
  .description(
    'Show current developer (reads ~/.config/slyxup/credentials.json)'
  )
  .option('--json', 'JSON output')
  .action((opts) => {
    const json = isJsonOpts(opts);
    const creds = needCreds();
    if (json)
      return jsonOut({ ok: true, email: creds.email, apiUrl: creds.apiUrl });
    console.log(
      `${style.bold(creds.email)}  ${style.dim(`(${creds.apiUrl})`)}`
    );
  });

// ── signup (top-level convenience for agents) ──
program
  .command('signup')
  .description(
    'Create a SlyxUp account (same as slyxup auth signup) — agent-friendly one-liner'
  )
  .option('-e, --email <email>', 'email')
  .option('-p, --password <password>', 'password (min 8 chars)')
  .option('--api-url <url>', `API base (default ${DEFAULT_API_URL})`)
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    const json = isJsonOpts(opts);
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
      if (json)
        return jsonOut({
          ok: true,
          user: res.user,
          hint: 'Check email to verify before login',
        });
      console.log(
        style.green(`✓ Signed up: ${res.user.email} (id: ${res.user.id})`)
      );
      console.log(
        style.dim(
          'Check your email for verification link (noreply@slyxup.online).'
        )
      );
    } catch (e) {
      fail(e, json);
    }
  });

// ── project ──
const project = program.command('project').description('Manage projects');

project
  .command('create <name>')
  .description('Create a project (agent: add --slug --json --api-url)')
  .option('-s, --slug <slug>', 'URL slug (default: kebab-case name)')
  .option('-d, --description <desc>')
  .option('--json', 'JSON output')
  .action(async (name: string, opts) => {
    const creds = needCreds();
    const json = isJsonOpts(opts);
    try {
      const slug = opts.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await api.createProject(creds, {
        name,
        slug,
        description: opts.description,
      });
      if (json) return jsonOut({ ok: true, project: res.project });
      console.log(style.green(`✓ Project created: ${res.project.id}`));
      console.log(
        `  ${style.bold(res.project.name)}  ${style.dim(`(${res.project.slug})`)}`
      );
      console.log(
        style.dim(
          `\nNext: slyxup keys create --project-id ${res.project.id} --type publishable --json`
        )
      );
    } catch (e) {
      fail(e, json);
    }
  });

project
  .command('list')
  .description('List projects (use --json for agents)')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const creds = needCreds();
    const json = isJsonOpts(opts);
    try {
      const res = await api.listProjects(creds);
      if (json) return jsonOut({ ok: true, projects: res.projects });
      if (res.projects.length === 0)
        return console.log(
          style.dim('No projects yet. Create one: slyxup project create <name>')
        );
      console.log(style.bold('Projects:'));
      const widths = [36, 24, 24];
      console.log(style.dim(tableRow(['ID', 'NAME', 'SLUG'], widths)));
      for (const p of res.projects)
        console.log(tableRow([p.id, p.name, p.slug], widths));
    } catch (e) {
      fail(e, json);
    }
  });

project
  .command('delete <id>')
  .description('Delete a project (coming soon: needs DELETE /v1/projects/:id)')
  .option('--json', 'JSON output')
  .action(async (id: string, opts) => {
    void id;
    const json = isJsonOpts(opts);
    if (json)
      return jsonOut({
        ok: false,
        error: 'DELETE /v1/projects/:id not yet implemented',
      });
    console.error(
      style.yellow(
        'Project delete requires DELETE /v1/projects/:id — coming soon.'
      )
    );
    process.exit(1);
  });

// ── keys ──
const keys = program.command('keys').description('Manage API keys (pk_/sk_)');

keys
  .command('create')
  .description(
    'Create a key — agents: use --project-id --type --env --name --json'
  )
  .requiredOption('--project-id <id>')
  .option('--type <type>', 'publishable | secret', 'publishable')
  .option('--env <environment>', 'test | live', 'test')
  .option('--name <name>', 'key name', 'default')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const creds = needCreds();
    const json = isJsonOpts(opts);
    try {
      const res = await api.createKey(creds, {
        projectId: opts.projectId,
        type: opts.type,
        environment: opts.env,
        name: opts.name,
      });
      if (json)
        return jsonOut({
          ok: true,
          id: res.id,
          key: res.key,
          prefix: res.prefix,
        });
      console.log(style.green(`✓ Key created (${res.prefix}):`));
      console.log(style.bold(res.key));
      console.log(
        style.yellow('\nSave it now — secret keys are shown only once.')
      );
    } catch (e) {
      fail(e, json);
    }
  });

keys
  .command('list')
  .description('List keys for a project')
  .requiredOption('--project-id <id>')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const creds = needCreds();
    const json = isJsonOpts(opts);
    try {
      const res = await api.listKeys(creds, opts.projectId);
      if (json) return jsonOut({ ok: true, keys: res.keys });
      if (res.keys.length === 0) return console.log(style.dim('No keys.'));
      console.log(style.bold(`Keys for ${opts.projectId}:`));
      for (const k of res.keys)
        console.log(
          `  ${style.cyan(k.id)}  ${style.dim(`${k.prefix}_…`)}  ${k.type}  ${k.environment}  ${k.name}`
        );
    } catch (e) {
      fail(e, json);
    }
  });

keys
  .command('revoke <id>')
  .description('Revoke a key by id')
  .option('--json', 'JSON output')
  .action(async (id: string, opts) => {
    const creds = needCreds();
    const json = isJsonOpts(opts);
    try {
      await api.revokeKey(creds, id);
      if (json) return jsonOut({ ok: true, revoked: id });
      console.log(style.green('✓ Key revoked.'));
    } catch (e) {
      fail(e, json);
    }
  });

// ── domains ──
const domains = program
  .command('domains')
  .description('Manage project domains for CORS (live projects only)');

domains
  .command('list')
  .description('List allowed CORS domains')
  .requiredOption('--project-id <id>')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const creds = needCreds();
    const json = isJsonOpts(opts);
    try {
      const res = await api.getDomains(creds, opts.projectId);
      if (json) return jsonOut(res);
      console.log(`${style.bold('Environment:')} ${res.environment}`);
      if (res.domains.length === 0)
        return console.log(
          style.dim('No custom domains. Test projects work on localhost only.')
        );
      for (const d of res.domains) console.log(`  ${style.cyan(d)}`);
    } catch (e) {
      fail(e, json);
    }
  });

domains
  .command('add <domain>')
  .description('Add a CORS domain')
  .requiredOption('--project-id <id>')
  .option('--json', 'JSON output')
  .action(async (domain: string, opts) => {
    const creds = needCreds();
    const json = isJsonOpts(opts);
    try {
      const res = await api.addDomain(creds, opts.projectId, domain);
      if (json) return jsonOut({ ok: true, domains: res.domains });
      console.log(
        style.green(
          `✓ Domain added. Allowed: ${res.domains.join(', ') || '(none)'}`
        )
      );
      const env = await api.getDomains(creds, opts.projectId);
      if (env.environment === 'test')
        console.log(
          style.yellow(
            '\nNote: Project is still in TEST mode. Run `slyxup domains go-live --project-id <id>` to enable custom domains.'
          )
        );
    } catch (e) {
      fail(e, json);
    }
  });

domains
  .command('remove <domain>')
  .description('Remove a CORS domain')
  .requiredOption('--project-id <id>')
  .option('--json', 'JSON output')
  .action(async (domain: string, opts) => {
    const creds = needCreds();
    const json = isJsonOpts(opts);
    try {
      const res = await api.removeDomain(creds, opts.projectId, domain);
      if (json) return jsonOut({ ok: true, domains: res.domains });
      console.log(
        style.green(
          `✓ Domain removed. Allowed: ${res.domains.join(', ') || '(none)'}`
        )
      );
    } catch (e) {
      fail(e, json);
    }
  });

domains
  .command('go-live')
  .requiredOption('--project-id <id>')
  .description('Upgrade project from test to live (enables custom domain CORS)')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const creds = needCreds();
    const json = isJsonOpts(opts);
    try {
      const res = await api.goLive(creds, opts.projectId);
      if (json) return jsonOut({ ok: true, environment: res.environment });
      console.log(
        style.green(
          `✓ Project is now ${res.environment.toUpperCase()}. Custom domains are active.`
        )
      );
    } catch (e) {
      fail(e, json);
    }
  });

// ── init ──
program
  .command('init')
  .description(
    'Connect this app to a SlyxUp project — creates project, key, and .env (agent: --project-id <id> --new <name> --json)'
  )
  .option('--api-url <url>', DEFAULT_API_URL)
  .option('--project-id <id>', 'use an existing project (skips selection)')
  .option('--new <name>', 'create a new project with this name')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const cwd = process.cwd();
    const d = detectFramework(cwd);
    const json = isJsonOpts(opts);

    if (!json) {
      console.log(style.bold('Detected:'));
      console.log(
        `  Framework:       ${d.framework === 'unknown' ? style.dim('unknown (generic React)') : style.cyan(d.framework)}`
      );
      if (d.router)
        console.log(
          `  Router:          ${d.router === 'app' ? 'App Router' : 'Pages Router'}`
        );
      console.log(`  Language:        ${d.language.toUpperCase()}`);
      console.log(`  Package manager: ${d.packageManager}`);
    }

    const existingKey = readEnvKey(cwd);
    if (existingKey) {
      if (json)
        return jsonOut({
          ok: true,
          alreadyConfigured: true,
          keyPrefix: existingKey.slice(0, 12),
        });
      console.log(
        style.green(
          `\n✓ Publishable key already configured (${existingKey.slice(0, 12)}…). Nothing to do.`
        )
      );
      return;
    }

    const creds = needCreds();
    try {
      let projectId = opts.projectId as string | undefined;
      let projectName = opts.new as string | undefined;

      if (!projectId && !projectName) {
        const res = await api.listProjects(creds);
        if (res.projects.length === 1) {
          projectId = res.projects[0].id;
          projectName = res.projects[0].name;
          if (!json)
            console.log(
              style.dim(
                `\nUsing your only project: ${projectName} (${projectId})`
              )
            );
        } else if (res.projects.length > 1) {
          if (json) {
            return jsonOut({
              ok: false,
              error: 'Multiple projects: pass --project-id or --new',
              projects: res.projects,
            });
          }
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
        if (!json)
          console.log(
            style.green(`✓ Project created: ${projectName} (${projectId})`)
          );
      }

      const key = await api.createKey(creds, {
        projectId,
        type: 'publishable',
        environment: 'test',
        name: 'default',
      });
      if (!json)
        console.log(
          style.green(`✓ Publishable key created: ${key.key.slice(0, 16)}…`)
        );

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
      if (!json) console.log(style.green(`✓ Wrote ${envFile}`));

      const pm = d.packageManager;
      const installCmd =
        pm === 'npm'
          ? 'npm i @slyxup/react @slyxup/ui'
          : pm === 'yarn'
            ? 'yarn add @slyxup/react @slyxup/ui'
            : pm === 'bun'
              ? 'bun add @slyxup/react @slyxup/ui'
              : 'pnpm add @slyxup/react @slyxup/ui';

      if (json)
        return jsonOut({
          ok: true,
          projectId,
          projectName,
          publishableKey: key.key,
          envFile,
          installCmd,
        });
      console.log(`
${style.green('Done!')} Next steps:
  1. ${style.cyan(installCmd)}
  2. Add to your app:

     ${style.dim("import { SlyxUpProvider } from '@slyxup/react';")}
     ${style.dim("import { SignIn } from '@slyxup/ui';")}

     ${style.dim('<SlyxUpProvider publishableKey={process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY}>')}
       ${style.dim('<SignIn />')}
     ${style.dim('</SlyxUpProvider>')}

 Project: ${style.bold(projectName ?? '')} (${projectId})
Docs: https://stack.slyxup.online/docs/quick-start`);
    } catch (e) {
      fail(e, json);
    }
  });

// ── env pull ──
program
  .command('env')
  .description(
    'Print env vars to copy into your app (agent: --out .env.local --json)'
  )
  .requiredOption('--publishable-key <key>')
  .option('--out <file>', 'write to file instead of stdout')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const json = isJsonOpts(opts);
    const lines = [
      `NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=${opts.publishableKey}`,
      `NEXT_PUBLIC_SLYXUP_API_URL=${loadCredentials()?.apiUrl ?? DEFAULT_API_URL}`,
    ];
    if (opts.out) {
      mkdirSync(dirname(opts.out), { recursive: true });
      appendFileSync(opts.out, `${lines.join('\n')}\n`);
      if (json) return jsonOut({ ok: true, out: opts.out, lines });
      console.log(style.green(`✓ Wrote ${lines.length} lines to ${opts.out}`));
    } else {
      if (json) return jsonOut({ ok: true, lines });
      console.log(lines.join('\n'));
    }
  });

// ── doctor ──
program
  .command('doctor')
  .description('Check local setup health (agent: add --json)')
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const json = isJsonOpts(opts);
    const creds = loadCredentials();
    const d = detectFramework();
    const checks: Array<[string, boolean, string]> = [
      ['Logged in', !!creds, 'run: slyxup login -e you@example.com -p secret'],
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

    if (json) {
      const results = checks.map(([label, pass, note]) => ({
        label,
        pass,
        note,
      }));
      const ok = results.every(
        (r) => r.pass || r.label === 'Framework detected'
      );
      jsonOut({ ok, checks: results });
      process.exit(ok ? 0 : 1);
    }

    let ok = true;
    for (const [label, pass, note] of checks) {
      console.log(
        `${pass ? style.ok() : style.err()} ${label}${pass ? '' : style.dim(` — ${note}`)}`
      );
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
  setTimeout(() => process.exit(0), 1500).unref();
}

// ── auth (SDK-based, with verification + OAuth) ──
const authCmd = program
  .command('auth')
  .description(
    'App-user auth via SDK (email + OAuth) — all support --json for agents'
  );

authCmd
  .command('signup')
  .description(
    'Sign up as app user (sends verification email) — agent: -e -p --api-url --json'
  )
  .option('-e, --email <email>')
  .option('-p, --password <password>')
  .option('--api-url <url>', DEFAULT_API_URL)
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    const json = isJsonOpts(opts);
    let email: string = opts.email;
    let password: string = opts.password;
    if (!email) {
      if (json) {
        jsonOut({ ok: false, error: 'email required' });
        process.exit(1);
      }
      process.stdout.write('Email: ');
      email = await readLine();
    }
    if (!password) {
      if (json) {
        jsonOut({ ok: false, error: 'password required' });
        process.exit(1);
      }
      password = await readHidden('Password: ');
    }
    const client = new SlyxupClient({ apiUrl });
    try {
      const res = await client.auth.signUp({ email, password });
      if (json) return jsonOut({ ok: true, user: res.user });
      console.log(
        style.green(`✓ Signed up: ${res.user.email} (id: ${res.user.id})`)
      );
      console.log(
        style.dim(
          'Check your email for verification link (noreply@slyxup.online).'
        )
      );
      console.log(
        style.dim(
          `Verify: curl -X POST ${apiUrl}/v1/verification/verify -H "Content-Type: application/json" -d '{"token":"<from email>"}'`
        )
      );
    } catch (e) {
      fail(e, json);
    }
  });

authCmd
  .command('signin')
  .description('Sign in as app user — agent: -e -p --json')
  .option('-e, --email <email>')
  .option('-p, --password <password>')
  .option('--api-url <url>', DEFAULT_API_URL)
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    const json = isJsonOpts(opts);
    let email: string = opts.email;
    let password: string = opts.password;
    if (!email) {
      if (json) {
        jsonOut({ ok: false, error: 'email required' });
        process.exit(1);
      }
      process.stdout.write('Email: ');
      email = await readLine();
    }
    if (!password) {
      if (json) {
        jsonOut({ ok: false, error: 'password required' });
        process.exit(1);
      }
      password = await readHidden('Password: ');
    }
    const client = new SlyxupClient({ apiUrl });
    try {
      const res = await client.auth.signIn({ email, password });
      if (json) return jsonOut({ ok: true, user: res.user });
      console.log(style.green(`✓ Signed in: ${res.user.email}`));
      try {
        const sess = await client.sessions.get();
        console.log(
          style.dim(
            `Session: ${sess.session.id} expires ${sess.session.expiresAt}`
          )
        );
      } catch {
        /* ignore */
      }
    } catch (e) {
      fail(e, json);
    }
  });

authCmd
  .command('verify')
  .description('Verify email with token from email — agent: --token <t> --json')
  .requiredOption('--token <token>')
  .option('--api-url <url>', DEFAULT_API_URL)
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    const json = isJsonOpts(opts);
    const res = await fetch(`${apiUrl}/v1/verification/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: opts.token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (json) {
        jsonOut({ ok: false, ...(data as object) });
        process.exit(1);
      }
      console.error(
        style.red(
          (data as { error?: string }).error ?? `Verify failed (${res.status})`
        )
      );
      process.exit(1);
    }
    if (json) return jsonOut({ ok: true, ...(data as object) });
    console.log(
      style.green(`✓ Verified: ${(data as { email?: string }).email ?? 'ok'}`)
    );
  });

authCmd
  .command('resend')
  .description('Resend the verification email — agent: -e <email> --json')
  .requiredOption('-e, --email <email>')
  .option('--api-url <url>', DEFAULT_API_URL)
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    const json = isJsonOpts(opts);
    const res = await fetch(`${apiUrl}/v1/verification/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: opts.email }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    if (json) return jsonOut({ ok: !!data.ok, email: opts.email });
    console.log(
      data.ok
        ? style.green(
            `✓ If ${opts.email} exists, a verification email was sent.`
          )
        : style.red('Resend failed.')
    );
  });

authCmd
  .command('oauth')
  .description('Start OAuth in browser (Google/GitHub)')
  .option('--provider <provider>', 'google | github', 'google')
  .option('--api-url <url>', DEFAULT_API_URL)
  .option('--json', 'JSON output')
  .action(async (opts) => {
    const apiUrl = opts.apiUrl ?? DEFAULT_API_URL;
    const json = isJsonOpts(opts);
    if (!['google', 'github'].includes(opts.provider)) {
      if (json) {
        jsonOut({ ok: false, error: 'provider must be google or github' });
        process.exit(1);
      }
      console.error(style.red('provider must be google or github'));
      process.exit(1);
    }
    const url = `${apiUrl}/v1/oauth/${opts.provider}`;
    if (json) return jsonOut({ ok: true, url });
    console.log(style.dim(`Opening ${url} ...`));
    openBrowser(url);
  });

// ── helpers ──
function fail(e: unknown, json = false): never {
  const msg =
    e instanceof CliApiError
      ? e.message
      : e instanceof Error
        ? e.message
        : String(e);
  if (json) {
    jsonOut({ ok: false, error: msg });
    process.exit(1);
  }
  console.error(style.red(`✗ ${msg}`));
  process.exit(1);
}

if (existsSync(join(process.cwd(), '.env'))) {
  void writeFileSync;
}

program.parseAsync(process.argv).catch((e) => {
  const json = process.argv.includes('--json');
  if (json) jsonOut({ ok: false, error: String(e) });
  else console.error(style.red(String(e)));
  process.exit(1);
});
