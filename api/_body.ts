/**
 * Body parsing for the subscribe endpoint.
 *
 * The JS client posts JSON; the <noscript> fallback posts a regular HTML form
 * (application/x-www-form-urlencoded). Both must work, so we parse by
 * Content-Type rather than assuming JSON.
 */

export type SubscribePayload = {
  email?: unknown;
  /** Honeypot field — see issue #10. Any non-empty value means a bot. */
  company?: unknown;
};

/**
 * Reads a Node/Vercel request stream, returning the parsed payload.
 * Throws on malformed input or bodies that exceed a sane size cap.
 */
export async function readSubscribePayload(
  req: { headers: Record<string, string | string[] | undefined>; body?: any },
): Promise<SubscribePayload> {
  const ct = (req.headers['content-type'] ?? '').toString().toLowerCase();
  const MAX = 8 * 1024; // 8 KiB — an email is tiny; anything bigger is abuse.

  let raw = '';
  if (typeof req.body === 'string') {
    raw = req.body;
  } else if (Buffer.isBuffer(req.body)) {
    raw = req.body.toString('utf8');
  } else if (req.body && typeof req.body === 'object') {
    // @vercel/node has already parsed JSON for us.
    return req.body as SubscribePayload;
  } else {
    // No body provided by the runtime — caller should stream-read it.
    throw new BodyError('no_body');
  }

  if (Buffer.byteLength(raw, 'utf8') > MAX) {
    throw new BodyError('too_large');
  }

  if (ct.includes('application/json')) {
    if (raw.trim() === '') throw new BodyError('empty');
    try {
      return JSON.parse(raw) as SubscribePayload;
    } catch {
      throw new BodyError('invalid_json');
    }
  }

  if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    return parseUrlencoded(raw);
  }

  // Default: try JSON, then urlencoded.
  try {
    return JSON.parse(raw) as SubscribePayload;
  } catch {
    return parseUrlencoded(raw);
  }
}

function parseUrlencoded(raw: string): SubscribePayload {
  const out: SubscribePayload = {};
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = decode(eq === -1 ? pair : pair.slice(0, eq));
    const val = decode(eq === -1 ? '' : pair.slice(eq + 1));
    if (key === 'email' || key === 'company') out[key] = val;
  }
  return out;
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

export class BodyError extends Error {
  readonly code: 'no_body' | 'too_large' | 'invalid_json' | 'empty';
  constructor(code: 'no_body' | 'too_large' | 'invalid_json' | 'empty') {
    super(code);
    this.name = 'BodyError';
    this.code = code;
  }
}
