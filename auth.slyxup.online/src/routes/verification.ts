import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../schemas/auth';
import { EMAIL_SHELL } from '../services/email.service';
import * as TokenService from '../services/token.service';

const tokens = new Hono<{ Bindings: { DB: D1Database } }>();

/** Email link target — verifies then renders a branded page. */
tokens.get('/confirm', async (c) => {
  const token = c.req.query('token') ?? '';
  try {
    const result = await TokenService.verifyEmail(c.env, token);
    return c.html(
      EMAIL_SHELL(
        'Email verified',
        `<h1 class="ok">✓ Email verified</h1>
         <p><strong>${result.email}</strong> is confirmed. You can now sign in everywhere.</p>
         <p style="font-size:12px">You can close this tab and return to the app.</p>`
      )
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid link';
    return c.html(
      EMAIL_SHELL(
        'Verification failed',
        `<h1 class="err">Link invalid or expired</h1><p>${msg}</p>
         <p style="font-size:12px">Request a new email from the app and try again.</p>`
      ),
      400
    );
  }
});

/** Email link target — hosted password-reset form. */
tokens.get('/reset', async (c) => {
  const token = c.req.query('token') ?? '';
  return c.html(
    EMAIL_SHELL(
      'Choose a new password',
      `<h1>Choose a new password</h1>
       <p>Enter a strong password (min 8 characters).</p>
       <form id="f">
         <input id="p1" type="password" placeholder="New password" minlength="8" required>
         <input id="p2" type="password" placeholder="Confirm password" minlength="8" required>
         <button type="submit">Update password</button>
       </form>
       <p id="msg" style="margin-top:14px;font-size:13px"></p>
       <script>
       document.getElementById('f').addEventListener('submit', async (e) => {
         e.preventDefault();
         const p1 = document.getElementById('p1').value;
         const p2 = document.getElementById('p2').value;
         const msg = document.getElementById('msg');
         if (p1 !== p2) { msg.className='err'; msg.textContent='Passwords do not match'; return; }
         const res = await fetch('/v1/verification/password/reset', {
           method: 'POST', headers: {'Content-Type':'application/json'},
           body: JSON.stringify({ token: ${JSON.stringify(token)}, password: p1 })
         });
         const data = await res.json().catch(() => ({}));
         if (res.ok && data.ok) {
           msg.className='ok'; msg.textContent='✓ Password updated. You can sign in now.';
           document.getElementById('f').style.display='none';
         } else {
           msg.className='err'; msg.textContent = data.error || 'Reset failed';
         }
       });
       </script>`
    )
  );
});

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
