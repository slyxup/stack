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
    private from = 'noreply@slyxup.online',
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

const SHELL = (title: string, body: string) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d14;color:#eceef2;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{max-width:420px;margin:24px;padding:36px;background:#15151f;border:1px solid #262633;border-radius:16px;text-align:center}
h1{font-size:20px;margin:0 0 10px}p{color:#9a9aa6;font-size:14px;line-height:1.6;margin:0 0 18px}
a.b{display:inline-block;background:#5b5bd6;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:10px}
input{width:100%;box-sizing:border-box;background:#0d0d14;border:1px solid #33334a;color:#eceef2;border-radius:10px;padding:11px 13px;font-size:14px;margin-bottom:12px}
button{width:100%;background:#5b5bd6;color:#fff;border:0;border-radius:10px;padding:11px;font-weight:600;font-size:14px;cursor:pointer}
.ok{color:#4ade80}.err{color:#f0737d}
</style></head><body><div class="card">${body}</div></body></html>`;

/** Branded HTML email templates */
export function verificationEmailHtml(link: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto">
<h2 style="margin:0 0 8px">Verify your email</h2>
<p style="color:#555;line-height:1.6;margin:0 0 24px">Welcome to SlyxUp! Confirm your email address to activate your account.</p>
<a href="${link}" style="display:inline-block;background:#5b5bd6;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 26px;border-radius:10px">Verify email</a>
<p style="color:#999;font-size:12px;margin-top:24px">Or paste this link in your browser:<br><code style="font-size:11px;word-break:break-all">${link}</code></p>
<p style="color:#bbb;font-size:11px;margin-top:28px">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
</div>`;
}

export function resetPasswordEmailHtml(link: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto">
<h2 style="margin:0 0 8px">Reset your password</h2>
<p style="color:#555;line-height:1.6;margin:0 0 24px">We received a request to reset your SlyxUp password.</p>
<a href="${link}" style="display:inline-block;background:#5b5bd6;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 26px;border-radius:10px">Choose new password</a>
<p style="color:#999;font-size:12px;margin-top:24px">Or paste this link:<br><code style="font-size:11px;word-break:break-all">${link}</code></p>
<p style="color:#bbb;font-size:11px;margin-top:28px">Link expires in 1 hour. Didn't ask for this? Ignore this email.</p>
</div>`;
}

export { SHELL as EMAIL_SHELL };
