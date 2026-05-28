// ============================================================
//  SI-DEVA — Pencarian RUP (Partial Match) v1.0.0
//  File: js/rup-search-patch.js
//
//  CARA PAKAI:
//  Muat file ini SETELAH dashboard.js di HTML utama:
//    <script src="js/rup-search-patch.js"></script>
//
//  Yang diubah:
//  - filter-rup-rincian → input text (partial match, bukan exact select)
//  - filter-rup-harga   → input text (partial match, bukan exact select)
//  - filterRincian() & filterHarga() di-override agar mendukung
//    pencarian sebagian nomor RUP (contoh: ketik "123" → tampil
//    semua RUP yang mengandung angka "123")
//  - rupSels (populasi dropdown) di-patch agar tidak crash pada
//    elemen input text
// ============================================================

// ── Patch rupSels population ──────────────────────────────────
// Fungsi asli di dashboard.js mencoba set innerHTML pada elemen
// select. Setelah kita ganti jadi input text, kita cegat agar
// tidak error dan tidak merusak value yang sudah diketik user.
(function patchRupPopulation() {
  const _origRefresh = typeof refreshSelects === 'function' ? refreshSelects : null;

  function _safePopulateRup() {
    ['filter-rup-rincian', 'filter-rup-harga'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        const cur = el.value;
        el.innerHTML = '<option value="">Semua Paket</option>';
        if (typeof state !== 'undefined' && state.paket && state.paket.data) {
          state.paket.data.forEach(p => {
            el.innerHTML += `<option value="${p.rup}">${p.rup} — ${p.namaPaket ? p.namaPaket.slice(0, 40) : ''}</option>`;
          });
        }
        el.value = cur;
      }
      // Jika sudah diganti input text → biarkan saja (nilai tetap)
    });
  }

  // Override refreshSelects jika ada (dipanggil setelah data load)
  if (_origRefresh) {
    window.refreshSelects = function() {
      _origRefresh.apply(this, arguments);
      _safePopulateRup();
    };
  }
})();

// ── Override filterRincian ────────────────────────────────────
window.filterRincian = function filterRincian() {
  const q      = (document.getElementById('search-rincian')?.value  || '').toLowerCase();
  const rupQ   = (document.getElementById('filter-rup-rincian')?.value || '').trim().toLowerCase();
  const satuan = document.getElementById('filter-satuan-rincian')?.value || '';
  const tahun  = document.getElementById('filter-tahun-rincian')?.value  || '';

  const rupTahunMap = {};
  if (typeof state !== 'undefined') {
    state.paket.data.forEach(p => {
      if (p.rup && p.tanggalPesanan)
        rupTahunMap[String(p.rup)] = new Date(p.tanggalPesanan).getFullYear();
    });
  }

  const s = state.rincian;
  s.filtered = s.data.filter(r => {
    const matchQ   = !q    || (r.itemBarang || '').toLowerCase().includes(q);
    const matchRup = !rupQ || String(r.rup || '').toLowerCase().includes(rupQ);
    const matchS   = !satuan || r.satuan === satuan;
    let   matchT   = true;
    if (tahun) {
      const tglInput  = r.tanggalInput ? new Date(r.tanggalInput).getFullYear() : null;
      const tglPaket  = rupTahunMap[String(r.rup)] || null;
      const tglEfektif = tglInput || tglPaket;
      matchT = tglEfektif === parseInt(tahun);
    }
    return matchQ && matchRup && matchS && matchT;
  });
  s.page = 1;
  if (typeof renderRincian === 'function') renderRincian();
};

// ── Override filterHarga ──────────────────────────────────────
window.filterHarga = function filterHarga() {
  const q      = (document.getElementById('search-harga')?.value       || '').toLowerCase();
  const rupQ   = (document.getElementById('filter-rup-harga')?.value   || '').trim().toLowerCase();
  const status = document.getElementById('filter-status-harga')?.value || '';
  const tahun  = document.getElementById('filter-tahun-harga')?.value  || '';

  const rupTahunMap = {};
  if (typeof state !== 'undefined') {
    state.paket.data.forEach(p => {
      if (p.rup && p.tanggalPesanan)
        rupTahunMap[String(p.rup)] = new Date(p.tanggalPesanan).getFullYear();
    });
  }

  const s = state.harga;
  s.filtered = s.data.filter(h => {
    const matchQ   = !q    || (h.namaItem     || '').toLowerCase().includes(q)
                           || (h.namaPenyedia || '').toLowerCase().includes(q)
                           || (h.namaProduk   || '').toLowerCase().includes(q);
    const matchRup = !rupQ || String(h.rup || '').toLowerCase().includes(rupQ);
    const matchS   = !status || (h.statusKatalog || '').includes(status);
    const matchT   = !tahun  || (rupTahunMap[String(h.rup)] === parseInt(tahun));
    return matchQ && matchRup && matchS && matchT;
  });
  s.page = 1;
  if (typeof renderHarga === 'function') renderHarga();
};

// ── Tombol Reset / Clear per kolom pencarian ──────────────────
// Tambahkan tombol × (clear) kecil di sebelah kanan input RUP
// agar user bisa menghapus filter dengan sekali klik.
(function addClearButtons() {
  function _addClear(inputId, filterFn) {
    const el = document.getElementById(inputId);
    if (!el || el.dataset.rupClearAdded) return;
    el.dataset.rupClearAdded = '1';

    const wrap = el.closest('.search-wrap') || el.parentElement;
    if (!wrap) return;

    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.title     = 'Hapus filter RUP';
    btn.textContent = '×';
    btn.style.cssText = [
      'position:absolute', 'right:6px', 'top:50%', 'transform:translateY(-50%)',
      'background:none', 'border:none', 'cursor:pointer', 'font-size:16px',
      'line-height:1', 'color:var(--text3,#9ca3af)', 'padding:0 2px',
      'display:none',
    ].join(';');

    if (getComputedStyle(wrap).position === 'static')
      wrap.style.position = 'relative';

    wrap.appendChild(btn);

    el.addEventListener('input', () => {
      btn.style.display = el.value ? 'block' : 'none';
    });
    btn.addEventListener('click', () => {
      el.value = '';
      btn.style.display = 'none';
      if (typeof window[filterFn] === 'function') window[filterFn]();
    });
  }

  function _init() {
    _addClear('filter-rup-rincian', 'filterRincian');
    _addClear('filter-rup-harga',   'filterHarga');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
    // Retry setelah page navigation (SPA)
    setTimeout(_init, 800);
    setTimeout(_init, 2000);
  }
})();
