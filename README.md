# niagraha.id — coming-soon page

A lightweight, terminal-themed "coming soon" page for **Niagraha** (acrylic robot
kits + ROS/ROS2 courses, Indonesia). Built as a Vercel static site with one
serverless function for email capture.

- **Stack:** static HTML/CSS/JS (no framework, no build step) + a single
  `/api/subscribe` serverless function in TypeScript.
- **Palette:** Catppuccin Frappé (do not swap).
- **No Docker.** Vercel runs the function natively; Resend is a SaaS API.
  Docker only earns its place if you later self-host or need a local DB.

## Project layout

```
public/              # served at / by Vercel (static)
  index.html         # structure + <noscript> fallback + meta/OG
  styles.css         # all CSS (Catppuccin Frappé, verbatim from the base file)
  i18n.js            # EN/ID strings + lang state + CONTACT placeholders (#8)
  boot.js            # terminal boot sequence
  dock.js            # macOS-style dock + panels
  subscribe.js       # email form → /api/subscribe
  favicon.svg, apple-touch-icon.png, og-image.png, robots.txt
api/                 # serverless functions (TypeScript)
  subscribe.ts       # POST /api/subscribe — Vercel handler
  _logic.ts          # pure handler logic (unit-tested)
  _validation.ts     # email validation + duplicate detection
  _rateLimit.ts      # in-memory sliding-window rate limiter
  _body.ts           # JSON + urlencoded body parsing
  subscribe.test.ts  # 31 node:test cases
scripts/
  og-image.html      # source used to render public/og-image.png
vercel.json          # function runtime + same-origin CORS
```

## Local development

```bash
npm install
vercel dev --listen 4517   # needs the Vercel CLI + login
```

If you don't have the Vercel CLI and just want to preview the static page:

```bash
python3 -m http.server --directory public 8000
# open http://localhost:8000
```

The subscribe form will hit `/api/subscribe` and, with no `RESEND_API_KEY` set,
returns `{ ok: true }` in preview mode (it logs a warning; no email is stored).
This is intentional so PR previews work without secrets.

## Tests & typecheck

```bash
npm test             # node:test — 31 cases covering validation, rate limit,
                     # body parsing, honeypot, Resend forwarding, duplicates,
                     # and end-to-end (JSON + urlencoded) paths.
npm run typecheck    # tsc --noEmit over api/*.ts
vercel dev           # full-stack local preview (needs Vercel CLI + login)
```

## Environment variables (set in Vercel Project Settings)

Copy `.env.example` to `.env` for local dev, or set these in the Vercel dashboard
for production. **Never commit a populated `.env`.**

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | **yes (for prod)** | Resend API key. Without it the endpoint runs in preview mode and signups are dropped. |
| `RESEND_AUDIENCE_ID` | one of these | If set, subscribers are added to this Resend audience (recommended). |
| `TEAM_NOTIFY_EMAIL` | (or the above) | If no audience is set, a notification email is sent here instead. |
| `RESEND_FROM_ADDRESS` | recommended | Verified sending address, e.g. `niagraha <notify@niagraha.id>`. |

In Resend you also need to **verify a sending domain** (e.g. `notify.niagraha.id`).

## Deploy

1. Push this branch and connect the repo to Vercel (or run `vercel`).
2. Set the environment variables above in Project Settings.
3. Verify a sending domain in Resend.
4. (Optional) Attach the custom domain `niagraha.id` in Project Settings → Domains.
5. Enable Vercel Analytics in the dashboard (the script is already in `<head>`).

`vercel.json` configures the `@vercel/node` runtime for `api/**/*.ts` and locks
`/api` CORS to `https://niagraha.id`. No code hardcodes `localhost` or a
specific origin.

## Before launch — owner checklist

These are the items the code can't resolve for you (tracked in
`niagraha-landing-issues.md`):

- [ ] **#8 — Contact info:** replace the `CONTACT` object at the top of
      `public/i18n.js` with the real email, Instagram handle, and country.
- [ ] **#15 — Indonesian copy:** the `id:` strings in `public/i18n.js` are a
      draft. Have a native Indonesian speaker review them before launch.
- [ ] **#7 — OG image:** `public/og-image.png` is generated from
      `scripts/og-image.html`. Swap for a real screenshot if you prefer.
      Regenerate with:
      ```bash
      chromium --headless --disable-gpu --no-sandbox --window-size=1200,630 \
        --screenshot=public/og-image.png "file://$PWD/scripts/og-image.html"
      ```

## Security notes

- All secrets are read from Vercel environment variables and never bundled into
  client JS.
- Production dependency tree audits clean (0 vulnerabilities). The remaining
  `npm audit` findings are transitive build-time deps of `@vercel/node` and do
  not ship to the serverless function.
- The subscribe endpoint has a honeypot field + in-memory rate limit
  (5 requests/IP/60s). The rate limit resets on cold start — acceptable for a
  coming-soon endpoint. If you see abuse, upgrade to Upstash Redis (drop-in
  replacement for the `RateLimiter` in `api/_rateLimit.ts`).
- Error responses never leak internals (generic `server_error`, `invalid_email`,
  etc.). Duplicate subscribers are reported as success so the endpoint can't be
  used to probe who's on the list.

## Reference

The original single-file version is preserved as `niagraha-coming-soon-base.html`
for visual reference. The live page (`public/index.html` + modules) reproduces
the exact palette, boot-sequence copy and pacing, and dock magnification/bounce
interaction; the only visible additions are the EN|ID toggle in the titlebar,
focus rings, and the `<noscript>` fallback.
