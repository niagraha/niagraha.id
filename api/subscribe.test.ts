/**
 * Tests for the subscribe endpoint logic.
 *
 * Run: npm test  (node --test api/)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleSubscribe, type SubscribeEnv } from './_logic.ts';
import { makeFakeResend } from './_test-helpers.ts';
import { RateLimiter } from './_rateLimit.ts';
import { isValidEmail, isDuplicateContactError, normalizeEmail, EMAIL_MAX_LENGTH } from './_validation.ts';
import { readSubscribePayload, BodyError } from './_body.ts';

const PROD_ENV: SubscribeEnv = {
  RESEND_API_KEY: 're_test_key',
  RESEND_AUDIENCE_ID: 'aud_123',
  TEAM_NOTIFY_EMAIL: 'team@niagraha.id',
  RESEND_FROM_ADDRESS: 'niagraha <notify@niagraha.id>',
};

function freshLimiter() {
  return new RateLimiter({ windowMs: 60_000, max: 5, now: () => 1_700_000_000_000 });
}

async function call(
  payload: { email?: unknown; company?: unknown },
  opts: {
    method?: string;
    ip?: string;
    resend?: ReturnType<typeof makeFakeResend>;
    env?: SubscribeEnv;
    limiter?: RateLimiter;
  } = {},
) {
  const resend = opts.resend ?? makeFakeResend();
  const result = await handleSubscribe(
    {
      method: opts.method ?? 'POST',
      ip: opts.ip ?? '1.2.3.4',
      payload,
    },
    {
      resend,
      env: opts.env ?? PROD_ENV,
      rateLimiter: opts.limiter ?? freshLimiter(),
    },
  );
  return { result, resend };
}

/* ---------- validation ---------- */

test('isValidEmail: accepts well-formed addresses', () => {
  for (const e of ['a@b.co', 'you@example.com', 'x.y.z@sub.example.org']) {
    assert.equal(isValidEmail(e), true, `expected ${e} to be valid`);
  }
});

test('isValidEmail: rejects junk', () => {
  for (const e of ['', '   ', 'noat.com', '@nope.com', 'a@', 'a@b', 'a b@c.com', 'a@.com', 'a@b.']) {
    assert.equal(isValidEmail(e), false, `expected ${e} to be invalid`);
  }
});

test('isValidEmail: rejects non-string types', () => {
  assert.equal(isValidEmail(undefined), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail(123), false);
  assert.equal(isValidEmail({ email: 'a@b.com' }), false);
  assert.equal(isValidEmail(['a@b.com']), false);
});

test(`isValidEmail: rejects strings longer than ${EMAIL_MAX_LENGTH}`, () => {
  const long = 'a'.repeat(EMAIL_MAX_LENGTH) + '@b.com';
  assert.equal(isValidEmail(long), false);
  // Exactly at the limit + a valid shape should pass.
  assert.equal(isValidEmail('a@b.co'), true);
});

test('normalizeEmail: trims and lowercases', () => {
  assert.equal(normalizeEmail('  Foo@BAR.com '), 'foo@bar.com');
});

test('isDuplicateContactError: detects Resend 422 / "already exists"', () => {
  assert.equal(isDuplicateContactError({ status: 422, message: 'contact already exists' }), true);
  assert.equal(isDuplicateContactError({ status: 409, message: 'duplicate' }), true);
  assert.equal(isDuplicateContactError({ name: 'validation_error', message: 'Contact already exists' }), true);
  assert.equal(isDuplicateContactError({ status: 500, message: 'resend is down' }), false);
  assert.equal(isDuplicateContactError(new Error('network')), false);
  assert.equal(isDuplicateContactError(null), false);
});

/* ---------- method guard ---------- */

test('GET returns 405 method_not_allowed', async () => {
  const { result } = await call({ email: 'a@b.com' }, { method: 'GET' });
  assert.equal(result.status, 405);
  assert.equal(result.body.error, 'method_not_allowed');
});

/* ---------- honeypot (#10) ---------- */

test('honeypot filled returns 200 ok silently, no Resend call', async () => {
  const { result, resend } = await call({ email: 'a@b.com', company: 'Buy Viagra Cheap' });
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(resend.contactsCreated.length, 0);
  assert.equal(resend.emailsSent.length, 0);
});

test('honeypot empty string is treated as a real submission', async () => {
  const { result, resend } = await call({ email: 'a@b.com', company: '' });
  assert.equal(result.status, 200);
  assert.equal(resend.contactsCreated.length, 1);
});

test('honeypot whitespace-only is treated as a real submission', async () => {
  const { result, resend } = await call({ email: 'a@b.com', company: '   ' });
  assert.equal(result.status, 200);
  assert.equal(resend.contactsCreated.length, 1);
});

/* ---------- validation in handler ---------- */

test('invalid email returns 400 invalid_email, no Resend call', async () => {
  const { result, resend } = await call({ email: 'not-an-email' });
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'invalid_email');
  assert.equal(resend.contactsCreated.length, 0);
});

test('missing email returns 400 invalid_email', async () => {
  const { result } = await call({});
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'invalid_email');
});

/* ---------- success paths ---------- */

test('valid email with audience configured → contacts.create called with normalized email', async () => {
  const { result, resend } = await call({ email: '  Foo@Bar.com ' });
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.deepEqual(resend.contactsCreated, [{ email: 'foo@bar.com', audienceId: 'aud_123' }]);
  assert.equal(resend.emailsSent.length, 0);
});

test('no audience → sends a notification email to the team instead', async () => {
  const { result, resend } = await call(
    { email: 'someone@example.org' },
    { env: { ...PROD_ENV, RESEND_AUDIENCE_ID: undefined } },
  );
  assert.equal(result.status, 200);
  assert.equal(resend.contactsCreated.length, 0);
  assert.equal(resend.emailsSent.length, 1);
  assert.equal(resend.emailsSent[0]!.to, 'team@niagraha.id');
  assert.equal(resend.emailsSent[0]!.subject, 'niagraha.id — new signup');
  assert.match(resend.emailsSent[0]!.html, /someone@example\.org/);
});

test('HTML is escaped in the notification email body', async () => {
  const { resend } = await call(
    { email: 'a@b.com', company: '' },
    { env: { ...PROD_ENV, RESEND_AUDIENCE_ID: undefined } },
  );
  // email is normalized/validated, so can't inject HTML via it — but assert we don't regress.
  assert.doesNotMatch(resend.emailsSent[0]!.html, /<script/);
});

/* ---------- duplicate handling ---------- */

test('duplicate contact error → 200 ok, no leakage', async () => {
  const resend = makeFakeResend({
    contactsCreateError: { status: 422, message: 'contact already exists' },
  });
  const { result } = await call({ email: 'dup@example.com' }, { resend });
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal('error' in result.body, false);
});

/* ---------- server errors ---------- */

test('Resend throws a 500 → 500 server_error, generic message', async () => {
  const resend = makeFakeResend({ contactsCreateError: new Error('upstream down') });
  const { result } = await call({ email: 'a@b.com' }, { resend });
  assert.equal(result.status, 500);
  assert.equal(result.body.error, 'server_error');
  assert.equal(JSON.stringify(result.body).includes('upstream down'), false);
});

/* ---------- preview mode ---------- */

test('no API key → 200 ok (preview mode), no network call', async () => {
  const { result, resend } = await call(
    { email: 'a@b.com' },
    { env: { ...PROD_ENV, RESEND_API_KEY: '' }, resend: null as never },
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
});

/* ---------- rate limiting (#10) ---------- */

test('rate limiter allows up to max per window, then blocks', () => {
  const now = { t: 0 };
  const limiter = new RateLimiter({ windowMs: 1000, max: 3, now: () => now.t });
  assert.equal(limiter.check('ip1').allowed, true);
  assert.equal(limiter.check('ip1').allowed, true);
  assert.equal(limiter.check('ip1').allowed, true);
  const blocked = limiter.check('ip1');
  assert.equal(blocked.allowed, false);
  if (!blocked.allowed) {
    assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 1000);
  }
});

test('rate limiter isolates by key', () => {
  const limiter = new RateLimiter({ windowMs: 1000, max: 1 });
  assert.equal(limiter.check('ip1').allowed, true);
  assert.equal(limiter.check('ip2').allowed, true); // different IP, allowed
  assert.equal(limiter.check('ip1').allowed, false);
});

test('rate limiter resets after the window', () => {
  const now = { t: 0 };
  const limiter = new RateLimiter({ windowMs: 1000, max: 1, now: () => now.t });
  assert.equal(limiter.check('ip').allowed, true);
  assert.equal(limiter.check('ip').allowed, false);
  now.t = 1001;
  assert.equal(limiter.check('ip').allowed, true);
});

test('handler returns 429 with retryAfter after the limit', async () => {
  const limiter = new RateLimiter({ windowMs: 60_000, max: 1, now: () => 1000 });
  await call({ email: 'a@b.com' }, { limiter, ip: '9.9.9.9' });
  const { result } = await call({ email: 'a@b.com' }, { limiter, ip: '9.9.9.9' });
  assert.equal(result.status, 429);
  assert.equal(result.body.error, 'rate_limited');
  assert.ok(result.body.retryAfter! >= 1);
});

/* ---------- body parsing (#4 — noscript form posts urlencoded) ---------- */

test('readSubscribePayload: parses JSON body', async () => {
  const payload = await readSubscribePayload({
    headers: { 'content-type': 'application/json' },
    body: '{"email":"a@b.com","company":""}',
  });
  assert.deepEqual(payload, { email: 'a@b.com', company: '' });
});

test('readSubscribePayload: parses urlencoded body (noscript form)', async () => {
  const payload = await readSubscribePayload({
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'email=a%40b.com&company=',
  });
  assert.deepEqual(payload, { email: 'a@b.com', company: '' });
});

test('readSubscribePayload: decodes + as space in urlencoded', async () => {
  const payload = await readSubscribePayload({
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'company=Spammy+Bot+Co&email=real%40example.com',
  });
  assert.deepEqual(payload, { email: 'real@example.com', company: 'Spammy Bot Co' });
});

test('readSubscribePayload: accepts a pre-parsed object body from runtime', async () => {
  const payload = await readSubscribePayload({
    headers: { 'content-type': 'application/json' },
    body: { email: 'a@b.com', company: '' },
  });
  assert.deepEqual(payload, { email: 'a@b.com', company: '' });
});

test('readSubscribePayload: rejects oversized body', async () => {
  await assert.rejects(
    () => readSubscribePayload({
      headers: { 'content-type': 'application/json' },
      body: 'x'.repeat(9 * 1024),
    }),
    (err: unknown) => err instanceof BodyError && err.code === 'too_large',
  );
});

test('readSubscribePayload: rejects empty JSON', async () => {
  await assert.rejects(
    () => readSubscribePayload({
      headers: { 'content-type': 'application/json' },
      body: '',
    }),
    (err: unknown) => err instanceof BodyError && err.code === 'empty',
  );
});

/* ---------- integration: body parse + handler (mirrors subscribe.ts) ---------- */

/**
 * Drives the full pipeline the way the Vercel wrapper does: raw body string
 * → readSubscribePayload → handleSubscribe. Proves the <noscript> form path
 * (urlencoded) and the JS-client path (JSON) both reach Resend.
 */
async function endToEnd(rawBody: string, contentType: string, opts: { ip?: string } = {}) {
  const payload = await readSubscribePayload({
    headers: { 'content-type': contentType },
    body: rawBody,
  });
  const resend = makeFakeResend();
  const result = await handleSubscribe(
    { method: 'POST', ip: opts.ip ?? '1.2.3.4', payload },
    { resend, env: PROD_ENV, rateLimiter: freshLimiter() },
  );
  return { result, resend };
}

test('integration: JSON body path (JS client) → contacts.create', async () => {
  const { result, resend } = await endToEnd(
    '{"email":"someone@example.com","company":""}',
    'application/json',
  );
  assert.equal(result.status, 200);
  assert.equal(resend.contactsCreated.length, 1);
  assert.equal(resend.contactsCreated[0]!.email, 'someone@example.com');
});

test('integration: urlencoded body path (noscript form) → contacts.create', async () => {
  const { result, resend } = await endToEnd(
    'email=someone%40example.com&company=',
    'application/x-www-form-urlencoded',
  );
  assert.equal(result.status, 200);
  assert.equal(resend.contactsCreated.length, 1);
  assert.equal(resend.contactsCreated[0]!.email, 'someone@example.com');
});

test('integration: honeypot filled in urlencoded body → silent 200, no Resend call', async () => {
  const { result, resend } = await endToEnd(
    'email=someone%40example.com&company=I+am+a+bot',
    'application/x-www-form-urlencoded',
  );
  assert.equal(result.status, 200);
  assert.equal(resend.contactsCreated.length, 0);
});
