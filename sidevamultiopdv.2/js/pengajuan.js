// ============================================================
//  CRUD - ADD / EDIT
// ============================================================
function openAddModal() {
  if (typeof isOperator === 'function' && !isOperator()) {
    toast('Anda tidak punya akses untuk menambah data.', 'error'); return;
  }
  editId = null;
  editStore = currentPage;
  if (currentPage === 'paket') {
    document.getElementById('modal-paket-title').textContent = 'Tambah Paket Baru';
    clearForm(['f-opd','f-rup','f-namaPaket','f-program','f-kegiatan','f-subKegiatan','f-durasi','f-tanggalPesanan','f-tanggalSelesai','f-paguAnggaran','f-output','f-tanggalDPP','f-kepalaBidang','f-nip']);
    document.getElementById('f-masaKerja').value = 'Hari Kalender';
    document.getElementById('f-bidang').value = '';
    document.getElementById('f-kodeRekening').value = '';
    openModal('modal-paket');
  } else if (currentPage === 'rincian') {
    document.getElementById('modal-rincian-title').textContent = 'Tambah Rincian Belanja';
    clearForm(['fr-rup','fr-user','fr-itemBarang','fr-vol','fr-satuan','fr-hargaSatuan','fr-jumlah']);
    openModal('modal-rincian');
  } else if (currentPage === 'harga') {
    document.getElementById('modal-harga-title').textContent = 'Tambah Survey Harga';
    clearForm(['fh-rup','fh-hps','fh-namaPaket','fh-namaItem','fh-namaProduk','fh-linkKatalog','fh-qty','fh-satuan','fh-hargaTayang','fh-dpp','fh-ppn','fh-ongkir','fh-totalHarga','fh-negoFinal']);
    document.getElementById('fh-statusPajak').value = 'Tidak Kena Pajak';
    // Isi dropdown penyedia (kosong untuk tambah baru)
    _buildPenyediaDropdown('');
    openModal('modal-harga');
  } else if (currentPage === 'penyedia') {
    document.getElementById('modal-penyedia-title').textContent = 'Tambah Penyedia';
    clearForm(['fp-nama','fp-alamat','fp-link']);
    document.getElementById('fp-bentuk').value = 'Perorangan';
    document.getElementById('fp-status').value = 'Aktif';
    document.getElementById('fp-tipe').value = 'UMKM';
    openModal('modal-penyedia');
  }
}

function clearForm(ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

async function editRecord(store, id) {
  editId = id;
  editStore = store;
  const all = await dbGetAll(store);
  const rec = all.find(r => r.id === id);
  if (!rec) return;

  if (store === 'paket') {
    document.getElementById('modal-paket-title').textContent = 'Edit Paket';
    document.getElementById('f-opd').value = rec.opd||'';
    document.getElementById('f-rup').value = rec.rup||'';
    document.getElementById('f-namaPaket').value = rec.namaPaket||'';
    const setTA = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = val || '';
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    };
    setTA('f-program', rec.program);
    setTA('f-kegiatan', rec.kegiatan);
    setTA('f-subKegiatan', rec.subKegiatan);
    document.getElementById('f-masaKerja').value = rec.masaKerja||'Hari Kalender';
    document.getElementById('f-durasi').value = rec.durasi||'';
    document.getElementById('f-tanggalPesanan').value = rec.tanggalPesanan||'';
    document.getElementById('f-tanggalSelesai').value = rec.tanggalSelesai||'';
    document.getElementById('f-paguAnggaran').value = rec.paguAnggaran||'';
    document.getElementById('f-kodeRekening').value = rec.kodeRekening||'';
    document.getElementById('f-bidang').value = rec.bidang||'';
    document.getElementById('f-kepalaBidang').value = rec.kepalaBidang||'';
    document.getElementById('f-nip').value = rec.nip||'';
    document.getElementById('f-tanggalDPP').value = rec.tanggalDPP||'';
    document.getElementById('f-output').value = rec.output||'';
    openModal('modal-paket');
  } else if (store === 'rincian') {
    document.getElementById('modal-rincian-title').textContent = 'Edit Rincian';
    document.getElementById('fr-rup').value = rec.rup||'';
    document.getElementById('fr-user').value = rec.user||'';
    document.getElementById('fr-itemBarang').value = rec.itemBarang||'';
    document.getElementById('fr-vol').value = rec.vol||'';
    document.getElementById('fr-satuan').value = rec.satuan||'';
    document.getElementById('fr-hargaSatuan').value = rec.hargaSatuan||'';
    document.getElementById('fr-jumlah').value = rec.jumlah||'';
    openModal('modal-rincian');
  } else if (store === 'harga') {
    document.getElementById('modal-harga-title').textContent = 'Edit Survey Harga';
    document.getElementById('fh-rup').value = rec.rup||'';
    document.getElementById('fh-hps').value = rec.hps||'';
    document.getElementById('fh-namaPaket').value = rec.namaPaket||'';
    document.getElementById('fh-namaItem').value = rec.namaItem||'';
    document.getElementById('fh-namaProduk').value = rec.namaProduk||'';
    document.getElementById('fh-linkKatalog').value = rec.linkKatalog||'';
    document.getElementById('fh-qty').value = rec.qty||'';
    document.getElementById('fh-satuan').value = rec.satuan||'';
    document.getElementById('fh-hargaTayang').value = rec.hargaTayang||'';
    document.getElementById('fh-statusPajak').value = rec.statusPajak||'Tidak Kena Pajak';
    document.getElementById('fh-dpp').value = rec.dpp||'';
    document.getElementById('fh-ppn').value = rec.ppn||'';
    document.getElementById('fh-ongkir').value = rec.ongkir||'';
    document.getElementById('fh-totalHarga').value = rec.totalHarga||'';
    document.getElementById('fh-pdn').value = rec.pdn||'Ya';
    document.getElementById('fh-umkm').value = rec.umkm||'Ya';
    document.getElementById('fh-lokasi').value = rec.lokasi||'Kapus Hulu';
    document.getElementById('fh-statusKatalog').value = rec.statusKatalog||'Aktif';
    document.getElementById('fh-negoFinal').value = rec.negoFinal||'';
    // Isi dropdown penyedia dan set nilai dengan benar
    _buildPenyediaDropdown(rec.namaPenyedia||'');
    openModal('modal-harga');
  } else if (store === 'penyedia') {
    document.getElementById('modal-penyedia-title').textContent = 'Edit Penyedia';
    document.getElementById('fp-nama').value = rec.namaPenyedia||'';
    document.getElementById('fp-alamat').value = rec.alamat||'';
    document.getElementById('fp-bentuk').value = rec.bentukUsaha||'Perorangan';
    document.getElementById('fp-status').value = rec.status||'Aktif';
    document.getElementById('fp-tipe').value = rec.tipe||'UMKM';
    document.getElementById('fp-link').value = rec.linkToko||'';
    openModal('modal-penyedia');
  }
}

// ============================================================
//  SAVE FUNCTIONS
// ============================================================
async function savePaket() {
  const rec = {
    opd: v('f-opd'), rup: v('f-rup'), namaPaket: v('f-namaPaket'),
    program: v('f-program'), kegiatan: v('f-kegiatan'), subKegiatan: v('f-subKegiatan'),
    masaKerja: v('f-masaKerja'), durasi: vn('f-durasi'),
    tanggalPesanan: v('f-tanggalPesanan'), tanggalSelesai: v('f-tanggalSelesai'),
    paguAnggaran: vn('f-paguAnggaran'), kodeRekening: v('f-kodeRekening'),
    bidang: v('f-bidang'), kepalaBidang: v('f-kepalaBidang'), nip: v('f-nip'),
    tanggalDPP: v('f-tanggalDPP'), output: v('f-output'),
  };
  if (!rec.namaPaket || !rec.rup) { toast('Nama Paket dan RUP wajib diisi!', 'error'); return; }
  if (editId) rec.id = editId;
  else {
    const all = await dbGetAll('paket');
    rec.noPaket = (all.length || 0) + 1;
  }
  try {
    await dbPut('paket', rec);
  } catch(err) {
    // RUP sudah ada di paket lain — izinkan saja (multi-item per RUP diperbolehkan)
    // Jika error bukan unique constraint, tampilkan pesan asli
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('sudah digunakan') || msg.includes('23505')) {
      toast('⚠️ Nomor RUP ' + rec.rup + ' sudah ada. Data tetap disimpan dengan RUP yang sama.', 'warning');
    } else {
      toast('Gagal simpan: ' + (err.message || err), 'error');
      return;
    }
  }
  closeModal('modal-paket');
  state.paket.data = await dbGetAll('paket');
  state.paket.filtered = [...state.paket.data];
  filterPaket();
  updateBadges();
  populateDropdowns();
  populateEvatRupSelect();
  if (typeof applyRoleUI === 'function') applyRoleUI();
  toast(editId ? 'Paket berhasil diupdate!' : 'Paket berhasil ditambah!', 'success');
}

async function saveRincian() {
  const vol = vn('fr-vol'), hargaSatuan = vn('fr-hargaSatuan');
  const rec = {
    rup: v('fr-rup'), user: v('fr-user'), itemBarang: v('fr-itemBarang'),
    vol, satuan: v('fr-satuan'), hargaSatuan, jumlah: vol * hargaSatuan,
    tanggalInput: new Date().toISOString(),
  };
  if (!rec.itemBarang || !rec.rup) { toast('Item Barang dan RUP wajib diisi!', 'error'); return; }
  const isEdit = !!editId;
  if (editId) rec.id = editId;
  else { const all = await dbGetAll('rincian'); rec.no = (all.length||0) + 1; }
  let savedRec;
  try {
    savedRec = await dbPut('rincian', rec);
  } catch(err) {
    toast('Gagal simpan Rincian: ' + (err.message || err), 'error');
    return;
  }
  closeModal('modal-rincian');
  state.rincian.data = await dbGetAll('rincian');
  state.rincian.filtered = [...state.rincian.data];

  // ── SYNC OTOMATIS: hanya untuk input BARU (bukan edit) ──
  const rincianId = (savedRec && savedRec.id) ? savedRec.id : editId;
  if (!isEdit && rincianId && typeof autoSyncHargaPembanding === 'function') {
    try {
      await autoSyncHargaPembanding(rincianId, rec, false);
      state.harga.data = await dbGetAll('harga');
      state.harga.filtered = [...state.harga.data];
      if (typeof filterHarga === 'function') filterHarga();
      setTimeout(() => {
        if (typeof validasiKelengkapanPembanding === 'function') validasiKelengkapanPembanding();
      }, 200);
    } catch(syncErr) {
      console.warn('[SyncData] Sync harga pembanding gagal:', syncErr);
    }
  } else if (isEdit) {
    setTimeout(() => {
      if (typeof validasiKelengkapanPembanding === 'function') validasiKelengkapanPembanding();
    }, 200);
  }

  filterRincian();
  updateBadges();
  toast(isEdit ? 'Rincian berhasil diupdate!' : 'Rincian berhasil ditambah!', 'success');
}

// ============================================================
//  PENYEDIA DROPDOWN HELPER — Survey Harga Modal
// ============================================================
function _buildPenyediaDropdown(currentNama) {
  const sel  = document.getElementById('fh-namaPenyedia');
  const inp  = document.getElementById('fh-namaPenyediaManual');
  const hint = document.getElementById('fh-namaPenyedia-hint');
  if (!sel) return;

  // Build options dari master
  sel.innerHTML = '<option value="">-- Pilih Penyedia --</option>';
  state.penyedia.data.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.namaPenyedia;
    opt.textContent = p.namaPenyedia;
    sel.appendChild(opt);
  });
  // Tambahkan opsi input manual
  const optManual = document.createElement('option');
  optManual.value = '__MANUAL__';
  optManual.textContent = '✏️ Ketik manual...';
  sel.appendChild(optManual);

  // Set nilai
  if (currentNama) {
    sel.value = currentNama;
    if (sel.value !== currentNama) {
      // Tidak ada di master — gunakan mode manual
      sel.value = '__MANUAL__';
      inp.value = currentNama;
      inp.style.display = '';
      hint.style.display = '';
    } else {
      inp.style.display = 'none';
      inp.value = '';
      hint.style.display = 'none';
    }
  } else {
    inp.style.display = 'none';
    inp.value = '';
    hint.style.display = 'none';
  }
}

function onPenyediaSelectChange() {
  const sel  = document.getElementById('fh-namaPenyedia');
  const inp  = document.getElementById('fh-namaPenyediaManual');
  const hint = document.getElementById('fh-namaPenyedia-hint');
  if (sel.value === '__MANUAL__') {
    inp.style.display = '';
    inp.value = '';
    hint.style.display = '';
    setTimeout(() => inp.focus(), 50);
  } else {
    inp.style.display = 'none';
    inp.value = '';
    hint.style.display = 'none';
    // Auto-fill link katalog dari master penyedia jika ada
    const masterP = state.penyedia.data.find(p => p.namaPenyedia === sel.value);
    if (masterP && masterP.linkToko) {
      const linkEl = document.getElementById('fh-linkKatalog');
      if (linkEl && !linkEl.value) linkEl.value = masterP.linkToko;
    }
  }
}

function syncManualPenyedia() {
  // Sinkron nilai manual ke hidden value agar v() bisa baca
}

function _getPenyediaNama() {
  const sel = document.getElementById('fh-namaPenyedia');
  const inp = document.getElementById('fh-namaPenyediaManual');
  if (!sel) return '';
  if (sel.value === '__MANUAL__') return (inp ? inp.value.trim() : '');
  return sel.value;
}

async function saveHarga() {
  const qty = vn('fh-qty'), ht = vn('fh-hargaTayang'), ongkir = vn('fh-ongkir');
  const pajak = v('fh-statusPajak');
  const dpp = pajak === 'Kena Pajak' ? Math.round(ht / 1.11) : ht;
  const ppn = pajak === 'Kena Pajak' ? ht - dpp : 0;
  const total = (ht + ongkir) * qty;
  const rec = {
    rup: v('fh-rup'), hps: vn('fh-hps'), namaPaket: v('fh-namaPaket'),
    namaItem: v('fh-namaItem'), namaProduk: v('fh-namaProduk'),
    namaPenyedia: _getPenyediaNama(), linkKatalog: v('fh-linkKatalog'),
    qty, satuan: v('fh-satuan'), hargaTayang: ht, statusPajak: pajak,
    dpp, ppn, ongkir, totalHarga: total,
    pdn: v('fh-pdn'), umkm: v('fh-umkm'), lokasi: v('fh-lokasi'),
    statusKatalog: v('fh-statusKatalog'), negoFinal: vn('fh-negoFinal'),
  };
  if (!rec.namaItem || !rec.rup) { toast('Nama Item dan RUP wajib diisi!', 'error'); return; }
  if (!rec.namaPenyedia) { toast('Nama Penyedia wajib diisi!', 'error'); return; }
  if (editId) rec.id = editId;
  try {
    await dbPut('harga', rec);
  } catch(err) {
    toast('Gagal simpan Survey Harga: ' + (err.message || err), 'error');
    return;
  }
  closeModal('modal-harga');
  state.harga.data = await dbGetAll('harga');
  state.harga.filtered = [...state.harga.data];
  filterHarga();
  updateBadges();
  toast(editId ? 'Data harga diupdate!' : 'Data harga ditambah!', 'success');
}

async function savePenyedia() {
  const rec = {
    namaPenyedia: v('fp-nama'), alamat: v('fp-alamat'),
    bentukUsaha: v('fp-bentuk'), status: v('fp-status'),
    tipe: v('fp-tipe'), linkToko: v('fp-link'),
  };
  if (!rec.namaPenyedia) { toast('Nama Penyedia wajib diisi!', 'error'); return; }
  if (editId) rec.id = editId;
  else { const all = await dbGetAll('penyedia'); rec.no = (all.length||0) + 1; }
  try {
    await dbPut('penyedia', rec);
  } catch(err) {
    toast('Gagal simpan Penyedia: ' + (err.message || err), 'error');
    return;
  }
  closeModal('modal-penyedia');
  state.penyedia.data = await dbGetAll('penyedia');
  state.penyedia.filtered = [...state.penyedia.data];
  filterPenyedia();
  populateDropdowns();
  toast(editId ? 'Penyedia diupdate!' : 'Penyedia ditambah!', 'success');
}

// ============================================================
//  DELETE
// ============================================================
function deleteRecord(store, id, name) {
  if (typeof isOperator === 'function' && !isOperator()) {
    toast('Anda tidak punya akses untuk menghapus data.', 'error'); return;
  }
  document.getElementById('delete-confirm-msg').innerHTML = `Yakin ingin menghapus <strong>${name}</strong>?`;
  const inp = document.getElementById('delete-confirm-input');
  const btn = document.getElementById('delete-confirm-btn');
  inp.value = ''; btn.disabled = true;
  btn.onclick = async () => {
    if (inp.value !== 'HAPUS') return;
    const rincianRec = store === 'rincian'
      ? (state.rincian.data || []).find(r => String(r.id) === String(id))
      : null;

    // ── SYNC HAPUS: hapus pembanding harga jika yang dihapus adalah rincian ──
    if (store === 'rincian' && typeof autoDeleteHargaPembanding === 'function') {
      try { await autoDeleteHargaPembanding(id, rincianRec); }
      catch(syncErr) { console.warn('[SyncData] Gagal hapus harga pembanding:', syncErr); }
    }

    await dbDelete(store, id);

    // Refresh state + jaga filter paket tetap aktif
    if (store === 'rincian') {
      state.rincian.data = await dbGetAll('rincian');
      if (typeof filterRincian === 'function') {
        filterRincian(); // pakai nilai dropdown/text filter yang sedang aktif
      } else if (state.rincian) {
        state.rincian.filtered = [...state.rincian.data];
      }

      state.harga.data = await dbGetAll('harga');
      if (typeof filterHarga === 'function') {
        filterHarga();
      } else if (state.harga) {
        state.harga.filtered = [...state.harga.data];
      }
    } else if (store === 'harga') {
      state.harga.data = await dbGetAll('harga');
      if (typeof filterHarga === 'function') {
        filterHarga();
      } else if (state.harga) {
        state.harga.filtered = [...state.harga.data];
      }
    } else {
      if (state[store]) {
        state[store].data = await dbGetAll(store);
        state[store].filtered = [...state[store].data];
      }
    }
    inp.value = ''; btn.disabled = true;
    closeModal('modal-delete');
    renderAll();
    updateBadges();
    populateDropdowns();
    populateEvatRupSelect();
    toast('Data berhasil dihapus', 'success');
    checkNotifications();
    setTimeout(() => {
      if (typeof validasiKelengkapanPembanding === 'function') validasiKelengkapanPembanding();
    }, 200);
  };
  openModal('modal-delete');
}

// ============================================================
//  AUTO-FILL HELPERS
// ============================================================
function autoFillBidang() {
  const sel = document.getElementById('f-bidang').value;
  const b = masterState.bidang.find(x => x.namaBidang === sel);
  document.getElementById('f-kepalaBidang').value = b ? b.kepalaBidang : '';
  document.getElementById('f-nip').value = b ? b.nip : '';
}

function autoFillHarga() {
  const rup = document.getElementById('fh-rup').value;
  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (paket) {
    document.getElementById('fh-namaPaket').value = paket.namaPaket||'';
    document.getElementById('fh-hps').value = paket.paguAnggaran||'';
  }
}

function calcJumlah() {
  const vol = vn('fr-vol'), hs = vn('fr-hargaSatuan');
  document.getElementById('fr-jumlah').value = vol * hs;
}

function calcHarga() {
  const qty = vn('fh-qty'), ht = vn('fh-hargaTayang');
  const ongkir = vn('fh-ongkir');
  const pajak = v('fh-statusPajak');
  const dpp = pajak === 'Kena Pajak' ? Math.round(ht / 1.11) : ht;
  const ppn = pajak === 'Kena Pajak' ? ht - dpp : 0;
  document.getElementById('fh-dpp').value = dpp;
  document.getElementById('fh-ppn').value = ppn;
  document.getElementById('fh-totalHarga').value = (ht + ongkir) * qty;
}
