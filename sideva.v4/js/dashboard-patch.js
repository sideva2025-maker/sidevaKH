// ============================================================
//  PATCH dashboard.js — Dropdown No RUP di Data Paket
//  SI-DEVA v3.0
//
//  Tiga fungsi di bawah ini menggantikan fungsi yang sama
//  di dashboard.js. Cari dan replace masing-masing fungsi.
// ============================================================

// ── PATCH 1: filterPaket ─────────────────────────────────────
// Cari fungsi ini di dashboard.js, ganti seluruh isinya:
//
//   function filterPaket() { ... }
//
// Dengan fungsi berikut:

function filterPaket() {
  const q      = document.getElementById('search-paket').value.toLowerCase();
  const rup    = document.getElementById('filter-rup-paket')?.value || '';
  const bidang = document.getElementById('filter-bidang-paket').value;
  const rek    = document.getElementById('filter-rek-paket').value;
  state.paket.filtered = state.paket.data.filter(p => {
    const matchQ   = !q      || (p.namaPaket||'').toLowerCase().includes(q) || String(p.rup||'').includes(q) || (p.opd||'').toLowerCase().includes(q);
    const matchRup = !rup    || String(p.rup) === String(rup);
    const matchB   = !bidang || p.bidang === bidang;
    const matchR   = !rek    || p.kodeRekening === rek;
    return matchQ && matchRup && matchB && matchR;
  });
  state.paket.page = 1;
  renderPaket();
}

// ── PATCH 2: populateDropdowns ───────────────────────────────
// Di dalam fungsi populateDropdowns(), cari baris ini:
//
//   const rupSels = document.querySelectorAll('#filter-rup-rincian,#filter-rup-harga,#fr-rup,#fh-rup');
//
// Ganti dengan baris berikut (tambah #filter-rup-paket):
//
//   const rupSels = document.querySelectorAll('#filter-rup-paket,#filter-rup-rincian,#filter-rup-harga,#fr-rup,#fh-rup');

// ── PATCH 3: _addClearButtons ────────────────────────────────
// Di dalam array filterMap di fungsi _addClearButtons(),
// cari baris:
//
//   { id: 'filter-bidang-paket',   fn: 'filterPaket' },
//
// Tambahkan satu baris SEBELUMNYA:
//
//   { id: 'filter-rup-paket',      fn: 'filterPaket' },
