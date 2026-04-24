export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

/**
 * Per-IP hourly rate limiter backed by KV. Keys expire on the next hour
 * rollover via KV TTL, so there's no background cleanup to worry about.
 */
export async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  limitPerHour: number,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  const hourBucket = Math.floor(now / 3_600_000);
  const key = `rl:${ip}:${hourBucket}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  const retryAfterSeconds = 3600 - Math.floor((now % 3_600_000) / 1000);

  if (count >= limitPerHour) {
    return { ok: false, retryAfterSeconds, remaining: 0 };
  }
  await kv.put(key, String(count + 1), { expirationTtl: 3600 });
  return {
    ok: true,
    retryAfterSeconds,
    remaining: Math.max(0, limitPerHour - (count + 1)),
  };
}
