// ============================================================
//  SI-DEVA — Cetak / Export PDF Laporan Realisasi v1.2.0
//  File: js/laporan-print-patch.js
//
//  Pasang di index.html SETELAH dashboard.js:
//    <script src="js/laporan-print-patch.js"></script>
//
//  FIX v1.2.0:
//  [BUG-17] _hitungNilaiPenetapan: fallback saat negoFinal = 0
//           sebelumnya menggunakan hargaTayang × qty, padahal
//           hargaTayang adalah harga per-unit SEBELUM pajak dan
//           ongkir. Nilai kontrak yang benar adalah totalHarga
//           (yang sudah mencakup qty × harga + PPN + ongkir),
//           sehingga tidak perlu dikalikan qty lagi.
//           Berlaku di: seleksi pemenang & akumulasi total
//           no-rincian. rekap-bidang.js dan
//           laporan-charts-patch.js mengikuti formula yang sama.
//
//  FIX v1.1.0 (tetap berlaku):
//  [BUG-05] Progres bar di tabel cetak diganti SVG inline.
//  [BUG-06] Efisiensi di-guard cek pagu > 0.
//  [BUG-07] Cek blokir popup sebelum membangun HTML besar.
//  [BUG-08] sumEf dihitung dari sumPagu - sumNego (identitas).
// ============================================================

// ── Helper: hitung Nilai Penetapan per RUP (BAHPE) ──────────
// Definisi ini menjadi sumber kebenaran tunggal.
// rekap-bidang.js mendeteksi keberadaannya dan tidak
// mendefinisikan ulang jika sudah ada.
function _hitungNilaiPenetapan(rup) {
  const rupStr        = String(rup);
  const hargaForRup   = state.harga.data.filter(h => String(h.rup) === rupStr);
  const rincianForRup = state.rincian.data.filter(r => String(r.rup) === rupStr);

  if (!hargaForRup.length) return 0;

  // Formula IDENTIK dengan _nilaiNegoPemenang & nilaiNego di BAHPE (dashboard.js):
  // Nilai Hasil Negosiasi = (negoFinal > 0 ? negoFinal : hargaTayang) × qty
  // untuk semua item milik penyedia pemenang (total terkecil).
  const totMap = {};
  hargaForRup.forEach(h => {
    if (!h.namaPenyedia) return;
    totMap[h.namaPenyedia] = (totMap[h.namaPenyedia] || 0)
      + (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0))
      * (Number(h.qty) || 1);
  });
  const entries = Object.entries(totMap).filter(e => e[1] > 0);
  if (!entries.length) return 0;
  const penyediaTerpilih = entries.reduce((a, b) => a[1] <= b[1] ? a : b)[0];

  return hargaForRup
    .filter(h => h.namaPenyedia === penyediaTerpilih)
    .reduce((s, h) =>
      s + (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0))
        * (Number(h.qty) || 1),
    0);
}

// ── Helper: nama penyedia pemenang per RUP ────────────────────
// Formula IDENTIK _nilaiNegoPemenang: (negoFinal || hargaTayang) × qty, terendah.
function _getPemenangRup(rup) {
  const rupStr     = String(rup);
  const hargaForRup = state.harga.data.filter(h => String(h.rup) === rupStr);
  if (!hargaForRup.length) return '-';
  const totMap = {};
  hargaForRup.forEach(h => {
    if (!h.namaPenyedia) return;
    totMap[h.namaPenyedia] = (totMap[h.namaPenyedia] || 0)
      + (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0))
      * (Number(h.qty) || 1);
  });
  const entries = Object.entries(totMap).filter(e => e[1] > 0);
  if (!entries.length) return '-';
  return entries.reduce((a, b) => a[1] <= b[1] ? a : b)[0];
}

// ── Helper: mini progress bar sebagai SVG inline ─────────────
// [FIX BUG-05] HTML <div> di dalam <td> tabel print tidak
// selalu di-render oleh engine PDF browser. SVG inline lebih
// andal karena dianggap elemen grafik, bukan layout box.
function _svgBar(pct) {
  const w    = Math.min(pct, 100).toFixed(1);
  const full = 80; // lebar bar dalam SVG unit
  const fill = pct > 100  ? '#dc2626'
             : pct >= 80  ? '#d97706'
             : pct > 0    ? '#16a34a'
             :               '#9ca3af';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${full}" height="10" viewBox="0 0 ${full} 10">
    <rect width="${full}" height="10" rx="4" fill="#e5e7eb"/>
    <rect width="${(w / 100 * full).toFixed(1)}" height="10" rx="4" fill="${fill}"/>
  </svg>`;
}

// ── Fungsi cetak utama ────────────────────────────────────────
function printLaporan() {
  if (!state.paket.data.length) {
    if (typeof toast === 'function') toast('Belum ada data untuk dicetak', 'error');
    return;
  }

  // [FIX BUG-07] Cek blokir popup sebelum membangun HTML besar
  const testWin = window.open('', '_blank', 'width=1,height=1');
  if (!testWin) {
    if (typeof toast === 'function') toast('Izinkan popup browser untuk mencetak', 'error');
    return;
  }
  testWin.close();

  const cfg      = typeof appConfig !== 'undefined' ? appConfig : {};
  const instansi = cfg.namaInstansi || cfg.singkatan || 'Instansi';
  const tgl      = new Date().toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const tahun    = cfg.tahunAnggaran || new Date().getFullYear();

  // ── Hitung data ───────────────────────────────────────────
  const rows = state.paket.data.map(p => {
    const pagu      = Number(p.paguAnggaran) || 0;
    const totalNego = _hitungNilaiPenetapan(p.rup);
    const pct       = pagu > 0 ? (totalNego / pagu * 100) : 0;
    const ef        = pagu - totalNego;
    const pemenang  = _getPemenangRup(p.rup);
    return { ...p, pagu, totalNego, pct, ef, pemenang };
  });

  const sumPagu = rows.reduce((s, r) => s + r.pagu, 0);
  const sumNego = rows.reduce((s, r) => s + r.totalNego, 0);
  const sumEf   = sumPagu - sumNego;      // [BUG-08] identitas
  const sumPct  = sumPagu > 0 ? (sumNego / sumPagu * 100) : 0;

  const fRp = v => 'Rp ' + (Number(v) || 0).toLocaleString('id-ID');
  const clr = p => p > 100  ? '#dc2626'
                 : p >= 80  ? '#d97706'
                 : p > 0    ? '#16a34a'
                 :             '#6b7280';

  const logoSrc = localStorage.getItem('sideva_logo_instansi') || '';
  const kopImg  = localStorage.getItem('sideva_kop_surat_img')  || '';

  const kopHTML = kopImg
    ? `<img src="${kopImg}" style="width:100%;display:block;margin-bottom:12px;">`
    : `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;padding-bottom:10px;border-bottom:3px double #000;">
        <tr>
          <td style="width:72px;text-align:center;vertical-align:middle;border:none;">
            ${logoSrc
              ? `<img src="${logoSrc}" style="width:60px;height:60px;object-fit:contain;">`
              : `<svg width="60" height="60" viewBox="0 0 64 64">
                   <circle cx="32" cy="32" r="30" fill="none" stroke="#000" stroke-width="1.5"/>
                   <polygon points="32,14 34.4,24.6 44.8,22.6 37.6,30.2 44.8,37.8 34.4,35.8
                                    32,46.4 29.6,35.8 19.2,37.8 26.4,30.2 19.2,22.6 29.6,24.6"
                            fill="none" stroke="#000" stroke-width="1.2"/>
                 </svg>`}
          </td>
          <td style="text-align:center;vertical-align:middle;border:none;">
            <div style="font-size:9pt;font-weight:bold;">
              ${'PEMERINTAH ' + (cfg.kabupaten || '').toUpperCase()}
            </div>
            <div style="font-size:13pt;font-weight:bold;line-height:1.3;">
              ${(cfg.namaInstansi || '').toUpperCase()}
            </div>
            <div style="font-size:8pt;margin-top:3px;">${cfg.alamat || ''}</div>
            <div style="font-size:8pt;">
              ${cfg.telepon ? 'Telp. ' + cfg.telepon : ''}
              ${cfg.website ? '| ' + cfg.website : ''}
            </div>
          </td>
          <td style="width:72px;text-align:center;vertical-align:middle;border:none;">
            ${logoSrc
              ? `<img src="${logoSrc}" style="width:60px;height:60px;object-fit:contain;opacity:.85;">`
              : `<svg width="60" height="60" viewBox="0 0 64 64">
                   <circle cx="32" cy="32" r="30" fill="none" stroke="#000" stroke-width="1.5"/>
                   <text x="32" y="34" text-anchor="middle" font-family="serif"
                         font-size="8" font-weight="bold" fill="#000">
                     ${(cfg.singkatan || '').toUpperCase()}
                   </text>
                 </svg>`}
          </td>
        </tr>
      </table>`;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Realisasi Anggaran — ${instansi} ${tahun}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family:'Times New Roman',Times,serif;
    font-size:11pt; color:#000; background:#fff;
    padding:20mm 20mm 20mm 25mm;
  }
  h2 { font-size:13pt; text-align:center; margin:14px 0 2px; letter-spacing:.5px; }
  .sub { font-size:10pt; text-align:center; margin-bottom:14px; color:#333; }
  .sum-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px; }
  .sum-box { border:1px solid #ccc; border-radius:6px; padding:10px 14px; text-align:center; }
  .sum-box .val { font-size:12pt; font-weight:bold; margin:4px 0; }
  .sum-box .lbl { font-size:8pt; color:#555; }
  table.main { width:100%; border-collapse:collapse; font-size:9pt; }
  table.main th {
    background:#1e3a5f; color:#fff;
    padding:7px 8px; text-align:center;
    font-weight:700; border:1px solid #1e3a5f;
  }
  table.main td { padding:6px 8px; border:1px solid #ccc; vertical-align:middle; }
  table.main tr:nth-child(even) td { background:#f8f9fa; }
  table.main tfoot td {
    background:#1e3a5f; color:#fff;
    font-weight:700; border:1px solid #1e3a5f;
  }
  .right  { text-align:right; font-family:'Courier New',monospace; }
  .center { text-align:center; }
  .footer-doc {
    margin-top:30px; font-size:9pt;
    text-align:right; color:#555;
    border-top:1px solid #ccc; padding-top:8px;
  }
  @media print {
    body { padding:10mm 15mm 10mm 20mm; }
    @page { size:A4 landscape; margin:10mm 15mm; }
  }
</style>
</head>
<body>

  ${kopHTML}

  <h2>LAPORAN REALISASI ANGGARAN</h2>
  <div class="sub">
    Tahun Anggaran ${tahun} &nbsp;|&nbsp; ${instansi} &nbsp;|&nbsp; Per ${tgl}
  </div>

  <!-- Ringkasan -->
  <div class="sum-grid">
    <div class="sum-box">
      <div class="lbl">Total Pagu Anggaran</div>
      <div class="val">${fRp(sumPagu)}</div>
    </div>
    <div class="sum-box" style="border-color:${clr(sumPct)}">
      <div class="lbl">Total Nilai Kontrak</div>
      <div class="val" style="color:${clr(sumPct)}">${fRp(sumNego)}</div>
      <div class="lbl">Serapan ${sumPct.toFixed(1)}%</div>
    </div>
    <div class="sum-box" style="border-color:${sumEf >= 0 ? '#16a34a' : '#dc2626'}">
      <div class="lbl">Efisiensi Anggaran</div>
      <div class="val" style="color:${sumEf >= 0 ? '#16a34a' : '#dc2626'}">
        ${sumEf >= 0 ? '+' : ''}${fRp(sumEf)}
      </div>
    </div>
  </div>

  <!-- Tabel Detail -->
  <table class="main">
    <thead>
      <tr>
        <th style="width:28px;">No</th>
        <th style="width:60px;">No RUP</th>
        <th>Nama Paket</th>
        <th style="width:80px;">Bidang</th>
        <th>Pemenang</th>
        <th style="width:110px;">Pagu (Rp)</th>
        <th style="width:110px;">Nilai Kontrak</th>
        <th style="width:54px;">Serapan</th>
        <th style="width:110px;">Efisiensi</th>
        <th style="width:90px;">Progres</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r, i) => `<tr>
        <td class="center">${i + 1}</td>
        <td class="center" style="font-family:monospace;font-size:8pt;">${r.rup || '-'}</td>
        <td>${(r.namaPaket || '-').slice(0, 45)}</td>
        <td class="center" style="font-size:8.5pt;">${r.bidang || '-'}</td>
        <td style="font-size:8pt;">${(r.pemenang || '-').slice(0, 35)}</td>
        <td class="right">${r.pagu ? fRp(r.pagu) : '-'}</td>
        <td class="right" style="color:${clr(r.pct)};font-weight:${r.totalNego ? '700' : '400'};">
          ${r.totalNego ? fRp(r.totalNego) : '-'}
        </td>
        <td class="center" style="color:${clr(r.pct)};font-weight:700;">
          ${r.pct > 0 ? r.pct.toFixed(1) + '%' : '-'}
        </td>
        <td class="right" style="color:${r.ef >= 0 ? '#16a34a' : '#dc2626'};font-weight:600;">
          ${r.pagu ? (r.ef >= 0 ? '+' : '') + fRp(r.ef) : '-'}
        </td>
        <td style="padding:6px 8px;">
          ${_svgBar(r.pct)}
        </td>
      </tr>`).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="text-align:center;">TOTAL (${rows.length} Paket)</td>
        <td class="right">${fRp(sumPagu)}</td>
        <td class="right">${fRp(sumNego)}</td>
        <td class="center">${sumPct.toFixed(1)}%</td>
        <td class="right">${sumEf >= 0 ? '+' : ''}${fRp(sumEf)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer-doc">
    Dicetak oleh SI-DEVA v1.0.0 &nbsp;|&nbsp; ${tgl} &nbsp;|&nbsp;
    Created by Alam Satria, S.Kep., Ners., M.A.P &nbsp;|&nbsp; © 2026
  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=750');
  if (!win) {
    if (typeof toast === 'function') toast('Izinkan popup browser untuk mencetak', 'error');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = function () {
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  if (typeof toast === 'function') toast('Membuka pratinjau cetak…', 'success');
}

// ── Patch renderLaporan: tambah tombol Cetak PDF ─────────────
const _origRenderLaporan = window.renderLaporan;
window.renderLaporan = function () {
  if (typeof _origRenderLaporan === 'function') _origRenderLaporan.apply(this, arguments);

  setTimeout(() => {
    const cardHeaders = document.querySelectorAll('#laporan-content .card-header');
    cardHeaders.forEach(h => {
      if (h.querySelector('.btn-laporan-print')) return;
      const btn       = document.createElement('button');
      btn.className   = 'btn btn-secondary btn-sm btn-laporan-print';
      btn.innerHTML   = '🖨️ Cetak / PDF';
      btn.style.marginLeft = '8px';
      btn.onclick     = printLaporan;
      const existBtn  = h.querySelector('button');
      if (existBtn) existBtn.after(btn);
      else h.appendChild(btn);
    });
  }, 300);
};
