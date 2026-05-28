// ============================================================
//  SI-DEVA — Rekap per Bidang v2.0.0
//  File: js/rekap-bidang.js
//
//  PERUBAHAN v2.0.0:
//  [NEW] Chart 1: Bar Pagu vs Nilai Kontrak per Bidang
//  [NEW] Chart 2: Donut Distribusi Jumlah Paket per Bidang
//  [NEW] Chart 3: Horizontal Bar Efisiensi per Bidang
//  [NEW] Chart 4: Bar % Serapan per Bidang
//  [KEEP] Semua fix dari v1.2.0 tetap berlaku
// ============================================================

// ── Instance chart rekap bidang ───────────────────────────────
let chartRBPaguKontrak = null;
let chartRBPaketDonut  = null;
let chartRBEfisiensi   = null;
let chartRBSerapan     = null;

// ── Helper: hitung total rincian belanja per RUP ─────────────
function _hitungNilaiRincian(rup) {
  const rupStr = String(rup);
  return state.rincian.data
    .filter(r => String(r.rup) === rupStr)
    .reduce((s, r) => s + (Number(r.vol) || 0) * (Number(r.hargaSatuan) || 0), 0);
}

// ── Helper: hitung Nilai Kontrak per RUP ─────────────────────
if (typeof _hitungNilaiPenetapan !== 'function') {
  window._hitungNilaiPenetapan = function _hitungNilaiPenetapan(rup) {
    const rupStr        = String(rup);
    const hargaForRup   = state.harga.data.filter(h => String(h.rup) === rupStr);
    const rincianForRup = state.rincian.data.filter(r => String(r.rup) === rupStr);

    if (!hargaForRup.length) return 0;

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
  };
}

// ── Hitung rekap per bidang ───────────────────────────────────
function _hitungRekapBidang() {
  const bidangMap = {};

  state.paket.data.forEach(p => {
    const b   = p.bidang || 'Tidak Ditentukan';
    const rup = String(p.rup);
    const pagu = Number(p.paguAnggaran) || 0;

    if (!bidangMap[b]) {
      bidangMap[b] = { bidang: b, jumlahPaket: 0, sumPagu: 0, sumNego: 0, sumRincian: 0, pakets: [] };
    }

    bidangMap[b].jumlahPaket++;
    bidangMap[b].sumPagu    += pagu;
    bidangMap[b].sumNego    += _hitungNilaiPenetapan(rup);
    bidangMap[b].sumRincian += _hitungNilaiRincian(rup);
    bidangMap[b].pakets.push(rup);
  });

  return Object.values(bidangMap)
    .map(b => ({
      ...b,
      pct: b.sumPagu > 0 ? (b.sumNego / b.sumPagu * 100) : 0,
      ef:  b.sumPagu - b.sumNego,
    }))
    .sort((a, b) => b.sumPagu - a.sumPagu);
}

// ── Render HTML rekap ─────────────────────────────────────────
function renderRekapBidang(containerId) {
  const el = document.getElementById(containerId || 'rekap-bidang-content');
  if (!el) return;

  if (!state.paket.data.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-title">Belum ada data paket</div>
      </div>`;
    return;
  }

  const data    = _hitungRekapBidang();
  const sumPagu = data.reduce((s, b) => s + b.sumPagu, 0);
  const sumNego = data.reduce((s, b) => s + b.sumNego, 0);
  const sumEf   = sumPagu - sumNego;
  const sumPct  = sumPagu > 0 ? (sumNego / sumPagu * 100) : 0;
  const fRp     = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID');
  const clr     = p => p > 100 ? '#ef4444' : p >= 80 ? '#f59e0b' : p > 0 ? '#22c55e' : '#6b7280';

  const totalPaket   = state.paket.data.length;
  const totalRincian = data.reduce((s, b) => s + b.sumRincian, 0);

  // Palet warna per bidang
  const palette = [
    '#C9A84C','#5C8CB4','#22c55e','#f97316','#a855f7',
    '#ec4899','#14b8a6','#6366f1','#ef4444','#84cc16',
  ];

  el.innerHTML = `
    <!-- ── Summary Cards ─────────────────────────────────────── -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:22px;">
      <div class="stat-card" style="cursor:default!important;">
        <div class="stat-icon">🏛️</div>
        <div class="stat-value">${data.length}</div>
        <div class="stat-label">Total Bidang</div>
      </div>
      <div class="stat-card" style="cursor:default!important;">
        <div class="stat-icon">📦</div>
        <div class="stat-value">${totalPaket}</div>
        <div class="stat-label">Total Paket</div>
      </div>
      <div class="stat-card" style="cursor:default!important;">
        <div class="stat-icon">💰</div>
        <div class="stat-value" style="font-size:13px;">${fRp(sumPagu)}</div>
        <div class="stat-label">Total Pagu</div>
      </div>
      <div class="stat-card" style="cursor:default!important;">
        <div class="stat-icon">🤝</div>
        <div class="stat-value" style="font-size:13px;color:${clr(sumPct)};">${fRp(sumNego)}</div>
        <div class="stat-label">Total Kontrak (${sumPct.toFixed(1)}%)</div>
      </div>
      <div class="stat-card" style="cursor:default!important;border-color:${sumEf >= 0 ? '#22c55e' : '#ef4444'}40;">
        <div class="stat-icon">${sumEf >= 0 ? '📉' : '📈'}</div>
        <div class="stat-value" style="font-size:13px;color:${sumEf >= 0 ? '#22c55e' : '#ef4444'};">
          ${sumEf >= 0 ? '+' : ''}${fRp(sumEf)}
        </div>
        <div class="stat-label">Total Efisiensi</div>
      </div>
    </div>

    <!-- ── CHARTS SECTION ─────────────────────────────────────── -->

    <!-- Chart Row 1: Bar Pagu vs Kontrak + Donut Distribusi Paket -->
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px;">

      <!-- Chart 1: Grouped Bar Pagu vs Kontrak per Bidang -->
      <div class="card" style="padding:20px;">
        <div class="card-title" style="margin-bottom:14px;font-size:13px;font-weight:700;">
          📊 Pagu vs Nilai Kontrak per Bidang
        </div>
        <div style="position:relative;height:${Math.max(180, data.length * 42)}px;">
          <canvas id="chart-rb-pagu-kontrak"></canvas>
        </div>
        <div style="display:flex;gap:14px;margin-top:10px;font-size:11px;flex-wrap:wrap;">
          <span style="display:flex;align-items:center;gap:5px;">
            <span style="width:12px;height:12px;border-radius:2px;background:rgba(92,140,180,0.6);display:inline-block;"></span>Pagu
          </span>
          <span style="display:flex;align-items:center;gap:5px;">
            <span style="width:12px;height:12px;border-radius:2px;background:rgba(201,168,76,0.8);display:inline-block;"></span>Nilai Kontrak
          </span>
        </div>
      </div>

      <!-- Chart 2: Donut Distribusi Jumlah Paket per Bidang -->
      <div class="card" style="padding:20px;">
        <div class="card-title" style="margin-bottom:14px;font-size:13px;font-weight:700;">
          🥧 Distribusi Paket per Bidang
        </div>
        <div style="position:relative;height:200px;">
          <canvas id="chart-rb-paket-donut"></canvas>
        </div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:5px;max-height:120px;overflow-y:auto;">
          ${data.map((b, i) => `
            <div style="display:flex;align-items:center;gap:6px;font-size:10px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${palette[i % palette.length]};flex-shrink:0;display:inline-block;"></span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${b.bidang}">${b.bidang}</span>
              <span style="font-weight:700;color:var(--text2);">${b.jumlahPaket}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Chart Row 2: Efisiensi per Bidang + % Serapan per Bidang -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px;">

      <!-- Chart 3: Horizontal Bar Efisiensi per Bidang -->
      <div class="card" style="padding:20px;">
        <div class="card-title" style="margin-bottom:14px;font-size:13px;font-weight:700;">
          💡 Efisiensi Anggaran per Bidang
        </div>
        <div style="position:relative;height:${Math.max(160, data.length * 40)}px;">
          <canvas id="chart-rb-efisiensi"></canvas>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:8px;">
          Hijau = hemat anggaran &nbsp;|&nbsp; Merah = melebihi pagu
        </div>
      </div>

      <!-- Chart 4: % Serapan per Bidang -->
      <div class="card" style="padding:20px;">
        <div class="card-title" style="margin-bottom:14px;font-size:13px;font-weight:700;">
          📈 Persentase Serapan per Bidang
        </div>
        <div style="position:relative;height:${Math.max(160, data.length * 40)}px;">
          <canvas id="chart-rb-serapan"></canvas>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-top:8px;">
          Target serapan ideal ≥ 80%
        </div>
      </div>
    </div>

    <!-- ── Card per Bidang ────────────────────────────────────── -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:22px;">
      ${data.map((b, i) => `
        <div class="card" style="padding:18px;border-left:4px solid ${palette[i % palette.length]};">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <div style="font-size:14px;font-weight:700;line-height:1.3;">${b.bidang}</div>
            <span style="font-size:11px;background:var(--surface2);border:1px solid var(--border);
                         border-radius:12px;padding:2px 10px;white-space:nowrap;margin-left:8px;">
              ${b.jumlahPaket} paket
            </span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:12px;">
            <div>
              <div style="color:var(--text3);margin-bottom:2px;">Pagu Anggaran</div>
              <div style="font-weight:700;font-family:monospace;font-size:11px;">${fRp(b.sumPagu)}</div>
            </div>
            <div>
              <div style="color:var(--text3);margin-bottom:2px;">Nilai Kontrak</div>
              <div style="font-weight:700;font-family:monospace;font-size:11px;color:${clr(b.pct)};">${fRp(b.sumNego)}</div>
            </div>
            <div>
              <div style="color:var(--text3);margin-bottom:2px;">Rincian Belanja</div>
              <div style="font-weight:700;font-family:monospace;font-size:11px;">${fRp(b.sumRincian)}</div>
            </div>
            <div>
              <div style="color:var(--text3);margin-bottom:2px;">Efisiensi</div>
              <div style="font-weight:700;font-size:11px;color:${b.ef >= 0 ? '#22c55e' : '#ef4444'};">
                ${b.ef >= 0 ? '+' : ''}${fRp(b.ef)}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;background:var(--surface2);border-radius:6px;height:10px;overflow:hidden;">
              <div style="width:${Math.min(b.pct, 100).toFixed(1)}%;height:10px;
                          background:${clr(b.pct)};border-radius:6px;transition:width .4s ease;"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${clr(b.pct)};min-width:42px;text-align:right;">
              ${b.pct > 0 ? b.pct.toFixed(1) + '%' : '0%'}
            </span>
          </div>
          <div style="font-size:10px;color:var(--text3);margin-top:5px;">Serapan anggaran</div>
        </div>`).join('')}
    </div>

    <!-- ── Tabel Rekap ─────────────────────────────────────────── -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">📋 Tabel Rekap per Bidang</div>
        <button class="btn btn-secondary btn-sm" onclick="exportRekapBidangXLSX()">📊 Export Excel</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>No</th><th>Bidang</th><th>Jml Paket</th>
            <th style="text-align:right;">Pagu (Rp)</th>
            <th style="text-align:right;">Nilai Kontrak</th>
            <th style="text-align:right;">Rincian Belanja</th>
            <th>Serapan</th>
            <th style="text-align:right;">Efisiensi</th>
          </tr></thead>
          <tbody>
            ${data.map((b, i) => `<tr>
              <td style="text-align:center;color:var(--text3);">${i + 1}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="width:10px;height:10px;border-radius:50%;background:${palette[i % palette.length]};flex-shrink:0;display:inline-block;"></span>
                  <span style="font-weight:600;">${b.bidang}</span>
                </div>
              </td>
              <td style="text-align:center;">
                <span style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:2px 8px;font-size:12px;">
                  ${b.jumlahPaket}
                </span>
              </td>
              <td style="text-align:right;font-family:monospace;font-size:12px;">${fRp(b.sumPagu)}</td>
              <td style="text-align:right;font-family:monospace;font-size:12px;color:${clr(b.pct)};font-weight:600;">
                ${b.sumNego ? fRp(b.sumNego) : '-'}
              </td>
              <td style="text-align:right;font-family:monospace;font-size:12px;">
                ${b.sumRincian ? fRp(b.sumRincian) : '-'}
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="flex:1;background:var(--surface2);border-radius:4px;height:8px;min-width:60px;">
                    <div style="width:${Math.min(b.pct, 100).toFixed(1)}%;height:8px;background:${clr(b.pct)};border-radius:4px;"></div>
                  </div>
                  <span style="font-size:11px;color:${clr(b.pct)};font-weight:700;min-width:36px;">
                    ${b.pct > 0 ? b.pct.toFixed(1) + '%' : '0%'}
                  </span>
                </div>
              </td>
              <td style="text-align:right;font-weight:600;color:${b.ef >= 0 ? '#22c55e' : '#ef4444'};">
                ${b.ef >= 0 ? '+' : ''}${fRp(b.ef)}
              </td>
            </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight:700;background:var(--surface2);">
              <td colspan="2" style="padding:10px 12px;">TOTAL</td>
              <td style="text-align:center;">${totalPaket}</td>
              <td style="text-align:right;font-family:monospace;">${fRp(sumPagu)}</td>
              <td style="text-align:right;font-family:monospace;color:${clr(sumPct)};">${fRp(sumNego)}</td>
              <td style="text-align:right;font-family:monospace;">${fRp(totalRincian)}</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="flex:1;background:var(--surface2);border-radius:4px;height:8px;min-width:60px;">
                    <div style="width:${Math.min(sumPct, 100).toFixed(1)}%;height:8px;background:${clr(sumPct)};border-radius:4px;"></div>
                  </div>
                  <span style="font-size:11px;color:${clr(sumPct)};font-weight:700;">${sumPct.toFixed(1)}%</span>
                </div>
              </td>
              <td style="text-align:right;color:${sumEf >= 0 ? '#22c55e' : '#ef4444'};">
                ${sumEf >= 0 ? '+' : ''}${fRp(sumEf)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;

  // ── Render Charts ─────────────────────────────────────────
  requestAnimationFrame(() => {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color       = '#786850';
    Chart.defaults.borderColor = 'rgba(201,168,76,0.12)';

    const bgPalette = palette.map(c => c);

    // ── Chart 1: Grouped Bar Pagu vs Kontrak per Bidang ──────
    if (chartRBPaguKontrak) chartRBPaguKontrak.destroy();
    const ctxPK = document.getElementById('chart-rb-pagu-kontrak');
    if (ctxPK) {
      const labels = data.map(b => strTrunc ? strTrunc(b.bidang, 20) : b.bidang.slice(0, 20));
      chartRBPaguKontrak = new Chart(ctxPK, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Pagu', data: data.map(b => b.sumPagu), backgroundColor: 'rgba(92,140,180,0.5)', borderColor: 'rgba(92,140,180,0.9)', borderWidth: 1, borderRadius: 3 },
            { label: 'Nilai Kontrak', data: data.map(b => b.sumNego), backgroundColor: 'rgba(201,168,76,0.7)', borderColor: '#C9A84C', borderWidth: 1, borderRadius: 3 },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: Rp ${Number(ctx.raw).toLocaleString('id-ID')}`,
                afterBody: (items) => {
                  const i = items[0]?.dataIndex;
                  if (i === undefined) return;
                  const b = data[i];
                  return [`  Serapan : ${b.pct.toFixed(1)}%`, `  Efisiensi: ${b.ef >= 0 ? '+' : ''}Rp ${Number(b.ef).toLocaleString('id-ID')}`];
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

    // ── Chart 2: Donut Distribusi Paket ──────────────────────
    if (chartRBPaketDonut) chartRBPaketDonut.destroy();
    const ctxD = document.getElementById('chart-rb-paket-donut');
    if (ctxD) {
      chartRBPaketDonut = new Chart(ctxD, {
        type: 'doughnut',
        data: {
          labels: data.map(b => b.bidang),
          datasets: [{
            data: data.map(b => b.jumlahPaket),
            backgroundColor: data.map((_, i) => bgPalette[i % bgPalette.length] + 'cc'),
            borderColor: data.map((_, i) => bgPalette[i % bgPalette.length]),
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '55%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.label}: ${ctx.raw} paket (${((ctx.raw / totalPaket) * 100).toFixed(1)}%)`,
              },
            },
          },
        },
      });
    }

    // ── Chart 3: Efisiensi per Bidang ────────────────────────
    if (chartRBEfisiensi) chartRBEfisiensi.destroy();
    const ctxEf = document.getElementById('chart-rb-efisiensi');
    if (ctxEf) {
      const efSorted = [...data].sort((a, b) => b.ef - a.ef);
      chartRBEfisiensi = new Chart(ctxEf, {
        type: 'bar',
        data: {
          labels: efSorted.map(b => strTrunc ? strTrunc(b.bidang, 20) : b.bidang.slice(0, 20)),
          datasets: [{
            label: 'Efisiensi (Rp)',
            data: efSorted.map(b => b.ef),
            backgroundColor: efSorted.map(b => b.ef >= 0 ? 'rgba(34,197,94,0.65)' : 'rgba(239,68,68,0.65)'),
            borderColor:     efSorted.map(b => b.ef >= 0 ? '#22c55e' : '#ef4444'),
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
                  const v = ctx.raw;
                  return ` ${v >= 0 ? '+' : ''}Rp ${Number(v).toLocaleString('id-ID')} ${v >= 0 ? '✅' : '🚨'}`;
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { callback: v => (v < 0 ? '-' : '') + (Math.abs(v) >= 1e9 ? (Math.abs(v)/1e9).toFixed(1)+'M' : Math.abs(v) >= 1e6 ? (Math.abs(v)/1e6).toFixed(0)+'Jt' : Math.abs(v)) },
              grid: { color: 'rgba(201,168,76,0.08)' },
            },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } },
          },
        },
      });
    }

    // ── Chart 4: % Serapan per Bidang ────────────────────────
    if (chartRBSerapan) chartRBSerapan.destroy();
    const ctxSp = document.getElementById('chart-rb-serapan');
    if (ctxSp) {
      const srpSorted = [...data].sort((a, b) => b.pct - a.pct);
      const clrFn = p => p > 100 ? 'rgba(239,68,68,0.7)' : p >= 80 ? 'rgba(34,197,94,0.7)' : p >= 50 ? 'rgba(245,158,11,0.7)' : 'rgba(107,114,128,0.7)';
      chartRBSerapan = new Chart(ctxSp, {
        type: 'bar',
        data: {
          labels: srpSorted.map(b => strTrunc ? strTrunc(b.bidang, 20) : b.bidang.slice(0, 20)),
          datasets: [{
            label: 'Serapan (%)',
            data: srpSorted.map(b => Math.min(b.pct, 110)),
            backgroundColor: srpSorted.map(b => clrFn(b.pct)),
            borderColor:     srpSorted.map(b => clrFn(b.pct).replace('0.7', '1')),
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
                  const b = srpSorted[ctx.dataIndex];
                  return [` Serapan: ${b.pct.toFixed(2)}%`, ` Pagu: Rp ${Number(b.sumPagu).toLocaleString('id-ID')}`, ` Kontrak: Rp ${Number(b.sumNego).toLocaleString('id-ID')}`];
                },
              },
            },
            annotation: {
              annotations: {
                line80: { type: 'line', xMin: 80, xMax: 80, borderColor: '#22c55e', borderWidth: 1, borderDash: [4, 4], label: { content: '80%', enabled: true, position: 'start', font: { size: 9 } } },
              },
            },
          },
          scales: {
            x: { beginAtZero: true, max: 110, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(201,168,76,0.08)' } },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } },
          },
        },
      });
    }
  });
}

// ── Export Excel rekap bidang ─────────────────────────────────
function exportRekapBidangXLSX() {
  if (typeof XLSX === 'undefined') {
    if (typeof toast === 'function') toast('Library Excel belum dimuat', 'error');
    return;
  }
  const data = _hitungRekapBidang();
  const cfg  = typeof appConfig !== 'undefined' ? appConfig : {};

  const rows = data.map((b, i) => [
    i + 1, b.bidang, b.jumlahPaket,
    Number(b.sumPagu), Number(b.sumNego), Number(b.sumRincian),
    parseFloat(b.pct.toFixed(2)), Number(b.ef),
  ]);

  const cols = ['No', 'Bidang', 'Jml Paket', 'Pagu (Rp)', 'Nilai Kontrak (Rp)', 'Rincian Belanja (Rp)', 'Serapan (%)', 'Efisiensi (Rp)'];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
  ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Bidang');

  const tgl    = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const wbout  = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob   = new Blob([wbout], { type: 'application/octet-stream' });
  const a      = document.createElement('a');
  a.href       = URL.createObjectURL(blob);
  a.download   = `Rekap_Bidang_${cfg.singkatan || 'SIDEVA'}_${tgl}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
  if (typeof toast === 'function') toast('✅ Rekap bidang berhasil diexport', 'success');
}

// ── Inject nav + page ─────────────────────────────────────────
function _injectNavRekapBidang() {
  if (document.getElementById('nav-rekap-bidang')) return;

  const allNav = document.querySelectorAll('.nav-item');
  let anchor   = null;
  allNav.forEach(n => {
    if ((n.getAttribute('onclick') || '').includes("'laporan'")) anchor = n;
  });
  if (!anchor && allNav.length) anchor = allNav[allNav.length - 1];

  const li       = document.createElement('div');
  li.id          = 'nav-rekap-bidang';
  li.className   = 'nav-item';
  li.setAttribute('onclick', "showPage('rekap-bidang')");
  li.innerHTML   = '<span class="nav-icon">🏛️</span><span class="nav-label">Rekap per Bidang</span>';
  if (anchor) anchor.after(li);

  if (!document.getElementById('page-rekap-bidang')) {
    const p       = document.createElement('div');
    p.id          = 'page-rekap-bidang';
    p.className   = 'page';
    p.innerHTML   = '<div id="rekap-bidang-content"></div>';
    const anyPage = document.querySelector('.page');
    if (anyPage) anyPage.parentNode.appendChild(p);
  }
}

// ── Listen navigation changes (avoid monkey-patching showPage) ─
window.addEventListener('sideva:page-changed', (e) => {
  if (e?.detail?.page !== 'rekap-bidang') return;
  const title = document.getElementById('topbar-title');
  if (title) title.textContent = 'Rekap per Bidang';
  const bc = document.getElementById('topbar-breadcrumb-cur');
  if (bc) bc.textContent = 'Rekap per Bidang';
  renderRekapBidang('rekap-bidang-content');
});

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('sb-ready', function (e) {
  if (e.detail?.loggedIn) setTimeout(_injectNavRekapBidang, 800);
});
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(_injectNavRekapBidang, 1500);
});
