import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '../src/rate-limit';

function makeKV(): { kv: KVNamespace; store: Map<string, string> } {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
  return { kv, store };
}

describe('checkRateLimit', () => {
  it('allows requests under the limit and decrements remaining', async () => {
    const { kv } = makeKV();
    const a = await checkRateLimit(kv, '1.1.1.1', 3);
    expect(a.ok).toBe(true);
    expect(a.remaining).toBe(2);

    const b = await checkRateLimit(kv, '1.1.1.1', 3);
    expect(b.ok).toBe(true);
    expect(b.remaining).toBe(1);

    const c = await checkRateLimit(kv, '1.1.1.1', 3);
    expect(c.ok).toBe(true);
    expect(c.remaining).toBe(0);
  });

  it('rejects requests over the limit', async () => {
    const { kv } = makeKV();
    await checkRateLimit(kv, '2.2.2.2', 2);
    await checkRateLimit(kv, '2.2.2.2', 2);
    const denied = await checkRateLimit(kv, '2.2.2.2', 2);
    expect(denied.ok).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
    expect(denied.retryAfterSeconds).toBeLessThanOrEqual(3600);
  });

  it('tracks IPs independently', async () => {
    const { kv } = makeKV();
    await checkRateLimit(kv, 'a', 1);
    const denyA = await checkRateLimit(kv, 'a', 1);
    expect(denyA.ok).toBe(false);
    const allowB = await checkRateLimit(kv, 'b', 1);
    expect(allowB.ok).toBe(true);
  });

  it('starts a fresh bucket in the next hour', async () => {
    const { kv } = makeKV();
    const now = Date.now();
    await checkRateLimit(kv, '3.3.3.3', 1, now);
    const deny = await checkRateLimit(kv, '3.3.3.3', 1, now);
    expect(deny.ok).toBe(false);
    const nextHour = now + 3_600_000;
    const allow = await checkRateLimit(kv, '3.3.3.3', 1, nextHour);
    expect(allow.ok).toBe(true);
  });
});
