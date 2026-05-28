/**
 * sync-data.js — SI-DEVA v3.0
 * ============================
 * WAJIB ditambahkan di index.html SETELAH rekap-bidang.js:
 *   <script src="js/sync-data.js"></script>
 *
 * Panel status dan tombol Sync Massal akan LANGSUNG tampil
 * saat halaman Rincian Belanja dibuka — tidak perlu input data baru dulu.
 */

'use strict';

var SYNC_CFG = { n: 3 };

function _normTxt(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function _isManualHargaByItem(h, rec) {
  if (!h || !rec) return false;
  if (String(h.rup || '') !== String(rec.rup || '')) return false;
  if (!h.namaItem) return false;
  if (String(h.parentRincianId || '').trim() !== '') return false;
  return _normTxt(h.namaItem) === _normTxt(rec.itemBarang);
}

// ============================================================
// AUTO-SYNC: dipanggil dari pengajuan.js → saveRincian() (input BARU saja)
// Hanya membuat baris pembanding yang belum ada — tidak menimpa data lama.
// ============================================================
async function autoSyncHargaPembanding(rincianId, rec, isEdit) {
  if (isEdit) {
    return { skipped: true, created: 0, updated: 0 };
  }

  var n = SYNC_CFG.n;
  var allHarga = (state.harga && state.harga.data) ? state.harga.data : [];
  var hasManual = allHarga.some(function(h) {
    return _isManualHargaByItem(h, rec);
  });
  if (hasManual) {
    return { skipped: true, created: 0, updated: 0 };
  }

  var existing = allHarga.filter(function(h) {
    return String(h.parentRincianId) === String(rincianId);
  });
  var paket = (state.paket.data||[]).find(function(p) {
    return String(p.rup) === String(rec.rup);
  });
  var tasks = [];
  var created = 0;

  for (var ke = 1; ke <= n; ke++) {
    var found = existing.find(function(h) { return Number(h.pembandingKe) === ke; });
    if (found) continue;

    tasks.push(dbPut('harga', {
      rup: rec.rup,
      namaPaket:       paket ? (paket.namaPaket||'') : '',
      hps:             paket ? (paket.paguAnggaran||null) : null,
      namaItem:        rec.itemBarang,
      namaProduk:      '',
      namaPenyedia:    '',
      qty:             rec.vol,
      satuan:          rec.satuan||'',
      hargaTayang:     null, dpp: null, ppn: null, ongkir: null, totalHarga: null,
      statusPajak:     'Tidak Kena Pajak',
      statusKatalog:   'Aktif',
      negoFinal:       null, pdn: 'Ya', umkm: 'Ya', lokasi: '',
      parentRincianId: String(rincianId),
      pembandingKe:    ke,
    }));
    created++;
  }

  if (tasks.length) {
    try { await Promise.all(tasks); }
    catch(e) {
      console.error('[SyncData] autoSync error:', e);
      throw e;
    }
  }

  return { skipped: false, created: created, updated: 0 };
}

// ============================================================
// AUTO-DELETE: dipanggil dari pengajuan.js → deleteRecord()
// ============================================================
async function autoDeleteHargaPembanding(rincianId, rec) {
  var all = await dbGetAll('harga');
  var terkait = all.filter(function(h) {
    return String(h.parentRincianId) === String(rincianId);
  });
  if (rec && rec.rup && rec.itemBarang) {
    var linkedByItem = all.filter(function(h) {
      return String(h.rup || '') === String(rec.rup || '') &&
             _normTxt(h.namaItem) === _normTxt(rec.itemBarang);
    });
    if (linkedByItem.length) {
      var map = {};
      terkait.concat(linkedByItem).forEach(function(h) {
        if (h && h.id) map[h.id] = h;
      });
      terkait = Object.keys(map).map(function(id) { return map[id]; });
    }
  }
  if (!terkait.length) return;
  try { await Promise.all(terkait.map(function(h) { return dbDelete('harga', h.id); })); }
  catch(e) { console.error('[SyncData] autoDelete error:', e); }
}

// ============================================================
// VALIDASI & RENDER PANEL STATUS
// ============================================================
function validasiKelengkapanPembanding() {
  var n          = SYNC_CFG.n;
  var rincianArr = (state && state.rincian && state.rincian.data) ? state.rincian.data : [];
  var hargaArr   = (state && state.harga   && state.harga.data)   ? state.harga.data   : [];

  var sudah = 0, belum = 0;
  rincianArr.forEach(function(r) {
    if (!r.id) return;
    var manualAda = hargaArr.some(function(h) { return _isManualHargaByItem(h, r); });
    if (manualAda) {
      // Item manual dikeluarkan dari metrik panel sync:
      // tidak dihitung "sudah" dan tidak dihitung "belum".
      return;
    }
    var jml = hargaArr.filter(function(h) {
      return String(h.parentRincianId) === String(r.id);
    }).length;
    if (jml >= n) { sudah++; }
    else { belum++; }
  });
  _svpRender(sudah+belum, sudah, belum);
}

// ============================================================
// SYNC ULANG MASSAL
// ============================================================
async function syncUlangMassal() {
  _smpShow();
  _smpLog('Memuat data dari Supabase…', 5, '#3b82f6');

  var allR, allH;
  try {
    var res = await Promise.all([dbGetAll('rincian'), dbGetAll('harga')]);
    allR = res[0]; allH = res[1];
  } catch(e) {
    _smpLog('Gagal memuat data: '+(e.message||e), 100, '#ef4444');
    _smpDone(false); return;
  }

  var total = allR.length, n = SYNC_CFG.n, dibuat=0, lewat=0, gagal=0;
  if (!total) {
    _smpLog('Tidak ada data rincian.', 100, '#f59e0b');
    _smpDone(true,0,0,0); return;
  }

  for (var i=0; i<total; i++) {
    var r    = allR[i];
    var pct  = Math.round(10 + (i/total)*85);
    var nm   = (r.itemBarang||'').slice(0,32);
    var manualAda = allH.some(function(h) { return _isManualHargaByItem(h, r); });
    if (manualAda) {
      // Item manual tidak ditampilkan sebagai status sync.
      continue;
    }
    var exst = allH.filter(function(h){ return String(h.parentRincianId)===String(r.id); });

    if (exst.length >= n) {
      lewat++;
      _smpLog('['+(i+1)+'/'+total+'] Dilewati (sudah lengkap): '+nm, pct, '#10b981');
      continue;
    }

    var paket = (state.paket.data||[]).find(function(p){ return String(p.rup)===String(r.rup); });
    var tasks = [];
    for (var ke=1; ke<=n; ke++) {
      var ada = exst.find(function(h){ return Number(h.pembandingKe)===ke; });
      if (ada) continue;
      tasks.push(dbPut('harga', {
        rup: r.rup,
        namaPaket:       paket?(paket.namaPaket||''):'',
        hps:             paket?(paket.paguAnggaran||null):null,
        namaItem:        r.itemBarang, namaProduk:'', namaPenyedia:'',
        qty:             r.vol, satuan:r.satuan||'',
        hargaTayang:null, dpp:null, ppn:null, ongkir:null, totalHarga:null,
        statusPajak:'Tidak Kena Pajak', statusKatalog:'Aktif',
        negoFinal:null, pdn:'Ya', umkm:'Ya', lokasi:'',
        parentRincianId: String(r.id),
        pembandingKe:    ke,
      }));
    }

    try {
      await Promise.all(tasks);
      dibuat += tasks.length;
      _smpLog('['+(i+1)+'/'+total+'] Dibuat '+tasks.length+' pembanding: '+nm, pct, '#3b82f6');
    } catch(e) {
      gagal++;
      _smpLog('['+(i+1)+'/'+total+'] Gagal: '+nm+' — '+(e.message||e), pct, '#ef4444');
    }
    if (tasks.length) await new Promise(function(res){ setTimeout(res, 100); });
  }

  _smpLog('Menyegarkan data…', 97, '#3b82f6');
  try {
    state.harga.data = await dbGetAll('harga');
    state.harga.filtered = state.harga.data.slice();
    if (typeof filterHarga==='function') filterHarga();
  } catch(_){}

  _smpLog('Selesai!', 100, '#10b981');
  _smpDone(true, dibuat, lewat, gagal);
  setTimeout(function(){
    if (typeof validasiKelengkapanPembanding==='function') validasiKelengkapanPembanding();
  }, 400);
}

// ============================================================
// INJEKSI TOMBOL KE HEADER RINCIAN
// ============================================================
function _injectBtn() {
  if (document.getElementById('btn-sync-massal-rincian')) return;
  var pg = document.getElementById('page-rincian');
  if (!pg) return;
  var hdr = pg.querySelector('.table-header');
  if (!hdr) return;

  var btn = document.createElement('button');
  btn.id      = 'btn-sync-massal-rincian';
  btn.title   = 'Tambah slot pembanding kosong (hanya item yang belum punya 3 pembanding; data lama tidak diubah)';
  btn.innerHTML = '⚡ Sync Massal';
  btn.onclick = function(){ syncUlangMassal(); };

  var titleEl = hdr.querySelector('.table-header-title');
  if (titleEl && titleEl.nextSibling) {
    hdr.insertBefore(btn, titleEl.nextSibling);
  } else {
    hdr.appendChild(btn);
  }
}

// ============================================================
// AUTO-TRIGGER PANEL VIA MutationObserver pada tbody-rincian
// Panel langsung muncul setiap kali tabel Rincian dirender ulang
// ============================================================
function _setupObserver() {
  var tbody = document.getElementById('tbody-rincian');
  if (!tbody) return;

  var debounce = null;
  var obs = new MutationObserver(function() {
    var pg = document.getElementById('page-rincian');
    if (!pg || !pg.classList.contains('active')) return;
    clearTimeout(debounce);
    debounce = setTimeout(function() {
      _injectBtn();
      validasiKelengkapanPembanding();
    }, 250);
  });
  obs.observe(tbody, { childList: true });
}

// ============================================================
// LISTENER EVENT NAVIGASI sideva:page-changed
// ============================================================
window.addEventListener('sideva:page-changed', function(e) {
  if (!e.detail || e.detail.page !== 'rincian') return;
  setTimeout(function() {
    _injectBtn();
    validasiKelengkapanPembanding();
  }, 400);
});

// ============================================================
// INIT SAAT SCRIPT DIMUAT
// ============================================================
(function _boot() {
  function _setup() {
    _injectBtn();
    _setupObserver();
    // Jika rincian sudah aktif dan punya data, langsung tampilkan panel
    var pg = document.getElementById('page-rincian');
    if (pg && pg.classList.contains('active')) {
      setTimeout(validasiKelengkapanPembanding, 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(_setup, 600); });
  } else {
    setTimeout(_setup, 600);
  }
})();

// ============================================================
// INJECT STYLES
// ============================================================
(function _css() {
  if (document.getElementById('sync-data-css')) return;
  var s = document.createElement('style');
  s.id = 'sync-data-css';
  s.textContent = [
    /* tombol toolbar */
    '#btn-sync-massal-rincian{display:inline-flex;align-items:center;gap:5px;',
    'background:#f0f9ff;color:#0369a1;border:1px solid #7dd3fc;border-radius:6px;',
    'padding:5px 12px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;',
    'flex-shrink:0;margin-left:10px;transition:all .15s;}',
    '#btn-sync-massal-rincian:hover{background:#e0f2fe;border-color:#38bdf8;}',
    /* panel status */
    '#svp{position:fixed;bottom:20px;right:20px;z-index:9999;background:#fff;',
    'border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.14);',
    'padding:14px 16px;min-width:255px;max-width:330px;font-family:sans-serif;font-size:13px;}',
    '#svp .svp-head{font-weight:700;font-size:13px;margin-bottom:10px;display:flex;',
    'align-items:center;justify-content:space-between;}',
    '#svp .svp-x{cursor:pointer;color:#a0aec0;font-size:18px;line-height:1;padding:0 2px;}',
    '#svp .svp-x:hover{color:#e53e3e;}',
    '#svp .svp-row{display:flex;align-items:center;justify-content:space-between;',
    'padding:5px 0;border-bottom:1px solid #f0f0f0;color:#4a5568;min-width:0;}',
    '#svp .svp-row:last-of-type{border-bottom:none;}',
    '#svp .svp-n{font-weight:700;font-size:15px;}',
    '#svp .svp-n.ok{color:#10b981;} #svp .svp-n.err{color:#e53e3e;}',
    '#svp .svp-lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px;}',
    '#svp .svp-sub{color:#9ca3af;font-size:11px;white-space:nowrap;margin-left:6px;}',
    '#svp .svp-ok{color:#10b981;font-weight:600;text-align:center;padding:5px 0 2px;}',
    '#svp .svp-btn{display:block;margin-top:8px;background:#3b82f6;color:#fff;border:none;',
    'border-radius:6px;padding:7px 10px;cursor:pointer;width:100%;font-size:12px;font-weight:600;}',
    '#svp .svp-btn:hover{background:#2563eb;}',
    '#svp .svp-btn2{display:block;margin-top:5px;background:#f9fafb;color:#374151;',
    'border:1px solid #d1d5db;border-radius:6px;padding:7px 10px;cursor:pointer;',
    'width:100%;font-size:12px;font-weight:600;}',
    '#svp .svp-btn2:hover{background:#eff6ff;color:#1d4ed8;border-color:#93c5fd;}',
    /* modal sync massal */
    '#smp-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;',
    'display:flex;align-items:center;justify-content:center;}',
    '#smp-bx{background:#fff;border-radius:14px;padding:26px 28px;',
    'width:min(470px,92vw);box-shadow:0 8px 40px rgba(0,0,0,.22);font-family:sans-serif;}',
    '#smp-bx h3{margin:0 0 5px;font-size:17px;color:#1e3a5f;font-weight:700;}',
    '#smp-bx .sb-sub{margin:0 0 18px;font-size:12.5px;color:#6b7280;line-height:1.5;}',
    '.sb-track{background:#f1f5f9;border-radius:999px;height:10px;overflow:hidden;margin-bottom:10px;}',
    '.sb-fill{height:100%;border-radius:999px;transition:width .3s,background .3s;}',
    '.sb-log{font-size:12px;color:#374151;min-height:38px;background:#f8fafc;',
    'border-radius:6px;padding:7px 10px;margin-bottom:16px;word-break:break-all;line-height:1.5;}',
    '.sb-cards{display:none;gap:10px;margin-bottom:18px;}',
    '.sb-cards.show{display:flex;}',
    '.sb-card{flex:1;border-radius:8px;padding:10px;text-align:center;border:1px solid #e5e7eb;}',
    '.sb-card .cv{font-size:26px;font-weight:800;line-height:1;}',
    '.sb-card .cl{font-size:11px;color:#6b7280;margin-top:3px;}',
    '.sb-card.blue{background:#eff6ff;border-color:#bfdbfe;}.sb-card.blue .cv{color:#2563eb;}',
    '.sb-card.green{background:#f0fdf4;border-color:#bbf7d0;}.sb-card.green .cv{color:#16a34a;}',
    '.sb-card.red{background:#fef2f2;border-color:#fecaca;}.sb-card.red .cv{color:#dc2626;}',
    '.sb-foot{display:flex;gap:10px;justify-content:flex-end;}',
    '.sb-cancel{background:#f9fafb;color:#374151;border:1px solid #d1d5db;border-radius:7px;',
    'padding:9px 20px;font-size:14px;font-weight:600;cursor:pointer;}',
    '.sb-cancel:hover{background:#f3f4f6;}',
    '.sb-done{display:none;background:#3b82f6;color:#fff;border:none;border-radius:7px;',
    'padding:9px 20px;font-size:14px;font-weight:600;cursor:pointer;}',
    '.sb-done:hover{background:#2563eb;}',
  ].join('');
  document.head.appendChild(s);
})();

// ============================================================
// UI HELPERS: PANEL STATUS
// ============================================================
function _svpRender(total, sudah, belum) {
  var el = document.getElementById('svp');
  if (!el) {
    el = document.createElement('div');
    el.id = 'svp';
    document.body.appendChild(el);
  }

  el.innerHTML =
    '<div class="svp-head">'+
      '<span>📋 Status Survey Harga</span>'+
      '<span class="svp-x" onclick="document.getElementById(\'svp\').style.display=\'none\'" title="Tutup">×</span>'+
    '</div>'+
    '<div class="svp-row"><span>Total Item Rincian</span><span class="svp-n">'+total+'</span></div>'+
    '<div class="svp-row"><span>Sudah ada pembanding</span><span class="svp-n ok">'+sudah+'</span></div>'+
    '<div class="svp-row"><span>Belum ada pembanding</span><span class="svp-n err">'+belum+'</span></div>'+
    '<button class="svp-btn" onclick="validasiKelengkapanPembanding()">🔄 Cek Ulang</button>'+
    (belum>0 ? '<button class="svp-btn2" onclick="syncUlangMassal()">⚡ Sync Massal Sekarang</button>' : '');

  el.style.display = 'block';
}

// ============================================================
// UI HELPERS: MODAL PROGRESS SYNC MASSAL
// ============================================================
function _smpShow() {
  var old = document.getElementById('smp-ov');
  if (old) old.remove();
  var ov = document.createElement('div');
  ov.id = 'smp-ov';
  ov.innerHTML =
    '<div id="smp-bx">'+
      '<h3>⚡ Sync Ulang Massal</h3>'+
      '<p class="sb-sub">Menambah baris Survey Harga hanya untuk rincian yang belum punya 3 pembanding.<br>'+
      '<strong>Rincian yang sudah punya pembanding tidak diubah/ditimpa.</strong></p>'+
      '<div class="sb-track"><div class="sb-fill" id="sb-fill" style="width:0%;background:#3b82f6"></div></div>'+
      '<div class="sb-log" id="sb-log">Memulai proses…</div>'+
      '<div class="sb-cards" id="sb-cards">'+
        '<div class="sb-card blue"><div class="cv" id="sb-d">0</div><div class="cl">Pembanding Dibuat</div></div>'+
        '<div class="sb-card green"><div class="cv" id="sb-l">0</div><div class="cl">Sudah Lengkap</div></div>'+
        '<div class="sb-card red"><div class="cv" id="sb-g">0</div><div class="cl">Gagal</div></div>'+
      '</div>'+
      '<div class="sb-foot">'+
        '<button class="sb-cancel" id="sb-cancel" onclick="document.getElementById(\'smp-ov\').remove()">Tutup</button>'+
        '<button class="sb-done"   id="sb-done"   onclick="document.getElementById(\'smp-ov\').remove()">✓ Selesai</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(ov);
}

function _smpLog(msg, pct, warna) {
  var f = document.getElementById('sb-fill');
  var l = document.getElementById('sb-log');
  if (f) { f.style.width = pct+'%'; f.style.background = warna; }
  if (l) l.textContent = msg;
}

function _smpDone(ok, dibuat, lewat, gagal) {
  var c = document.getElementById('sb-cancel');
  var d = document.getElementById('sb-done');
  var cards = document.getElementById('sb-cards');
  if (c) c.style.display = 'none';
  if (d) d.style.display = 'inline-block';
  if (ok && cards) {
    var el1 = document.getElementById('sb-d');
    var el2 = document.getElementById('sb-l');
    var el3 = document.getElementById('sb-g');
    if (el1) el1.textContent = dibuat||0;
    if (el2) el2.textContent = lewat||0;
    if (el3) el3.textContent = gagal||0;
    cards.classList.add('show');
  }
}
