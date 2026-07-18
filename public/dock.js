/* ===================================================================
   macOS-style dock + panels.
   Issue #2  — icons are real <button>s with focus-visible rings.
   Issue #3  — focus move / trap / restore on panel open & close.
   Issue #9  — dock_opened analytics event per icon.
   Issue #12 — bounce & magnification disabled under prefers-reduced-motion.
   Issue #14 — cross-fade when switching panels without closing first.
   =================================================================== */

import { t, onLangChange } from './i18n.js';

/** Wrap window.va defensively. */
function track(name, props) {
  try {
    if (typeof window.va === 'function') window.va('track', name, props);
  } catch { /* noop */ }
}

const ICONS = [
  {
    id: 'about',
    color: '#8caaee',
    labelKey: 'dock.about.label',
    titleKey: 'panel.about.title',
    bodyKey: 'panel.about.body',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#232634" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v5h1"/></svg>`,
  },
  {
    id: 'courses',
    color: '#a6d189',
    labelKey: 'dock.courses.label',
    titleKey: 'panel.courses.title',
    bodyKey: 'panel.courses.body',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#232634" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>`,
  },
  {
    id: 'contact',
    color: '#f4b8e4',
    labelKey: 'dock.contact.label',
    titleKey: 'panel.contact.title',
    bodyKey: 'panel.contact.body',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#232634" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>`,
  },
  {
    id: 'system',
    color: '#ef9f76',
    labelKey: 'dock.system.label',
    titleKey: 'panel.system.title',
    bodyKey: 'panel.system.body',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="#232634" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/></svg>`,
  },
];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let dock, dockZone, panel, panelBackdrop, panelTitle, panelBody, panelClose;
let openId = null;
let lastFocused = null;
let dockInited = false;

export function initDock() {
  if (dockInited) return; // idempotent — boot.js may call after re-render
  dockInited = true;

  dock = document.getElementById('dock');
  dockZone = document.getElementById('dockZone');
  panel = document.getElementById('panel');
  panelBackdrop = document.getElementById('panelBackdrop');
  panelTitle = document.getElementById('panelTitle');
  panelBody = document.getElementById('panelBody');
  panelClose = document.getElementById('panelClose');

  // Build dock icon buttons.
  for (const item of ICONS) {
    const wrap = document.createElement('div');
    wrap.className = 'dock-icon-wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dock-icon';
    btn.dataset.id = item.id;
    btn.style.background = item.color;
    btn.setAttribute('aria-label', t(item.labelKey));
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'panel');
    btn.innerHTML = `
      <span class="dock-tooltip">${t(item.labelKey)}</span>
      ${item.svg}
    `;
    btn.addEventListener('click', () => togglePanel(item));

    wrap.appendChild(btn);

    const dot = document.createElement('div');
    dot.className = 'dock-dot';
    dot.id = 'dot-' + item.id;
    wrap.appendChild(dot);

    dock.appendChild(wrap);
  }

  panelClose.setAttribute('aria-label', t('panel.close.aria'));
  panelClose.addEventListener('click', closePanel);
  panelBackdrop.addEventListener('click', closePanel);
  document.addEventListener('keydown', onKeydown);

  if (!reduceMotion) {
    installMagnification();
  }

  // Re-label everything when the language changes.
  onLangChange(() => {
    for (const item of ICONS) {
      const btn = dock.querySelector(`.dock-icon[data-id="${item.id}"]`);
      if (!btn) continue;
      const label = t(item.labelKey);
      btn.setAttribute('aria-label', label);
      const tip = btn.querySelector('.dock-tooltip');
      if (tip) tip.textContent = label;
    }
    panelClose.setAttribute('aria-label', t('panel.close.aria'));
    // If a panel is open, re-render its title/body in the new language.
    if (openId) {
      const item = ICONS.find((i) => i.id === openId);
      if (item) {
        panelTitle.textContent = t(item.titleKey);
        panelBody.innerHTML = t(item.bodyKey);
      }
    }
  });
}

export function revealDock() {
  if (dockZone) dockZone.classList.add('visible');
}

function togglePanel(item) {
  const iconEl = dock.querySelector(`.dock-icon[data-id="${item.id}"]`);
  if (!iconEl) return;

  // Bounce — skipped under reduced-motion (#12).
  if (!reduceMotion) {
    iconEl.classList.remove('bounce');
    void iconEl.offsetWidth; // restart animation
    iconEl.classList.add('bounce');
  }

  if (openId === item.id) {
    closePanel();
    return;
  }

  if (openId && openId !== item.id) {
    // Issue #14: switching panels — cross-fade the body.
    switchPanel(item, iconEl);
    return;
  }

  openPanel(item, iconEl);
}

function openPanel(item, iconEl) {
  openId = item.id;
  setDockDots(item.id);
  iconEl.setAttribute('aria-expanded', 'true');

  panelTitle.textContent = t(item.titleKey);
  panelBody.innerHTML = t(item.bodyKey);
  panel.classList.add('visible');
  panelBackdrop.classList.add('visible');

  lastFocused = document.activeElement;
  track('dock_opened', { id: item.id });

  // Move focus into the dialog (issue #3). The close button is the first
  // focusable element, so it's a natural entry point.
  window.requestAnimationFrame(() => {
    panelClose.focus();
  });
}

function switchPanel(item, iconEl) {
  const prevIconId = openId;
  const prevIcon = prevIconId ? dock.querySelector(`.dock-icon[data-id="${prevIconId}"]`) : null;
  if (prevIcon) prevIcon.setAttribute('aria-expanded', 'false');

  openId = item.id;
  setDockDots(item.id);
  iconEl.setAttribute('aria-expanded', 'true');

  const applyNew = () => {
    panelTitle.textContent = t(item.titleKey);
    panelBody.innerHTML = t(item.bodyKey);
    panelBody.classList.remove('swapping');
    // Keep focus inside the panel — return to the close button.
    panelClose.focus();
  };

  if (reduceMotion) {
    applyNew();
  } else {
    panelBody.classList.add('swapping');
    setTimeout(applyNew, 120);
  }

  track('dock_opened', { id: item.id });
}

function closePanel() {
  if (!openId) return;
  const iconEl = dock.querySelector(`.dock-icon[data-id="${openId}"]`);
  if (iconEl) iconEl.setAttribute('aria-expanded', 'false');

  openId = null;
  panel.classList.remove('visible');
  panelBackdrop.classList.remove('visible');
  document.querySelectorAll('.dock-dot').forEach((d) => d.classList.remove('on'));

  // Restore focus to the triggering icon (issue #3).
  if (lastFocused && typeof lastFocused.focus === 'function') {
    lastFocused.focus();
    lastFocused = null;
  }
}

function setDockDots(id) {
  document.querySelectorAll('.dock-dot').forEach((d) => d.classList.remove('on'));
  const dot = document.getElementById('dot-' + id);
  if (dot) dot.classList.add('on');
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    if (openId) {
      e.preventDefault();
      closePanel();
    }
    return;
  }

  // Focus trap (issue #3): clamp Tab/Shift-Tab to the panel.
  if (e.key !== 'Tab' || !openId) return;
  if (!panel || !panel.classList.contains('visible')) return;

  const focusables = getFocusable(panel);
  if (focusables.length === 0) {
    e.preventDefault();
    panelClose.focus();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (e.shiftKey) {
    if (active === first || !panel.contains(active)) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (active === last || !panel.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }
}

function getFocusable(root) {
  const sel = 'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll(sel)).filter((el) => el.offsetParent !== null);
}

/* macOS-style magnification on hover — skipped on touch and under reduced-motion. */
function installMagnification() {
  const isTouch = window.matchMedia('(hover: none)').matches;
  if (isTouch) return;

  dock.addEventListener('mousemove', (e) => {
    const icons = dock.querySelectorAll('.dock-icon');
    icons.forEach((icon) => {
      const rect = icon.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(e.clientX - center);
      const maxDist = 110;
      const maxScale = 1.55;
      let scale = 1;
      if (dist < maxDist) {
        scale = 1 + (maxScale - 1) * (1 - dist / maxDist);
      }
      icon.style.transform = `scale(${scale}) translateY(${(scale - 1) * -14}px)`;
    });
  });

  dock.addEventListener('mouseleave', () => {
    dock.querySelectorAll('.dock-icon').forEach((icon) => {
      icon.style.transform = 'scale(1) translateY(0)';
    });
  });
}
