/**
 * Tiny in-memory sliding-window rate limiter.
 *
 * Limitation: state lives in the function instance and resets on cold start
 * (Vercel may spin up new instances). This is acceptable for a low-traffic
 * coming-soon endpoint — it stops casual abuse, not a determined attacker.
 * If abuse shows up, upgrade to Upstash Redis (see README).
 */

interface Bucket {
  windowStart: number;
  count: number;
}

export interface RateLimiterOptions {
  /** Window length in ms. */
  windowMs: number;
  /** Max requests per key per window. */
  max: number;
  /** Inject a clock for testing. Default: Date.now. */
  now?: () => number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private readonly windowMs: number;
  private readonly max: number;
  private readonly now: () => number;

  constructor(opts: RateLimiterOptions) {
    this.windowMs = opts.windowMs;
    this.max = opts.max;
    this.now = opts.now ?? Date.now;
  }

  /**
   * Records one hit for `key`. Returns `{ allowed: true }` if under the limit,
   * or `{ allowed: false, retryAfterMs }` once the limit is reached.
   */
  check(key: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const t = this.now();
    const existing = this.buckets.get(key);
    let bucket: Bucket;

    if (!existing || t - existing.windowStart >= this.windowMs) {
      bucket = { windowStart: t, count: 0 };
      this.buckets.set(key, bucket);
    } else {
      bucket = existing;
    }

    if (bucket.count >= this.max) {
      return {
        allowed: false,
        retryAfterMs: Math.ceil(this.windowMs - (t - bucket.windowStart)),
      };
    }

    bucket.count += 1;
    return { allowed: true };
  }

  /** Test helper: drop all state. */
  reset(): void {
    this.buckets.clear();
  }
}
