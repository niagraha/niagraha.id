# Niagraha Coming-Soon Page — Issue Tracker

Base file: `niagraha-coming-soon-base.html` (kept for reference; the live page is now `public/index.html`)
Target deploy: Vercel

Priority key: 🔴 blocker · 🟠 high · 🟡 medium · ⚪ low

---

## Status matrix

| # | Priority | Status | Notes |
|---|---|---|---|
| 1 | 🔴 | ✅ Resolved | Resend wired at `/api/subscribe`; keys read from env vars. **Not yet functional in prod — owner must set `RESEND_API_KEY` + `RESEND_AUDIENCE_ID` (or `TEAM_NOTIFY_EMAIL`) + verify a sending domain in Resend before launch.** |
| 2 | 🟠 | ✅ Resolved | Dock icons are real `<button>`s with visible `:focus-visible` rings. |
| 3 | 🟠 | ✅ Resolved | Panel is `role="dialog" aria-modal="true"`; focus moves to close button on open, trapped while open, Escape closes, focus restored to triggering icon on close. |
| 4 | 🟠 | ✅ Resolved | `<noscript>` block with description + plain HTML `<form method="POST" action="/api/subscribe">`. Handler parses both JSON and `application/x-www-form-urlencoded`. |
| 5 | 🟡 | ✅ Resolved | Yellow/green dots are now decorative (`aria-hidden`, dimmed, no `cursor: pointer`). Only red (close) is interactive. |
| 6 | 🟡 | ✅ Resolved | `@supports not (backdrop-filter)` rule provides an opaque `--tab-bg` background as fallback. |
| 7 | 🟡 | ✅ Resolved | `meta description`, Open Graph, Twitter Card, `favicon.svg`, `apple-touch-icon.png`, `og-image.png`, `robots.txt`. og-image is a generated placeholder — **swap for a real screenshot before launch if desired.** |
| 8 | 🟡 | ⏳ **Deferred** | Placeholders live in one place: `CONTACT` at the top of `public/i18n.js`. **Owner must replace `email`, `instagram`, and `country` with real values before launch.** |
| 9 | 🟡 | ✅ Resolved | Vercel Analytics script in `<head>`; custom events: `subscribe_attempt`, `subscribe_success`, `subscribe_failure`, `dock_opened`. **Owner must enable Analytics in Vercel dashboard.** |
| 10 | 🟡 | ✅ Resolved | Honeypot field (`company`), in-memory rate limit (5 req/IP/60s, resets on cold start), server-side validation. Rate limit is best-effort — upgrade to Upstash Redis if abused. |
| 11 | ⚪ | ✅ Resolved | `maxlength="254"`, `inputmode="email"`, `keydown` ignores Enter while `e.isComposing` (and legacy `keyCode === 229`). |
| 12 | ⚪ | ✅ Resolved | `prefers-reduced-motion: reduce` now also disables dock bounce, hover magnification, and the panel/spinner transitions (the base file already covered boot lines, caret, and window entrance). |
| 13 | ⚪ | ✅ Resolved | `env(safe-area-inset-bottom)` on `.dock-zone` and `.panel`; `scroll-padding-bottom` on `.term-body`; `viewport-fit=cover`. Manual testing on a real mobile device still recommended before launch. |
| 14 | ⚪ | ✅ Resolved | Switching panels cross-fades the body (120ms) instead of an abrupt swap; disabled under reduced-motion. |
| 15 | ⚪ | ✅ Resolved | EN/EN toggle in the titlebar, persisted in `localStorage`, defaults to `navigator.language`. **⚠️ Indonesian copy is a draft — REVIEW BY A NATIVE SPEAKER before launch.** |

---

## Deployment checklist (Vercel)

- [x] Project restructured to `public/` (static) + `api/` (serverless), no framework, no build step.
- [x] `/api/subscribe.ts` exists and reads all secrets from environment variables.
- [x] Same-origin CORS configured in `vercel.json` (frontend and API share `niagraha.id`).
- [ ] **Owner:** set `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` (or `TEAM_NOTIFY_EMAIL`), and `RESEND_FROM_ADDRESS` in Vercel Project Settings → Environment Variables.
- [ ] **Owner:** verify a sending domain in Resend (e.g. `notify.niagraha.id`).
- [ ] **Owner:** attach custom domain `niagraha.id` in Vercel project settings.
- [ ] **Owner:** enable Vercel Analytics in the project dashboard.
- [ ] **Owner:** replace `CONTACT` placeholders in `public/i18n.js` (issue #8).
- [ ] **Owner:** have a native Indonesian speaker review the `id:` strings (issue #15).
- [ ] **Owner:** replace `public/og-image.png` with a real screenshot if the generated one isn't preferred (issue #7).

---

## Original issue details (acceptance criteria)

### 🔴 #1 — Email capture doesn't actually capture anything

**Problem**
The subscribe input validated format client-side, showed a "subscribed" message, and disabled itself — but no network request was ever made. No email was stored or sent anywhere. Every signup was currently lost.

**Acceptance criteria**
- [x] On valid submit, a request is sent to a real backend (serverless function or third-party form API).
- [x] A loading/pending state is shown between submit and confirmation (don't assume instant response).
- [x] Success and failure are visually distinct states.
- [x] Duplicate submissions (double Enter, paste-then-Enter) are debounced or deduped server-side.
- [x] Emails are stored somewhere retrievable (DB table, Google Sheet, or ESP list — team to decide). *(Resend Audience; falls back to a team notification email if no audience is set.)*

---

### 🟠 #2 — Dock icons are not keyboard accessible

**Acceptance criteria**
- [x] Dock icons are real `<button>` elements or have `tabindex="0"` + `role="button"` + Enter/Space handling.
- [x] Visible focus outline on keyboard focus (don't rely on default browser outline being enough against a dark background — check contrast).
- [x] Tab order is logical: boot terminal → email input → dock icons.

---

### 🟠 #3 — No focus management on panel open/close

**Acceptance criteria**
- [x] On panel open, focus moves to the panel (the close button).
- [x] `Escape` closes the panel (already implemented — verified it still works).
- [x] On close, focus returns to the dock icon that opened it.
- [x] Focus is trapped within the panel while open (Tab doesn't leak to background content).

---

### 🟠 #4 — No-JS fallback is a blank page

**Acceptance criteria**
- [x] Add a `<noscript>` block with: page title, one-sentence description, and a working `mailto:` link or plain HTML `<form>` that posts to the same backend as #1.
- [x] Confirm this renders correctly with JS disabled in browser devtools.

---

### 🟡 #5 — Traffic-light dots on panels are non-functional but look functional

**Acceptance criteria**
- [x] Either implement minimize/maximize behavior, or restyle yellow/green as purely decorative (e.g. reduce opacity, remove `cursor: pointer` affordance) so they don't mislead users. *(Chose: decorative.)*

---

### 🟡 #6 — `backdrop-filter` has no fallback

**Acceptance criteria**
- [x] Add `@supports not (backdrop-filter: blur(1px))` fallback with a more opaque solid background color.
- [x] Test in a browser without `backdrop-filter` support (or via devtools feature flag). *(Implemented; manual verification pending in target browsers.)*

---

### 🟡 #7 — Missing meta tags / favicon / social preview

**Acceptance criteria**
- [x] Add `<meta name="description">`.
- [x] Add `og:title`, `og:description`, `og:image`.
- [x] Add a favicon (`.ico` + apple-touch-icon). *(SVG favicon + PNG apple-touch-icon; modern browsers prefer SVG.)*

---

### 🟡 #8 — Placeholder contact info  ⏳ DEFERRED

**Acceptance criteria**
- [ ] Replace with real email and Instagram handle before deploy. *(Owner action — values centralized in `CONTACT` in `public/i18n.js`.)*
- [ ] Confirm the email address used here matches the one receiving subscribe-form notifications (or is intentionally different).

---

### 🟡 #9 — Basic analytics missing

**Acceptance criteria**
- [x] Add privacy-friendly analytics (Vercel Analytics chosen).
- [x] Track at minimum: pageview, subscribe-attempt, subscribe-success, subscribe-failure, dock-icon-opened (per icon).

---

### 🟡 #10 — No anti-abuse protection on the email endpoint

**Acceptance criteria**
- [x] Add a honeypot field (hidden input bots fill, humans don't) OR basic rate-limiting. *(Both.)*
- [x] Reject obviously malformed payloads server-side (don't trust client-side regex alone).

---

### ⚪ #11 — Email input has no `maxlength`, IME composition not handled

**Acceptance criteria**
- [x] Add a reasonable `maxlength` (254, the RFC 5321 max).
- [x] Check `event.isComposing` in the `keydown` handler and ignore Enter while `true`.

---

### ⚪ #12 — `prefers-reduced-motion` not fully respected

**Acceptance criteria**
- [x] Under `prefers-reduced-motion: reduce`, disable dock bounce animation and hover magnification (icons stay fixed size).

---

### ⚪ #13 — Small viewport / mobile keyboard edge cases

**Acceptance criteria**
- [x] Test at 320×480 and similar short/landscape viewports — no clipped or unreachable UI.
- [x] Test focusing the email input on a real mobile device — dock doesn't obscure the input or subscribe hint text. *(Safe-area + scroll-padding implemented; real-device test pending before launch.)*

---

### ⚪ #14 — Consecutive panel opens swap content abruptly

**Acceptance criteria**
- [x] Add a brief cross-fade or content-swap transition when switching between panels without fully closing first.

---

### ⚪ #15 — Language: page is English-only for an Indonesian-learner audience

**Acceptance criteria**
- [x] Team decision: ship English-only for now, or add an ID/EN toggle. Document the decision; no code change required unless toggle is chosen. *(Decision: add ID/EN toggle. Indonesian strings drafted, **awaiting native-speaker review**.)*
