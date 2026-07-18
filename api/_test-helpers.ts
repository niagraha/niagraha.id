/**
 * Test helpers shared by subscribe.test.ts.
 *
 * node:test + node:assert — no extra test framework dependency.
 */

import type { ResendLike } from './_logic.ts';

/** Records every call so tests can assert on them. */
export function makeFakeResend(opts: {
  contactsCreateError?: unknown;
  emailsSendError?: unknown;
} = {}): ResendLike & {
  contactsCreated: Array<{ email: string; audienceId: string }>;
  emailsSent: Array<{ from: string; to: string; subject: string; html: string }>;
} {
  const contactsCreated: Array<{ email: string; audienceId: string }> = [];
  const emailsSent: Array<{ from: string; to: string; subject: string; html: string }> = [];

  return {
    contactsCreated,
    emailsSent,
    contacts: {
      async create({ email, audienceId }) {
        if (opts.contactsCreateError) throw opts.contactsCreateError;
        contactsCreated.push({ email, audienceId });
        return { id: 'fake_' + contactsCreated.length };
      },
    },
    emails: {
      async send({ from, to, subject, html }) {
        if (opts.emailsSendError) throw opts.emailsSendError;
        emailsSent.push({ from, to: String(to), subject, html });
        return { id: 'fake_' + emailsSent.length };
      },
    },
  };
}
