import { describe, expect, it, vi } from 'vitest';
import oauth from '../src/routes/oauth';
vi.mock('../src/services/project.service', () => ({ verifyApiKey: vi.fn().mockResolvedValue({ projectId: 'project', type: 'publishable' }) }));

describe('OAuth project boundary', () => {
  it('requires an app proof-key challenge for project sign-in', async () => {
    const response = await oauth.request('/google?publishable_key=pk_project');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'Project OAuth requires an S256 app challenge' });
  });
});
