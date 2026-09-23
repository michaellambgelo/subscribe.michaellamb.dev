// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { detectShow, SHOWS } from '../src/laya';

const ENV = {
  LAYA_TOKEN: 'laya-token',
  CF_ACCESS_CLIENT_ID: 'id.access',
  CF_ACCESS_CLIENT_SECRET: 'secret',
};

function answering(choice: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify({ answers: { show: { choice } } }), { status }));
}

describe('detectShow', () => {
  it('returns the show Laya picks, asking the specialist with the Access and bearer headers', async () => {
    const f = answering('the_office');
    expect(await detectShow(ENV, 'Dwight is my spirit animal', f as unknown as typeof fetch)).toBe('the_office');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://ai.michaellamb.dev/decide');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer laya-token');
    expect(headers['CF-Access-Client-Id']).toBe('id.access');
    expect(headers['CF-Access-Client-Secret']).toBe('secret');
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({ state: 'Dwight is my spirit animal', caller: 'subscribe', model: 'show-detect', questions: { show: {} } });
  });

  it('is null for none, an unknown key, or a malformed body', async () => {
    for (const choice of ['none', 'seinfeld', undefined, 42]) {
      expect(await detectShow(ENV, 'x', answering(choice) as unknown as typeof fetch)).toBeNull();
    }
    const junk = vi.fn(async () => new Response('not json'));
    expect(await detectShow(ENV, 'x', junk as unknown as typeof fetch)).toBeNull();
  });

  it('fails open on a non-2xx, a network error, or a timeout', async () => {
    expect(await detectShow(ENV, 'x', answering('the_office', 403) as unknown as typeof fetch)).toBeNull();
    const down = vi.fn(async () => { throw new TypeError('network'); });
    expect(await detectShow(ENV, 'x', down as unknown as typeof fetch)).toBeNull();
    const hang = vi.fn((_u: string, init: RequestInit) => new Promise<Response>((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('timeout', 'TimeoutError')));
    }));
    const t0 = Date.now();
    expect(await detectShow(ENV, 'x', hang as unknown as typeof fetch, 50)).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('does nothing without a token, and omits Access headers it does not have', async () => {
    const f = answering('community');
    expect(await detectShow({}, 'x', f as unknown as typeof fetch)).toBeNull();
    expect(f).not.toHaveBeenCalled();
    await detectShow({ LAYA_TOKEN: 't', LAYA_URL: 'http://127.0.0.1:8087/decide' }, 'x', f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8087/decide');
    expect(Object.keys(init.headers as object)).not.toContain('CF-Access-Client-Id');
  });

  it('covers exactly the five shows in the quote bank', async () => {
    const { QUOTES } = await import('../src/quotes');
    expect(new Set(Object.values(SHOWS))).toEqual(new Set(QUOTES.map((q) => q.show)));
  });
});
