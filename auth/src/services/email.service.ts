export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  send(options: EmailOptions): Promise<{ ok: true; id?: string }>;
}

/** Brevo (Sendinblue) provider — uses BREVO_API_KEY */
export class BrevoEmailService implements EmailService {
  constructor(
    private apiKey: string,
    private from = 'noreply@slyxup.com',
    private fromName = 'SlyxUp'
  ) {}

  async send(options: EmailOptions): Promise<{ ok: true; id?: string }> {
    if (!this.apiKey || this.apiKey.includes('REPLACE')) {
      console.warn(
        '[email] BREVO_API_KEY not set — skipping send to',
        options.to
      );
      return { ok: true };
    }
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        sender: { email: this.from, name: this.fromName },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Brevo send failed (${res.status}): ${text}`);
    }
    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { ok: true, id: data.messageId };
  }
}

/** No-op for tests */
export class NoopEmailService implements EmailService {
  async send(): Promise<{ ok: true }> {
    return { ok: true };
  }
}

export function getEmailService(
  env: Record<string, string | undefined>
): EmailService {
  const key = env.BREVO_API_KEY ?? env.BRAVO_API_KEY;
  if (key)
    return new BrevoEmailService(key, env.EMAIL_FROM, env.EMAIL_FROM_NAME);
  console.warn('[email] BREVO_API_KEY not set — emails disabled');
  return new NoopEmailService();
}

/** Best-effort send — never throws (auth flows must not break on email failure). */
export async function trySend(
  env: Record<string, string | undefined>,
  options: EmailOptions
): Promise<void> {
  try {
    const svc = getEmailService(env);
    const res = await svc.send(options);
    if (!res.ok)
      console.error(JSON.stringify({ evt: 'email_failed', to: options.to }));
  } catch (e) {
    console.error(
      JSON.stringify({ evt: 'email_error', to: options.to, msg: String(e) })
    );
  }
}

const FONT_STACK = `-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif`;

/**
 * Hosted auth page shell (GET /v1/verification/confirm + /reset).
 * Light, professional, responsive — no external assets so it always renders.
 */
const SHELL = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · SlyxUp</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:${FONT_STACK};background:#eef1f8;color:#202533;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px 16px;-webkit-font-smoothing:antialiased}
.card{width:100%;max-width:420px;background:#fff;border:1px solid #e2e7f0;border-radius:20px;padding:36px 36px 32px;box-shadow:0 1px 2px rgba(18,18,28,.05),0 12px 30px -12px rgba(27,39,64,.14),0 28px 70px -24px rgba(27,39,64,.16);text-align:center}
.mark{width:48px;height:48px;border-radius:14px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;background:linear-gradient(140deg,#5b5bd6 0%,#8b5cf6 100%);color:#fff;font-weight:800;font-size:22px;letter-spacing:-.02em;box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 6px 16px -6px rgba(91,91,214,.55)}
.eyebrow{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5b5bd6;background:rgba(91,91,214,.1);border-radius:999px;padding:4px 12px;margin-bottom:14px}
h1{font-size:22px;font-weight:700;letter-spacing:-.02em;color:#0e1422;margin:0 0 8px}
p{color:#687287;font-size:14px;line-height:1.6;margin:0 0 16px}
p strong{color:#0e1422}
input{width:100%;box-sizing:border-box;background:#f7f8fc;border:1px solid #e2e7f0;color:#202533;border-radius:14px;padding:10px 13px;font-size:14px;min-height:44px;margin-bottom:12px;outline:none}
input:focus{border-color:#5b5bd6;box-shadow:0 0 0 3.5px rgba(91,91,214,.13);background:#fff}
button{width:100%;background:#101014;color:#fff;border:1px solid #101014;border-radius:14px;padding:11px 14px;min-height:46px;font-weight:600;font-size:14px;cursor:pointer}
button:hover{filter:brightness(1.25)}
.foot{margin:22px 0 0;font-size:12px;color:#9aa1b2}
.ok{color:#177245}.err{color:#cc333f}
.msg{font-size:13px;border-radius:10px;padding:10px 12px;margin:0 0 16px;line-height:1.45}
.msg.ok{background:rgba(23,114,69,.08);border:1px solid rgba(23,114,69,.25)}
.msg.err{background:rgba(204,51,63,.07);border:1px solid rgba(204,51,63,.25)}
@media(max-width:460px){.card{padding:26px 22px 24px}h1{font-size:19px}}
</style></head><body><main class="card"><div class="mark" aria-hidden="true">S</div>${body}<p class="foot">Secured by SlyxUp</p></main></body></html>`;

/** Shared email chrome — table layout + inline styles so it survives Gmail/Outlook/Apple Mail. */
function emailChrome(opts: {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  ctaLabel: string;
  link: string;
  expiryNote: string;
  ignoreNote: string;
}): string {
  const { preheader, eyebrow, title, intro, ctaLabel, link, expiryNote, ignoreNote } = opts;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>@media only screen and (max-width:600px){.container{width:100%!important}.card{padding:28px 22px!important}.cta a{padding:13px 20px!important}}</style>
</head><body style="margin:0;padding:0;background-color:#f4f5f9;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f5f9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" class="container" style="width:560px;max-width:560px;">
<tr><td align="left" style="padding:0 8px 16px;font-family:${FONT_STACK};font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#0e1422;">SlyxUp<span style="color:#5b5bd6;">.</span></td></tr>
<tr><td class="card" style="background-color:#ffffff;border:1px solid #e2e7f0;border-radius:16px;padding:36px 36px 32px;">
<p style="margin:0 0 14px;"><span style="display:inline-block;font-family:${FONT_STACK};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#5b5bd6;background-color:rgba(91,91,214,0.1);border-radius:999px;padding:4px 12px;">${eyebrow}</span></p>
<h1 style="margin:0 0 10px;font-family:${FONT_STACK};font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#0e1422;">${title}</h1>
<p style="margin:0 0 24px;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:#3f4756;">${intro}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta"><tr><td align="center" bgcolor="#5b5bd6" style="border-radius:10px;background-color:#5b5bd6;"><a href="${link}" style="display:inline-block;font-family:${FONT_STACK};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:10px;">${ctaLabel}</a></td></tr></table>
<p style="margin:24px 0 0;font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#687287;">Button not working? Paste this link into your browser:</p>
<p style="margin:8px 0 0;padding:10px 12px;background-color:#f7f8fc;border:1px solid #e2e7f0;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;word-break:break-all;color:#3f4756;"><a href="${link}" style="color:#5b5bd6;text-decoration:none;">${link}</a></p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:24px 0 0;"><p style="margin:0;padding-top:16px;border-top:1px solid #eef1f5;font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:#9aa1b2;">${expiryNote}<br>${ignoreNote}</p></td></tr></table>
</td></tr>
<tr><td align="center" style="padding:20px 8px 0;font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:#9aa1b2;">Sent by SlyxUp · noreply@slyxup.com<br>You're receiving this because an action was requested on your account.</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Branded HTML email templates */
export function verificationEmailHtml(link: string): string {
  return emailChrome({
    preheader: 'Confirm your email to activate your SlyxUp account.',
    eyebrow: 'Email verification',
    title: 'Verify your email',
    intro: 'Welcome to SlyxUp! Confirm this email address to activate your account and get started.',
    ctaLabel: 'Verify email',
    link,
    expiryNote: 'This link expires in 24 hours.',
    ignoreNote: "If you didn't create a SlyxUp account, you can safely ignore this email.",
  });
}

export function resetPasswordEmailHtml(link: string): string {
  return emailChrome({
    preheader: 'Choose a new password for your SlyxUp account.',
    eyebrow: 'Password reset',
    title: 'Reset your password',
    intro: 'We received a request to reset your SlyxUp password. Click below to choose a new one.',
    ctaLabel: 'Choose new password',
    link,
    expiryNote: 'This link expires in 1 hour and can only be used once.',
    ignoreNote: "Didn't ask for this? Your password is unchanged — just ignore this email.",
  });
}

export { SHELL as EMAIL_SHELL };
