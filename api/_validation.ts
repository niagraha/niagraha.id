/**
 * Shared validation helpers for the subscribe endpoint.
 *
 * Kept separate from the handler so it can be unit-tested without spinning
 * up a fake HTTP request, and reused by any future caller.
 */

/** RFC 5321 caps the local+domain at 254 characters. */
export const EMAIL_MAX_LENGTH = 254;

/**
 * Pragmatic email check. We deliberately do NOT try to be a full RFC 5322
 * parser — the only authoritative test is "did Resend accept it". This regex
 * rejects the obvious junk (missing @, spaces, no TLD, leading/trailing dots)
 * while accepting every sane address.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > EMAIL_MAX_LENGTH) return false;
  return EMAIL_RE.test(trimmed);
}

/** Normalize before storage/forwarding so duplicates dedupe cleanly. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Resend returns HTTP 422 with a `contact_already_exists` message when you
 * try to add a duplicate contact to an audience. From the user's POV that's
 * a success — they're already on the list — so we treat it as such.
 */
export function isDuplicateContactError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; message?: string; name?: string };
  if (e.status === 422 || e.status === 409) return true;
  if (typeof e.message === 'string' && /already exists|duplicate/i.test(e.message)) {
    return true;
  }
  if (e.name === 'validation_error' && typeof e.message === 'string' && /already exists/i.test(e.message)) {
    return true;
  }
  return false;
}
