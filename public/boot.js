/* ===================================================================
   Boot sequence — terminal lines typed out, ending in the subscribe row.
   Reads all copy from i18n.js (issue #15). Re-runnable on language change.

   Timing model mirrors niagraha-coming-soon-base.html exactly:
   - Each line is appended to the DOM with an `animationDelay` equal to a
     running cumulative `delay` counter.
   - The CSS `.line { animation: fadeIn 0.15s forwards }` fades each in.
   - `step()` schedules each scripted line ~90ms apart; the `wait` argument
     to addLine() advances the shared delay counter (the original behavior).
   Under prefers-reduced-motion the CSS sets opacity:1 and drops the animation.
   =================================================================== */

import { t, onLangChange } from './i18n.js';
import { initSubscribe } from './subscribe.js';
import { initDock, revealDock } from './dock.js';

const body = document.getElementById('termBody');
let stepTimers = [];
let bootedOnce = false;

// Respect reduced-motion: the progress bar snaps to its final frame instead
// of animating. (Other boot animations are handled by CSS media queries.)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function addLine(html, wait) {
  const div = document.createElement('div');
  div.className = 'line';
  div.innerHTML = html;
  div.style.animationDelay = delay + 'ms';
  body.appendChild(div);
  delay += wait ?? 220;
  return div;
}

function scrollDown() { body.scrollTop = body.scrollHeight; }

let delay = 0;
let i = 0;
// Incremented on each runBoot() so a stale async step() loop from a previous
// run can detect that it's been superseded and bail out instead of racing.
let runId = 0;

function buildScript() {
  delay = 0;
  i = 0;
  return [
    () => addLine(promptLine(t('boot.cmd.status')), 500),
    () => addLine(t('boot.line.status_ok'), 260),
    () => addLine(t('boot.line.loaded'), 180),
    () => addLine(t('boot.line.active'), 380),
    () => addLine(emptyPrompt(), 200),
    () => addLine(promptLine(t('boot.cmd.readme')), 450),
    () => addLine(t('boot.line.readme1'), 160),
    () => addLine(t('boot.line.readme2'), 160),
    () => addLine(t('boot.line.readme3'), 220),
    () => addLine(emptyPrompt(), 200),
    () => addLine(promptLine(t('boot.cmd.deploy')), 450),
    () => addProgressBar(),
    () => addLine('', 220),
    () => {
      const d = addLine(t('boot.line.headline'), 0);
      d.style.fontSize = '17px';
      return d;
    },
    () => addLine(t('boot.line.subhead'), 400),
    () => addLine('', 150),
    () => buildSubscribeLine(),
  ];
}

let script = [];

function promptLine(cmd) {
  return `<span class="prompt-user">niagraha</span><span class="prompt-at">@</span><span class="prompt-host">boot</span><span class="prompt-sym">:</span><span class="prompt-path">~</span><span class="prompt-sym">$</span> <span class="cmd">${cmd}</span>`;
}

/** Empty prompt line — just 'niagraha@boot:~$' with no command. Used as a
 *  visual separator between command blocks, mimicking pressing Enter. */
function emptyPrompt() {
  return `<span class="prompt-user">niagraha</span><span class="prompt-at">@</span><span class="prompt-host">boot</span><span class="prompt-sym">:</span><span class="prompt-path">~</span><span class="prompt-sym">$</span>`;
}

/**
 * Renders a single progress bar and animates it from 0 → 100%, swapping the
 * label as it crosses phase thresholds. Mirrors a real terminal deploy bar.
 *
 * Under prefers-reduced-motion it snaps directly to the final frame.
 * The returned Promise resolves when the animation finishes so the boot
 * sequence can continue at the right pace.
 */
const BAR_WIDTH = 24;             // total chars between [ and ]
const BAR_DUR_MS = 1800;          // full 0→100% duration
const BAR_FRAME_MS = 45;          // animation frame interval

function addProgressBar() {
  const div = document.createElement('div');
  div.className = 'line';
  div.style.animationDelay = delay + 'ms';
  div.innerHTML = barFrame(0, t('boot.bar.phase1'));
  body.appendChild(div);

  return new Promise((resolve) => {
    if (reduceMotion) {
      // Skip the animation entirely — show final state, then resolve.
      div.innerHTML = barFrame(1, t('boot.bar.done'));
      const tm = setTimeout(resolve, 220);
      stepTimers.push(tm);
      return;
    }

    // setTimeout-based loop (not requestAnimationFrame) so the bar advances
    // reliably in background tabs AND under headless virtual-time testing.
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(1, elapsed / BAR_DUR_MS);
      div.innerHTML = barFrame(pct, labelFor(pct));
      scrollDown();
      if (pct < 1) {
        const tm = setTimeout(tick, BAR_FRAME_MS);
        stepTimers.push(tm);
      } else {
        // Hold the final frame briefly before continuing.
        const tm = setTimeout(resolve, 220);
        stepTimers.push(tm);
      }
    };
    const tm = setTimeout(tick, BAR_FRAME_MS);
    stepTimers.push(tm);
  });
}

/** Pick the right label for the current fill level. */
function labelFor(pct) {
  if (pct < 0.42) return t('boot.bar.phase1');      // building assets
  if (pct < 0.92) return t('boot.bar.phase2');      // provisioning courses
  return t('boot.bar.done');                        // done
}

/** Build the bar HTML for a given fill ratio. */
function barFrame(pct, label) {
  const filled = Math.round(pct * BAR_WIDTH);
  const fillChars = '#'.repeat(filled);
  const dotChars = '.'.repeat(BAR_WIDTH - filled);
  const labelHtml = pct >= 1
    ? `<span class="green">${label}</span>`
    : `<span class="comment">${label}</span>`;
  return `<span class="bar-wrap">[<span class="bar-fill">${fillChars}</span>${dotChars}]</span> ${labelHtml}`;
}

function buildSubscribeLine() {
  const wrap = document.createElement('div');
  wrap.className = 'line subscribe-row';
  wrap.style.animationDelay = delay + 'ms';
  wrap.innerHTML = `
    ${t('subscribe.prompt')}
    <span class="cmd">${t('subscribe.cmd')}</span>
    <input
      class="fake-input"
      id="emailInput"
      name="email"
      type="email"
      maxlength="254"
      inputmode="email"
      autocomplete="email"
      spellcheck="false"
      aria-label="email"
      aria-describedby="subscribeHint"
      placeholder="${t('subscribe.placeholder')}"
    />
    <!-- honeypot (issue #10): real users never fill this. -->
    <input class="visually-hidden" name="company" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
  `;
  body.appendChild(wrap);
  delay += 200;

  const hint = document.createElement('div');
  hint.className = 'line hint';
  hint.id = 'subscribeHint';
  hint.style.animationDelay = delay + 'ms';
  hint.textContent = t('subscribe.hint');
  body.appendChild(hint);

  // Focus the input shortly after it appears (mirrors the original timing).
  const focusTimer = setTimeout(() => {
    const input = wrap.querySelector('#emailInput');
    initSubscribe({
      input,
      hint,
      honeypot: wrap.querySelector('input[name="company"]'),
    });
    // Auto-focus so the user can start typing immediately, like a real
    // terminal — no click needed. (Restored from the base file.)
    input?.focus();
  }, delay + 100);
  stepTimers.push(focusTimer);
}

async function step(myRunId) {
  while (i < script.length) {
    // If a newer run started (e.g. language switch), bail — don't keep racing.
    if (myRunId !== runId) return;
    // Each script entry may return synchronously (a plain line) or a Promise
    // (the progress bar). Await both shapes so async entries block the next
    // line until they finish.
    await script[i]();
    if (myRunId !== runId) return;
    i++;
    scrollDown();
    // Small visual gap between lines, mirroring the base file's pacing.
    await new Promise((r) => {
      const tm = setTimeout(r, 90);
      stepTimers.push(tm);
    });
  }
  if (myRunId !== runId) return;
  scrollDown();
  revealDock();
  bootedOnce = true;
}

function runBoot() {
  // Clear any pending timers from a previous run (e.g. language switch).
  stepTimers.forEach((id) => clearTimeout(id));
  stepTimers = [];
  runId++;              // supersede any in-flight async step() loop
  body.innerHTML = '';
  script = buildScript();
  step(runId);
}

// Initial render.
runBoot();
initDock();

// Language toggle (issue #15): if the user hasn't subscribed yet, replay the
// boot sequence in the new language. If they have, leave their state intact
// and just append a locale-change note.
onLangChange((lang) => {
  const input = document.getElementById('emailInput');
  const subscribed = input?.classList.contains('is-success');
  if (!subscribed) {
    runBoot();
    return;
  }
  // Already subscribed — don't blow away their confirmation. Just note the switch.
  const note = document.createElement('div');
  note.className = 'line comment';
  note.textContent = `# locale → ${lang === 'id' ? 'id_ID' : 'en_US'}`;
  body.appendChild(note);
  scrollDown();
});
