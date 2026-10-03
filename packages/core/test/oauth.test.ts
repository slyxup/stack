import { afterEach, describe, expect, it, vi } from 'vitest';
import { SlyxupClient } from '../src/client';

afterEach(() => vi.unstubAllGlobals());
describe('OAuth app handoff', () => {
  it('creates a proof-key redirect and exchanges a code only once across concurrent callers', async () => {
    const values = new Map<string,string>();
    const assign = vi.fn();
    const location = { href: 'https://app.example/callback', origin: 'https://app.example', assign };
    const replaceState = vi.fn();
    vi.stubGlobal('window', { location, history: { state: null, replaceState }, sessionStorage: { getItem: (key:string)=>values.get(key), setItem:(key:string,value:string)=>values.set(key,value), removeItem:(key:string)=>values.delete(key) } });
    const client = new SlyxupClient({ publishableKey:'pk_project' });
    await client.auth.startOAuth('google');
    const target = new URL(assign.mock.calls[0][0]);
    expect(target.searchParams.get('code_challenge')).toHaveLength(43);
    expect(target.searchParams.get('publishable_key')).toBe('pk_project');
    location.href += '?slyxup_code=' + 'a'.repeat(64);
    const fetcher = vi.fn().mockResolvedValue(Response.json({ok:true,user:{id:'u',email:'u@example.com'},sessionToken:'session'}));
    vi.stubGlobal('fetch',fetcher);
    const [a,b] = await Promise.all([client.auth.completeOAuth(),client.auth.completeOAuth()]);
    expect(a).toEqual(b);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(replaceState.mock.calls[0][2]).toBe('https://app.example/callback');
    expect(client.getToken()).toBe('session');
    expect(values.size).toBe(0);
  });
  it('rejects callbacks without the initiating tab verifier', async () => {
    vi.stubGlobal('window', { location:{href:'https://app.example/?slyxup_code='+'a'.repeat(64)},sessionStorage:{getItem:()=>null} });
    await expect(new SlyxupClient().auth.completeOAuth()).rejects.toMatchObject({code:'oauth_verifier_missing'});
  });
});
