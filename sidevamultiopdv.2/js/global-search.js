// ============================================================
//  SI-DEVA — Pencarian Global v1.0.0
//  File: js/global-search.js
//
//  Pasang di index.html SETELAH dashboard.js:
//    <script src="js/global-search.js"></script>
//
//  Menambahkan kotak pencarian global di topbar yang mencari
//  sekaligus di: Paket, Rincian Belanja, Survey Harga
// ============================================================

(function () {
  'use strict';

  let _debounce = null;

  // ── Cari di semua tabel ───────────────────────────────────
  function _doSearch(q) {
    q = (q || '').toLowerCase().trim();
    const results = { paket: [], rincian: [], harga: [] };
    if (!q) { _renderResults(null); return; }

    // Paket
    (state.paket.data || []).forEach(p => {
      const hay = [p.noPaket, p.rup, p.namaPaket, p.bidang, p.opd,
                   p.program, p.kegiatan, p.kodeRekening, p.kepalaBidang,
                   p.output].join(' ').toLowerCase();
      if (hay.includes(q)) results.paket.push(p);
    });

    // Rincian
    (state.rincian.data || []).forEach(r => {
      const hay = [r.rup, r.itemBarang, r.satuan, r.user].join(' ').toLowerCase();
      if (hay.includes(q)) results.rincian.push(r);
    });

    // Survey Harga
    (state.harga.data || []).forEach(h => {
      const hay = [h.rup, h.namaPaket, h.namaItem, h.namaProduk,
                   h.namaPenyedia, h.statusKatalog, h.lokasi].join(' ').toLowerCase();
      if (hay.includes(q)) results.harga.push(h);
    });

    _renderResults(q, results);
  }

  // ── Highlight match ───────────────────────────────────────
  function _hl(text, q) {
    if (!q || !text) return text || '';
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(text).replace(new RegExp(`(${escaped})`, 'gi'),
      '<mark style="background:#fef08a;color:#000;border-radius:2px;padding:0 2px;">$1</mark>');
  }

  const fRp = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID');

  // ── Render hasil ──────────────────────────────────────────
  function _renderResults(q, results) {
    const panel = document.getElementById('gs-panel');
    if (!panel) return;

    if (!q) { panel.style.display = 'none'; return; }

    const total = results.paket.length + results.rincian.length + results.harga.length;
    if (!total) {
      panel.style.display = 'block';
      panel.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text3);">
        🔍 Tidak ada hasil untuk "<strong>${q}</strong>"</div>`;
      return;
    }

    const MAX = 5;
    let html = `<div style="padding:10px 14px 6px;font-size:11px;color:var(--text3);border-bottom:1px solid var(--border);">
      ${total} hasil untuk "<strong>${q}</strong>"</div>`;

    // Paket
    if (results.paket.length) {
      html += `<div class="gs-group-header">📦 Data Paket (${results.paket.length})</div>`;
      results.paket.slice(0, MAX).forEach(p => {
        html += `<div class="gs-item" onclick="showPage('paket');document.getElementById('gs-input').value='';document.getElementById('gs-panel').style.display='none';">
          <div class="gs-title">${_hl(p.namaPaket || p.noPaket, q)}</div>
          <div class="gs-sub">${_hl(p.rup || '', q)} · ${_hl(p.bidang || '', q)} · ${fRp(p.paguAnggaran)}</div>
        </div>`;
      });
      if (results.paket.length > MAX)
        html += `<div class="gs-more" onclick="showPage('paket')">+${results.paket.length - MAX} lainnya di Paket →</div>`;
    }

    // Rincian
    if (results.rincian.length) {
      html += `<div class="gs-group-header">📋 Rincian Belanja (${results.rincian.length})</div>`;
      results.rincian.slice(0, MAX).forEach(r => {
        html += `<div class="gs-item" onclick="showPage('rincian');document.getElementById('gs-input').value='';document.getElementById('gs-panel').style.display='none';">
          <div class="gs-title">${_hl(r.itemBarang, q)}</div>
          <div class="gs-sub">RUP ${_hl(r.rup || '', q)} · ${r.vol || ''} ${r.satuan || ''} · ${fRp(r.jumlah)}</div>
        </div>`;
      });
      if (results.rincian.length > MAX)
        html += `<div class="gs-more" onclick="showPage('rincian')">+${results.rincian.length - MAX} lainnya di Rincian →</div>`;
    }

    // Harga
    if (results.harga.length) {
      html += `<div class="gs-group-header">💰 Survey Harga (${results.harga.length})</div>`;
      results.harga.slice(0, MAX).forEach(h => {
        html += `<div class="gs-item" onclick="showPage('harga');document.getElementById('gs-input').value='';document.getElementById('gs-panel').style.display='none';">
          <div class="gs-title">${_hl(h.namaItem || h.namaProduk, q)}</div>
          <div class="gs-sub">${_hl(h.namaPenyedia || '', q)} · ${_hl(h.statusKatalog || '', q)} · ${fRp(h.totalHarga)}</div>
        </div>`;
      });
      if (results.harga.length > MAX)
        html += `<div class="gs-more" onclick="showPage('harga')">+${results.harga.length - MAX} lainnya di Harga →</div>`;
    }

    panel.innerHTML = html;
    panel.style.display = 'block';
  }

  // ── Inject UI ke topbar ───────────────────────────────────
  function _inject() {
    if (document.getElementById('gs-wrap')) return;
    const topbar = document.querySelector('.topbar') ||
                   document.querySelector('#topbar') ||
                   document.querySelector('header');
    if (!topbar) return;

    // Inject CSS
    if (!document.getElementById('gs-style')) {
      const s = document.createElement('style');
      s.id = 'gs-style';
      s.textContent = `
        #gs-wrap { position:relative; flex:1; max-width:380px; margin: 0 12px; }
        #gs-input {
          width:100%; padding:8px 12px 8px 34px;
          border-radius:20px; border:1px solid var(--border);
          background:var(--surface2); color:var(--text1);
          font-size:13px; outline:none; transition:border .2s;
          box-sizing:border-box;
        }
        #gs-input:focus { border-color:#6366f1; }
        #gs-icon {
          position:absolute; left:11px; top:50%; transform:translateY(-50%);
          font-size:14px; pointer-events:none;
        }
        #gs-clear {
          position:absolute; right:10px; top:50%; transform:translateY(-50%);
          font-size:16px; cursor:pointer; color:var(--text3);
          display:none; background:none; border:none; padding:0;
          line-height:1;
        }
        #gs-panel {
          display:none; position:absolute; top:calc(100% + 6px); left:0; right:0;
          background:var(--surface); border:1px solid var(--border);
          border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.18);
          z-index:9999; max-height:420px; overflow-y:auto;
        }
        .gs-group-header {
          padding:8px 14px 4px; font-size:11px; font-weight:700;
          color:var(--text3); text-transform:uppercase; letter-spacing:.04em;
          border-top:1px solid var(--border); margin-top:2px;
        }
        .gs-item {
          padding:9px 14px; cursor:pointer; transition:background .12s;
        }
        .gs-item:hover { background:var(--surface2); }
        .gs-title { font-size:13px; font-weight:600; color:var(--text1); }
        .gs-sub   { font-size:11px; color:var(--text3); margin-top:2px; }
        .gs-more  {
          padding:7px 14px; font-size:12px; color:#6366f1; cursor:pointer;
          font-weight:600;
        }
        .gs-more:hover { text-decoration:underline; }
      `;
      document.head.appendChild(s);
    }

    const wrap = document.createElement('div');
    wrap.id = 'gs-wrap';
    wrap.innerHTML = `
      <span id="gs-icon">🔍</span>
      <input id="gs-input" type="text" placeholder="Cari paket, rincian, harga..." autocomplete="off">
      <button id="gs-clear">×</button>
      <div id="gs-panel"></div>`;

    // Sisipkan sebelum .topbar-actions agar tidak masuk kolom flex-column title
    const actions = topbar.querySelector('.topbar-actions');
    if (actions) actions.before(wrap); else topbar.append(wrap);

    const input = document.getElementById('gs-input');
    const clear = document.getElementById('gs-clear');
    const panel = document.getElementById('gs-panel');

    input.addEventListener('input', function () {
      clear.style.display = this.value ? 'block' : 'none';
      clearTimeout(_debounce);
      _debounce = setTimeout(() => _doSearch(this.value), 220);
    });

    input.addEventListener('focus', function () {
      if (this.value) _doSearch(this.value);
    });

    clear.addEventListener('click', function () {
      input.value = '';
      clear.style.display = 'none';
      panel.style.display = 'none';
    });

    // Tutup panel saat klik di luar
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) panel.style.display = 'none';
    });

    // Shortcut: / untuk fokus search
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT'
                        && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        input.focus();
      }
      if (e.key === 'Escape') { panel.style.display = 'none'; input.blur(); }
    });
  }

  // ── Init ──────────────────────────────────────────────────
  window.addEventListener('sb-ready', () => setTimeout(_inject, 700));
  document.addEventListener('DOMContentLoaded', () => setTimeout(_inject, 1500));

})();
