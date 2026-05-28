// ============================================================
//  SI-DEVA — Dark / Light Theme CSS Patch v1.0.0
//  File: js/theme-dark-patch.js
//
//  CARA PAKAI:
//  Tambahkan 1 baris di index.html, SETELAH style.css dimuat
//  dan SEBELUM </body>:
//    <script src="js/theme-dark-patch.js"></script>
//
//  Penjelasan:
//  - style.css saat ini hanya berisi tema terang (light).
//  - dashboard.js sudah punya toggleTheme() yang toggle class
//    "light-mode" di <body>, tapi CSS-nya belum ada.
//  - File ini menyuntikkan CSS dark mode yang benar:
//      body (default/tanpa class) → gelap 🌙
//      body.light-mode            → terang ☀️
//  - Semua warna mengikuti CSS custom properties (--var) yang
//    sudah dipakai di seluruh app, jadi tidak perlu ubah HTML.
// ============================================================

(function () {
  'use strict';

  const STYLE_ID = 'sideva-theme-dark-patch';
  if (document.getElementById(STYLE_ID)) return; // sudah dipasang

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `

/* ══════════════════════════════════════════════════════════════
   DARK MODE — default (body tanpa class .light-mode)
   Semua var di-override di sini agar tampilan gelap
   ══════════════════════════════════════════════════════════════ */

body:not(.light-mode) {
  /* ── Background ── */
  --bg:       #0f172a;
  --bg2:      #1e293b;
  --bg3:      #263348;
  --surface:  #1e293b;
  --surface2: #263348;
  --surface3: #2d3f57;

  /* ── Text ── */
  --text:  #f1f5f9;
  --text2: #94a3b8;
  --text3: #64748b;

  /* ── Border ── */
  --border:  #334155;
  --border2: #475569;

  /* ── Primary (sedikit lebih terang di dark bg) ── */
  --primary:       #3b82f6;
  --primary-dark:  #2563eb;
  --primary-light: rgba(59,130,246,0.15);
  --primary-hover: #2563eb;

  /* ── Topbar ── */
  --topbar-bg:     #1e293b;
  --topbar-border: #334155;

  /* ── Status bar ── */
  --statusbar-bg:  #0f172a;

  /* ── Status colours (dark-friendly) ── */
  --red:           #f87171;
  --red-subtle:    rgba(248,113,113,0.12);
  --green:         #4ade80;
  --green-subtle:  rgba(74,222,128,0.12);
  --yellow:        #facc15;
  --yellow-subtle: rgba(250,204,21,0.12);
  --orange:        #fb923c;
  --orange-subtle: rgba(251,146,60,0.12);
  --purple:        #c084fc;
  --purple-subtle: rgba(192,132,252,0.12);
  --teal:          #22d3ee;
  --teal-subtle:   rgba(34,211,238,0.12);

  /* ── Stat card accent colours (dark bg version) ── */
  --accent-blue:      #3b82f6; --accent-blue-bg:   rgba(59,130,246,0.12);
  --accent-green:     #4ade80; --accent-green-bg:  rgba(74,222,128,0.12);
  --accent-purple:    #c084fc; --accent-purple-bg: rgba(192,132,252,0.12);
  --accent-orange:    #fb923c; --accent-orange-bg: rgba(251,146,60,0.12);
  --accent-teal:      #22d3ee; --accent-teal-bg:   rgba(34,211,238,0.12);
  --accent-pink:      #f472b6; --accent-pink-bg:   rgba(244,114,182,0.12);

  /* ── Shadows lebih dalam di dark ── */
  --shadow-flat: 0 0 0 1px var(--border);
  --shadow-sm:   0 1px 4px rgba(0,0,0,0.4);
  --shadow:      0 2px 8px rgba(0,0,0,0.5);
  --shadow-lg:   0 6px 20px rgba(0,0,0,0.55);
  --shadow-xl:   0 16px 40px rgba(0,0,0,0.6);

  color-scheme: dark;
}

/* ── Body background di dark mode ── */
body:not(.light-mode) {
  background: var(--bg);
  color: var(--text);
}

/* ── Topbar dark ── */
body:not(.light-mode) .topbar {
  background: var(--topbar-bg);
  border-bottom-color: var(--border);
}

/* ── Card dark ── */
body:not(.light-mode) .card {
  background: var(--surface);
  border-color: var(--border);
}

/* ── Tabel dark ── */
body:not(.light-mode) table thead th {
  background: var(--surface2);
  color: var(--text3);
  border-color: var(--border);
}
body:not(.light-mode) table tbody td {
  border-color: var(--border);
  color: var(--text);
}
body:not(.light-mode) tbody tr:hover {
  background: var(--surface2);
}
body:not(.light-mode) .table-wrap {
  border-color: var(--border);
}

/* ── Input & Select dark ── */
body:not(.light-mode) input,
body:not(.light-mode) textarea,
body:not(.light-mode) select,
body:not(.light-mode) .filter-select,
body:not(.light-mode) .form-control {
  background: var(--surface2) !important;
  color: var(--text) !important;
  border-color: var(--border) !important;
}
body:not(.light-mode) input::placeholder,
body:not(.light-mode) textarea::placeholder {
  color: var(--text3);
}
body:not(.light-mode) input:focus,
body:not(.light-mode) textarea:focus,
body:not(.light-mode) select:focus,
body:not(.light-mode) .filter-select:focus,
body:not(.light-mode) .form-control:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.2) !important;
  outline: none;
}

/* ── Tombol default dark ── */
body:not(.light-mode) .btn-secondary,
body:not(.light-mode) .btn-ghost {
  background: var(--surface2);
  color: var(--text);
  border-color: var(--border);
}
body:not(.light-mode) .btn-secondary:hover,
body:not(.light-mode) .btn-ghost:hover {
  background: var(--surface3);
  border-color: var(--border2);
}

/* ── Stat cards ── */
body:not(.light-mode) .stat-card {
  background: var(--surface);
  border-color: var(--border);
}
body:not(.light-mode) .stat-value { color: var(--text); }
body:not(.light-mode) .stat-label { color: var(--text3); }

/* ── Badge & Tag ── */
body:not(.light-mode) .badge-blue {
  background: var(--accent-blue-bg);
  color: var(--accent-blue);
}
body:not(.light-mode) .badge-green {
  background: var(--accent-green-bg);
  color: var(--accent-green);
}
body:not(.light-mode) .badge-red {
  background: var(--red-subtle);
  color: var(--red);
}
body:not(.light-mode) .badge-yellow {
  background: var(--yellow-subtle);
  color: var(--yellow);
}

/* ── Modal ── */
body:not(.light-mode) .modal-overlay,
body:not(.light-mode) [id*="modal"] {
  background: rgba(0,0,0,0.7);
}
body:not(.light-mode) .modal-box,
body:not(.light-mode) .modal-content,
body:not(.light-mode) [id*="modal"] .modal-box {
  background: var(--surface);
  border-color: var(--border);
  color: var(--text);
}

/* ── Dropdown / Popover ── */
body:not(.light-mode) .dropdown-menu,
body:not(.light-mode) .popover,
body:not(.light-mode) .notif-panel,
body:not(.light-mode) .gs-results {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow-xl);
}
body:not(.light-mode) .notif-item,
body:not(.light-mode) .gs-result-item {
  border-color: var(--border);
  color: var(--text);
}
body:not(.light-mode) .notif-item:hover,
body:not(.light-mode) .gs-result-item:hover,
body:not(.light-mode) .gs-result-item.selected {
  background: var(--surface2);
  color: var(--primary);
}
body:not(.light-mode) .notif-item.unread {
  background: var(--accent-blue-bg);
}

/* ── Pagination ── */
body:not(.light-mode) .pagination button {
  background: var(--surface);
  border-color: var(--border);
  color: var(--text);
}
body:not(.light-mode) .pagination button:hover {
  background: var(--accent-blue-bg);
  border-color: var(--primary);
  color: var(--primary);
}
body:not(.light-mode) .pagination button.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

/* ── Quick menu cards (dashboard) ── */
body:not(.light-mode) .quick-menu-card {
  background: var(--surface);
  border-color: var(--border);
}
body:not(.light-mode) .quick-menu-card:hover {
  background: var(--surface2);
  border-color: var(--primary);
}

/* ── Empty state ── */
body:not(.light-mode) .empty-state {
  color: var(--text3);
}

/* ── Scrollbar custom dark ── */
body:not(.light-mode) ::-webkit-scrollbar-track {
  background: var(--bg2);
}
body:not(.light-mode) ::-webkit-scrollbar-thumb {
  background: var(--border2);
  border-color: var(--bg2);
}
body:not(.light-mode) ::-webkit-scrollbar-thumb:hover {
  background: var(--text3);
}

/* ── Toast ── */
body:not(.light-mode) .toast,
body:not(.light-mode) [class*="toast"] {
  background: var(--surface);
  border-color: var(--border);
  color: var(--text);
  box-shadow: var(--shadow-xl);
}

/* ── Tab navigation ── */
body:not(.light-mode) .tab-bar,
body:not(.light-mode) .tabs {
  background: var(--surface2);
  border-color: var(--border);
}
body:not(.light-mode) .tab-btn,
body:not(.light-mode) .tab {
  color: var(--text3);
}
body:not(.light-mode) .tab-btn.active,
body:not(.light-mode) .tab.active {
  color: var(--primary);
  background: var(--surface);
}

/* ── Chart container ── */
body:not(.light-mode) canvas {
  filter: brightness(0.95);
}

/* ── Section label teks ── */
body:not(.light-mode) .section-title,
body:not(.light-mode) h1, body:not(.light-mode) h2,
body:not(.light-mode) h3, body:not(.light-mode) h4 {
  color: var(--text);
}

/* ══════════════════════════════════════════════════════════════
   LIGHT MODE — body.light-mode (aktif saat user pilih terang)
   Mengikuti :root yang sudah ada di style.css — ini hanya
   memastikan override dark mode tidak bocor ke light mode.
   ══════════════════════════════════════════════════════════════ */

body.light-mode {
  --bg:       #f4f6fb;
  --bg2:      #edf0f7;
  --bg3:      #e4e8f3;
  --surface:  #ffffff;
  --surface2: #f8f9fc;
  --surface3: #f1f3f8;
  --text:  #1e293b;
  --text2: #475569;
  --text3: #94a3b8;
  --border:  #e2e8f0;
  --border2: #cbd5e1;
  --primary:       #1a56db;
  --primary-dark:  #1341a8;
  --primary-light: #e8f0fe;
  --primary-hover: #1746c0;
  --topbar-bg:     #ffffff;
  --topbar-border: #e2e8f0;
  --red:           #dc2626; --red-subtle:    #fef2f2;
  --green:         #16a34a; --green-subtle:  #f0fdf4;
  --yellow:        #ca8a04; --yellow-subtle: #fefce8;
  --orange:        #ea580c; --orange-subtle: #fff7ed;
  --purple:        #7c3aed; --purple-subtle: #f5f3ff;
  --teal:          #0891b2; --teal-subtle:   #f0fdfa;
  background: var(--bg);
  color: var(--text);
  color-scheme: light;
}

/* ── Transisi halus saat ganti tema ── */
body {
  transition:
    background-color 0.25s ease,
    color 0.2s ease;
}
body .card,
body .topbar,
body input,
body select,
body textarea,
body .stat-card,
body table thead th,
body table tbody td {
  transition:
    background-color 0.25s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

  `;

  document.head.appendChild(style);

  // ── Pastikan updateThemeBtn sinkron setelah inject ─────────
  //    (dashboard.js memanggil updateThemeBtn() sebelum patch ini,
  //     tapi tombol sudah ada — kita sinkronkan icon lagi)
  function syncBtn() {
    const btn = document.getElementById('theme-btn');
    if (!btn) return;
    const isLight = document.body.classList.contains('light-mode');
    btn.textContent = isLight ? '🌙' : '☀️';
    btn.title = isLight ? 'Ganti ke Tema Gelap' : 'Ganti ke Tema Terang';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncBtn);
  } else {
    syncBtn();
  }

  // Sinkronkan juga setiap kali toggleTheme dipanggil
  //   — dengan cara observe perubahan class body
  const observer = new MutationObserver(() => syncBtn());
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

})();
