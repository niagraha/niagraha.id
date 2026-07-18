/**
 * Core subscribe handler logic, kept pure (no Node/Vercel globals) so it can
 * be unit-tested by injecting a fake Resend client, clock, and rate limiter.
 *
 * The actual HTTP wrapper in `subscribe.ts` reads the request, parses the
 * body, and calls this function.
 */

import {
  isDuplicateContactError,
  isValidEmail,
  normalizeEmail,
} from './_validation.js';
import { RateLimiter } from './_rateLimit.js';

/** Subset of the Resend SDK we depend on. */
export interface ResendLike {
  contacts: {
    create(args: {
      email: string;
      audienceId: string;
      unsubscribed?: boolean;
    }): Promise<unknown>;
  };
  emails: {
    send(args: {
      from: string;
      to: string | string[];
      subject: string;
      html: string;
    }): Promise<unknown>;
  };
}

export interface SubscribeEnv {
  RESEND_API_KEY: string;
  RESEND_AUDIENCE_ID?: string;
  TEAM_NOTIFY_EMAIL?: string;
  RESEND_FROM_ADDRESS?: string;
}

export interface SubscribeResult {
  status: number;
  body: { ok: boolean; error?: string; retryAfter?: number };
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

/** Create the production rate limiter. Tests construct their own. */
export function createRateLimiter(): RateLimiter {
  return new RateLimiter({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
  });
}

export interface HandleSubscribeInput {
  method: string;
  /** Origin IP for rate-limiting. */
  ip: string;
  /** Already-parsed payload. */
  payload: { email?: unknown; company?: unknown };
}

export interface HandleSubscribeDeps {
  resend: ResendLike | null;
  env: SubscribeEnv;
  rateLimiter: RateLimiter;
}

function json(status: number, body: SubscribeResult['body']): SubscribeResult {
  return { status, body };
}

/**
 * Returns a `{status, body}` tuple. Caller serializes the body as JSON.
 *
 * Error responses never leak internals — they use the generic codes
 * `method_not_allowed`, `invalid_email`, `rate_limited`, `server_error`.
 */
export async function handleSubscribe(
  input: HandleSubscribeInput,
  deps: HandleSubscribeDeps,
): Promise<SubscribeResult> {
  if (input.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  // Honeypot: a real user never fills `company`. Accept silently so the bot
  // can't tell it was caught.
  if (typeof input.payload.company === 'string' && input.payload.company.trim() !== '') {
    return json(200, { ok: true });
  }

  // Rate limit BEFORE validation so a flood of junk still gets throttled.
  const rl = deps.rateLimiter.check(input.ip);
  if (!rl.allowed) {
    return json(429, { ok: false, error: 'rate_limited', retryAfter: Math.ceil(rl.retryAfterMs / 1000) });
  }

  if (!isValidEmail(input.payload.email)) {
    return json(400, { ok: false, error: 'invalid_email' });
  }

  const email = normalizeEmail(input.payload.email);

  // No API key configured (e.g. preview deploy) — accept the submission but
  // flag clearly that nothing was stored. This keeps the UX working in PR
  // previews without silently dropping signups in prod.
  if (!deps.env.RESEND_API_KEY || !deps.resend) {
    console.warn('[subscribe] RESEND_API_KEY not set — signup dropped (preview mode).');
    return json(200, { ok: true });
  }

  try {
    await forwardToResend(deps.resend, deps.env, email);
    return json(200, { ok: true });
  } catch (err) {
    if (isDuplicateContactError(err)) {
      // Already subscribed — treat as success, do NOT leak that they exist.
      return json(200, { ok: true });
    }
    // Log the detail server-side only; client gets a generic message.
    console.error('[subscribe] Resend error:', err);
    return json(500, { ok: false, error: 'server_error' });
  }
}

async function forwardToResend(resend: ResendLike, env: SubscribeEnv, email: string): Promise<void> {
  if (env.RESEND_AUDIENCE_ID) {
    await resend.contacts.create({ email, audienceId: env.RESEND_AUDIENCE_ID, unsubscribed: false });
    return;
  }

  // No audience configured — fall back to emailing the team a notification.
  const to = env.TEAM_NOTIFY_EMAIL;
  if (!to) {
    throw new Error('RESEND_AUDIENCE_ID or TEAM_NOTIFY_EMAIL must be set');
  }
  const from = env.RESEND_FROM_ADDRESS ?? 'niagraha <notify@niagraha.id>';
  await resend.emails.send({
    from,
    to,
    subject: 'niagraha.id — new signup',
    html: `<p>New signup: <code>${escapeHtml(email)}</code></p>`,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}
