// ============================================================
//  SI-DEVA — Export Excel (XLSX) v1.1.0
//  File: js/export-excel.js
//
//  Pasang di index.html SETELAH dashboard.js:
//    <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
//    <script src="js/export-excel.js"></script>
//
//  FIX v1.1.0:
//  [BUG-13] exportRincianXLSX: baris total di-append sebagai
//           array terakhir dengan XLSX.sheet_add_aoa tetapi
//           indeks kolom tidak sesuai; total dijumlah dari
//           r[8] padahal posisi kolom Jumlah adalah indeks 8
//           (benar), namun baris total tidak diberi style bold
//           sehingga tidak bisa dibedakan dari baris data.
//           Diperbaiki: gunakan aoa_to_sheet dengan baris total
//           sekaligus, hindari sheet_add_aoa terpisah.
//  [BUG-14] exportHargaXLSX: kolom linkKatalog (URL panjang)
//           bisa melebihi batas sel 32.767 karakter SheetJS.
//           Ditambahkan truncate 500 karakter.
//  [BUG-15] _injectExportButtons: variabel 'map' didefinisikan
//           tapi tidak pernah digunakan. Dihapus.
//  [BUG-16] exportSemuaXLSX: Sheet Paket hanya menyertakan 7
//           kolom dari semua field, sementara exportPaketXLSX
//           menyertakan 15 kolom. Dibuat konsisten 15 kolom
//           agar export "semua" tidak kehilangan data penting.
// ============================================================

// ── Helper: buat dan download file XLSX ──────────────────────
function _xlsxDownload(workbook, filename) {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob  = new Blob([wbout], { type: 'application/octet-stream' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = filename + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

function _xlsxSheet(data, cols) {
  const ws    = XLSX.utils.aoa_to_sheet([cols, ...data]);
  const widths = cols.map((h, i) => ({
    wch: Math.max(h.length + 2, ...data.map(r => String(r[i] || '').length + 1), 10),
  }));
  ws['!cols'] = widths;
  return ws;
}

// ── EXPORT PAKET ─────────────────────────────────────────────
function exportPaketXLSX() {
  if (typeof XLSX === 'undefined') {
    if (typeof toast === 'function') toast('Library Excel belum dimuat', 'error'); return;
  }
  if (!state.paket.data.length) {
    if (typeof toast === 'function') toast('Tidak ada data paket untuk diexport', 'error'); return;
  }
  const cfg  = typeof appConfig !== 'undefined' ? appConfig : {};
  const src  = state.paket.filtered?.length ? state.paket.filtered : state.paket.data;

  const rows = src.map(p => [
    p.noPaket || p.id,
    p.rup           || '',
    p.namaPaket     || '',
    p.opd           || '',
    p.bidang        || '',
    p.program       || '',
    p.kegiatan      || '',
    p.kodeRekening  || '',
    Number(p.paguAnggaran) || 0,
    p.durasi        || '',
    p.masaKerja     || '',
    p.tanggalPesanan|| '',
    p.tanggalSelesai|| '',
    p.kepalaBidang  || '',
    p.output        || '',
  ]);

  const cols = [
    'No Paket', 'No RUP', 'Nama Paket', 'OPD', 'Bidang',
    'Program', 'Kegiatan', 'Kode Rekening', 'Pagu Anggaran (Rp)',
    'Durasi', 'Masa Kerja', 'Tgl Pesanan', 'Tgl Selesai',
    'Kepala Bidang', 'Output',
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, _xlsxSheet(rows, cols), 'Data Paket');

  const infoRows = [
    ['Instansi',       cfg.namaInstansi || ''],
    ['Tahun Anggaran', cfg.tahunAnggaran || new Date().getFullYear()],
    ['Diekspor',       new Date().toLocaleString('id-ID')],
    ['Total Paket',    rows.length],
    ['Sumber',         'SI-DEVA v1.0.0 — Alam Satria, S.Kep., Ners., M.A.P'],
  ];
  const wsInfo       = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo['!cols']    = [{ wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info');

  _xlsxDownload(wb, `Data_Paket_${cfg.singkatan || 'SIDEVA'}`);
  if (typeof toast === 'function') toast(`✅ ${rows.length} data paket berhasil diexport`, 'success');
}

// ── EXPORT RINCIAN ────────────────────────────────────────────
function exportRincianXLSX() {
  if (typeof XLSX === 'undefined') {
    if (typeof toast === 'function') toast('Library Excel belum dimuat', 'error'); return;
  }
  if (!state.rincian.data.length) {
    if (typeof toast === 'function') toast('Tidak ada data rincian untuk diexport', 'error'); return;
  }
  const cfg = typeof appConfig !== 'undefined' ? appConfig : {};
  const src = state.rincian.filtered?.length ? state.rincian.filtered : state.rincian.data;

  const rows = src.map(r => {
    const paket = state.paket.data.find(p => String(p.rup) === String(r.rup));
    return [
      r.no            || '',
      r.rup           || '',
      paket?.namaPaket || '',
      paket?.bidang    || '',
      r.itemBarang    || '',
      Number(r.vol)          || 0,
      r.satuan        || '',
      Number(r.hargaSatuan)  || 0,
      Number(r.jumlah)       || 0,
      r.user          || '',
    ];
  });

  const cols = [
    'No', 'No RUP', 'Nama Paket', 'Bidang', 'Item Barang & Spek',
    'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Jumlah (Rp)', 'User Input',
  ];

  // [FIX BUG-13] Baris total disertakan langsung dalam array data
  // agar tidak perlu sheet_add_aoa terpisah (menghindari offset kolom).
  const totalJumlah  = rows.reduce((s, r) => s + (r[8] || 0), 0);
  const rowsWithTotal = [
    ...rows,
    ['', '', '', '', 'TOTAL', '', '', '', totalJumlah, ''],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, _xlsxSheet(rowsWithTotal, cols), 'Rincian Belanja');

  const infoRows = [
    ['Instansi',       cfg.namaInstansi || ''],
    ['Tahun Anggaran', cfg.tahunAnggaran || new Date().getFullYear()],
    ['Diekspor',       new Date().toLocaleString('id-ID')],
    ['Total Item',     rows.length],
    ['Total Nilai',    totalJumlah],
    ['Sumber',         'SI-DEVA v1.0.0 — Alam Satria, S.Kep., Ners., M.A.P'],
  ];
  const wsInfo       = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo['!cols']    = [{ wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info');

  _xlsxDownload(wb, `Rincian_Belanja_${cfg.singkatan || 'SIDEVA'}`);
  if (typeof toast === 'function') toast(`✅ ${rows.length} rincian berhasil diexport`, 'success');
}

// ── EXPORT SURVEY HARGA ───────────────────────────────────────
function exportHargaXLSX() {
  if (typeof XLSX === 'undefined') {
    if (typeof toast === 'function') toast('Library Excel belum dimuat', 'error'); return;
  }
  if (!state.harga.data.length) {
    if (typeof toast === 'function') toast('Tidak ada data survey harga untuk diexport', 'error'); return;
  }
  const cfg = typeof appConfig !== 'undefined' ? appConfig : {};
  const src = state.harga.filtered?.length ? state.harga.filtered : state.harga.data;

  const rows = src.map(h => [
    h.rup             || '',
    h.namaPaket       || '',
    h.namaItem        || '',
    h.namaProduk      || '',
    h.namaPenyedia    || '',
    // [FIX BUG-14] Truncate URL agar tidak melebihi batas sel SheetJS (32767 char)
    (h.linkKatalog    || '').slice(0, 500),
    Number(h.qty)         || 0,
    h.satuan          || '',
    Number(h.hargaTayang) || 0,
    h.statusPajak     || '',
    Number(h.dpp)         || 0,
    Number(h.ppn)         || 0,
    Number(h.ongkir)      || 0,
    Number(h.totalHarga)  || 0,
    Number(h.negoFinal)   || 0,
    h.statusKatalog   || '',
    h.pdn             || '',
    h.umkm            || '',
    h.lokasi          || '',
  ]);

  const cols = [
    'No RUP', 'Nama Paket', 'Item Barang', 'Nama Produk', 'Nama Penyedia',
    'Link Katalog', 'Qty', 'Satuan', 'Harga Tayang (Rp)', 'Status Pajak',
    'DPP (Rp)', 'PPN (Rp)', 'Ongkir (Rp)', 'Total Harga (Rp)', 'Nego Final (Rp)',
    'Status Katalog', 'PDN', 'UMKM', 'Lokasi',
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, _xlsxSheet(rows, cols), 'Survey Harga');

  const infoRows = [
    ['Instansi',       cfg.namaInstansi || ''],
    ['Tahun Anggaran', cfg.tahunAnggaran || new Date().getFullYear()],
    ['Diekspor',       new Date().toLocaleString('id-ID')],
    ['Total Item',     rows.length],
    ['Sumber',         'SI-DEVA v1.0.0 — Alam Satria, S.Kep., Ners., M.A.P'],
  ];
  const wsInfo       = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo['!cols']    = [{ wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info');

  _xlsxDownload(wb, `Survey_Harga_${cfg.singkatan || 'SIDEVA'}`);
  if (typeof toast === 'function') toast(`✅ ${rows.length} data survey harga berhasil diexport`, 'success');
}

// ── EXPORT SEMUA (multi-sheet) ────────────────────────────────
function exportSemuaXLSX() {
  if (typeof XLSX === 'undefined') {
    if (typeof toast === 'function') toast('Library Excel belum dimuat', 'error'); return;
  }
  const cfg = typeof appConfig !== 'undefined' ? appConfig : {};
  const wb  = XLSX.utils.book_new();

  // [FIX BUG-16] Sheet Paket kini menyertakan 15 kolom lengkap,
  // konsisten dengan exportPaketXLSX().
  if (state.paket.data.length) {
    const rows = state.paket.data.map(p => [
      p.noPaket || p.id,
      p.rup           || '',
      p.namaPaket     || '',
      p.opd           || '',
      p.bidang        || '',
      p.program       || '',
      p.kegiatan      || '',
      p.kodeRekening  || '',
      Number(p.paguAnggaran) || 0,
      p.durasi        || '',
      p.masaKerja     || '',
      p.tanggalPesanan|| '',
      p.tanggalSelesai|| '',
      p.kepalaBidang  || '',
      p.output        || '',
    ]);
    XLSX.utils.book_append_sheet(wb, _xlsxSheet(rows, [
      'No Paket', 'No RUP', 'Nama Paket', 'OPD', 'Bidang',
      'Program', 'Kegiatan', 'Kode Rekening', 'Pagu (Rp)',
      'Durasi', 'Masa Kerja', 'Tgl Pesanan', 'Tgl Selesai',
      'Kepala Bidang', 'Output',
    ]), 'Paket');
  }

  if (state.rincian.data.length) {
    const rows = state.rincian.data.map(r => [
      r.rup          || '',
      r.itemBarang   || '',
      Number(r.vol)          || 0,
      r.satuan       || '',
      Number(r.hargaSatuan)  || 0,
      Number(r.jumlah)       || 0,
    ]);
    XLSX.utils.book_append_sheet(wb, _xlsxSheet(rows, [
      'No RUP', 'Item Barang', 'Vol', 'Satuan',
      'Harga Satuan (Rp)', 'Jumlah (Rp)',
    ]), 'Rincian');
  }

  if (state.harga.data.length) {
    const rows = state.harga.data.map(h => [
      h.rup           || '',
      h.namaItem      || '',
      h.namaProduk    || '',
      h.namaPenyedia  || '',
      Number(h.qty)         || 0,
      Number(h.hargaTayang) || 0,
      Number(h.totalHarga)  || 0,
      Number(h.negoFinal)   || 0,
      h.statusKatalog || '',
    ]);
    XLSX.utils.book_append_sheet(wb, _xlsxSheet(rows, [
      'No RUP', 'Item', 'Produk', 'Penyedia',
      'Qty', 'Harga Tayang', 'Total', 'Nego Final', 'Status',
    ]), 'Harga');
  }

  _xlsxDownload(wb, `SIDEVA_Export_${cfg.singkatan || 'ALL'}`);
  if (typeof toast === 'function') toast('✅ Export semua data berhasil!', 'success');
}

// ── Inject tombol Export ke tabel ────────────────────────────
function _injectExportButtons() {
  // [FIX BUG-15] Variabel 'map' yang tidak terpakai dihapus.
  const targets = [
    { searchId: 'search-paket',   btnId: 'btn-export-paket',   fn: 'exportPaketXLSX',   label: '📊 Excel' },
    { searchId: 'search-rincian', btnId: 'btn-export-rincian', fn: 'exportRincianXLSX', label: '📊 Excel' },
    { searchId: 'search-harga',   btnId: 'btn-export-harga',   fn: 'exportHargaXLSX',   label: '📊 Excel' },
  ];

  targets.forEach(({ searchId, btnId, fn, label }) => {
    if (document.getElementById(btnId)) return;
    const searchEl = document.getElementById(searchId);
    if (!searchEl) return;
    const bar = searchEl.closest('.search-bar');
    if (!bar) return;
    const btn         = document.createElement('button');
    btn.id            = btnId;
    btn.className     = 'btn btn-secondary btn-sm';
    btn.innerHTML     = label;
    btn.style.cssText = 'white-space:nowrap;flex-shrink:0;';
    btn.onclick       = window[fn];
    bar.appendChild(btn);
  });
}

// ── Listen page changes (avoid monkey-patching showPage) ──────
window.addEventListener('sideva:page-changed', (e) => {
  const name = e?.detail?.page;
  if (['paket', 'rincian', 'harga'].includes(name)) {
    setTimeout(_injectExportButtons, 350);
  }
});

// ── Init saat DOM siap ────────────────────────────────────────
window.addEventListener('sb-ready', () => setTimeout(_injectExportButtons, 1200));
