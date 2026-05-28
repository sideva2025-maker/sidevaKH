// ============================================================
//  SI-DEVA — Chart & Diagram Realisasi Belanja v2.0.0
//  File: js/laporan-charts-patch.js
//
//  PERUBAHAN v2.0.0:
//  [NEW] Chart Row 3: Efisiensi Anggaran per Bidang (horizontal bar)
//  [NEW] Chart Row 4: Top 10 Pemenang (bar chart nilai kontrak)
//  [NEW] Kolom Pemenang ditampilkan dengan badge berwarna di tabel
//  [NEW] Tabel ringkasan pemenang per bidang di bawah chart
//  [KEEP] Semua fix dari v1.2.0 tetap berlaku
// ============================================================

// ── Instance chart ────────────────────────────────────────────
let chartLaporanDoughnut  = null;
let chartLaporanBidang    = null;
let chartLaporanPaket     = null;
let chartLaporanEfisiensi = null;
let chartLaporanPemenang  = null;

function renderLaporan() {
  const el = document.getElementById('laporan-content');
  if (!el) return;

  if (!state.paket.data.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-title">Belum ada data</div>
        <div class="empty-sub">Tambahkan Data Paket terlebih dahulu</div>
      </div>`;
    return;
  }

  // ── Hitung semua baris ──────────────────────────────────────
  let rows = state.paket.data.map(p => {
    const pagu      = Number(p.paguAnggaran) || 0;
    const totalNego = (typeof _hitungNilaiPenetapan === 'function')
      ? _hitungNilaiPenetapan(p.rup)
      : (() => {
          const rupStr = String(p.rup);
          const hi     = state.harga.data.filter(h => String(h.rup) === rupStr);
          if (!hi.length) return 0;
          const totPer = {};
          hi.forEach(h => {
            if (h.namaPenyedia)
              totPer[h.namaPenyedia] = (totPer[h.namaPenyedia] || 0)
                + (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0))
                * (Number(h.qty) || 1);
          });
          const entries = Object.entries(totPer).filter(e => e[1] > 0);
          if (!entries.length) return 0;
          const win = entries.reduce((a, b) => a[1] <= b[1] ? a : b)[0];
          return hi.filter(h => h.namaPenyedia === win)
            .reduce((s, h) => s + (Number(h.negoFinal) > 0
              ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0))
              * (Number(h.qty) || 1), 0);
        })();

    const pct      = pagu > 0 ? (totalNego / pagu * 100) : 0;
    const ef       = pagu - totalNego;

    const pemenang = (typeof _getPemenangRup === 'function') ? _getPemenangRup(p.rup) : (() => {
      const rupStr = String(p.rup);
      const hi     = state.harga.data.filter(h => String(h.rup) === rupStr);
      if (!hi.length) return '-';
      const totPer = {};
      hi.forEach(h => {
        if (h.namaPenyedia)
          totPer[h.namaPenyedia] = (totPer[h.namaPenyedia] || 0)
            + (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0))
            * (Number(h.qty) || 1);
      });
      const ents = Object.entries(totPer).filter(e => e[1] > 0);
      return ents.length ? ents.reduce((a, b) => a[1] <= b[1] ? a : b)[0] : '-';
    })();

    return { ...p, pagu, totalNego, pct, ef, pemenang };
  });

  // ── Terapkan filter ────────────────────────────────────────
  const fBidang  = (document.getElementById('laporan-filter-bidang')?.value  || '').trim();
  const fProgres = (document.getElementById('laporan-filter-progres')?.value || '').trim();
  const fPagu    = (document.getElementById('laporan-filter-pagu')?.value    || '').trim();

  if (fBidang)  rows = rows.filter(r => (r.bidang || '') === fBidang);
  if (fProgres === 'done')  rows = rows.filter(r => r.pct >= 100);
  else if (fProgres === 'on')   rows = rows.filter(r => r.pct > 0 && r.pct < 100);
  else if (fProgres === 'zero') rows = rows.filter(r => r.pct === 0);
  if (fPagu === 'over') rows = rows.filter(r => r.pct > 100);
  else if (fPagu === 'warn') rows = rows.filter(r => r.pct >= 90 && r.pct <= 100);
  else if (fPagu === 'ok')   rows = rows.filter(r => r.pct < 90);

  // Isi dropdown bidang
  const selBidang = document.getElementById('laporan-filter-bidang');
  if (selBidang && selBidang.options.length <= 1) {
    const bidangSet = [...new Set(state.paket.data.map(p => p.bidang || '').filter(Boolean))].sort();
    bidangSet.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b; opt.textContent = b;
      selBidang.appendChild(opt);
    });
    if (fBidang) selBidang.value = fBidang;
  }

  // ── Agregasi utama ─────────────────────────────────────────
  const sumPagu = rows.reduce((s, r) => s + r.pagu, 0);
  const sumNego = rows.reduce((s, r) => s + r.totalNego, 0);
  const sumEf   = sumPagu - sumNego;
  const sumPct  = sumPagu > 0 ? (sumNego / sumPagu * 100) : 0;
  const clr     = p => p > 100 ? '#ef4444' : p >= 80 ? '#f59e0b' : p > 0 ? '#22c55e' : '#6b7280';

  // ── Per bidang ─────────────────────────────────────────────
  const bidangMap = {};
  rows.forEach(r => {
    const b = r.bidang || 'Lainnya';
    if (!bidangMap[b]) bidangMap[b] = { pagu: 0, nego: 0, ef: 0 };
    bidangMap[b].pagu += r.pagu;
    bidangMap[b].nego += r.totalNego;
    bidangMap[b].ef   += r.ef;
  });
  const bidangLabels = Object.keys(bidangMap);
  const bidangPagu   = bidangLabels.map(b => bidangMap[b].pagu);
  const bidangNego   = bidangLabels.map(b => bidangMap[b].nego);
  const bidangEf     = bidangLabels.map(b => bidangMap[b].ef);

  // ── Rekapitulasi pemenang ──────────────────────────────────
  const pemenangMap = {};
  rows.forEach(r => {
    if (!r.pemenang || r.pemenang === '-') return;
    if (!pemenangMap[r.pemenang]) pemenangMap[r.pemenang] = { jumlah: 0, nilai: 0 };
    pemenangMap[r.pemenang].jumlah++;
    pemenangMap[r.pemenang].nilai += r.totalNego;
  });
  const topPemenang = Object.entries(pemenangMap)
    .sort((a, b) => b[1].nilai - a[1].nilai)
    .slice(0, 10);

  // ── Render HTML ────────────────────────────────────────────
  el.innerHTML = `
    <!-- STAT CARDS -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value" style="font-size:15px;">${fmtRp(sumPagu)}</div>
        <div class="stat-label">Total Pagu Anggaran</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🤝</div>
        <div class="stat-value" style="font-size:15px;color:${clr(sumPct)};">${fmtRp(sumNego)}</div>
        <div class="stat-label">Total Nilai Kontrak (${sumPct.toFixed(1)}%)</div>
      </div>
      <div class="stat-card" style="border-color:${sumEf >= 0 ? '#22c55e' : '#ef4444'}40;">
        <div class="stat-icon">${sumEf >= 0 ? '📉' : '⚠️'}</div>
        <div class="stat-value" style="font-size:15px;color:${sumEf >= 0 ? '#22c55e' : '#ef4444'};">
          ${sumEf >= 0 ? '+' : ''}${fmtRp(sumEf)}
        </div>
        <div class="stat-label">${sumEf >= 0 ? 'Total Efisiensi' : 'Melebihi Pagu!'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏢</div>
        <div class="stat-value">${rows.length}</div>
        <div class="stat-label">Jumlah Paket</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-value">${topPemenang.length}</div>
        <div class="stat-label">Jumlah Penyedia</div>
      </div>
    </div>

    <!-- CHART ROW 1: Doughnut + Bar Bidang -->
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:16px;margin-bottom:16px;">
      <div class="card" style="padding:20px;">
        <div class="card-title" style="margin-bottom:14px;font-size:13px;font-weight:700;">🎯 Serapan Anggaran Keseluruhan</div>
        <div style="position:relative;height:200px;">
          <canvas id="chart-laporan-doughnut"></canvas>
        </div>
        <div style="display:flex;justify-content:center;gap:14px;margin-top:10px;font-size:11px;flex-wrap:wrap;">
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="width:10px;height:10px;border-radius:50%;background:#22c55e;display:inline-block;"></span>Terserap
          </span>
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="width:10px;height:10px;border-radius:50%;background:#C9A84C;display:inline-block;"></span>Efisiensi
          </span>
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="width:10px;height:10px;border-radius:50%;background:#374151;display:inline-block;"></span>Belum
          </span>
        </div>
      </div>
      <div class="card" style="padding:20px;">
        <div class="card-title" style="margin-bottom:14px;font-size:13px;font-weight:700;">📊 Pagu vs Kontrak per Bidang</div>
        <div style="position:relative;height:200px;">
          <canvas id="chart-laporan-bidang"></canvas>
        </div>
      </div>
    </div>

    <!-- CHART ROW 2: Horizontal Bar per Paket -->
    <div class="card" style="padding:20px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div class="card-title" style="font-size:13px;font-weight:700;">
          📦 Realisasi per Paket${rows.length > 10 ? ' (Top 10 Nilai Kontrak Terbesar)' : ''}
        </div>
        <div style="font-size:10px;color:var(--text3,#9ca3af);">
          Biru = Pagu &nbsp;|&nbsp; Emas = Nilai Kontrak &nbsp;|&nbsp; Hover untuk detail
        </div>
      </div>
      <div style="position:relative;height:${Math.max(200, Math.min(rows.length, 10) * 40)}px;">
        <canvas id="chart-laporan-paket"></canvas>
      </div>
    </div>

    <!-- CHART ROW 3: Efisiensi per Bidang -->
    <div class="card" style="padding:20px;margin-bottom:16px;">
      <div class="card-title" style="margin-bottom:14px;font-size:13px;font-weight:700;">💡 Efisiensi Anggaran per Bidang</div>
      <div style="position:relative;height:${Math.max(160, bidangLabels.length * 42)}px;">
        <canvas id="chart-laporan-efisiensi"></canvas>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:8px;">
        Hijau = efisiensi positif (nilai kontrak &lt; pagu) &nbsp;|&nbsp; Merah = melebihi pagu
      </div>
    </div>

    <!-- CHART ROW 4: Top Pemenang -->
    ${topPemenang.length > 0 ? `
    <div class="card" style="padding:20px;margin-bottom:16px;">
      <div class="card-title" style="margin-bottom:14px;font-size:13px;font-weight:700;">🏆 Top Pemenang berdasarkan Nilai Kontrak</div>
      <div style="position:relative;height:${Math.max(160, topPemenang.length * 40)}px;">
        <canvas id="chart-laporan-pemenang"></canvas>
      </div>
    </div>` : ''}

    <!-- TABEL DETAIL -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">📋 Detail Realisasi per Paket</div>
        <button class="btn btn-secondary btn-sm" onclick="exportLaporanCSV()">📥 Export CSV</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>No</th><th>Nama Paket</th><th>Bidang</th>
            <th>🏆 Pemenang</th>
            <th style="text-align:right;">Pagu (Rp)</th>
            <th style="text-align:right;">Nilai Kontrak</th>
            <th>Serapan</th>
            <th style="text-align:right;">Efisiensi</th>
            <th>Progres</th>
          </tr></thead>
          <tbody>
            ${rows.length ? rows.map((r, idx) => `<tr>
              <td style="text-align:center;color:var(--text3);font-size:12px;">${idx+1}</td>
              <td>
                <div style="font-size:12px;font-weight:600;">${strTrunc(r.namaPaket || '-', 38)}</div>
                <div style="font-size:10px;color:var(--text3);font-family:monospace;">RUP: ${r.rup || '-'}</div>
              </td>
              <td>
                <span style="font-size:11px;background:var(--surface2);border:1px solid var(--border);
                             border-radius:10px;padding:2px 8px;">${r.bidang || '-'}</span>
              </td>
              <td>
                ${r.pemenang && r.pemenang !== '-'
                  ? `<div style="display:flex;align-items:center;gap:5px;">
                       <span style="font-size:13px;">🏆</span>
                       <span style="font-size:11px;font-weight:600;color:#92400e;
                                    background:#fef3c7;border:1px solid #f59e0b33;
                                    border-radius:8px;padding:3px 8px;max-width:150px;
                                    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
                                    display:block;" title="${r.pemenang}">
                         ${strTrunc(r.pemenang, 25)}
                       </span>
                     </div>`
                  : `<span style="font-size:11px;color:var(--text3);">—</span>`}
              </td>
              <td style="text-align:right;font-family:monospace;font-size:12px;">${r.pagu ? fmtRp(r.pagu) : '-'}</td>
              <td style="text-align:right;font-family:monospace;font-size:12px;color:${clr(r.pct)};">
                ${r.totalNego ? fmtRp(r.totalNego) : '-'}
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;">
                  <div class="pagu-bar-wrap">
                    <div class="pagu-bar-fill" style="width:${Math.min(r.pct, 100)}%;background:${clr(r.pct)};"></div>
                  </div>
                  <span style="font-size:11px;color:${clr(r.pct)};min-width:34px;text-align:right;">
                    ${r.pct > 0 ? r.pct.toFixed(1) + '%' : '-'}
                  </span>
                </div>
              </td>
              <td style="text-align:right;font-weight:600;color:${r.ef >= 0 ? '#22c55e' : '#ef4444'};">
                ${r.pagu ? ((r.ef >= 0 ? '+' : '') + fmtRp(r.ef)) : '-'}
              </td>
              <td>
                <div onclick="showProgressDetail('${r.rup}')" style="cursor:pointer;">
                  ${renderProgressBar(r.rup)}
                </div>
              </td>
            </tr>`).join('')
            : '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:20px;">Tidak ada data sesuai filter</td></tr>'}
          </tbody>
          <tfoot><tr style="font-weight:700;background:var(--surface2);">
            <td colspan="3" style="padding:10px 12px;">Total (${rows.length} paket)</td>
            <td style="font-size:11px;color:var(--text3);padding:10px 12px;">
              ${topPemenang.length} penyedia
            </td>
            <td style="text-align:right;font-family:monospace;">${fmtRp(sumPagu)}</td>
            <td style="text-align:right;font-family:monospace;color:${clr(sumPct)};">${fmtRp(sumNego)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:6px;">
                <div class="pagu-bar-wrap">
                  <div class="pagu-bar-fill" style="width:${Math.min(sumPct, 100)}%;background:${clr(sumPct)};"></div>
                </div>
                <span style="font-size:11px;color:${clr(sumPct)};">${sumPct.toFixed(1)}%</span>
              </div>
            </td>
            <td style="text-align:right;color:${sumEf >= 0 ? '#22c55e' : '#ef4444'};">
              ${sumEf >= 0 ? '+' : ''}${fmtRp(sumEf)}
            </td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>
    </div>

    <!-- TABEL RINGKASAN PEMENANG PER BIDANG -->
    ${topPemenang.length > 0 ? `
    <div class="card" style="margin-top:16px;">
      <div class="card-header">
        <div class="card-title">🏆 Rekap Pemenang Lelang</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>No</th>
            <th>Nama Penyedia / Pemenang</th>
            <th style="text-align:center;">Jumlah Paket</th>
            <th style="text-align:right;">Total Nilai Kontrak</th>
          </tr></thead>
          <tbody>
            ${topPemenang.map(([nama, info], i) => `<tr>
              <td style="text-align:center;color:var(--text3);">${i+1}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  ${i === 0 ? '<span style="font-size:18px;">🥇</span>' : i === 1 ? '<span style="font-size:16px;">🥈</span>' : i === 2 ? '<span style="font-size:15px;">🥉</span>' : '<span style="font-size:14px;">🏅</span>'}
                  <span style="font-weight:600;">${nama}</span>
                </div>
              </td>
              <td style="text-align:center;">
                <span style="background:var(--surface2);border:1px solid var(--border);
                             border-radius:10px;padding:2px 10px;font-size:12px;font-weight:600;">
                  ${info.jumlah} paket
                </span>
              </td>
              <td style="text-align:right;font-family:monospace;font-size:12px;font-weight:600;color:#92400e;">
                ${fmtRp(info.nilai)}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}`;

  // ── Render Charts ─────────────────────────────────────────
  requestAnimationFrame(() => {
    Chart.defaults.color       = '#786850';
    Chart.defaults.borderColor = 'rgba(201,168,76,0.12)';

    // ── Chart 1: Doughnut serapan ─────────────────────────────
    if (chartLaporanDoughnut) chartLaporanDoughnut.destroy();
    const ctxD = document.getElementById('chart-laporan-doughnut');
    if (ctxD) {
      const efisiensiNilai = Math.max(0, sumEf);
      const belumNilai     = Math.max(0, sumPagu - sumNego - efisiensiNilai);
      const centerTextPlugin = {
        id: 'centerText',
        afterDraw(chart) {
          const { ctx, chartArea: { width, height, left, top } } = chart;
          const cx = left + width / 2, cy = top + height / 2;
          ctx.save();
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle    = sumPct > 100 ? '#dc2626' : sumPct >= 80 ? '#d97706' : '#16a34a';
          ctx.font         = `bold ${Math.round(height * 0.18)}px sans-serif`;
          ctx.fillText(sumPct.toFixed(1) + '%', cx, cy - height * 0.04);
          ctx.fillStyle = '#786850';
          ctx.font      = `${Math.round(height * 0.09)}px sans-serif`;
          ctx.fillText('Serapan', cx, cy + height * 0.1);
          ctx.restore();
        },
      };
      chartLaporanDoughnut = new Chart(ctxD, {
        type: 'doughnut',
        data: {
          labels: ['Terserap', 'Efisiensi', 'Belum Terealisasi'],
          datasets: [{
            data: [sumNego, efisiensiNilai, belumNilai],
            backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(201,168,76,0.8)', 'rgba(55,65,81,0.7)'],
            borderColor: 'rgba(0,0,0,0.15)', borderWidth: 2,
          }],
        },
        plugins: [centerTextPlugin],
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtRp(ctx.raw)} (${sumPagu > 0 ? (ctx.raw / sumPagu * 100).toFixed(1) : 0}%)` } },
          },
        },
      });
    }

    // ── Chart 2: Bar per Bidang ───────────────────────────────
    if (chartLaporanBidang) chartLaporanBidang.destroy();
    const ctxB = document.getElementById('chart-laporan-bidang');
    if (ctxB && bidangLabels.length > 0) {
      chartLaporanBidang = new Chart(ctxB, {
        type: 'bar',
        data: {
          labels: bidangLabels.map(b => strTrunc(b, 18)),
          datasets: [
            { label: 'Pagu', data: bidangPagu, backgroundColor: 'rgba(92,140,180,0.4)', borderColor: 'rgba(92,140,180,0.9)', borderWidth: 1, borderRadius: 3 },
            { label: 'Nilai Kontrak', data: bidangNego, backgroundColor: 'rgba(201,168,76,0.6)', borderColor: '#C9A84C', borderWidth: 1, borderRadius: 3 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtRp(ctx.raw)}` } },
          },
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => v >= 1e9 ? (v/1e9).toFixed(1)+'M' : v >= 1e6 ? (v/1e6).toFixed(0)+'Jt' : v }, grid: { color: 'rgba(201,168,76,0.08)' } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    // ── Chart 3: Horizontal Bar top-10 per Paket ─────────────
    if (chartLaporanPaket) chartLaporanPaket.destroy();
    const ctxP = document.getElementById('chart-laporan-paket');
    if (ctxP) {
      const top = [...rows].sort((a, b) => b.totalNego - a.totalNego).slice(0, 10);
      chartLaporanPaket = new Chart(ctxP, {
        type: 'bar',
        data: {
          labels: top.map(r => strTrunc(r.namaPaket || ('RUP ' + r.rup), 30)),
          datasets: [
            { label: 'Pagu', data: top.map(r => r.pagu), backgroundColor: 'rgba(92,140,180,0.35)', borderColor: 'rgba(92,140,180,0.8)', borderWidth: 1, borderRadius: 3 },
            { label: 'Nilai Kontrak', data: top.map(r => r.totalNego), backgroundColor: 'rgba(201,168,76,0.6)', borderColor: '#C9A84C', borderWidth: 1, borderRadius: 3 },
          ],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
            tooltip: {
              callbacks: {
                afterLabel: ctx => {
                  if (ctx.datasetIndex === 1) {
                    const r = top[ctx.dataIndex];
                    const lines = [` Serapan : ${r.pct.toFixed(1)}%`, ` Efisiensi: ${fmtRp(r.ef)}`];
                    if (r.pemenang && r.pemenang !== '-') lines.push(` Pemenang : ${r.pemenang}`);
                    return lines;
                  }
                  return '';
                },
                label: ctx => ` ${ctx.dataset.label}: ${fmtRp(ctx.raw)}`,
              },
            },
          },
          scales: {
            x: { beginAtZero: true, ticks: { callback: v => v >= 1e9 ? (v/1e9).toFixed(1)+'M' : v >= 1e6 ? (v/1e6).toFixed(0)+'Jt' : v }, grid: { color: 'rgba(201,168,76,0.08)' } },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } },
          },
        },
      });
    }

    // ── Chart 4 (BARU): Efisiensi per Bidang ─────────────────
    if (chartLaporanEfisiensi) chartLaporanEfisiensi.destroy();
    const ctxE = document.getElementById('chart-laporan-efisiensi');
    if (ctxE && bidangLabels.length > 0) {
      const efColors = bidangEf.map(v => v >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)');
      const efBorder = bidangEf.map(v => v >= 0 ? '#22c55e' : '#ef4444');
      // Urutkan dari terbesar efisiensi
      const efSorted = bidangLabels.map((b, i) => ({ label: b, ef: bidangEf[i] }))
        .sort((a, b) => b.ef - a.ef);
      chartLaporanEfisiensi = new Chart(ctxE, {
        type: 'bar',
        data: {
          labels: efSorted.map(e => strTrunc(e.label, 22)),
          datasets: [{
            label: 'Efisiensi (Rp)',
            data: efSorted.map(e => e.ef),
            backgroundColor: efSorted.map(e => e.ef >= 0 ? 'rgba(34,197,94,0.65)' : 'rgba(239,68,68,0.65)'),
            borderColor:     efSorted.map(e => e.ef >= 0 ? '#22c55e' : '#ef4444'),
            borderWidth: 1, borderRadius: 4,
          }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const val = ctx.raw;
                  return ` Efisiensi: ${val >= 0 ? '+' : ''}${fmtRp(val)} ${val >= 0 ? '✅' : '🚨'}`;
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { callback: v => (v >= 0 ? '' : '-') + (Math.abs(v) >= 1e9 ? (Math.abs(v)/1e9).toFixed(1)+'M' : Math.abs(v) >= 1e6 ? (Math.abs(v)/1e6).toFixed(0)+'Jt' : Math.abs(v)) },
              grid: { color: 'rgba(201,168,76,0.08)' },
            },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } },
          },
        },
      });
    }

    // ── Chart 5 (BARU): Top Pemenang ─────────────────────────
    if (chartLaporanPemenang) chartLaporanPemenang.destroy();
    const ctxPm = document.getElementById('chart-laporan-pemenang');
    if (ctxPm && topPemenang.length > 0) {
      const paletteColors = [
        'rgba(201,168,76,0.75)','rgba(92,140,180,0.75)','rgba(34,197,94,0.75)',
        'rgba(249,115,22,0.75)','rgba(168,85,247,0.75)','rgba(236,72,153,0.75)',
        'rgba(20,184,166,0.75)','rgba(99,102,241,0.75)','rgba(239,68,68,0.75)',
        'rgba(132,204,22,0.75)',
      ];
      chartLaporanPemenang = new Chart(ctxPm, {
        type: 'bar',
        data: {
          labels: topPemenang.map(([nama]) => strTrunc(nama, 28)),
          datasets: [{
            label: 'Nilai Kontrak (Rp)',
            data:  topPemenang.map(([, info]) => info.nilai),
            backgroundColor: topPemenang.map((_, i) => paletteColors[i % paletteColors.length]),
            borderWidth: 1, borderRadius: 5,
            borderColor: topPemenang.map((_, i) => paletteColors[i % paletteColors.length].replace('0.75', '1')),
          }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const [, info] = topPemenang[ctx.dataIndex];
                  return [` Nilai Kontrak: ${fmtRp(ctx.raw)}`, ` Jumlah Paket: ${info.jumlah} paket`];
                },
              },
            },
          },
          scales: {
            x: { beginAtZero: true, ticks: { callback: v => v >= 1e9 ? (v/1e9).toFixed(1)+'M' : v >= 1e6 ? (v/1e6).toFixed(0)+'Jt' : v }, grid: { color: 'rgba(201,168,76,0.08)' } },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } },
          },
        },
      });
    }
  });
}

// ── Export CSV laporan ─────────────────────────────────────────
function exportLaporanCSV() {
  if (!state.paket.data.length) {
    if (typeof toast === 'function') toast('Tidak ada data laporan untuk diexport', 'error');
    return;
  }

  const rows = state.paket.data.map(p => {
    const pagu      = Number(p.paguAnggaran) || 0;
    const totalNego = typeof _hitungNilaiPenetapan === 'function' ? _hitungNilaiPenetapan(p.rup) : 0;
    const pct       = pagu > 0 ? (totalNego / pagu * 100) : 0;
    const ef        = pagu - totalNego;
    const pemenang  = typeof _getPemenangRup === 'function' ? _getPemenangRup(p.rup) : '-';
    return [
      p.rup || '',
      (p.namaPaket  || '').replace(/,/g, ' '),
      (p.bidang     || '').replace(/,/g, ' '),
      (pemenang     || '-').replace(/,/g, ' '),
      pagu, totalNego, pct.toFixed(2), ef,
    ];
  });

  const header = 'No RUP,Nama Paket,Bidang,Pemenang,Pagu (Rp),Nilai Kontrak (Rp),Serapan (%),Efisiensi (Rp)';
  const csv    = [header, ...rows.map(r => r.join(','))].join('\n');
  const blob   = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  const cfg    = typeof appConfig !== 'undefined' ? appConfig : {};
  const tgl    = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href       = url;
  a.download   = `Laporan_Realisasi_${cfg.singkatan || 'SIDEVA'}_${tgl}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  if (typeof toast === 'function') toast(`✅ ${rows.length} data berhasil diexport CSV`, 'success');
}
