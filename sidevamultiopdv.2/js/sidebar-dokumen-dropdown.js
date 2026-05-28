// ============================================================
//  SI-DEVA — Sidebar Dokumen Dropdown v1.0.0
//  File: js/sidebar-dokumen-dropdown.js
//
//  CARA PAKAI:
//  Tambahkan 1 baris di index.html, SETELAH dashboard.js:
//    <script src="js/sidebar-dokumen-dropdown.js"></script>
//
//  Fitur:
//  ✅ Menu "Dokumen" di sidebar menjadi accordion dropdown
//  ✅ Animasi buka/tutup halus
//  ✅ Chevron berputar saat dibuka
//  ✅ Otomatis terbuka saat halaman dokumen aktif
//  ✅ Status (buka/tutup) tersimpan di localStorage
//  ✅ Badge count total ditampilkan di header dropdown
//  ✅ Tidak merusak fungsi showPage() yang sudah ada
// ============================================================

(function () {
  'use strict';

  // Daftar page yang termasuk grup Dokumen (sesuai sidebar index.html)
  const DOKUMEN_PAGES = ['evat','evhp','formspek','formdpp','nodis','riviu','penetapan','idkb','bahpe','sppbj'];

  // Label & ikon tiap dokumen (untuk badge hover tooltip)
  const DOKUMEN_META = {
    evat:       { label: 'EV_AT',       icon: '📄' },
    evhp:       { label: 'EV_HP',       icon: '📑' },
    formspek:   { label: 'Form Spek',   icon: '🧷' },
    formdpp:    { label: 'Form DPP',    icon: '🧮' },
    nodis:      { label: 'Nodis',       icon: '📬' },
    riviu:      { label: 'Riviu',       icon: '📝' },
    penetapan:  { label: 'F Penetapan', icon: '✅' },
    idkb:       { label: 'F IDKB',      icon: '🪪' },
    bahpe:      { label: 'BAHPE',       icon: '📋' },
    sppbj:      { label: 'SPPBJ',       icon: '📨' },
  };

  const LS_KEY = 'sideva_dokumen_dropdown_open';

  // ── Inject CSS ────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* Dropdown header */
    .nav-dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px 8px 14px;
      cursor: pointer;
      border-radius: 8px;
      margin: 0 6px 2px;
      transition: background 0.15s;
      user-select: none;
      -webkit-user-select: none;
    }
    .nav-dropdown-header:hover {
      background: var(--surface2, rgba(255,255,255,0.06));
    }
    .nav-dropdown-header.active {
      background: var(--surface2, rgba(255,255,255,0.08));
    }
    .nav-dropdown-left {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .nav-dropdown-icon {
      font-size: 16px;
      line-height: 1;
      flex-shrink: 0;
    }
    .nav-dropdown-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text1, #f3f4f6);
      font-family: 'Plus Jakarta Sans', sans-serif;
      white-space: nowrap;
    }
    .nav-dropdown-badge {
      font-size: 10px;
      font-weight: 700;
      background: var(--accent, #C9A84C);
      color: #111;
      border-radius: 10px;
      padding: 1px 7px;
      line-height: 1.6;
      margin-left: 2px;
      display: none; /* tampil hanya saat closed + ada halaman aktif */
    }
    .nav-dropdown-badge.visible { display: inline-block; }
    .nav-dropdown-chevron {
      font-size: 11px;
      color: var(--text3, #9ca3af);
      transition: transform 0.25s ease;
      flex-shrink: 0;
    }
    .nav-dropdown-chevron.open { transform: rotate(180deg); }

    /* Container item-item dokumen */
    .nav-dropdown-body {
      overflow: hidden;
      max-height: 0;
      transition: max-height 0.3s ease, opacity 0.2s ease;
      opacity: 0;
    }
    .nav-dropdown-body.open {
      max-height: 600px; /* cukup besar untuk semua item */
      opacity: 1;
    }

    /* Indent item dokumen */
    .nav-dropdown-body .nav-item {
      padding-left: 40px !important;
      font-size: 12.5px;
    }
    .nav-dropdown-body .nav-item .icon {
      font-size: 14px;
    }

    /* Garis aksen kiri saat dropdown terbuka */
    .nav-dropdown-wrap.open > .nav-dropdown-body {
      border-left: 2px solid var(--accent, #C9A84C)44;
      margin-left: 22px;
      padding-left: 0;
      border-radius: 0 0 6px 6px;
    }

    /* Animasi sub-items masuk */
    .nav-dropdown-body .nav-item {
      opacity: 0;
      transform: translateX(-6px);
      transition: opacity 0.18s ease, transform 0.18s ease, background 0.15s;
    }
    .nav-dropdown-body.open .nav-item {
      opacity: 1;
      transform: translateX(0);
    }
    /* Stagger tiap item */
    .nav-dropdown-body.open .nav-item:nth-child(1)  { transition-delay: 0.02s; }
    .nav-dropdown-body.open .nav-item:nth-child(2)  { transition-delay: 0.04s; }
    .nav-dropdown-body.open .nav-item:nth-child(3)  { transition-delay: 0.06s; }
    .nav-dropdown-body.open .nav-item:nth-child(4)  { transition-delay: 0.08s; }
    .nav-dropdown-body.open .nav-item:nth-child(5)  { transition-delay: 0.10s; }
    .nav-dropdown-body.open .nav-item:nth-child(6)  { transition-delay: 0.12s; }
    .nav-dropdown-body.open .nav-item:nth-child(7)  { transition-delay: 0.14s; }
    .nav-dropdown-body.open .nav-item:nth-child(8)  { transition-delay: 0.16s; }
    .nav-dropdown-body.open .nav-item:nth-child(9)  { transition-delay: 0.18s; }
    .nav-dropdown-body.open .nav-item:nth-child(10) { transition-delay: 0.20s; }

    /* Section label (judul grup) tetap tersembunyi — dropdown jadi pengganti */
    .nav-section-label-dokumen { display: none !important; }
  `;
  document.head.appendChild(style);

  // ── Fungsi utama: transform sidebar ──────────────────────
  function initDokumenDropdown() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    // Cari label "Dokumen"
    const allLabels = nav.querySelectorAll('.nav-section-label');
    let dokLabel = null;
    allLabels.forEach(el => {
      if (el.textContent.trim() === 'Dokumen') dokLabel = el;
    });
    if (!dokLabel) return; // sudah di-patch atau tidak ditemukan

    // Kumpulkan semua nav-item yang termasuk grup Dokumen
    // (dari setelah dokLabel sampai nav-section-label berikutnya)
    const dokItems = [];
    let sibling = dokLabel.nextElementSibling;
    while (sibling && !sibling.classList.contains('nav-section-label')) {
      if (sibling.classList.contains('nav-item')) dokItems.push(sibling);
      sibling = sibling.nextElementSibling;
    }

    if (!dokItems.length) return;

    // Tentukan apakah ada item aktif
    const hasActive = dokItems.some(el => el.classList.contains('active'));
    const savedOpen = localStorage.getItem(LS_KEY);
    const shouldOpen = hasActive || savedOpen === 'true' || savedOpen === null; // buka by default pertama kali

    // ── Buat struktur dropdown ────────────────────────────
    const wrap = document.createElement('div');
    wrap.className = 'nav-dropdown-wrap' + (shouldOpen ? ' open' : '');

    const header = document.createElement('div');
    header.className = 'nav-dropdown-header' + (hasActive ? ' active' : '');
    header.innerHTML = `
      <div class="nav-dropdown-left">
        <span class="nav-dropdown-icon">📂</span>
        <span class="nav-dropdown-label">Dokumen</span>
        <span class="nav-dropdown-badge${hasActive && !shouldOpen ? ' visible' : ''}" id="dok-active-badge">●</span>
      </div>
      <span class="nav-dropdown-chevron${shouldOpen ? ' open' : ''}">▼</span>
    `;

    const body = document.createElement('div');
    body.className = 'nav-dropdown-body' + (shouldOpen ? ' open' : '');

    // Pindahkan semua item ke dalam body
    dokItems.forEach(item => body.appendChild(item));

    wrap.appendChild(header);
    wrap.appendChild(body);

    // Ganti label "Dokumen" dengan dropdown wrap
    dokLabel.classList.add('nav-section-label-dokumen');
    dokLabel.after(wrap);

    // ── Toggle handler ────────────────────────────────────
    header.addEventListener('click', () => {
      const isOpen = body.classList.contains('open');
      if (isOpen) {
        body.classList.remove('open');
        wrap.classList.remove('open');
        header.querySelector('.nav-dropdown-chevron').classList.remove('open');
        localStorage.setItem(LS_KEY, 'false');
        // tampilkan badge jika ada aktif
        const badge = header.querySelector('.nav-dropdown-badge');
        if (badge && body.querySelector('.nav-item.active')) badge.classList.add('visible');
      } else {
        body.classList.add('open');
        wrap.classList.add('open');
        header.querySelector('.nav-dropdown-chevron').classList.add('open');
        localStorage.setItem(LS_KEY, 'true');
        const badge = header.querySelector('.nav-dropdown-badge');
        if (badge) badge.classList.remove('visible');
      }
    });
  }

  // ── On page change: auto-buka dropdown saat halaman dokumen aktif ──
  function onPageChanged(name) {
    const isDokPage = DOKUMEN_PAGES.includes(name);

    const header = document.querySelector('.nav-dropdown-header');
    if (header) {
      header.classList.toggle('active', isDokPage);
    }

    if (isDokPage) {
      const body    = document.querySelector('.nav-dropdown-body');
      const chevron = document.querySelector('.nav-dropdown-chevron');
      const wrap    = document.querySelector('.nav-dropdown-wrap');
      const badge   = document.querySelector('.nav-dropdown-badge');
      if (body && !body.classList.contains('open')) {
        body.classList.add('open');
        if (wrap) wrap.classList.add('open');
        if (chevron) chevron.classList.add('open');
        if (badge) badge.classList.remove('visible');
        localStorage.setItem(LS_KEY, 'true');
      }
    }

    requestAnimationFrame(() => {
      const body  = document.querySelector('.nav-dropdown-body');
      const badge = document.querySelector('.nav-dropdown-badge');
      if (body && badge) {
        const hasActive = !!body.querySelector('.nav-item.active');
        if (!body.classList.contains('open') && hasActive) {
          badge.classList.add('visible');
        } else {
          badge.classList.remove('visible');
        }
      }
    });
  }

  window.addEventListener('sideva:page-changed', (e) => {
    const name = e?.detail?.page;
    if (name) onPageChanged(name);
  });

  // ── Init ──────────────────────────────────────────────────
  function init() {
    initDokumenDropdown();
  }

  // Jalankan setelah DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM sudah ready, tapi tunggu sedikit agar script lain selesai
    setTimeout(init, 200);
  }

  // Backup: jalankan juga setelah sb-ready (Supabase selesai init)
  window.addEventListener('sb-ready', () => setTimeout(init, 300));

})();
