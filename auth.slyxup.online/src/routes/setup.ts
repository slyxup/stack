import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { setSessionCookie } from '../lib/cookies';
import {
  bootstrapAdmin,
  getBootstrapStatus,
} from '../services/bootstrap.service';

type Bindings = {
  DB: D1Database;
  BOOTSTRAP_SECRET?: string;
  ADMIN_BOOTSTRAP_TOKEN?: string;
  BOOTSTRAP_ADMIN_EMAIL?: string;
  INITIAL_ADMIN_EMAIL?: string;
  SINGLE_TENANT_MODE?: string;
  ALLOW_PUBLIC_DEVELOPER_REGISTRATION?: string;
};

const setup = new Hono<{ Bindings: Bindings }>();

/**
 * GET /v1/setup/status — public, tells UI whether bootstrap is needed.
 * No auth. Single-tenant instances show needsBootstrap until owner claims it.
 */
setup.get('/status', async (c) => {
  const status = await getBootstrapStatus(
    c.env as unknown as { DB: D1Database } & Record<string, string | undefined>
  );
  return c.json({ ok: true, ...status });
});

const bootstrapSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  token: z.string().optional(),
  name: z.string().optional(),
});

/**
 * POST /v1/setup/bootstrap — claim the first admin.
 * - Only works when DB has 0 users
 * - If BOOTSTRAP_SECRET env is set, token must match (Header X-Bootstrap-Token or body token)
 * - If BOOTSTRAP_ADMIN_EMAIL env is set, email must match
 * - Creates admin user + developer + default project + initial keys + session cookie
 * - Single-use: second call returns 409
 */
setup.post('/bootstrap', zValidator('json', bootstrapSchema), async (c) => {
  const body = c.req.valid('json');
  const headerToken =
    c.req.header('X-Bootstrap-Token') ?? c.req.header('x-bootstrap-token');
  const token = body.token ?? headerToken;
  try {
    const result = await bootstrapAdmin(
      c.env as unknown as { DB: D1Database } & Record<
        string,
        string | undefined
      >,
      { email: body.email, password: body.password, token, name: body.name }
    );
    setSessionCookie(c, result.sessionToken, result.expiresAt);
    return c.json(
      {
        ok: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt.toISOString(),
        project: result.project
          ? {
              id: result.project.id,
              slug: result.project.slug,
              name: result.project.name,
            }
          : null,
        keys: result.keys,
        message: result.user.mustChangePassword
          ? 'Bootstrap successful — please change your password immediately.'
          : 'Bootstrap successful — admin created.',
      },
      201
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'ALREADY_BOOTSTRAPPED')
      return c.json({ ok: false, error: 'Instance already bootstrapped' }, 409);
    if (msg === 'INVALID_BOOTSTRAP_TOKEN')
      return c.json(
        {
          ok: false,
          code: 'INVALID_BOOTSTRAP_TOKEN',
          error: 'Invalid bootstrap token',
        },
        403
      );
    if (msg === 'EMAIL_NOT_ALLOWED_FOR_BOOTSTRAP')
      return c.json(
        {
          ok: false,
          code: 'EMAIL_NOT_ALLOWED',
          error: 'Email not allowed for bootstrap',
        },
        403
      );
    return c.json({ ok: false, error: msg }, 400);
  }
});

export default setup;
