/**
 * POST /api/subscribe
 *
 * Body (JSON or urlencoded): { email: string, company?: string }
 *  - `company` is a honeypot — real users never fill it.
 *
 * Responses:
 *   200 { ok: true }                         — subscribed (or duplicate, silently)
 *   400 { ok: false, error: 'invalid_email' }
 *   405 { ok: false, error: 'method_not_allowed' }
 *   429 { ok: false, error: 'rate_limited', retryAfter }
 *   500 { ok: false, error: 'server_error' }
 *
 * API keys live in Vercel env vars, never in client JS.
 */

import type { VercelRequest, VercelResponse, VercelApiHandler } from '@vercel/node';
import { Resend } from 'resend';
import {
  createRateLimiter,
  handleSubscribe,
  type ResendLike,
} from './_logic.ts';
import { readSubscribePayload, BodyError } from './_body.ts';

// Module-scoped so it survives warm invocations of the same instance.
const rateLimiter = createRateLimiter();

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS preflight (same-origin in prod, permissive for local dev).
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  let payload;
  try {
    payload = await readSubscribePayload(req);
  } catch (err) {
    if (err instanceof BodyError) {
      res.status(err.code === 'too_large' ? 413 : 400).json({
        ok: false,
        error: err.code === 'too_large' ? 'payload_too_large' : 'invalid_body',
      });
      return;
    }
    throw err;
  }

  const env = {
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
    RESEND_AUDIENCE_ID: process.env.RESEND_AUDIENCE_ID || undefined,
    TEAM_NOTIFY_EMAIL: process.env.TEAM_NOTIFY_EMAIL || undefined,
    RESEND_FROM_ADDRESS: process.env.RESEND_FROM_ADDRESS || undefined,
  };

  const resend: ResendLike | null = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

  const result = await handleSubscribe(
    {
      method: req.method ?? 'GET',
      ip: getClientIp(req),
      payload,
    },
    { resend, env, rateLimiter },
  );

  if (result.status === 429) {
    res.setHeader('Retry-After', String(result.body.retryAfter ?? 60));
  }
  res.status(result.status).json(result.body);
}

/**
 * Best-effort client-IP extraction. Vercel sets `x-forwarded-for` and the
 * newer `x-vercel-forwarded-for`. We trust the first hop only — that's what
 * Vercel guarantees is real on their edge.
 */
function getClientIp(req: VercelRequest): string {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const xvf = headers['x-vercel-forwarded-for'] ?? headers['x-forwarded-for'];
  if (typeof xvf === 'string') return xvf.split(',')[0]!.trim();
  if (Array.isArray(xvf) && xvf.length) return xvf[0]!.split(',')[0]!.trim();
  return headers['x-real-ip'] as string ?? '0.0.0.0';
}
