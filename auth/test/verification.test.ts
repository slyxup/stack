import { describe, expect, it, vi, beforeEach } from 'vitest';
import app from '../src/routes/verification';
import { verifyApiKey } from '../src/services/project.service';
import * as tokens from '../src/services/token.service';

vi.mock('../src/services/project.service', () => ({ verifyApiKey: vi.fn() }));
vi.mock('../src/services/token.service', () => ({ forgotPassword: vi.fn(), resendVerification: vi.fn() }));

describe('verification project scope', () => {
  beforeEach(() => vi.resetAllMocks());
  it.each(['/resend', '/password/forgot'])('uses the validated key for %s', async (path) => {
    vi.mocked(verifyApiKey).mockResolvedValue({ projectId: 'project-a', type: 'publishable', environment: 'test' });
    const env = { DB: {} } as never;
    const response = await app.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Publishable-Key': 'pk_a' }, body: JSON.stringify({ email: 'ada@example.com', projectId: 'a7d516be-f1ae-4b26-a942-652c6e6676a4' }) }, env);
    expect(response.status).toBe(200);
    const called = path === '/resend' ? tokens.resendVerification : tokens.forgotPassword;
    expect(called).toHaveBeenCalledWith(env, 'ada@example.com', 'project-a');
  });
  it('rejects an invalid key without sending an email', async () => {
    vi.mocked(verifyApiKey).mockResolvedValue(null);
    const response = await app.request('/password/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Publishable-Key': 'invalid' }, body: JSON.stringify({ email: 'ada@example.com' }) });
    expect(response.status).toBe(401);
    expect(tokens.forgotPassword).not.toHaveBeenCalled();
  });
  it('does not interpolate a script closing tag into the hosted reset form', async () => {
    const response = await app.request(`/reset?token=${encodeURIComponent('</script><script>evil()</script>')}`);
    const html = await response.text();
    expect(html).not.toContain('</script><script>evil()');
    expect(html).toContain('\\u003c/script>');
  });
});
