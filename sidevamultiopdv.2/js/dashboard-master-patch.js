// ============================================================
//  PATCH untuk dashboard.js — Menu Master
//  Ganti fungsi-fungsi di bawah ini di file dashboard.js kamu
//  dengan versi yang sudah diperbaiki di sini.
//
//  BUG YANG DIPERBAIKI:
//  1. showTab() — pakai implicit `event` yang fragile; ganti ke
//     parameter `el` eksplisit
//  2. saveBidang / saveOpd / saveRekening / savePPK /
//     savePejabatPengadaan — tidak ada try/catch; kalau Supabase
//     error (sesi habis, constraint, dll) UI diam saja tanpa pesan
//  3. confirmDeleteMaster / deleteMaster — sama, perlu try/catch
// ============================================================

// ── 1. GANTI showTab() ────────────────────────────────────────
// Sebelum  : onclick="showTab('tab-bidang')"  → pakai event.target
// Sesudah  : onclick="showTab('tab-bidang', this)"  → eksplisit
//
// PENTING: setelah ganti fungsi ini, update SEMUA pemanggilan
// showTab di index.html / master.html:
//   showTab('tab-bidang')           → showTab('tab-bidang', this)
//   showTab('tab-opd')              → showTab('tab-opd', this)
//   showTab('tab-rekening')         → showTab('tab-rekening', this)
//   showTab('tab-ppk')              → showTab('tab-ppk', this)
//   showTab('tab-pejabat-pengadaan')→ showTab('tab-pejabat-pengadaan', this)

function showTab(id, el) {
  const btn    = el || (typeof event !== 'undefined' ? event.target : null);
  const pane   = document.getElementById(id);
  if (!pane) return;
  const parent = pane.closest('.card, .page');
  if (!parent) return;
  parent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  pane.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ── 2. GANTI saveBidang() ─────────────────────────────────────
async function saveBidang() {
  const namaBidang = v('fb-namaBidang');
  if (!namaBidang) { toast('Nama Bidang wajib diisi', 'error'); return; }

  const data = {
    namaBidang,
    kodeSurat:    v('fb-kodeSurat'),
    kepalaBidang: v('fb-kepalaBidang'),
    nip:          v('fb-nip'),
  };
  if (masterEditId) data.id = masterEditId;

  try {
    await dbPut('bidang', data);
    masterState.bidang = await dbGetAll('bidang');
    renderMaster();
    populateDropdowns();
    populateDashboardFilters();
    closeModal('modal-bidang');
    toast(masterEditId ? 'Bidang berhasil diperbarui' : 'Bidang berhasil ditambahkan', 'success');
    masterEditId = null;
  } catch(err) {
    toast('Gagal simpan Bidang: ' + (err.message || err), 'error');
  }
}

// ── 3. GANTI saveOpd() ───────────────────────────────────────
async function saveOpd() {
  const namaOPD = v('fo-namaOPD');
  if (!namaOPD) { toast('Nama OPD wajib diisi', 'error'); return; }

  // namaOpd (huruf kecil d) sesuai FIELD_MAP.opd.to
  const data = { namaOpd: namaOPD };
  if (masterEditId) data.id = masterEditId;

  try {
    await dbPut('opd', data);
    masterState.opd = await dbGetAll('opd');
    renderMaster();
    populateDropdowns();
    closeModal('modal-opd');
    toast(masterEditId ? 'OPD berhasil diperbarui' : 'OPD berhasil ditambahkan', 'success');
    masterEditId = null;
  } catch(err) {
    toast('Gagal simpan OPD: ' + (err.message || err), 'error');
  }
}

// ── 4. GANTI saveRekening() ───────────────────────────────────
async function saveRekening() {
  const kodeRekening = v('frk-kodeRekening') || v('fr-kodeRekening');
  if (!kodeRekening) { toast('Kode Rekening wajib diisi', 'error'); return; }

  const data = {
    kodeRekening,
    linkKatalog: v('frk-linkEKatalog') || v('fr-linkKatalog'),
  };
  if (masterEditId) data.id = masterEditId;

  try {
    await dbPut('rekening', data);
    masterState.rekening = await dbGetAll('rekening');
    renderMaster();
    populateDropdowns();
    populateDashboardFilters();
    closeModal('modal-rekening');
    toast(masterEditId ? 'Kode Rekening berhasil diperbarui' : 'Kode Rekening berhasil ditambahkan', 'success');
    masterEditId = null;
  } catch(err) {
    toast('Gagal simpan Kode Rekening: ' + (err.message || err), 'error');
  }
}

// ── 5. GANTI savePPK() ───────────────────────────────────────
async function savePPK() {
  const nama = v('fppk-nama');
  if (!nama) { toast('Nama PPK wajib diisi', 'error'); return; }

  const ttdFileInput = document.getElementById('fppk-ttd-file');
  const capFileInput = document.getElementById('fppk-cap-file');
  const ttdB64New    = document.getElementById('fppk-ttd-b64').value || '';
  const capB64New    = document.getElementById('fppk-cap-b64').value || '';

  const ttdHasNewFile = ttdFileInput && ttdFileInput.files && ttdFileInput.files.length > 0;
  const capHasNewFile = capFileInput && capFileInput.files && capFileInput.files.length > 0;
  const ttdCleared    = ttdFileInput && ttdFileInput.getAttribute('data-cleared') === '1';
  const capCleared    = capFileInput && capFileInput.getAttribute('data-cleared') === '1';

  const ttdSizeW = parseInt(document.getElementById('fppk-ttd-size-w').value) || 120;
  const ttdSizeH = parseInt(document.getElementById('fppk-ttd-size-h').value) || 55;
  const capSizeW = parseInt(document.getElementById('fppk-cap-size-w').value) || 80;
  const capSizeH = parseInt(document.getElementById('fppk-cap-size-h').value) || 80;

  const data = { nama, nip: v('fppk-nip'), jabatan: v('fppk-jabatan'),
    ttdSizeW, ttdSizeH, capSizeW, capSizeH };

  if (masterEditId) {
    const old = masterState.ppk.find(x => x.id === masterEditId);
    data.ttd = ttdHasNewFile && ttdB64New ? ttdB64New
             : ttdCleared ? ''
             : (old && old.ttd) ? old.ttd : '';
    data.cap = capHasNewFile && capB64New ? capB64New
             : capCleared ? ''
             : (old && old.cap) ? old.cap : '';
    data.id  = masterEditId;
  } else {
    data.ttd = ttdB64New;
    data.cap = capB64New;
  }

  try {
    await dbPut('ppk', data);
    masterState.ppk = await dbGetAll('ppk');
    renderMaster();
    closeModal('modal-ppk');
    toast(masterEditId ? 'PPK berhasil diperbarui' : 'PPK berhasil ditambahkan', 'success');
    masterEditId = null;
  } catch(err) {
    toast('Gagal simpan PPK: ' + (err.message || err), 'error');
  }
}

// ── 6. GANTI savePejabatPengadaan() ───────────────────────────
async function savePejabatPengadaan() {
  const nama = v('fpp-nama');
  if (!nama) { toast('Nama Pejabat Pengadaan wajib diisi', 'error'); return; }

  const data = { nama, nip: v('fpp-nip'), jabatan: v('fpp-jabatan') };
  if (masterEditId) data.id = masterEditId;

  try {
    await dbPut('pejabatPengadaan', data);
    masterState.pejabatPengadaan = await dbGetAll('pejabatPengadaan');
    renderMaster();
    populateEvatPejabatSelect();
    populateEvhpPejabatSelect();
    closeModal('modal-pejabatPengadaan');
    toast(masterEditId ? 'Pejabat Pengadaan berhasil diperbarui' : 'Pejabat Pengadaan berhasil ditambahkan', 'success');
    masterEditId = null;
  } catch(err) {
    toast('Gagal simpan Pejabat Pengadaan: ' + (err.message || err), 'error');
  }
}

// ── 7. GANTI deleteMaster() ───────────────────────────────────
async function deleteMaster(store, id) {
  try {
    await dbDelete(store, id);
    masterState[store] = await dbGetAll(store);
    renderMaster();
    populateDropdowns();
    if (store === 'bidang' || store === 'rekening') {
      populateDashboardFilters();
    }
    toast('Data master berhasil dihapus', 'success');
  } catch(err) {
    toast('Gagal hapus data: ' + (err.message || err), 'error');
  }
}
