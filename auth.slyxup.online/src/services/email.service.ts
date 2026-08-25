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
  return new NoopEmailService();
}
