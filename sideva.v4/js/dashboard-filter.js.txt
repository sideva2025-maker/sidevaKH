// ============================================================
//  SI-DEVA — Filter Dashboard Real-Time v1.0.0
//  File: js/dashboard-filter.js
//
//  Pasang di index.html SETELAH dashboard.js:
//    <script src="js/dashboard-filter.js"></script>
//
//  Menambahkan filter bar di halaman Dashboard:
//  - Dropdown filter Bidang
//  - Dropdown filter Kode Rekening
//  - Reset filter
//  - Stat cards & chart otomatis update
// ============================================================

(function () {
  'use strict';

  // ── State filter ─────────────────────────────────────────
  const _fs = { bidang: '', rekening: '' };

  // ── Format rupiah ─────────────────────────────────────────
  const fRp = v => 'Rp ' + Number(v || 0).toLocaleString('id-ID');

  // ── Data terfilter ────────────────────────────────────────
  function _filteredPaket() {
    return state.paket.data.filter(p => {
      const okB = !_fs.bidang   || (p.bidang        || '') === _fs.bidang;
      const okR = !_fs.rekening || (p.kodeRekening  || '').startsWith(_fs.rekening);
      return okB && okR;
    });
  }

  // ── Isi opsi dropdown ─────────────────────────────────────
  function _populateDropdowns() {
    const bSet = new Set(), rSet = new Set();
    state.paket.data.forEach(p => {
      if (p.bidang)       bSet.add(p.bidang);
      if (p.kodeRekening) rSet.add(p.kodeRekening);
    });

    const selB = document.getElementById('df-bidang');
    const selR = document.getElementById('df-rekening');
    if (!selB || !selR) return;

    const cur  = selB.value;
    selB.innerHTML = '<option value="">— Semua Bidang —</option>' +
      [...bSet].sort().map(b => `<option value="${b}"${b===cur?'selected':''}>${b}</option>`).join('');

    const curR = selR.value;
    selR.innerHTML = '<option value="">— Semua Rekening —</option>' +
      [...rSet].sort().map(r => `<option value="${r}"${r===curR?'selected':''}>${r}</option>`).join('');
  }

  // ── Update stat cards ─────────────────────────────────────
  function _updateCards(pakets) {
    const totalPagu  = pakets.reduce((s, p) => s + (Number(p.paguAnggaran) || 0), 0);
    // Nilai kontrak = nilai penetapan BAHPE per RUP (sama dengan laporan realisasi)
    const totalNego  = pakets.reduce((s, p) =>
      s + (typeof _hitungNilaiPenetapan === 'function' ? _hitungNilaiPenetapan(p.rup) : 0), 0);
    const rupSet     = new Set(pakets.map(p => String(p.rup)));
    const rincData   = state.rincian.data.filter(r => rupSet.has(String(r.rup)));
    const totalRinc  = rincData.reduce((s, r) => s + (Number(r.jumlah) || 0), 0);
    const efisiensi  = totalPagu - totalNego;
    const pct        = totalPagu > 0 ? (totalNego / totalPagu * 100) : 0;

    const map = {
      'df-stat-paket'    : pakets.length,
      'df-stat-pagu'     : fRp(totalPagu),
      'df-stat-kontrak'  : fRp(totalNego),
      'df-stat-rincian'  : fRp(totalRinc),
      'df-stat-efisiensi': (efisiensi >= 0 ? '+' : '') + fRp(efisiensi),
      'df-stat-serapan'  : pct.toFixed(1) + '%',
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });

    // warna serapan
    const sep = document.getElementById('df-stat-serapan');
    if (sep) {
      sep.style.color = pct > 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : pct > 0 ? '#22c55e' : '#6b7280';
    }
    const ef = document.getElementById('df-stat-efisiensi');
    if (ef) ef.style.color = efisiensi >= 0 ? '#22c55e' : '#ef4444';
  }

  // ── Bar chart per bidang (canvas) ────────────────────────
  let _dfChart = null;
  function _updateChart(pakets) {
    const canvas = document.getElementById('df-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const bidMap = {};
    pakets.forEach(p => {
      const b = p.bidang || 'Lainnya';
      if (!bidMap[b]) bidMap[b] = { pagu: 0, nego: 0 };
      bidMap[b].pagu += Number(p.paguAnggaran) || 0;
      // Nilai kontrak = nilai penetapan BAHPE (sama dengan laporan realisasi)
      bidMap[b].nego += (typeof _hitungNilaiPenetapan === 'function')
        ? _hitungNilaiPenetapan(p.rup)
        : state.harga.data.filter(h => String(h.rup) === String(p.rup))
            .reduce((s, h) => s + (Number(h.negoFinal) > 0
              ? Number(h.negoFinal) * Number(h.qty || 1)
              : Number(h.totalHarga) || 0), 0);
    });

    const labels = Object.keys(bidMap);
    const pagu   = labels.map(b => bidMap[b].pagu);
    const nego   = labels.map(b => bidMap[b].nego);

    if (_dfChart) { _dfChart.destroy(); _dfChart = null; }
    _dfChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Pagu Anggaran', data: pagu, backgroundColor: '#6366f180', borderColor: '#6366f1', borderWidth: 1, borderRadius: 4 },
          { label: 'Nilai Kontrak', data: nego, backgroundColor: '#22c55e80', borderColor: '#22c55e', borderWidth: 1, borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: 'var(--text1)', font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${fRp(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: { ticks: { color: 'var(--text2)', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: 'var(--text2)', callback: v => 'Rp ' + (v/1e6).toFixed(0) + 'jt' }, grid: { color: 'var(--border)' } }
        }
      }
    });
  }

  // ── Update keseluruhan saat filter berubah ───────────────
  function _applyFilter() {
    const pakets = _filteredPaket();
    _updateCards(pakets);
    _updateChart(pakets);

    // Badge jumlah filter aktif
    const badge = document.getElementById('df-badge');
    if (badge) {
      const n = (_fs.bidang ? 1 : 0) + (_fs.rekening ? 1 : 0);
      badge.textContent  = n > 0 ? n : '';
      badge.style.display = n > 0 ? 'inline-flex' : 'none';
    }
  }

  // ── Inject filter bar + widget ────────────────────────────
  function _injectFilterBar() {
    if (document.getElementById('df-filter-bar')) return;
    const dashPage = document.getElementById('page-dashboard') ||
      document.querySelector('[id*="dashboard"]');
    if (!dashPage) return;

    const bar = document.createElement('div');
    bar.id         = 'df-filter-bar';
    bar.style.cssText = `
      display:flex; align-items:center; gap:10px; flex-wrap:wrap;
      margin-bottom:18px; padding:14px 18px;
      background:var(--surface); border:1px solid var(--border);
      border-radius:12px;
    `;
    bar.innerHTML = `
      <span style="font-size:13px;font-weight:700;color:var(--text2);white-space:nowrap;">
        🔍 Filter:
      </span>
      <select id="df-bidang" style="flex:1;min-width:160px;max-width:260px;
          padding:7px 10px;border-radius:8px;border:1px solid var(--border);
          background:var(--surface2);color:var(--text1);font-size:13px;">
        <option value="">— Semua Bidang —</option>
      </select>
      <select id="df-rekening" style="flex:1;min-width:160px;max-width:260px;
          padding:7px 10px;border-radius:8px;border:1px solid var(--border);
          background:var(--surface2);color:var(--text1);font-size:13px;">
        <option value="">— Semua Rekening —</option>
      </select>
      <button id="df-reset"
          style="padding:7px 14px;border-radius:8px;border:1px solid var(--border);
                 background:var(--surface2);color:var(--text1);font-size:13px;cursor:pointer;
                 white-space:nowrap;transition:background .15s;"
          onmouseover="this.style.background='var(--primary)';this.style.color='#fff';"
          onmouseout="this.style.background='var(--surface2)';this.style.color='var(--text1)';">
        ✕ Reset
      </button>
      <span id="df-badge" style="display:none;background:#6366f1;color:#fff;
          font-size:11px;font-weight:700;border-radius:99px;
          padding:2px 8px;min-width:20px;text-align:center;">0</span>
      <span id="df-count" style="font-size:12px;color:var(--text3);margin-left:auto;white-space:nowrap;"></span>
    `;
    dashPage.prepend(bar);

    // Stat cards ringkasan filter
    const widget = document.createElement('div');
    widget.id = 'df-widget';
    widget.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px;';
    const items = [
      { id:'df-stat-paket',    icon:'📦', label:'Paket' },
      { id:'df-stat-pagu',     icon:'💰', label:'Total Pagu' },
      { id:'df-stat-kontrak',  icon:'🤝', label:'Nilai Kontrak' },
      { id:'df-stat-rincian',  icon:'📋', label:'Rincian Belanja' },
      { id:'df-stat-serapan',  icon:'📈', label:'Serapan' },
      { id:'df-stat-efisiensi',icon:'📉', label:'Efisiensi' },
    ];
    widget.innerHTML = items.map(it => `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;
                  padding:12px 14px;min-width:0;">
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">${it.icon} ${it.label}</div>
        <div id="${it.id}" style="font-size:13px;font-weight:700;color:var(--text1);
                                   white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">—</div>
      </div>`).join('');
    bar.after(widget);

    // Chart area
    const chartWrap = document.createElement('div');
    chartWrap.id = 'df-chart-wrap';
    chartWrap.style.cssText = `
      background:var(--surface);border:1px solid var(--border);border-radius:12px;
      padding:16px;margin-bottom:18px;
    `;
    chartWrap.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--text2);margin-bottom:12px;">
        📊 Pagu vs Kontrak per Bidang
      </div>
      <div style="height:200px;"><canvas id="df-chart"></canvas></div>`;
    widget.after(chartWrap);

    // Event listeners
    document.getElementById('df-bidang').addEventListener('change', function () {
      _fs.bidang = this.value; _refresh();
    });
    document.getElementById('df-rekening').addEventListener('change', function () {
      _fs.rekening = this.value; _refresh();
    });
    document.getElementById('df-reset').addEventListener('click', function () {
      _fs.bidang = ''; _fs.rekening = '';
      document.getElementById('df-bidang').value   = '';
      document.getElementById('df-rekening').value = '';
      _refresh();
    });
  }

  function _refresh() {
    _populateDropdowns();
    _applyFilter();
    const n = _filteredPaket().length;
    const cnt = document.getElementById('df-count');
    if (cnt) cnt.textContent = _fs.bidang || _fs.rekening
      ? `${n} dari ${state.paket.data.length} paket`
      : `${n} paket`;
  }

  // ── Listen navigation changes (avoid monkey-patching showPage) ─
  window.addEventListener('sideva:page-changed', (e) => {
    if (e?.detail?.page !== 'dashboard') return;
    setTimeout(() => { _injectFilterBar(); _refresh(); }, 400);
  });

  // ── Init ──────────────────────────────────────────────────
  window.addEventListener('sb-ready', function (e) {
    if (e.detail?.loggedIn) {
      setTimeout(() => { _injectFilterBar(); _refresh(); }, 1000);
    }
  });

})();
