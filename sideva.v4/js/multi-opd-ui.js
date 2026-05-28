// ============================================================
//  SI-DEVA — Multi-OPD UI Component v1.0
//  File: js/multi-opd-ui.js
//
//  Inject OPD selector ke topbar
//  Pasang di index.html SETELAH multi-opd-db.js:
//    <script src="js/multi-opd-db.js"></script>
//    <script src="js/multi-opd-ui.js"></script>
// ============================================================

// ── Inject CSS untuk OPD selector ────────────────────────────
(function injectOpdStyle() {
  const s = document.createElement('style');
  s.id = 'multi-opd-style';
  s.textContent = `
    #opd-selector-container {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
      border-right: 1px solid var(--border, #2a2a2a);
    }
    #opd-selector-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text3, #888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    #opd-selector {
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--border, #333);
      background: var(--surface2, #222);
      color: var(--text, #fff);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 150px;
    }
    #opd-selector:hover {
      border-color: var(--gold, #c9a84c);
      background: var(--surface3, #2a2a2a);
    }
    #opd-selector:focus {
      outline: none;
      border-color: var(--gold, #c9a84c);
      box-shadow: 0 0 0 2px rgba(201, 168, 76, 0.15);
    }
    .opd-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      background: rgba(201, 168, 76, 0.15);
      color: var(--gold, #c9a84c);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    #opd-info-tooltip {
      display: none;
      position: absolute;
      background: var(--surface, #1a1a1a);
      border: 1px solid var(--border, #2a2a2a);
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-width: 200px;
    }
    #opd-info-tooltip.show {
      display: block;
    }
  `;
  document.head.appendChild(s);
})();

// ── Render OPD Selector ──────────────────────────────────────
function renderOpdSelector() {
  const topbar = document.querySelector('.topbar') || document.querySelector('header');
  if (!topbar) {
    console.warn('Topbar tidak ditemukan, OPD selector tidak ditampilkan');
    return;
  }

  // Hapus selector lama jika ada
  const oldContainer = document.getElementById('opd-selector-container');
  if (oldContainer) oldContainer.remove();

  // Jika user belum login atau tidak punya OPD access, jangan tampilkan
  if (!isLoggedIn() || !getCurrentOpdId()) return;

  const opdList = getUserOpdList();
  if (!opdList || opdList.length === 0) return;

  // Buat container
  const container = document.createElement('div');
  container.id = 'opd-selector-container';

  // Label
  const label = document.createElement('span');
  label.id = 'opd-selector-label';
  label.textContent = '🏢 OPD:';

  // Selector dropdown
  const select = document.createElement('select');
  select.id = 'opd-selector';
  select.onchange = (e) => {
    const opdId = e.target.value;
    setCurrentOpd(opdId).then(() => {
      if (typeof renderAll === 'function') renderAll();
      if (typeof updateBadges === 'function') updateBadges();
      toast(`Beralih ke OPD: ${getCurrentOpdName()}`, 'success');
    }).catch(err => {
      toast('Gagal beralih OPD: ' + err.message, 'error');
      e.target.value = getCurrentOpdId();
    });
  };

  // Populate options
  opdList.forEach(opd => {
    const option = document.createElement('option');
    option.value = opd.id;
    option.textContent = opd.namaOpd || opd.nama || opd.id;
    if (opd.id === getCurrentOpdId()) option.selected = true;
    select.appendChild(option);
  });

  container.appendChild(label);
  container.appendChild(select);

  // Inject ke topbar (sebelum elemen lain)
  const firstChild = topbar.firstChild;
  if (firstChild) {
    topbar.insertBefore(container, firstChild);
  } else {
    topbar.appendChild(container);
  }
}

// ── Update OPD Selector saat OPD berubah ─────────────────────
window.addEventListener('opd-changed', (e) => {
  const select = document.getElementById('opd-selector');
  if (select) {
    select.value = e.detail.opdId;
  }
});

// ── Update OPD Selector saat login ───────────────────────────
window.addEventListener('sb-ready', (e) => {
  if (e.detail.loggedIn) {
    setTimeout(() => renderOpdSelector(), 100);
  }
});

// ── Patch applyRoleUI untuk include OPD selector ──────────────
if (!window._multiOpdOrigApplyRoleUI) window._multiOpdOrigApplyRoleUI = window.applyRoleUI;
window.applyRoleUI = function() {
  if (typeof window._multiOpdOrigApplyRoleUI === 'function') window._multiOpdOrigApplyRoleUI.call(this);
  renderOpdSelector();
};

// ── Listen navigation changes (avoid monkey-patching showPage) ─
window.addEventListener('sideva:page-changed', () => {
  setTimeout(() => renderOpdSelector(), 50);
});

// ── Helper: Update OPD info di UI ────────────────────────────
function updateOpdInfo() {
  const currentOpdName = getCurrentOpdName();
  const badge = document.querySelector('.opd-badge');
  if (badge) {
    badge.textContent = '🏢 ' + currentOpdName;
  }

  // Update title/subtitle jika ada
  const subtitle = document.getElementById('hero-subtitle');
  if (subtitle && currentOpdName !== 'Semua OPD') {
    const baseText = subtitle.getAttribute('data-base-text') || subtitle.textContent;
    if (!subtitle.getAttribute('data-base-text')) {
      subtitle.setAttribute('data-base-text', baseText);
    }
    subtitle.textContent = baseText + ' — ' + currentOpdName;
  }
}

// ── Event: Update info saat OPD berubah ──────────────────────
window.addEventListener('opd-changed', (e) => {
  updateOpdInfo();
});

// ── Init: Render saat DOM ready ──────────────────────────────
if (!window._multiOpdUIInitRegistered) {
  window._multiOpdUIInitRegistered = true;
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (typeof isLoggedIn === 'function' && isLoggedIn()) renderOpdSelector();
    }, 200);
  });
}

console.log('✅ Multi-OPD UI loaded');
