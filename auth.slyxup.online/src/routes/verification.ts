import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../schemas/auth';
import * as TokenService from '../services/token.service';

const tokens = new Hono<{ Bindings: { DB: D1Database } }>();

tokens.post('/verify', zValidator('json', verifyEmailSchema), async (c) => {
  const { token } = c.req.valid('json');
  try {
    const result = await TokenService.verifyEmail(c.env, token);
    return c.json({ ok: true, email: result.email });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return c.json({ ok: false, error: msg }, 400);
  }
});

tokens.post(
  '/resend',
  zValidator('json', resendVerificationSchema),
  async (c) => {
    const { email } = c.req.valid('json');
    await TokenService.resendVerification(c.env, email);
    // Always ok — do not reveal user existence
    return c.json({ ok: true });
  }
);

tokens.post(
  '/password/forgot',
  zValidator('json', forgotPasswordSchema),
  async (c) => {
    const { email } = c.req.valid('json');
    await TokenService.forgotPassword(c.env, email);
    return c.json({ ok: true });
  }
);

tokens.post(
  '/password/reset',
  zValidator('json', resetPasswordSchema),
  async (c) => {
    const { token, password } = c.req.valid('json');
    try {
      const result = await TokenService.resetPassword(c.env, token, password);
      return c.json({ ok: true, email: result.email });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      return c.json({ ok: false, error: msg }, 400);
    }
  }
);

export default tokens;
