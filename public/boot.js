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
    () => addLine(t('boot.line.bar1'), 260),
    () => addLine(t('boot.line.bar2'), 260),
    () => addLine(t('boot.line.bar3'), 340),
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

function step() {
  if (i < script.length) {
    script[i]();
    i++;
    const tm = setTimeout(() => { scrollDown(); step(); }, 90);
    stepTimers.push(tm);
  } else {
    scrollDown();
    revealDock();
    bootedOnce = true;
  }
}

function runBoot() {
  // Clear any pending timers from a previous run (e.g. language switch).
  stepTimers.forEach((id) => clearTimeout(id));
  stepTimers = [];
  body.innerHTML = '';
  script = buildScript();
  step();
}

// Initial render.
runBoot();
initDock();

// Click anywhere in the terminal → focus the email input. Feels like a real
// terminal: you don't have to aim for the input field. No-op if the input
// hasn't appeared yet (still booting) or is mid-submit (disabled).
body.addEventListener('click', (e) => {
  // Don't steal focus if the user clicked a link or the input itself.
  if (e.target.closest('a')) return;
  const input = document.getElementById('emailInput');
  if (input && !input.disabled) input.focus();
});

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
