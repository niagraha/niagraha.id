/* ===================================================================
   Issue #15 — ID/EN language toggle.
   Exports: getLang(), setLang(), t(key), onLangChange(cb).
   ⚠️ Indonesian strings are a draft — REVIEW BY A NATIVE SPEAKER before launch.
   =================================================================== */

/**
 * Contact placeholders (issue #8). Replace these two values with the real
 * handles before deploy. Kept here so there's exactly one place to edit.
 */
export const CONTACT = {
  email: 'hello@niagraha.id',
  instagram: '@niagraha.id',
  country: 'Indonesia',
};

/** Logical key → string, per language. */
const STRINGS = {
  en: {
    'lang.label': 'Language',

    // boot sequence
    'boot.cmd.status': 'systemctl status niagraha-website.service',
    'boot.line.status_ok': '<span class="green">●</span> niagraha-website.service - Robotics Education Platform',
    'boot.line.loaded': '     <span class="out">Loaded: loaded (/etc/niagraha/site.conf)</span>',
    'boot.line.active': '     <span class="out">Active: </span><span class="accent">activating (start)</span> <span class="comment">since now</span>',
    'boot.cmd.readme': 'cat README.md',
    'boot.line.readme1': '<span class="out">Acrylic robot kits, ROS &amp; ROS2 courses, and hands-on</span>',
    'boot.line.readme2': '<span class="out">robotics education — built in Indonesia, for Indonesian</span>',
    'boot.line.readme3': '<span class="out">learners, from school age through professional level.</span>',
    'boot.cmd.deploy': './deploy.sh --site niagraha.id',
    'boot.line.bar1': '<span class="bar-wrap">[<span class="bar-fill">##########</span>..........]</span> <span class="comment">building assets</span>',
    'boot.line.bar2': '<span class="bar-wrap">[<span class="bar-fill">####################</span>..]</span> <span class="comment">provisioning courses</span>',
    'boot.line.bar3': '<span class="bar-wrap">[<span class="bar-fill">########################</span>]</span> <span class="green">done</span>',
    'boot.line.headline': '<span class="bold accent">Something\'s coming up.</span>',
    'boot.line.subhead': '<span class="comment"># the site\'s still booting. leave your email and we\'ll ping you when it\'s live.</span>',

    // subscribe
    'subscribe.prompt': '<span class="prompt-user">you</span><span class="prompt-at">@</span><span class="prompt-host">niagraha</span><span class="prompt-sym">:</span><span class="prompt-path">~</span><span class="prompt-sym">$</span>',
    'subscribe.cmd': 'notify&nbsp;--email',
    'subscribe.placeholder': 'you@example.com',
    'subscribe.hint': 'press enter to subscribe',
    'subscribe.invalid': 'that doesn\'t look like a valid email — try again',
    'subscribe.loading': 'subscribing…',
    'subscribe.success': (email) => `subscribed. we'll email ${email} when niagraha.id is live.`,
    'subscribe.error': 'something went wrong on our end. try again in a moment.',
    'subscribe.rateLimited': (sec) => `too many attempts — please wait ~${sec}s and try again.`,

    // dock labels + tooltips
    'dock.about.label': 'About',
    'dock.courses.label': 'Courses & Kits',
    'dock.contact.label': 'Contact / Socials',
    'dock.system.label': 'System Info',

    // panels
    'panel.about.title': 'About Niagraha',
    'panel.about.body': `
      <p><strong>Niagraha</strong> is a robotics education venture based in Indonesia — acrylic robot frames and hands-on courses for learners from school age through professional level.</p>
      <p>The idea is simple: robotics education shouldn't only exist behind expensive imported kits or English-only material. We're building the Indonesian-language, Indonesia-priced version.</p>
      <p class="comment"># run by an engineer who spends the rest of the week integrating autonomous robot fleets — this is the after-hours project.</p>
    `,
    'panel.courses.title': 'ls -la ./courses',
    'panel.courses.body': `
      <div class="ls-row"><span class="ls-perm">d</span><span class="ls-name">starter-kit/</span><span class="ls-desc">Acrylic robot frame — build your first robot</span></div>
      <div class="ls-row"><span class="ls-perm">d</span><span class="ls-name">ros-fundamentals/</span><span class="ls-desc">ROS / ROS2 basics for beginners</span></div>
      <div class="ls-row"><span class="ls-perm">d</span><span class="ls-name">navigation-lab/</span><span class="ls-desc">Autonomous navigation &amp; mapping</span></div>
      <div class="ls-row"><span class="ls-perm">d</span><span class="ls-name">pro-track/</span><span class="ls-desc">Advanced robotics for working engineers</span></div>
      <p class="comment"># full syllabus and pricing land with the site launch.</p>
    `,
    'panel.contact.title': 'cat contact.txt',
    'panel.contact.body': `
      <p><span class="accent">email</span>&nbsp;&nbsp; <a href="mailto:${CONTACT.email}">${CONTACT.email}</a></p>
      <p><span class="accent">based&nbsp;in</span>&nbsp; ${CONTACT.country}</p>
      <p><span class="accent">instagram</span> ${CONTACT.instagram}</p>
      <p class="comment"># placeholders — swap in your real handles before this goes live.</p>
    `,
    'panel.system.title': 'neofetch',
    'panel.system.body': `
      <div class="neofetch">
        <pre>   /\\\\
  /  \\\\
 / __ \\\\
/_/  \\_\\\\
 |    |
 |____|</pre>
        <div class="specs">
          <div><span class="label">OS:</span> NiagrahaOS (pre-release)</div>
          <div><span class="label">Host:</span> niagraha.id</div>
          <div><span class="label">Kernel:</span> robotics-edu 0.1.0</div>
          <div><span class="label">Uptime:</span> preparing since 2026</div>
          <div><span class="label">Packages:</span> 4 (courses)</div>
          <div><span class="label">Shell:</span> ROS / ROS2</div>
          <div><span class="label">Theme:</span> Catppuccin Frappé</div>
          <div><span class="label">Status:</span> <span class="green">booting…</span></div>
        </div>
      </div>
    `,

    // panel accessibility
    'panel.close.aria': 'Close panel',
  },

  id: {
    'lang.label': 'Bahasa',

    // boot sequence — Indonesian
    'boot.cmd.status': 'systemctl status niagraha-website.service',
    'boot.line.status_ok': '<span class="green">●</span> niagraha-website.service - Platform Edukasi Robotika',
    'boot.line.loaded': '     <span class="out">Loaded: loaded (/etc/niagraha/site.conf)</span>',
    'boot.line.active': '     <span class="out">Active: </span><span class="accent">activating (start)</span> <span class="comment">sejak sekarang</span>',
    'boot.cmd.readme': 'cat README.md',
    'boot.line.readme1': '<span class="out">Kit robot akrilik, kursus ROS &amp; ROS2, dan edukasi</span>',
    'boot.line.readme2': '<span class="out">robotika langsung — dibuat di Indonesia, untuk pembelajar</span>',
    'boot.line.readme3': '<span class="out">Indonesia, dari usia sekolah hingga tingkat profesional.</span>',
    'boot.cmd.deploy': './deploy.sh --site niagraha.id',
    'boot.line.bar1': '<span class="bar-wrap">[<span class="bar-fill">##########</span>..........]</span> <span class="comment">membangun aset</span>',
    'boot.line.bar2': '<span class="bar-wrap">[<span class="bar-fill">####################</span>..]</span> <span class="comment">menyiapkan kursus</span>',
    'boot.line.bar3': '<span class="bar-wrap">[<span class="bar-fill">########################</span>]</span> <span class="green">selesai</span>',
    'boot.line.headline': '<span class="bold accent">Sesuatu sedang datang.</span>',
    'boot.line.subhead': '<span class="comment"># situs masih booting. tinggalkan email Anda dan kami kabari saat sudah live.</span>',

    // subscribe
    'subscribe.prompt': '<span class="prompt-user">anda</span><span class="prompt-at">@</span><span class="prompt-host">niagraha</span><span class="prompt-sym">:</span><span class="prompt-path">~</span><span class="prompt-sym">$</span>',
    'subscribe.cmd': 'notify&nbsp;--email',
    'subscribe.placeholder': 'anda@contoh.com',
    'subscribe.hint': 'tekan enter untuk berlangganan',
    'subscribe.invalid': 'email itu tidak valid — coba lagi',
    'subscribe.loading': 'berlangganan…',
    'subscribe.success': (email) => `terlanjang. kami akan mengirim email ke ${email} saat niagraha.id live.`,
    'subscribe.error': 'ada masalah di sisi kami. coba lagi sebentar.',
    'subscribe.rateLimited': (sec) => `terlalu banyak percobaan — coba lagi dalam ~${sec} detik.`,

    // dock labels
    'dock.about.label': 'Tentang',
    'dock.courses.label': 'Kursus & Kit',
    'dock.contact.label': 'Kontak / Sosial',
    'dock.system.label': 'Info Sistem',

    // panels
    'panel.about.title': 'Tentang Niagraha',
    'panel.about.body': `
      <p><strong>Niagraha</strong> adalah usaha edukasi robotika yang berbasis di Indonesia — rangka robot akrilik dan kursus langsung untuk pembelajar dari usia sekolah hingga profesional.</p>
      <p>Idenya sederhana: edukasi robotika tidak harus hanya tersedia lewat kit impor yang mahal atau materi berbahasa Inggris. Kami membangun versi berbahasa Indonesia dengan harga Indonesia.</p>
      <p class="comment"># dijalankan oleh engineer yang sisa minggunya mengintegrasikan armada robot otonom — ini proyek di luar jam kerja.</p>
    `,
    'panel.courses.title': 'ls -la ./courses',
    'panel.courses.body': `
      <div class="ls-row"><span class="ls-perm">d</span><span class="ls-name">starter-kit/</span><span class="ls-desc">Rangka robot akrilik — rakit robot pertama Anda</span></div>
      <div class="ls-row"><span class="ls-perm">d</span><span class="ls-name">ros-fundamentals/</span><span class="ls-desc">Dasar ROS / ROS2 untuk pemula</span></div>
      <div class="ls-row"><span class="ls-perm">d</span><span class="ls-name">navigation-lab/</span><span class="ls-desc">Navigasi otonom &amp; pemetaan</span></div>
      <div class="ls-row"><span class="ls-perm">d</span><span class="ls-name">pro-track/</span><span class="ls-desc">Robotika lanjutan untuk engineer profesional</span></div>
      <p class="comment"># silabus lengkap dan harga hadir bersama peluncuran situs.</p>
    `,
    'panel.contact.title': 'cat contact.txt',
    'panel.contact.body': `
      <p><span class="accent">email</span>&nbsp;&nbsp; <a href="mailto:${CONTACT.email}">${CONTACT.email}</a></p>
      <p><span class="accent">berbasis&nbsp;di</span>&nbsp; ${CONTACT.country}</p>
      <p><span class="accent">instagram</span> ${CONTACT.instagram}</p>
      <p class="comment"># placeholder — ganti dengan handle asli sebelum situs live.</p>
    `,
    'panel.system.title': 'neofetch',
    'panel.system.body': `
      <div class="neofetch">
        <pre>   /\\\\
  /  \\\\
 / __ \\\\
/_/  \\_\\\\
 |    |
 |____|</pre>
        <div class="specs">
          <div><span class="label">OS:</span> NiagrahaOS (pra-rilis)</div>
          <div><span class="label">Host:</span> niagraha.id</div>
          <div><span class="label">Kernel:</span> robotics-edu 0.1.0</div>
          <div><span class="label">Uptime:</span> bersiap sejak 2026</div>
          <div><span class="label">Packages:</span> 4 (kursus)</div>
          <div><span class="label">Shell:</span> ROS / ROS2</div>
          <div><span class="label">Theme:</span> Catppuccin Frappé</div>
          <div><span class="label">Status:</span> <span class="green">booting…</span></div>
        </div>
      </div>
    `,

    'panel.close.aria': 'Tutup panel',
  },
};

const STORAGE_KEY = 'niagraha.lang';
const SUPPORTED = ['en', 'id'];

function detectDefault() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch { /* localStorage may be disabled */ }
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('id') ? 'id' : 'en';
}

let currentLang = detectDefault();
applyHtmlLang(currentLang);

function applyHtmlLang(lang) {
  document.documentElement.lang = lang;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!SUPPORTED.includes(lang)) return;
  if (lang === currentLang) return;
  currentLang = lang;
  applyHtmlLang(lang);
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/**
 * Translate. Values may be a string or a function (for parameterized strings).
 */
export function t(key, ...args) {
  const table = STRINGS[currentLang] ?? STRINGS.en;
  const fallback = STRINGS.en;
  const val = table[key] ?? fallback[key];
  if (typeof val === 'function') return val(...args);
  return val ?? key;
}

/** Register a callback for language changes. Returns an unsubscribe fn. */
export function onLangChange(cb) {
  const handler = (e) => cb(e.detail.lang);
  document.addEventListener('langchange', handler);
  return () => document.removeEventListener('langchange', handler);
}

/**
 * Wire up the EN|ID segmented control in the titlebar. Called automatically
 * on DOMContentLoaded; safe to call multiple times.
 */
export function initLangToggle() {
  const sync = () => {
    const en = document.getElementById('langEn');
    const id = document.getElementById('langId');
    if (!en || !id) return;
    en.setAttribute('aria-pressed', String(currentLang === 'en'));
    id.setAttribute('aria-pressed', String(currentLang === 'id'));
    if (!en.dataset.wired) {
      en.addEventListener('click', () => setLang('en'));
      en.dataset.wired = '1';
    }
    if (!id.dataset.wired) {
      id.addEventListener('click', () => setLang('id'));
      id.dataset.wired = '1';
    }
  };
  sync();
  onLangChange(sync);
  // Re-sync after DOM is ready (this module loads in <head> via type=module,
  // which is deferred, but be defensive in case of re-renders).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync);
  }
}

initLangToggle();
