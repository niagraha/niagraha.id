/* ===================================================================
   Issue #1 — real email capture via POST /api/subscribe.
   Issue #10 — honeypot field + dedupe identical consecutive submits.
   Issue #11 — IME composition guard + maxlength (in HTML).
   Issue #9  — Vercel Analytics custom events.
   =================================================================== */

import { t, onLangChange } from './i18n.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Wrap window.va defensively — it's only present when Analytics is on. */
function track(name, props) {
  try {
    if (typeof window.va === 'function') window.va('track', name, props);
  } catch { /* analytics must never break the page */ }
}

export function initSubscribe({ input, hint, honeypot }) {
  if (!input || !hint) return;

  let inFlight = false;
  let lastSubmitted = '';

  input.addEventListener('keydown', (e) => {
    // Issue #11: ignore Enter while the user is composing via an IME
    // (Japanese/Chinese/Korean), and the legacy keyCode 229 some browsers
    // fire during composition.
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key !== 'Enter') return;
    e.preventDefault();
    void submit();
  });

  // Also submit on the form, if there ever is one wrapping us.
  const form = input.form;
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void submit();
    });
  }

  onLangChange(() => {
    // Don't clobber an active loading/error/success state.
    if (input.disabled) return;
    hint.className = 'line hint';
    hint.textContent = t('subscribe.hint');
    input.placeholder = t('subscribe.placeholder');
  });

  async function submit() {
    if (inFlight) return;
    const raw = input.value.trim();
    if (!EMAIL_RE.test(raw) || raw.length > 254) {
      setState('invalid', t('subscribe.invalid'));
      return;
    }
    // Dedupe identical consecutive attempts (double Enter, paste+Enter).
    if (raw.toLowerCase() === lastSubmitted && input.classList.contains('is-success')) {
      return;
    }

    inFlight = true;
    input.disabled = true;
    input.setAttribute('aria-busy', 'true');
    setState('loading', t('subscribe.loading'));
    track('subscribe_attempt');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: raw,
          company: honeypot?.value ?? '',
        }),
      });

      let data = {};
      try { data = await res.json(); } catch { /* tolerate empty body */ }

      if (res.ok && data.ok) {
        lastSubmitted = raw.toLowerCase();
        setState('success', t('subscribe.success', raw));
        track('subscribe_success');
        return;
      }

      if (res.status === 429) {
        const retryAfter = data.retryAfter ?? 60;
        setState('error', t('subscribe.rateLimited', retryAfter));
        track('subscribe_failure', { reason: 'rate_limited' });
        // Allow retry after the window.
        input.disabled = false;
        input.removeAttribute('aria-busy');
        inFlight = false;
        return;
      }

      if (res.status === 400) {
        setState('invalid', t('subscribe.invalid'));
        track('subscribe_failure', { reason: 'invalid_email' });
        input.disabled = false;
        input.removeAttribute('aria-busy');
        inFlight = false;
        return;
      }

      // 5xx and anything else.
      setState('error', t('subscribe.error'));
      track('subscribe_failure', { reason: 'server_error', status: res.status });
      input.disabled = false;
      input.removeAttribute('aria-busy');
      inFlight = false;
    } catch (err) {
      // Network failure / offline.
      setState('error', t('subscribe.error'));
      track('subscribe_failure', { reason: 'network' });
      input.disabled = false;
      input.removeAttribute('aria-busy');
      inFlight = false;
    }
  }

  function setState(state, message) {
    input.classList.remove('is-loading', 'is-success', 'is-error');
    hint.classList.remove('is-error', 'is-success');
    switch (state) {
      case 'loading':
        input.classList.add('is-loading');
        hint.textContent = message + ' ';
        // Spinner span (CSS disables its animation under reduced-motion).
        const spin = document.createElement('span');
        spin.className = 'spinner';
        spin.setAttribute('aria-hidden', 'true');
        spin.textContent = '⠋';
        hint.appendChild(spin);
        break;
      case 'success':
        input.classList.add('is-success');
        hint.classList.add('is-success');
        hint.textContent = message;
        break;
      case 'invalid':
        hint.classList.add('is-error');
        hint.textContent = message;
        break;
      case 'error':
      default:
        input.classList.add('is-error');
        hint.classList.add('is-error');
        hint.textContent = message;
        break;
    }
  }
}
