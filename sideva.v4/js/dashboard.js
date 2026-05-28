// ============================================================
//  DATABASE — Supabase v3.0
//  dbGetAll / dbPut / dbDelete / dbClear didefinisikan
//  di supabase-db.js yang di-load SEBELUM file ini.
//  Stub berikut hanya sebagai fallback jika supabase-db.js
//  belum selesai load (seharusnya tidak terjadi).
// ============================================================
if (typeof db === 'undefined') var db = null; // tidak dipakai lagi, tapi dibiarkan agar tidak error referensi

function openDB() {
  // Tidak perlu buka IndexedDB — Supabase sudah siap via supabase-db.js
  return Promise.resolve(true);
}

// ============================================================
//  KONFIGURASI INSTANSI (Multi-Instansi — Tidak hanya BAPPEDA)
// ============================================================
if (!window.DEFAULT_CONFIG) window.DEFAULT_CONFIG = {
  namaInstansi:  '',
  singkatan:     '',
  kabupaten:     '',
  alamat:        '',
  telepon:       '',
  website:       '',
  sumberDana:    'APBD',
  tahunAnggaran: new Date().getFullYear(),
};
var DEFAULT_CONFIG = window.DEFAULT_CONFIG;
if (typeof appConfig === 'undefined') var appConfig = { ...DEFAULT_CONFIG };

function loadAppConfig() {
  try {
    const saved = localStorage.getItem('sideva_config');
    if (saved) appConfig = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch(e) { appConfig = { ...DEFAULT_CONFIG }; }
}
function saveAppConfig() {
  localStorage.setItem('sideva_config', JSON.stringify(appConfig));
  // Sinkron ke Supabase — sertakan gambar kop surat agar tampil di semua device
  if (typeof sbSaveConfig === 'function' && typeof isLoggedIn === 'function' && isLoggedIn()) {
    const kopImg = localStorage.getItem('sideva_kop_surat_img') || null;
    const cfgToSync = { ...appConfig, _kopSuratImg: kopImg };
    sbSaveConfig(cfgToSync).catch(e => console.warn('Config sync:', e));
  }
}
function applyAppConfig() {
  const s   = appConfig.singkatan   || 'Instansi';
  const kab = (appConfig.kabupaten  || '').replace('Kabupaten ','').replace('Kota ','');
  const brandLabel = s + (kab ? ' ' + kab : '');
  const el1 = document.getElementById('brand-instansi');
  if (el1) el1.textContent = brandLabel || 'Instansi Pemerintah';
  const el2 = document.getElementById('footer-instansi');
  if (el2) el2.textContent = 'SI-DEVA v2.0 · ' + (brandLabel || 'Instansi Pemerintah');
  const el3 = document.getElementById('hero-subtitle');
  if (el3) {
    if (appConfig.singkatan) {
      el3.textContent = 'Sistem Informasi Dokumen Evaluasi — monitoring paket, evaluasi harga, dan administrasi pengadaan ' + s + ' ' + (appConfig.kabupaten||'') + ' secara real-time.';
    } else {
      el3.textContent = 'Sistem Informasi Dokumen Evaluasi — monitoring paket, evaluasi harga, dan administrasi pengadaan secara real-time untuk seluruh perangkat daerah.';
    }
  }
  // Tampilkan banner setup jika instansi belum dikonfigurasi
  const setupBanner = document.getElementById('setup-banner');
  if (setupBanner) setupBanner.style.display = appConfig.singkatan ? 'none' : 'flex';
  // Isi form pengaturan jika sudah ada
  _fillPengaturanForm();
}
function _fillPengaturanForm() {
  const fields = ['namaInstansi','singkatan','kabupaten','alamat','telepon','website','sumberDana','tahunAnggaran'];
  fields.forEach(f => {
    const el = document.getElementById('cfg-' + f);
    if (el) el.value = appConfig[f] || '';
  });
}
function savePengaturan() {
  const fields = ['namaInstansi','singkatan','kabupaten','alamat','telepon','website','sumberDana'];
  fields.forEach(f => {
    const el = document.getElementById('cfg-' + f);
    if (el) appConfig[f] = el.value.trim();
  });
  const tEl = document.getElementById('cfg-tahunAnggaran');
  if (tEl) appConfig.tahunAnggaran = parseInt(tEl.value) || new Date().getFullYear();
  saveAppConfig();
  applyAppConfig();
  toast('Pengaturan instansi berhasil disimpan!', 'success');
}
function resetPengaturan() {
  if (!confirm('Reset semua pengaturan ke nilai default?')) return;
  appConfig = { ...DEFAULT_CONFIG };
  saveAppConfig();
  applyAppConfig();
  toast('Pengaturan direset ke default.', 'info');
}
function savePengaturanAndPreview() {
  savePengaturan();
  // Render kop surat preview
  const area = document.getElementById('kop-preview-area');
  if (area) area.innerHTML = kopSurat();
  // Update preview label
  const uploadedKop = localStorage.getItem('sideva_kop_surat_img');
  const lbl = document.getElementById('kop-preview-label-text');
  if (lbl) lbl.textContent = uploadedKop
    ? 'Pratinjau kop surat — menggunakan gambar yang diupload'
    : 'Pratinjau kop surat (teks fallback) — berdasarkan data yang diisi di atas';
}

// ============================================================
//  UPLOAD KOP SURAT
// ============================================================
function handleKopFileSelect(event) {
  const file = event.target.files[0];
  if (file) processKopFile(file);
}
function handleKopDrop(event) {
  event.preventDefault();
  document.getElementById('kop-upload-zone').classList.remove('kop-drag-over');
  const file = event.dataTransfer.files[0];
  if (file) processKopFile(file);
}
function processKopFile(file) {
  if (!file.type.startsWith('image/')) {
    showKopMsg('Gagal: File harus berupa gambar (PNG, JPG, atau WEBP).', 'error'); return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showKopMsg('Gagal: Ukuran file melebihi 5 MB. Mohon kompres gambar terlebih dahulu.', 'error'); return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    try {
      localStorage.setItem('sideva_kop_surat_img', base64);
      renderKopUploadPreview(base64, file);
      const area = document.getElementById('kop-preview-area');
      if (area) area.innerHTML = kopSurat();
      const lbl = document.getElementById('kop-preview-label-text');
      if (lbl) lbl.textContent = 'Pratinjau kop surat - menggunakan gambar yang diupload';
      showKopMsg('Gambar kop surat berhasil disimpan dan siap digunakan di dokumen cetak.', 'success');
      toast('Gambar kop surat berhasil diupload!', 'success');
      // Sync gambar kop surat ke Supabase agar tampil di semua device
      if (typeof sbSaveConfig === 'function' && typeof isLoggedIn === 'function' && isLoggedIn()) {
        const cfgToSync = { ...appConfig, _kopSuratImg: base64 };
        sbSaveConfig(cfgToSync).catch(e => console.warn('Kop surat sync:', e));
      }
    } catch(err) {
      showKopMsg('Gagal menyimpan gambar: ' + err.message + '. Coba perkecil ukuran gambar.', 'error');
    }
  };
  reader.readAsDataURL(file);
}
function renderKopUploadPreview(base64, file) {
  const wrap = document.getElementById('kop-img-preview-wrap');
  const img  = document.getElementById('kop-img-preview');
  const meta = document.getElementById('kop-img-meta');
  if (!wrap || !img) return;
  img.src = base64;
  if (meta && file) {
    const kb = (file.size / 1024).toFixed(1);
    meta.textContent = file.name + ' - ' + kb + ' KB - ' + file.type.replace('image/','').toUpperCase();
  }
  wrap.style.display = 'block';
  document.getElementById('kop-upload-zone').style.display = 'none';
}
function hapusKopSurat() {
  if (!confirm('Hapus gambar kop surat? Dokumen akan menggunakan tampilan teks fallback.')) return;
  localStorage.removeItem('sideva_kop_surat_img');
  const wrap = document.getElementById('kop-img-preview-wrap');
  const zone = document.getElementById('kop-upload-zone');
  const fileInput = document.getElementById('kop-file-input');
  if (wrap) wrap.style.display = 'none';
  if (zone) zone.style.display = '';
  if (fileInput) fileInput.value = '';
  const area = document.getElementById('kop-preview-area');
  if (area) area.innerHTML = kopSurat();
  const lbl = document.getElementById('kop-preview-label-text');
  if (lbl) lbl.textContent = 'Pratinjau kop surat (teks fallback) - berdasarkan data yang diisi di atas';
  showKopMsg('Gambar kop surat dihapus. Dokumen kini menggunakan tampilan teks.', 'info');
  toast('Gambar kop surat dihapus.', 'info');
  // Hapus gambar kop dari Supabase config juga
  if (typeof sbSaveConfig === 'function' && typeof isLoggedIn === 'function' && isLoggedIn()) {
    const cfgToSync = { ...appConfig, _kopSuratImg: null };
    sbSaveConfig(cfgToSync).catch(e => console.warn('Kop surat sync:', e));
  }
}
function showKopMsg(msg, type) {
  const el = document.getElementById('kop-upload-msg');
  if (!el) return;
  const colors = {
    success: { bg:'var(--green-subtle)', color:'var(--green)', border:'rgba(92,158,106,0.3)' },
    error:   { bg:'var(--red-subtle)',   color:'var(--red)',   border:'rgba(192,80,80,0.3)' },
    info:    { bg:'var(--gold-subtle)',  color:'var(--gold)',  border:'var(--border2)' },
  };
  const c = colors[type] || colors.info;
  el.style.cssText = 'display:block;background:'+c.bg+';color:'+c.color+';border:1px solid '+c.border+';border-radius:var(--radius);padding:10px 14px;font-size:12px;margin-top:12px;';
  el.textContent = msg;
  setTimeout(function() { el.style.display = 'none'; }, 5000);
}
function initKopSuratUpload() {
  const saved = localStorage.getItem('sideva_kop_surat_img');
  if (saved) {
    renderKopUploadPreview(saved, null);
    const meta = document.getElementById('kop-img-meta');
    if (meta) {
      const approxKb = Math.round(saved.length * 0.75 / 1024);
      meta.textContent = 'Gambar tersimpan - sekitar ' + approxKb + ' KB';
    }
    const lbl = document.getElementById('kop-preview-label-text');
    if (lbl) lbl.textContent = 'Pratinjau kop surat - menggunakan gambar yang diupload';
  }
}

// ============================================================
//  STATE
// ============================================================
if (!window.state) window.state = {
  paket:    { data:[], filtered:[], page:1, perPage:10, sortCol:'noPaket', sortDir:'asc' },
  rincian:  { data:[], filtered:[], page:1, perPage:10, sortCol:'no', sortDir:'asc' },
  harga:    { data:[], filtered:[], page:1, perPage:10, sortCol:'rup', sortDir:'asc' },
  penyedia: { data:[], filtered:[], page:1, perPage:10, sortCol:'namaPenyedia', sortDir:'asc' },
};
var state = window.state;
if (!window.masterState) window.masterState = { bidang:[], opd:[], rekening:[], ppk:[], pejabatPengadaan:[], ecatalog:[] };
var masterState = window.masterState;
if (typeof editId === 'undefined')      var editId = null;
if (typeof editStore === 'undefined')   var editStore = null;
if (typeof currentPage === 'undefined') var currentPage = 'dashboard';

// ── Performa: gunakan requestAnimationFrame untuk update UI non-kritis ──
function rafUpdate(fn) {
  if (window.requestAnimationFrame) requestAnimationFrame(fn);
  else fn();
}

// ============================================================
//  NAVIGATION
// ============================================================
if (!window.PAGE_TITLES) window.PAGE_TITLES = {
  dashboard:'Dashboard', paket:'Data Paket', rincian:'Rincian Belanja',
  harga:'Survey Harga', penyedia:'Data Penyedia', master:'Data Master',
  import:'Import Data', backup:'Backup & Restore', evat:'EV_AT - Evaluasi Administrasi Teknis',
  evhp:'EV_HP', formspek:'Form Spek - Spesifikasi Teknis E-Purchasing', formdpp:'Form DPP - Dokumen Persiapan Pengadaan E-Purchasing', nodis:'Nota Dinas',
  riviu:'Riviu Dokumen', penetapan:'Form Penetapan', idkb:'Form IDKB',
  bahpe:'BAHPE - Berita Acara Hasil Penetapan E-Purchasing',
  sppbj:'SPPBJ - Surat Perintah Pengadaan Barang/Jasa',
  ecatalog:'Referensi Link E-Catalog',
  pengaturan:'Pengaturan Instansi',
  'opd-management':'Manajemen OPD',
  'manajemen-user':'Manajemen RBAC',
  laporan:'Laporan Realisasi Anggaran'
};
var PAGE_TITLES = window.PAGE_TITLES;

// ============================================================
//  MOBILE SIDEBAR (offcanvas drawer)
// ============================================================
function _isPhoneLayout() {
  try { return window.matchMedia && window.matchMedia('(max-width: 599px)').matches; }
  catch(_) { return false; }
}

function openSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  const btn = document.getElementById('sidebar-toggle');
  if (!sb || !ov) return;
  sb.classList.add('open');
  ov.classList.add('open');
  document.body.classList.add('sidebar-open');
  if (btn) {
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Tutup menu');
  }
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  const btn = document.getElementById('sidebar-toggle');
  if (!sb || !ov) return;
  sb.classList.remove('open');
  ov.classList.remove('open');
  document.body.classList.remove('sidebar-open');
  if (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Buka menu');
  }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  if (sb.classList.contains('open')) closeSidebar();
  else openSidebar();
}

// Wire up interactions (no inline onclick)
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('sidebar-toggle');
  const ov  = document.getElementById('sidebar-overlay');
  const sb  = document.getElementById('sidebar');
  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); toggleSidebar(); });
  if (ov)  ov.addEventListener('click', () => closeSidebar());

  // Touch guard: when drawer is open, block background scrolling but keep sidebar scroll.
  document.addEventListener('touchmove', (e) => {
    if (!_isPhoneLayout()) return;
    if (!document.body.classList.contains('sidebar-open')) return;
    if (sb && sb.contains(e.target)) return; // allow scroll inside sidebar nav
    e.preventDefault();
  }, { passive: false });

  // ESC closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
});

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const targetPage = document.getElementById('page-' + name);
  if (!targetPage) return;
  targetPage.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes("'" + name + "'"))
      n.classList.add('active');
  });
  document.getElementById('topbar-title').textContent = PAGE_TITLES[name] || name;
  const bcCur = document.getElementById('topbar-breadcrumb-cur');
  if (bcCur) bcCur.textContent = PAGE_TITLES[name] || name;
  currentPage = name;
  if (name === 'dashboard') renderDashboard();
  if (name === 'master') renderMaster();
  if (name === 'ecatalog') renderEcatalog();
  if (name === 'formspek') { populateFormSpekSelects(); }
  if (name === 'formdpp') { populateFormDppSelects(); }
  if (name === 'nodis') { populateNodisSelects(); }
  if (name === 'riviu') { populateRiviuSelects(); }
  if (name === 'penetapan') { populatePenetapanSelects(); }
  if (name === 'idkb') { populateIdkbSelects(); }
  if (name === 'bahpe') { populateBahpeSelects(); }
  if (name === 'sppbj') { populateSppbjSelects(); }
  if (name === 'pengaturan') { _fillPengaturanForm(); initKopSuratUpload(); initNotifPrefsUI(); }
  if (name === 'backup')     { updateBackupPageStatus(); }
  if (name === 'laporan')    { renderLaporan(); }
  // Update add button context
  const addBtn = document.querySelector('.topbar-actions .btn-primary');
  const exportBtn = document.querySelector('.topbar-actions .btn-secondary');
  const noAdd = ['dashboard','master','import','backup','evat','evhp','formspek','formdpp','nodis','riviu','penetapan','idkb','bahpe','sppbj','ecatalog','pengaturan','laporan','opd-management','manajemen-user'];
  addBtn.style.display = noAdd.includes(name) ? 'none' : '';
  exportBtn.style.display = ['paket','rincian','harga','penyedia'].includes(name) ? '' : 'none';
  // Print PDF button — tampil di halaman dokumen
  const printBtn = document.getElementById('topbar-print-btn');
  const docPages = ['evat','evhp','formspek','formdpp','nodis','riviu','penetapan','idkb','bahpe','sppbj'];
  if (printBtn) {
    printBtn.style.display = docPages.includes(name) ? '' : 'none';
    printBtn.setAttribute('data-slug', name);
  }

  // Mobile UX: close drawer on navigation
  if (_isPhoneLayout()) closeSidebar();

  // Broadcast navigation change for feature modules (avoid monkey-patching showPage).
  try {
    window.dispatchEvent(new CustomEvent('sideva:page-changed', {
      detail: { page: name, title: PAGE_TITLES[name] || name }
    }));
  } catch(_) {}
}

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

// ============================================================
//  FORMAT UTILS
// ============================================================
function fmtRp(n) {
  if (!n && n !== 0) return '-';
  return 'Rp' + Number(n).toLocaleString('id-ID', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function getActiveDocConfig() {
  const cfg = { ...DEFAULT_CONFIG, ...(appConfig || {}) };
  let opdId = null;
  let opdName = '';

  try {
    opdId = (typeof getCurrentOpdId === 'function') ? getCurrentOpdId() : null;
    opdName = (typeof getCurrentOpdName === 'function') ? getCurrentOpdName() : '';
  } catch (_) {}

  let opdCfg = {};
  if (opdId) {
    try {
      const saved = localStorage.getItem(`sideva_opd_config_${opdId}`);
      if (saved) opdCfg = JSON.parse(saved) || {};
    } catch (_) {}
  }

  if (opdName && opdName !== 'Semua OPD') {
    cfg.namaInstansi = opdName;
  }
  if (opdCfg.singkatan) cfg.singkatan = opdCfg.singkatan;
  if (opdCfg.alamat) cfg.alamat = opdCfg.alamat;
  if (opdCfg.telepon) cfg.telepon = opdCfg.telepon;
  if (opdCfg.website) cfg.website = opdCfg.website;
  if (!cfg.singkatan && opdCfg.kode_opd) cfg.singkatan = opdCfg.kode_opd;

  cfg.singkatan = cfg.singkatan || 'SIDEVA';
  cfg.kabupaten = cfg.kabupaten || 'Kabupaten Kapuas Hulu';
  return cfg;
}

function getDocOrg(paket = null) {
  const cfg = getActiveDocConfig();
  const namaInstansi = cfg.namaInstansi || paket?.opd || 'Instansi Pemerintah';
  const singkatan = cfg.singkatan || 'SIDEVA';
  const kabupaten = cfg.kabupaten || 'Kabupaten Kapuas Hulu';
  const tahunAnggaran = cfg.tahunAnggaran || new Date().getFullYear();
  return {
    cfg,
    namaInstansi,
    singkatan,
    kabupaten,
    kabupatenShort: kabupaten.replace('Kabupaten ', '').replace('Kota ', ''),
    sumberDana: cfg.sumberDana || 'APBD',
    tahunAnggaran,
    alamat: cfg.alamat || '',
    tempatPengiriman: cfg.alamat
      ? `Kantor ${namaInstansi}, ${cfg.alamat}.`
      : `Kantor ${namaInstansi} ${kabupaten}.`,
  };
}

function getDefaultDocNumber(saved, fallback, activeSingkatan) {
  const val = String(saved || '');
  return val && !(activeSingkatan !== 'BAPPERIDA' && val.includes('/BAPPERIDA/'))
    ? val
    : fallback;
}

// ============================================================
//  KOP SURAT — gambar resmi; bila file tidak ada tampilkan
//  kop surat teks sebagai fallback agar dokumen tetap valid
// ============================================================
function kopSurat() {
  const cfg       = getActiveDocConfig();
  const namaPem   = ('PEMERINTAH ' + (cfg.kabupaten || 'Kabupaten Kapuas Hulu')).toUpperCase();
  const namaInst  = (cfg.namaInstansi || 'Instansi Pemerintah').toUpperCase();
  const kabShort  = (cfg.kabupaten || '').replace('Kabupaten ','').replace('Kota ','').toUpperCase();
  const singkat   = (cfg.singkatan  || 'SIDEVA').toUpperCase();
  const altText   = 'Kop Surat ' + (cfg.singkatan||'') + ' ' + (cfg.kabupaten||'');
  // Prioritaskan gambar yang diupload user (tersimpan di localStorage)
  const uploadedKop = localStorage.getItem('sideva_kop_surat_img') || '';
  const imgSrc = uploadedKop || 'kop-surat.png';
  return `<div style="margin-bottom:14px;">
      <img src="${imgSrc}" alt="${altText}"
        style="width:100%;display:block;"
        onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='block';">
      <div style="display:none;width:100%;font-family:'Times New Roman',Times,serif;color:#000;padding-bottom:8px;border-bottom:3px double #000;margin-bottom:2px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:72px;text-align:center;vertical-align:middle;border:none;padding-right:8px;">
              <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="30" fill="none" stroke="#000" stroke-width="1.5"/>
                <circle cx="32" cy="32" r="25" fill="none" stroke="#000" stroke-width="0.5"/>
                <polygon points="32,14 34.4,24.6 44.8,22.6 37.6,30.2 44.8,37.8 34.4,35.8 32,46.4 29.6,35.8 19.2,37.8 26.4,30.2 19.2,22.6 29.6,24.6"
                  fill="none" stroke="#000" stroke-width="1.2"/>
                <text x="32" y="56" text-anchor="middle" font-family="serif" font-size="5.5" font-weight="bold" fill="#000">GARUDA PANCASILA</text>
              </svg>
            </td>
            <td style="text-align:center;vertical-align:middle;border:none;padding:4px 6px;">
              <div style="font-size:9pt;font-weight:bold;color:#000;text-transform:uppercase;letter-spacing:0.3px;">${namaPem}</div>
              <div style="font-size:13pt;font-weight:bold;color:#000;text-transform:uppercase;line-height:1.25;letter-spacing:0.2px;">${namaInst}</div>
              <div style="font-size:8pt;color:#000;margin-top:4px;line-height:1.5;">${cfg.alamat || ''}</div>
              <div style="font-size:8pt;color:#000;">Telepon ${cfg.telepon || '-'} &nbsp;&nbsp; Website: ${cfg.website || '-'}</div>
            </td>
            <td style="width:72px;text-align:center;vertical-align:middle;border:none;padding-left:8px;">
              <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="30" fill="none" stroke="#000" stroke-width="1.5"/>
                <circle cx="32" cy="32" r="25" fill="none" stroke="#000" stroke-width="0.5"/>
                <text x="32" y="26" text-anchor="middle" font-family="serif" font-size="7" font-weight="bold" fill="#000">${singkat}</text>
                <text x="32" y="40" text-anchor="middle" font-family="serif" font-size="5.5" fill="#000">${kabShort}</text>
              </svg>
            </td>
          </tr>
        </table>
      </div>
    </div>`;
}
function fmtDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}); }
  catch(e) { return d; }
}
function excelDateToISO(n) {
  if (!n) return '';
  const d = new Date((n - 25569) * 86400 * 1000);
  return d.toISOString().split('T')[0];
}
function strTrunc(s, n=40) {
  if (!s) return '';
  return s.length > n ? s.slice(0,n) + '…' : s;
}
function bidangBadge(b) {
  const map = {
    'Sekretariatan':'blue',
    'Bidang Perencanaan Pengendalian dan Evaluasi Daerah':'green',
    'Bidang Pemerintah dan Pembangunan Manusia':'yellow',
    'Bidang Sumber Daya Alam Infrastruktur dan Kewilayahan':'purple',
    'Bidang Riset dan Inovasi Daerah':'red',
  };
  const c = Object.keys(map).find(k => b && b.includes(k.split(' ').slice(-2).join(' ')));
  return `<span class="badge badge-${map[c]||'blue'}">${strTrunc(b,30)}</span>`;
}

// ============================================================
//  TOAST
// ============================================================
function toast(msg, type='info') {
  const icons = {success:'✅',error:'❌',info:'ℹ️'};
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ============================================================
//  MODAL
// ============================================================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); })
);

// ============================================================
//  LOAD ALL DATA
// ============================================================
async function loadAll() {
  // Delegasi ke supabase-db.js yang mengambil data dari Supabase
  if (typeof loadAllData === 'function') {
    await loadAllData();
  }

  // Apply initial filters
  state.paket.filtered    = [...state.paket.data];
  state.rincian.filtered  = [...state.rincian.data];
  state.harga.filtered    = [...state.harga.data];
  state.penyedia.filtered = [...state.penyedia.data];

  // Initialize dashboard filtered data
  dashboardFilteredPaket    = [...state.paket.data];
  dashboardFilteredRincian  = [...state.rincian.data];
  dashboardFilteredHarga    = [...state.harga.data];

  renderAll();
  updateBadges();
  populateDropdowns();
  populateEvatRupSelect();
  populateEvatPejabatSelect();
  populateEvhpRupSelect();
  populateEvhpPejabatSelect();
  populateFormSpekSelects();
  populateFormDppSelects();
  populatePenetapanSelects();
  populateIdkbSelects();
  populateDashboardFilters();
}

function renderAll() {
  renderPaket();
  renderRincian();
  renderHarga();
  renderPenyedia();
  if (currentPage === 'dashboard') renderDashboard();
  if (currentPage === 'master') renderMaster();
}

function updateBadges() {
  document.getElementById('badge-paket').textContent    = state.paket.data.length;
  document.getElementById('badge-rincian').textContent  = state.rincian.data.length;
  document.getElementById('badge-harga').textContent    = state.harga.data.length;
}

// ============================================================
//  POPULATE DROPDOWNS
// ============================================================
function populateDropdowns() {
  const bidangSel = document.querySelectorAll('#f-bidang, #filter-bidang-paket');
  bidangSel.forEach(sel => {
    const cur = sel.value;
    const isFilter = sel.id.startsWith('filter');
    sel.innerHTML = isFilter ? '<option value="">Semua Bidang</option>' : '';
    masterState.bidang.forEach(b => {
      sel.innerHTML += `<option value="${b.namaBidang}">${b.namaBidang}</option>`;
    });
    sel.value = cur;
  });

  const rekInput = document.getElementById('f-kodeRekening');
  const rekList = document.getElementById('f-kodeRekening-list');
  if (rekList) {
    rekList.innerHTML = '';
    masterState.rekening.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.kodeRekening || '';
      rekList.appendChild(opt);
    });
  } else if (rekInput && rekInput.tagName === 'SELECT') {
    const cur = rekInput.value;
    rekInput.innerHTML = '<option value="">-- Pilih --</option>';
    masterState.rekening.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.kodeRekening || '';
      opt.textContent = r.kodeRekening || '';
      opt.title = r.kodeRekening || '';
      rekInput.appendChild(opt);
    });
    rekInput.value = cur;
  }

  const filterRekSel = document.getElementById('filter-rek-paket');
  if (filterRekSel) {
    const cur = filterRekSel.value;
    filterRekSel.innerHTML = '<option value="">Semua Rekening</option>';
    masterState.rekening.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.kodeRekening || '';
      opt.textContent = r.kodeRekening || '';
      opt.title = r.kodeRekening || '';
      filterRekSel.appendChild(opt);
    });
    filterRekSel.value = cur;
  }

  // Populate filter-rup-paket
  const rupPaketSel = document.getElementById('filter-rup-paket');
  if (rupPaketSel) {
    const curRupPaket = rupPaketSel.value;
    rupPaketSel.innerHTML = '<option value="">Semua No RUP</option>';
    state.paket.data.forEach(p => {
      rupPaketSel.innerHTML += `<option value="${p.rup}">${p.rup} — ${strTrunc(p.namaPaket,40)}</option>`;
    });
    rupPaketSel.value = curRupPaket;
  }

  const rupSels = document.querySelectorAll('#filter-rupdd-rincian,#filter-rupdd-harga,#fr-rup,#fh-rup');
  rupSels.forEach(sel => {
    const cur = sel.value;
    const isFilter = sel.id.startsWith('filter');
    sel.innerHTML = isFilter ? '<option value="">Semua Paket</option>' : '<option value="">-- Pilih --</option>';
    state.paket.data.forEach(p => {
      sel.innerHTML += `<option value="${p.rup}">${p.rup} — ${strTrunc(p.namaPaket,40)}</option>`;
    });
    sel.value = cur;
  });

  const satuanVals = [...new Set(state.rincian.data.map(r => r.satuan).filter(Boolean))];
  const satuanSel = document.getElementById('filter-satuan-rincian');
  const cur = satuanSel.value;
  satuanSel.innerHTML = '<option value="">Semua Satuan</option>';
  satuanVals.forEach(s => satuanSel.innerHTML += `<option value="${s}">${s}</option>`);
  satuanSel.value = cur;

  // fh-namaPenyedia dikelola oleh _buildPenyediaDropdown saat modal dibuka
  // Hanya refresh jika modal harga sedang terbuka agar tidak menimpa pilihan aktif
  const _modalHarga = document.getElementById('modal-harga');
  if (_modalHarga && _modalHarga.classList.contains('open')) {
    const _curNama = _getPenyediaNama();
    _buildPenyediaDropdown(_curNama);
  }

  // Populate filter tahun
  populateYearFilters();
}

// ── Populate dropdown filter tahun berdasarkan data yang ada ──
function populateYearFilters() {
  // Kumpulkan semua tahun dari tanggalPesanan paket
  const tahunPaket = new Set();
  state.paket.data.forEach(p => {
    if (p.tanggalPesanan) tahunPaket.add(new Date(p.tanggalPesanan).getFullYear());
  });

  // Kumpulkan tahun rincian: dari tanggalInput atau via RUP→paket
  const tahunRincian = new Set(tahunPaket); // inherit dari paket (via RUP)
  state.rincian.data.forEach(r => {
    if (r.tanggalInput) tahunRincian.add(new Date(r.tanggalInput).getFullYear());
  });

  // Harga: gunakan tahun dari paket (sama dengan paket karena harga terhubung via RUP)
  const tahunHarga = new Set(tahunPaket);

  const currentYear = (typeof appConfig !== 'undefined' && appConfig.tahunAnggaran)
    ? appConfig.tahunAnggaran
    : new Date().getFullYear();

  function fillSelect(id, years) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value; // simpan pilihan sebelumnya
    sel.innerHTML = '<option value="">Semua Tahun</option>';
    [...years].sort((a,b) => b-a).forEach(y => {
      sel.innerHTML += `<option value="${y}"${y===parseInt(cur)?" selected":""}>TA ${y}</option>`;
    });
    // Set default ke tahun berjalan jika belum ada pilihan tersimpan
    if (!cur && years.has(currentYear)) sel.value = String(currentYear);
    else if (cur) sel.value = cur;
  }

  fillSelect('filter-tahun-paket',   tahunPaket);
  fillSelect('filter-tahun-rincian', tahunRincian);
  fillSelect('filter-tahun-harga',   tahunHarga);
  fillSelect('dash-filter-tahun',    tahunPaket);
  fillSelect('laporan-filter-tahun', tahunPaket);
}

// ============================================================
//  DASHBOARD
// ============================================================
// Dashboard filter state
if (typeof dashboardFilteredPaket === 'undefined') var dashboardFilteredPaket = [];
if (typeof dashboardFilteredRincian === 'undefined') var dashboardFilteredRincian = [];
if (typeof dashboardFilteredHarga === 'undefined') var dashboardFilteredHarga = [];

// Chart instances
if (typeof chartBidangPie === 'undefined') var chartBidangPie = null;
if (typeof chartMonthlyBar === 'undefined') var chartMonthlyBar = null;
if (typeof chartPenyediaBar === 'undefined') var chartPenyediaBar = null;
if (typeof chartStatusDoughnut === 'undefined') var chartStatusDoughnut = null;
if (typeof chartPembelanjaanBidang === 'undefined') var chartPembelanjaanBidang = null;

// ============================================================
//  UI ENHANCEMENTS — inject CSS + clear buttons
// ============================================================
(function injectSidevaEnhancements() {
  const style = document.createElement('style');
  style.textContent = `
    /* 1. Table row hover */
    tbody tr { transition: background 0.13s; }
    tbody tr:hover { background: #F5F7FA !important; }

    /* 2. Sidebar active state — solid blue + white text */
    .nav-item.active {
      background: #2563EB !important;
      color: #fff !important;
      border-radius: 6px !important;
      text-decoration: none !important;
    }
    .nav-item.active .nav-label,
    .nav-item.active .nav-icon,
    .nav-item.active span { color: #fff !important; }

    /* 3. Stat card — cursor + hover shadow */
    .stat-card {
      cursor: pointer !important;
      transition: box-shadow 0.18s, transform 0.16s !important;
    }
    .stat-card:hover {
      box-shadow: 0 8px 28px rgba(0,0,0,0.22) !important;
      transform: translateY(-3px) !important;
    }

    /* 4. Dropdown filter — fade-in animation */
    @keyframes _sidevaFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .filter-wrap { position: relative; display: inline-flex; align-items: center; }
    .filter-wrap select { padding-right: 28px !important; }
    .filter-clear-btn {
      position: absolute; right: 26px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: #999; font-size: 13px; line-height: 1; padding: 0 2px;
      transition: color 0.13s; display: none; z-index: 1;
    }
    .filter-clear-btn:hover { color: #333; }
    .filter-wrap.has-value .filter-clear-btn { display: block; }
    .filter-wrap.has-value select { animation: _sidevaFadeIn 0.18s ease; }
  `;
  document.head.appendChild(style);

  // Add clear buttons to filter selects after DOM ready
  function _addClearButtons() {
    const filterMap = [
      { id: 'dash-filter-bidang',    fn: 'applyDashboardFilters' },
      { id: 'dash-filter-rekening',  fn: 'applyDashboardFilters' },
      { id: 'dash-filter-penyedia',  fn: 'applyDashboardFilters' },
      { id: 'dash-filter-bulan',     fn: 'applyDashboardFilters' },
      { id: 'dash-filter-triwulan',  fn: 'applyDashboardFilters' },
      { id: 'dash-filter-tahun',     fn: 'applyDashboardFilters' },
      { id: 'laporan-filter-tahun',  fn: 'renderLaporan' },
      { id: 'filter-bidang-paket',   fn: 'filterPaket' },
      { id: 'filter-rek-paket',      fn: 'filterPaket' },
      { id: 'filter-rup-rincian',    fn: 'filterRincian' },
      { id: 'filter-satuan-rincian', fn: 'filterRincian' },
      { id: 'filter-rup-harga',      fn: 'filterHarga' },
      { id: 'filter-status-harga',   fn: 'filterHarga' },
      { id: 'filter-tipe-penyedia',  fn: 'filterPenyedia' },
    ];
    filterMap.forEach(({ id, fn }) => {
      const sel = document.getElementById(id);
      if (!sel || sel.closest('.filter-wrap')) return;
      const wrap = document.createElement('span');
      wrap.className = 'filter-wrap';
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);
      const btn = document.createElement('button');
      btn.className = 'filter-clear-btn';
      btn.type = 'button';
      btn.title = 'Reset filter';
      btn.textContent = '×';
      wrap.appendChild(btn);
      const updateWrap = () => {
        wrap.classList.toggle('has-value', !!sel.value);
      };
      sel.addEventListener('change', updateWrap);
      btn.addEventListener('click', () => {
        sel.value = '';
        wrap.classList.remove('has-value');
        if (typeof window[fn] === 'function') window[fn]();
      });
      updateWrap();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _addClearButtons);
  } else {
    setTimeout(_addClearButtons, 500);
  }
})();

// Populate dashboard filter dropdowns
function populateDashboardFilters() {
  // Bidang filter
  const bidangSel = document.getElementById('dash-filter-bidang');
  const curBidang = bidangSel.value;
  bidangSel.innerHTML = '<option value="">Semua Bidang</option>';
  masterState.bidang.forEach(b => {
    bidangSel.innerHTML += `<option value="${b.namaBidang}">${strTrunc(b.namaBidang, 50)}</option>`;
  });
  bidangSel.value = curBidang;

  // Rekening filter
  const rekSel = document.getElementById('dash-filter-rekening');
  const curRek = rekSel.value;
  rekSel.innerHTML = '<option value="">Semua Mata Anggaran</option>';
  masterState.rekening.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.kodeRekening || '';
    opt.textContent = r.kodeRekening || '';
    opt.title = r.kodeRekening || '';
    rekSel.appendChild(opt);
  });
  rekSel.value = curRek;

  // Penyedia filter — sumber data sama dengan diagram Top 5 Penyedia (pemenang per RUP)
  const penyediaSel = document.getElementById('dash-filter-penyedia');
  const curPenyedia = penyediaSel.value;
  penyediaSel.innerHTML = '<option value="">Semua Penyedia</option>';
  const terpilihSet = [...getPenyediaTerpilih(state.harga.data)].sort();
  terpilihSet.forEach(nama => {
    penyediaSel.innerHTML += `<option value="${nama}">${nama}</option>`;
  });
  penyediaSel.value = curPenyedia;
}

// Apply dashboard filters
function applyDashboardFilters() {
  const bidang   = document.getElementById('dash-filter-bidang').value;
  const rekening = document.getElementById('dash-filter-rekening').value;
  const penyedia = document.getElementById('dash-filter-penyedia').value;
  const bulan    = document.getElementById('dash-filter-bulan').value;
  const triwulan = document.getElementById('dash-filter-triwulan').value;
  const tahun    = document.getElementById('dash-filter-tahun')?.value || '';

  // Calculate month range for triwulan
  let monthStart = 0, monthEnd = 12;
  if (triwulan) {
    const tw = parseInt(triwulan);
    monthStart = (tw - 1) * 3;
    monthEnd = tw * 3;
  }
  if (bulan) {
    monthStart = parseInt(bulan) - 1;
    monthEnd = parseInt(bulan);
  }

  // Filter paket
  dashboardFilteredPaket = state.paket.data.filter(p => {
    const matchBidang   = !bidang   || p.bidang === bidang;
    const matchRekening = !rekening || p.kodeRekening === rekening;
    const matchTahun    = !tahun    || (p.tanggalPesanan && new Date(p.tanggalPesanan).getFullYear() === parseInt(tahun));

    let matchDate = true;
    if (bulan || triwulan) {
      const date = p.tanggalPesanan ? new Date(p.tanggalPesanan) : null;
      if (date) {
        const month = date.getMonth();
        matchDate = month >= monthStart && month < monthEnd;
      } else {
        matchDate = false;
      }
    }
    
    return matchBidang && matchRekening && matchDate && matchTahun;
  });

  // Get RUPs from filtered paket
  const filteredRups = new Set(dashboardFilteredPaket.map(p => String(p.rup)));

  // Filter rincian based on filtered paket RUPs
  dashboardFilteredRincian = state.rincian.data.filter(r => {
    return filteredRups.has(String(r.rup));
  });

  // Filter harga based on filtered paket RUPs and penyedia
  dashboardFilteredHarga = state.harga.data.filter(h => {
    const matchRup = filteredRups.has(String(h.rup));
    const matchPenyedia = !penyedia || h.namaPenyedia === penyedia;
    return matchRup && matchPenyedia;
  });

  // Highlight active filters
  highlightActiveFilters();

  // Render dashboard with filtered data
  renderDashboard();
}

function highlightActiveFilters() {
  const filters = ['dash-filter-bidang', 'dash-filter-rekening', 'dash-filter-penyedia', 'dash-filter-bulan', 'dash-filter-triwulan', 'dash-filter-tahun'];
  filters.forEach(id => {
    const el = document.getElementById(id);
    if (el.value) {
      el.classList.add('filter-active');
    } else {
      el.classList.remove('filter-active');
    }
  });
}

function resetDashboardFilters() {
  document.getElementById('dash-filter-bidang').value = '';
  document.getElementById('dash-filter-rekening').value = '';
  document.getElementById('dash-filter-penyedia').value = '';
  document.getElementById('dash-filter-bulan').value = '';
  document.getElementById('dash-filter-triwulan').value = '';
  const _dft = document.getElementById('dash-filter-tahun');
  if (_dft) _dft.value = '';
  
  dashboardFilteredPaket = [...state.paket.data];
  dashboardFilteredRincian = [...state.rincian.data];
  dashboardFilteredHarga = [...state.harga.data];
  
  highlightActiveFilters();
  renderDashboard();
  toast('Filter dashboard direset', 'info');
}

function renderDashboard() {
  // Use filtered data or all data if no filters applied
  const paketData = dashboardFilteredPaket.length > 0 || hasActiveFilters() ? dashboardFilteredPaket : state.paket.data;
  const rincianData = dashboardFilteredRincian.length > 0 || hasActiveFilters() ? dashboardFilteredRincian : state.rincian.data;
  const hargaData = dashboardFilteredHarga.length > 0 || hasActiveFilters() ? dashboardFilteredHarga : state.harga.data;

  const totalPaket   = paketData.length;
  const totalItem    = rincianData.length;
  const totalNilai   = rincianData.reduce((s,r) => s + (Number(r.jumlah)||0), 0);
  const rataPerPaket = totalPaket ? totalNilai / totalPaket : 0;

  // Calculate trends (comparing to all data)
  const allTotalPaket = state.paket.data.length;
  const paketPercentage = allTotalPaket ? Math.round((totalPaket / allTotalPaket) * 100) : 0;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card blue" onclick="drillDownStat('paket')" title="Klik untuk melihat daftar paket">
      <span class="stat-icon">📦</span>
      <div class="stat-label">Total Paket</div>
      <div class="stat-value">${totalPaket}</div>
      <div class="stat-sub">
        ${hasActiveFilters() ? `<span class="trend-indicator trend-up">${paketPercentage}% dari total</span>` : 'Paket pengadaan'}
      </div>
    </div>
    <div class="stat-card green" onclick="drillDownStat('rincian')" title="Klik untuk melihat rincian belanja">
      <span class="stat-icon">🧾</span>
      <div class="stat-label">Total Item Belanja</div>
      <div class="stat-value">${totalItem}</div>
      <div class="stat-sub">Rincian belanja</div>
    </div>
    <div class="stat-card yellow" onclick="drillDownStat('paket')" title="Klik untuk melihat daftar paket">
      <span class="stat-icon">💰</span>
      <div class="stat-label">Total Nilai Belanja</div>
      <div class="stat-value" style="font-size:18px">${fmtRp(totalNilai)}</div>
      <div class="stat-sub">Akumulasi ${hasActiveFilters() ? 'terfilter' : 'semua paket'}</div>
    </div>
    <div class="stat-card purple" onclick="drillDownStat('harga')" title="Klik untuk melihat data survey harga">
      <span class="stat-icon">📊</span>
      <div class="stat-label">Rata-rata / Paket</div>
      <div class="stat-value" style="font-size:18px">${fmtRp(Math.round(rataPerPaket))}</div>
      <div class="stat-sub">Nilai rata-rata per paket</div>
    </div>
  `;

  // Recent paket
  const recent = [...paketData].sort((a,b) => b.id - a.id).slice(0,5);
  if (recent.length === 0) {
    document.getElementById('recent-paket').innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Belum ada data paket</div><div class="empty-sub">Tidak ada paket yang sesuai dengan filter</div></div>';
  } else {
    document.getElementById('recent-paket').innerHTML = '<table style="width:100%"><thead><tr><th style="padding:10px 16px;font-size:11px;font-weight:600;color:var(--text3);background:var(--surface2);border-bottom:1px solid var(--border)">Nama Paket</th><th style="padding:10px 16px;font-size:11px;font-weight:600;color:var(--text3);background:var(--surface2);border-bottom:1px solid var(--border)">Pagu</th><th style="padding:10px 16px;font-size:11px;font-weight:600;color:var(--text3);background:var(--surface2);border-bottom:1px solid var(--border)">Bidang</th></tr></thead><tbody>'
      + recent.map(p => `<tr style="border-bottom:1px solid var(--border)"><td style="padding:10px 16px;font-size:13px">${strTrunc(p.namaPaket,35)}</td><td style="padding:10px 16px;font-size:12px;font-family:monospace">${fmtRp(p.paguAnggaran)}</td><td style="padding:10px 16px;font-size:11px">${bidangBadge(p.bidang)}</td></tr>`).join('')
      + '</tbody></table>';
  }

  // Bidang summary
  const bidangGroups = {};
  paketData.forEach(p => {
    const b = p.bidang || 'Tidak Diketahui';
    if (!bidangGroups[b]) bidangGroups[b] = { count:0, nilai:0 };
    bidangGroups[b].count++;
    bidangGroups[b].nilai += Number(p.paguAnggaran)||0;
  });
  const maxNilai = Math.max(...Object.values(bidangGroups).map(v => v.nilai), 1);
  document.getElementById('bidang-summary').innerHTML = Object.entries(bidangGroups).map(([b,v]) => `
    <div style="margin-bottom:16px">
      <div class="flex-between"><span style="font-size:12px;font-weight:600;color:var(--text)">${strTrunc(b,35)}</span><span style="font-size:11px;color:var(--text3)">${v.count} paket</span></div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">${fmtRp(v.nilai)}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(v.nilai/maxNilai*100)}%"></div></div>
    </div>
  `).join('') || '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Belum ada data</div></div>';

  // Update hero stats bar
  updateHeroStats();

  // Render charts
  renderCharts(paketData, rincianData, hargaData);
}

function hasActiveFilters() {
  return document.getElementById('dash-filter-bidang').value ||
         document.getElementById('dash-filter-rekening').value ||
         document.getElementById('dash-filter-penyedia').value ||
         document.getElementById('dash-filter-bulan').value ||
         document.getElementById('dash-filter-triwulan').value ||
         (document.getElementById('dash-filter-tahun')?.value || '');
}

// Drill-down dari stat card ke halaman yang relevan
function drillDownStat(page) {
  showPage(page);
  toast('Menampilkan data ' + (page === 'paket' ? 'paket pengadaan' : page === 'rincian' ? 'rincian belanja' : 'survey harga'), 'info');
}

// Chart rendering
function renderCharts(paketData, rincianData, hargaData) {
  const chartColors = [
    'rgba(201,168,76,0.85)',   // gold
    'rgba(92,158,106,0.75)',   // green
    'rgba(139,111,168,0.75)',  // purple
    'rgba(192,80,80,0.75)',    // red
    'rgba(160,122,48,0.75)',   // gold-dim
    'rgba(92,140,180,0.75)',   // blue-steel
  ];
  // Chart.js global config for luxury dark theme
  Chart.defaults.color = '#786850';
  Chart.defaults.borderColor = 'rgba(201,168,76,0.12)';
  // 1. Bidang Pie Chart
  const bidangData = {};
  paketData.forEach(p => {
    const b = strTrunc(p.bidang || 'Tidak Diketahui', 25);
    bidangData[b] = (bidangData[b] || 0) + (Number(p.paguAnggaran) || 0);
  });

  const bidangLabels = Object.keys(bidangData);
  const bidangValues = Object.values(bidangData);

  if (chartBidangPie) chartBidangPie.destroy();
  const ctxPie = document.getElementById('chart-bidang-pie');
  if (ctxPie && bidangLabels.length > 0) {
    chartBidangPie = new Chart(ctxPie, {
      type: 'pie',
      data: {
        labels: bidangLabels,
        datasets: [{
          data: bidangValues,
          backgroundColor: chartColors.slice(0, bidangLabels.length),
          borderColor: '#0E0E0E',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 10,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${fmtRp(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  // 2. Monthly Bar Chart
  const monthlyData = {};
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  months.forEach(m => monthlyData[m] = 0);
  
  rincianData.forEach(r => {
    // Try to find month from paket
    const paket = paketData.find(p => String(p.rup) === String(r.rup));
    if (paket && paket.tanggalPesanan) {
      const date = new Date(paket.tanggalPesanan);
      const monthIndex = date.getMonth();
      monthlyData[months[monthIndex]] += Number(r.jumlah) || 0;
    }
  });

  if (chartMonthlyBar) chartMonthlyBar.destroy();
  const ctxMonthly = document.getElementById('chart-monthly-bar');
  if (ctxMonthly) {
    chartMonthlyBar = new Chart(ctxMonthly, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Total Belanja',
          data: Object.values(monthlyData),
          backgroundColor: 'rgba(201,168,76,0.25)',
          borderColor: '#C9A84C',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => fmtRp(ctx.raw)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => value >= 1000000 ? (value / 1000000) + ' Jt' : value
            },
            grid: { color: '#21262d' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // 3. Top Penyedia Bar Chart — hanya nilai penyedia TERPILIH per paket
  // Logika: per RUP, penyedia terpilih = yang memiliki total negoFinal/totalHarga terendah
  const penyediaWinData = {};
  const rupList = [...new Set(hargaData.map(h => h.rup).filter(Boolean))];

  rupList.forEach(rup => {
    const hargaRup = hargaData.filter(h => String(h.rup) === String(rup));
    if (hargaRup.length === 0) return;

    // Hitung total per penyedia untuk RUP ini (pakai negoFinal jika ada, fallback ke totalHarga)
    const totalsMap = {};
    hargaRup.forEach(h => {
      if (!h.namaPenyedia) return;
      const nilai = (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0)) * (Number(h.qty) || 1);
      totalsMap[h.namaPenyedia] = (totalsMap[h.namaPenyedia] || 0) + nilai;
    });

    // Penyedia terpilih = total terendah (harga pemenang negosiasi)
    const entries = Object.entries(totalsMap).filter(e => e[1] > 0);
    if (entries.length === 0) return;
    const winner = entries.reduce((a, b) => a[1] <= b[1] ? a : b);
    penyediaWinData[winner[0]] = (penyediaWinData[winner[0]] || 0) + winner[1];
  });

  const sortedPenyedia = Object.entries(penyediaWinData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (chartPenyediaBar) chartPenyediaBar.destroy();
  const ctxPenyedia = document.getElementById('chart-penyedia-bar');
  if (ctxPenyedia && sortedPenyedia.length > 0) {
    chartPenyediaBar = new Chart(ctxPenyedia, {
      type: 'bar',
      data: {
        labels: sortedPenyedia.map(p => strTrunc(p[0], 15)),
        datasets: [{
          label: 'Nilai Terpilih',
          data: sortedPenyedia.map(p => p[1]),
          backgroundColor: chartColors.slice(0, sortedPenyedia.length),
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => sortedPenyedia[items[0].dataIndex]?.[0] || '',
              label: (ctx) => ' Nilai Terpilih: ' + fmtRp(ctx.raw)
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: (value) => value >= 1000000 ? (value / 1000000) + ' Jt' : value
            },
            grid: { color: '#21262d' }
          },
          y: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // 4. Status Doughnut Chart
  const now = new Date();
  let statusSelesai = 0, statusBerlangsung = 0, statusMenunggu = 0;
  
  paketData.forEach(p => {
    const selesai = p.tanggalSelesai ? new Date(p.tanggalSelesai) : null;
    if (selesai && selesai < now) statusSelesai++;
    else if (!p.tanggalSelesai) statusMenunggu++;
    else statusBerlangsung++;
  });

  if (chartStatusDoughnut) chartStatusDoughnut.destroy();
  const ctxStatus = document.getElementById('chart-status-doughnut');
  if (ctxStatus) {
    chartStatusDoughnut = new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Selesai', 'Berlangsung', 'Menunggu'],
        datasets: [{
          data: [statusSelesai, statusBerlangsung, statusMenunggu],
          backgroundColor: ['rgba(92,158,106,0.8)', 'rgba(201,168,76,0.8)', 'rgba(192,80,80,0.8)'],
          borderColor: '#111111',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });
  }

  // 5. Pembelanjaan Per Bidang — total nilai pemenang kontrak per bidang
  // Logika: per RUP ambil pemenang (total terendah), cari bidang dari data paket,
  // lalu akumulasi nilai pemenang tersebut ke bidang yang bersangkutan.
  const pembelanjaanBidangMap = {};
  const rupListPembelanjaan = [...new Set(hargaData.map(h => h.rup).filter(Boolean))];

  rupListPembelanjaan.forEach(rup => {
    // Nilai kontrak = nilai penetapan BAHPE (sama dengan laporan realisasi)
    const nilaiPemenang = (typeof _hitungNilaiPenetapan === 'function')
      ? _hitungNilaiPenetapan(rup)
      : (() => {
          const hargaRup = hargaData.filter(h => String(h.rup) === String(rup));
          if (!hargaRup.length) return 0;
          const totalsMap = {};
          hargaRup.forEach(h => {
            if (!h.namaPenyedia) return;
            totalsMap[h.namaPenyedia] = (totalsMap[h.namaPenyedia] || 0)
              + (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0)) * (Number(h.qty) || 1);
          });
          const entries = Object.entries(totalsMap).filter(e => e[1] > 0);
          if (!entries.length) return 0;
          return entries.reduce((a, b) => a[1] <= b[1] ? a : b)[1];
        })();

    if (!nilaiPemenang) return;

    // Temukan bidang dari data paket berdasarkan RUP
    const paket = paketData.find(p => String(p.rup) === String(rup));
    const bidang = (paket && paket.bidang) ? strTrunc(paket.bidang, 30) : 'Tidak Diketahui';

    pembelanjaanBidangMap[bidang] = (pembelanjaanBidangMap[bidang] || 0) + nilaiPemenang;
  });

  const pbEntries = Object.entries(pembelanjaanBidangMap).sort((a, b) => b[1] - a[1]);

  if (chartPembelanjaanBidang) chartPembelanjaanBidang.destroy();
  const ctxPembelanjaan = document.getElementById('chart-pembelanjaan-bidang');
  if (ctxPembelanjaan && pbEntries.length > 0) {
    chartPembelanjaanBidang = new Chart(ctxPembelanjaan, {
      type: 'bar',
      data: {
        labels: pbEntries.map(e => e[0]),
        datasets: [{
          label: 'Total Pembelanjaan (Nilai Pemenang)',
          data: pbEntries.map(e => e[1]),
          backgroundColor: chartColors.slice(0, pbEntries.length),
          borderRadius: 5,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => pbEntries[items[0].dataIndex]?.[0] || '',
              label: (ctx) => ' Pembelanjaan: ' + fmtRp(ctx.raw)
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: (value) => value >= 1000000000
                ? (value / 1000000000).toFixed(1) + ' M'
                : value >= 1000000
                ? (value / 1000000).toFixed(1) + ' Jt'
                : value
            },
            grid: { color: 'rgba(201,168,76,0.1)' }
          },
          y: { grid: { display: false } }
        }
      }
    });
  } else if (ctxPembelanjaan && pbEntries.length === 0) {
    // Tampilkan pesan kosong jika belum ada data pemenang
    if (chartPembelanjaanBidang) { chartPembelanjaanBidang.destroy(); chartPembelanjaanBidang = null; }
    const parent = ctxPembelanjaan.parentElement;
    if (parent && !parent.querySelector('.pb-empty')) {
      const empty = document.createElement('div');
      empty.className = 'empty-state pb-empty';
      empty.innerHTML = '<div class="empty-icon">📊</div><div class="empty-title">Belum ada data pemenang</div><div class="empty-sub">Data pembelanjaan akan muncul setelah data survey harga terisi</div>';
      parent.appendChild(empty);
    }
  }
}

// ============================================================
//  PAKET TABLE
// ============================================================
function filterPaket() {
  const q      = document.getElementById('search-paket').value.toLowerCase();
  const rupF   = document.getElementById('filter-rup-paket')?.value || '';
  const bidang = document.getElementById('filter-bidang-paket').value;
  const rek    = document.getElementById('filter-rek-paket').value;
  const tahun  = document.getElementById('filter-tahun-paket')?.value || '';
  state.paket.filtered = state.paket.data.filter(p => {
    const matchQ = !q || (p.namaPaket||'').toLowerCase().includes(q) || String(p.rup||'').includes(q) || (p.opd||'').toLowerCase().includes(q);
    const matchRup = !rupF || String(p.rup) === String(rupF);
    const matchB = !bidang || p.bidang === bidang;
    const matchR = !rek || p.kodeRekening === rek;
    const matchT = !tahun || (p.tanggalPesanan && new Date(p.tanggalPesanan).getFullYear() === parseInt(tahun));
    return matchQ && matchRup && matchB && matchR && matchT;
  });
  state.paket.page = 1;
  renderPaket();
}

function sortTable(tbl, col) {
  const s = state[tbl];
  if (s.sortCol === col) s.sortDir = s.sortDir === 'asc' ? 'desc' : 'asc';
  else { s.sortCol = col; s.sortDir = 'asc'; }
  s.page = 1;
  if (tbl === 'paket')    { filterPaket(); return; }
  if (tbl === 'rincian')  { filterRincian(); return; }
  if (tbl === 'harga')    { filterHarga(); return; }
  if (tbl === 'penyedia') { filterPenyedia(); return; }
}

function sortArr(arr, col, dir) {
  return [...arr].sort((a,b) => {
    let va = a[col], vb = b[col];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va === undefined) va = '';
    if (vb === undefined) vb = '';
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

function renderPaket() {
  const s = state.paket;
  const sorted = sortArr(s.filtered, s.sortCol, s.sortDir);
  const total = sorted.length;
  const pages = Math.ceil(total / s.perPage) || 1;
  s.page = Math.min(s.page, pages);
  const slice = sorted.slice((s.page-1)*s.perPage, s.page*s.perPage);

  const tbody = document.getElementById('tbody-paket');
  if (slice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Tidak ada data</div><div class="empty-sub">Tambah paket baru atau ubah filter pencarian</div></div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map(p => {
      const now = new Date();
      const selesai = p.tanggalSelesai ? new Date(p.tanggalSelesai) : null;
      let status = '<span class="badge badge-blue">Berlangsung</span>';
      if (selesai && selesai < now) status = '<span class="badge badge-green">Selesai</span>';
      if (!p.tanggalSelesai) status = '<span class="badge badge-yellow">Menunggu</span>';
      return `<tr>
        <td class="td-mono">${p.noPaket||p.id}</td>
        <td style="max-width:200px"><div class="truncate" title="${p.namaPaket}">${p.namaPaket||'-'}</div><div style="font-size:11px;color:var(--text3)">${p.opd ? strTrunc(p.opd,30) : ''}</div></td>
        <td class="td-mono">${p.rup||'-'}</td>
        <td>${bidangBadge(p.bidang)}</td>
        <td class="td-mono" style="text-align:right">${fmtRp(p.paguAnggaran)}</td>
        <td><span style="font-size:12px">${p.durasi||'-'} ${p.masaKerja||''}</span></td>
        <td style="font-size:12px">${fmtDate(p.tanggalPesanan)}</td>
        <td style="font-size:12px">${fmtDate(p.tanggalSelesai)}</td>
        <td>${status}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="editRecord('paket',${p.id})" title="Edit">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteRecord('paket',${p.id},'${(p.namaPaket||'').replace(/'/g,"\\'")}'')" title="Hapus">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  document.getElementById('info-paket').textContent = `Menampilkan ${slice.length} dari ${total} data`;
  renderPagination('paket', s.page, pages);
}

// ============================================================
//  RINCIAN TABLE
// ============================================================
function filterRincian() {
  const q      = document.getElementById('search-rincian').value.toLowerCase();
  const rupTxt = document.getElementById('filter-rup-rincian').value;
  const rupDD  = document.getElementById('filter-rupdd-rincian')?.value || '';
  const rup    = rupDD || rupTxt;  // dropdown prioritas; fallback ke text
  const satuan = document.getElementById('filter-satuan-rincian').value;
  const tahun  = document.getElementById('filter-tahun-rincian')?.value || '';
  // Buat lookup tahun dari paket berdasarkan RUP
  const rupTahunMap = {};
  state.paket.data.forEach(p => {
    if (p.rup && p.tanggalPesanan) rupTahunMap[String(p.rup)] = new Date(p.tanggalPesanan).getFullYear();
  });
  const s = state.rincian;
  s.filtered = s.data.filter(r => {
    const matchQ = !q || (r.itemBarang||'').toLowerCase().includes(q);
    const matchR = !rup || String(r.rup) === String(rup);
    const matchS = !satuan || r.satuan === satuan;
    let matchT = true;
    if (tahun) {
      // Prioritas: tanggalInput rincian, fallback ke tahun paket via RUP
      const tglInput = r.tanggalInput ? new Date(r.tanggalInput).getFullYear() : null;
      const tglPaket = rupTahunMap[String(r.rup)] || null;
      const tglEfektif = tglInput || tglPaket;
      matchT = tglEfektif === parseInt(tahun);
    }
    return matchQ && matchR && matchS && matchT;
  });
  s.page = 1;
  renderRincian();
}

function renderRincian() {
  const s = state.rincian;
  const sorted = sortArr(s.filtered, s.sortCol, s.sortDir);
  const total = sorted.length;
  const pages = Math.ceil(total / s.perPage) || 1;
  s.page = Math.min(s.page, pages);
  const pageOffset = (s.page - 1) * s.perPage;
  const slice = sorted.slice(pageOffset, s.page*s.perPage);

  const tbody = document.getElementById('tbody-rincian');
  if (slice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🧾</div><div class="empty-title">Tidak ada data rincian</div></div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map((r, idx) => {
      const hargaByRincian = (state.harga.data||[]).filter(h => String(h.parentRincianId) === String(r.id));
      const hargaCountLinked = hargaByRincian.length;
      const maxP = 3;
      const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const hasManualMatch = (state.harga.data||[]).some(h => {
        if (String(h.rup || '') !== String(r.rup || '')) return false;
        if (String(h.parentRincianId || '').trim() !== '') return false;
        const rincianItem = norm(r.itemBarang);
        const hargaItem = norm(h.namaItem);
        const hargaProduk = norm(h.namaProduk);
        const gabung = norm((h.namaItem || '') + ' ' + (h.namaProduk || ''));
        return (
          (hargaItem && hargaItem === rincianItem) ||
          (hargaProduk && hargaProduk === rincianItem) ||
          (gabung && gabung.includes(rincianItem)) ||
          (hargaItem && rincianItem.includes(hargaItem))
        );
      });
      const hargaCount = hasManualMatch ? maxP : hargaCountLinked;
      const bc = hargaCount >= maxP ? '#15803d' : hargaCount > 0 ? '#92400e' : '#b91c1c';
      const bb = hargaCount >= maxP ? '#dcfce7' : hargaCount > 0 ? '#fef3c7' : '#fee2e2';
      const bi = hargaCount >= maxP ? '✓' : hargaCount > 0 ? '~' : '✗';
      const ketBadge = hasManualMatch
        ? `Data harga pembanding manual terdeteksi untuk item ini`
        : `Data harga pembanding: ${hargaCount} dari ${maxP}`;
      const badge = `<span title="${ketBadge}" style="display:inline-block;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;background:${bb};color:${bc};margin-right:5px;white-space:nowrap;vertical-align:middle;cursor:default;">${bi} ${hargaCount}/${maxP}</span>`;
      return `<tr>
      <td class="td-mono">${pageOffset + idx + 1}</td>
      <td class="td-mono">${r.rup||'-'}</td>
      <td style="max-width:240px"><div class="truncate" title="${r.itemBarang}">${badge}${r.itemBarang||'-'}</div></td>
      <td style="text-align:right">${Number(r.vol||0).toLocaleString('id-ID')}</td>
      <td>${r.satuan||'-'}</td>
      <td class="td-mono" style="text-align:right">${fmtRp(r.hargaSatuan)}</td>
      <td class="td-mono" style="text-align:right;font-weight:600">${fmtRp(r.jumlah)}</td>
      <td style="font-size:12px;color:var(--text3)">${r.user||'-'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="editRecord('rincian',${r.id})">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteRecord('rincian',${r.id},'${(r.itemBarang||'').slice(0,30).replace(/'/g,"\\'")}')" >🗑️</button>
        </div>
      </td>
    </tr>`;
    }).join('');
  }
  document.getElementById('info-rincian').textContent = `Menampilkan ${slice.length} dari ${total} data`;
  renderPagination('rincian', s.page, pages);
}

// ============================================================
//  HARGA TABLE
// ============================================================
function filterHarga() {
  const q      = document.getElementById('search-harga').value.toLowerCase();
  const rupTxt = document.getElementById('filter-rup-harga').value;
  const rupDD  = document.getElementById('filter-rupdd-harga')?.value || '';
  const rup    = rupDD || rupTxt;  // dropdown prioritas; fallback ke text
  const status = document.getElementById('filter-status-harga')?.value || '';
  const tahun  = document.getElementById('filter-tahun-harga')?.value || '';
  // Lookup tahun dari paket berdasarkan RUP (harga tidak punya field tanggal langsung)
  const rupTahunMap = {};
  state.paket.data.forEach(p => {
    if (p.rup && p.tanggalPesanan) rupTahunMap[String(p.rup)] = new Date(p.tanggalPesanan).getFullYear();
  });
  const s = state.harga;
  s.filtered = s.data.filter(h => {
    const matchQ = !q || (h.namaItem||'').toLowerCase().includes(q) || (h.namaPenyedia||'').toLowerCase().includes(q) || (h.namaProduk||'').toLowerCase().includes(q);
    const matchR = !rup || String(h.rup) === String(rup);
    const matchS = !status || (h.statusKatalog||'').includes(status);
    const matchT = !tahun || (rupTahunMap[String(h.rup)] === parseInt(tahun));
    return matchQ && matchR && matchS && matchT;
  });
  s.page = 1;
  renderHarga();
}

function renderHarga() {
  const s = state.harga;
  const sorted = sortArr(s.filtered, s.sortCol, s.sortDir);
  const total = sorted.length;
  const pages = Math.ceil(total / s.perPage) || 1;
  s.page = Math.min(s.page, pages);
  const slice = sorted.slice((s.page-1)*s.perPage, s.page*s.perPage);

  const tbody = document.getElementById('tbody-harga');
  if (slice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="empty-icon">🏷️</div><div class="empty-title">Tidak ada data survey harga</div></div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map(h => {
      const statusCls = h.statusKatalog === 'Aktif' ? 'badge-green' : h.statusKatalog === 'Turun Tayang' ? 'badge-red' : 'badge-yellow';
      const pajakCls  = h.statusPajak === 'Kena Pajak' ? 'badge-yellow' : 'badge-blue';
      return `<tr>
        <td class="td-mono">${h.rup||'-'}</td>
        <td style="max-width:150px"><div class="truncate" title="${h.namaItem}">
          ${h.pembandingKe ? `<span class="badge-pembanding">Pembanding ${h.pembandingKe}</span>` : ''}${h.namaItem||'-'}
        </div></td>
        <td style="max-width:140px"><div class="truncate" title="${h.namaProduk}">${h.namaProduk||'-'}</div></td>
        <td style="font-size:12px">${h.namaPenyedia||'-'}</td>
        <td style="text-align:right">${Number(h.qty||0).toLocaleString('id-ID')}</td>
        <td class="td-mono" style="text-align:right">${fmtRp(h.hargaTayang)}</td>
        <td class="td-mono" style="text-align:right;font-weight:600">${fmtRp(h.totalHarga)}</td>
        <td><span class="badge ${pajakCls}" style="font-size:10px">${h.statusPajak === 'Kena Pajak' ? 'Kena PPN' : 'Bebas PPN'}</span></td>
        <td><span class="badge ${statusCls}">${h.statusKatalog||'-'}</span></td>
        <td class="td-mono">${h.negoFinal ? fmtRp(h.negoFinal) : '-'}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-secondary btn-sm btn-icon" onclick="editRecord('harga',${h.id})">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteRecord('harga',${h.id},'${(h.namaItem||'').slice(0,30).replace(/'/g,"\\'")}')" >🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }
  document.getElementById('info-harga').textContent = `Menampilkan ${slice.length} dari ${total} data`;
  renderPagination('harga', s.page, pages);
}

// ============================================================
//  PENYEDIA TABLE
// ============================================================
function filterPenyedia() {
  const q = document.getElementById('search-penyedia').value.toLowerCase();
  const tipe = document.getElementById('filter-tipe-penyedia').value;
  const s = state.penyedia;
  s.filtered = s.data.filter(p => {
    const matchQ = !q || (p.namaPenyedia||'').toLowerCase().includes(q) || (p.alamat||'').toLowerCase().includes(q);
    const matchT = !tipe || p.tipe === tipe;
    return matchQ && matchT;
  });
  s.page = 1;
  renderPenyedia();
}

function renderPenyedia() {
  const s = state.penyedia;
  const sorted = sortArr(s.filtered, s.sortCol, s.sortDir);
  const total = sorted.length;
  const pages = Math.ceil(total / s.perPage) || 1;
  s.page = Math.min(s.page, pages);
  const slice = sorted.slice((s.page-1)*s.perPage, s.page*s.perPage);

  const tbody = document.getElementById('tbody-penyedia');
  if (slice.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🏪</div><div class="empty-title">Tidak ada data penyedia</div></div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map((p,i) => `<tr>
      <td class="td-mono">${p.no||i+1}</td>
      <td style="font-weight:600">${p.namaPenyedia||'-'}</td>
      <td style="max-width:180px;font-size:12px;color:var(--text3)"><div class="truncate" title="${p.alamat}">${p.alamat||'-'}</div></td>
      <td style="font-size:12px">${p.bentukUsaha||'-'}</td>
      <td><span class="badge ${p.status==='Aktif'?'badge-green':'badge-red'}">${p.status||'-'}</span></td>
      <td><span class="badge ${p.tipe==='UMKM'?'badge-purple':'badge-blue'}">${p.tipe||'-'}</span></td>
      <td>${p.linkToko ? `<a href="${p.linkToko}" target="_blank" style="color:var(--accent-hover);font-size:12px;text-decoration:none">🔗 Lihat</a>` : '-'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="editRecord('penyedia',${p.id})">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteRecord('penyedia',${p.id},'${(p.namaPenyedia||'').replace(/'/g,"\\'")}')" >🗑️</button>
        </div>
      </td>
    </tr>`).join('');
  }
  document.getElementById('info-penyedia').textContent = `Menampilkan ${slice.length} dari ${total} data`;
  renderPagination('penyedia', s.page, pages);
}

// ============================================================
//  MASTER TABLES
// ============================================================
if (typeof masterEditId === 'undefined') var masterEditId = null;
if (typeof masterEditType === 'undefined') var masterEditType = null;

function renderMaster() {
  document.getElementById('tbody-bidang').innerHTML = masterState.bidang.map(b => `<tr>
    <td style="font-weight:600">${b.namaBidang||'-'}</td>
    <td class="td-mono">${b.kodeSurat||'-'}</td>
    <td>${b.kepalaBidang||'-'}</td>
    <td class="td-mono" style="font-size:11px">${b.nip||'-'}</td>
    <td>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" onclick="editMaster('bidang',${b.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteMaster('bidang',${b.id},'${(b.namaBidang||'').replace(/'/g,"\\'")}')">Hapus</button>
      </div>
    </td>
  </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">Tidak ada data</td></tr>';

  document.getElementById('tbody-opd').innerHTML = masterState.opd.map(o => `<tr>
    <td>${o.namaOpd||o.namaOPD||o.nama||'-'}</td>
    <td>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" onclick="editMaster('opd','${o.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteMaster('opd','${o.id}','${(o.namaOpd||o.namaOPD||o.nama||'').replace(/'/g,"\\'")}')">Hapus</button>
      </div>
    </td>
  </tr>`).join('') || '<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--text3)">Tidak ada data</td></tr>';

  document.getElementById('tbody-rekening').innerHTML = masterState.rekening.map(r => `<tr>
    <td style="font-size:12px">${r.kodeRekening||'-'}</td>
    <td>${r.linkKatalog ? `<a href="${r.linkKatalog}" target="_blank" style="color:var(--accent-hover);font-size:12px">Link</a>` : '-'}</td>
    <td>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" onclick="editMaster('rekening',${r.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteMaster('rekening',${r.id},'Kode Rekening')">Hapus</button>
      </div>
    </td>
  </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text3)">Tidak ada data</td></tr>';

  document.getElementById('tbody-ppk').innerHTML = masterState.ppk.map(p => `<tr>
    <td style="font-weight:600">${p.nama||'-'}</td>
    <td class="td-mono" style="font-size:11px">${p.nip||'-'}</td>
    <td style="font-size:12px;color:var(--text2)">${p.jabatan||'-'}</td>
    <td style="text-align:center;">
      ${p.ttd
        ? `<img src="${p.ttd}" style="max-height:32px;max-width:90px;object-fit:contain;border:1px dashed var(--border2);border-radius:3px;background:#fff;padding:2px;" title="TTD">`
        : `<span style="color:var(--text4);font-size:10px;">—</span>`}
    </td>
    <td style="text-align:center;">
      ${p.cap
        ? `<img src="${p.cap}" style="max-height:36px;max-width:36px;object-fit:contain;border:1px dashed var(--border2);border-radius:50%;background:#fff;padding:2px;" title="Cap/Stempel">`
        : `<span style="color:var(--text4);font-size:10px;">—</span>`}
    </td>
    <td>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" onclick="editMaster('ppk',${p.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteMaster('ppk',${p.id},'${(p.nama||'').replace(/'/g,"\\'")}')">Hapus</button>
      </div>
    </td>
  </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text3)">Tidak ada data</td></tr>';

  document.getElementById('tbody-pejabatPengadaan').innerHTML = masterState.pejabatPengadaan.map(p => `<tr>
    <td style="font-weight:600">${p.nama||'-'}</td>
    <td class="td-mono" style="font-size:11px">${p.nip||'-'}</td>
    <td style="font-size:12px;color:var(--text2)">${p.jabatan||'-'}</td>
    <td>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" onclick="editMaster('pejabatPengadaan',${p.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteMaster('pejabatPengadaan',${p.id},'${(p.nama||'').replace(/'/g,"\\'")}')">Hapus</button>
      </div>
    </td>
  </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text3)">Tidak ada data</td></tr>';
}

function openMasterModal(type) {
  masterEditId = null;
  masterEditType = type;
  
  if (type === 'bidang') {
    document.getElementById('modal-bidang-title').textContent = 'Tambah Bidang';
    clearForm(['fb-namaBidang', 'fb-kodeSurat', 'fb-kepalaBidang', 'fb-nip']);
    openModal('modal-bidang');
  } else if (type === 'opd') {
    document.getElementById('modal-opd-title').textContent = 'Tambah OPD';
    clearForm(['fo-namaOPD']);
    openModal('modal-opd');
  } else if (type === 'rekening') {
    document.getElementById('modal-rekening-title').textContent = 'Tambah Kode Rekening';
    clearForm(['frk-kodeRekening', 'frk-linkEKatalog', 'fr-kodeRekening', 'fr-linkKatalog']);
    openModal('modal-rekening');
  } else if (type === 'ppk') {
    document.getElementById('modal-ppk-title').textContent = 'Tambah PPK';
    clearForm(['fppk-nama', 'fppk-nip', 'fppk-jabatan']);
    ['ttd','cap'].forEach(k => {
      document.getElementById(`fppk-${k}-file`).value = '';
      document.getElementById(`fppk-${k}-b64`).value  = '';
      document.getElementById(`fppk-${k}-preview`).style.display = 'none';
      document.getElementById(`fppk-${k}-cur`).textContent = '';
    });
    // Reset slider ke default
    const defs = { ttd: {w:120,h:55}, cap: {w:80,h:80} };
    ['ttd','cap'].forEach(k => {
      const wEl = document.getElementById(`fppk-${k}-w`);
      const hEl = document.getElementById(`fppk-${k}-h`);
      const wLbl = document.getElementById(`fppk-${k}-wlbl`);
      const hLbl = document.getElementById(`fppk-${k}-hlbl`);
      const hidW = document.getElementById(`fppk-${k}-size-w`);
      const hidH = document.getElementById(`fppk-${k}-size-h`);
      if (wEl) { wEl.value = defs[k].w; if(wLbl) wLbl.textContent = defs[k].w+'px'; }
      if (hEl) { hEl.value = defs[k].h; if(hLbl) hLbl.textContent = defs[k].h+'px'; }
      if (hidW) hidW.value = defs[k].w;
      if (hidH) hidH.value = defs[k].h;
    });
    openModal('modal-ppk');
  } else if (type === 'pejabatPengadaan') {
    document.getElementById('modal-pejabatPengadaan-title').textContent = 'Tambah Pejabat Pengadaan';
    clearForm(['fpp-nama', 'fpp-nip', 'fpp-jabatan']);
    openModal('modal-pejabatPengadaan');
  }
}

async function editMaster(type, id) {
  masterEditId = id;
  masterEditType = type;
  
  if (type === 'bidang') {
    const b = masterState.bidang.find(x => x.id === id);
    if (!b) return;
    document.getElementById('modal-bidang-title').textContent = 'Edit Bidang';
    document.getElementById('fb-namaBidang').value = b.namaBidang || '';
    document.getElementById('fb-kodeSurat').value = b.kodeSurat || '';
    document.getElementById('fb-kepalaBidang').value = b.kepalaBidang || '';
    document.getElementById('fb-nip').value = b.nip || '';
    openModal('modal-bidang');
  } else if (type === 'opd') {
    const o = masterState.opd.find(x => String(x.id) === String(id));
    if (!o) return;
    document.getElementById('modal-opd-title').textContent = 'Edit OPD';
    document.getElementById('fo-namaOPD').value = o.namaOpd || o.namaOPD || o.nama || '';
    openModal('modal-opd');
  } else if (type === 'rekening') {
    const r = masterState.rekening.find(x => x.id === id);
    if (!r) return;
    document.getElementById('modal-rekening-title').textContent = 'Edit Kode Rekening';
    const kodeEl = document.getElementById('frk-kodeRekening') || document.getElementById('fr-kodeRekening');
    const linkEl = document.getElementById('frk-linkEKatalog') || document.getElementById('fr-linkKatalog');
    if (kodeEl) kodeEl.value = r.kodeRekening || '';
    if (linkEl) linkEl.value = r.linkKatalog || r.linkEcatalog || '';
    openModal('modal-rekening');
  } else if (type === 'ppk') {
    const p = masterState.ppk.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modal-ppk-title').textContent = 'Edit PPK';
    document.getElementById('fppk-nama').value    = p.nama    || '';
    document.getElementById('fppk-nip').value     = p.nip     || '';
    document.getElementById('fppk-jabatan').value = p.jabatan || '';
    // Reset semua preview dulu
    ['ttd','cap'].forEach(k => {
      document.getElementById(`fppk-${k}-file`).value = '';
      document.getElementById(`fppk-${k}-b64`).value  = '';
      document.getElementById(`fppk-${k}-preview`).style.display = 'none';
      document.getElementById(`fppk-${k}-cur`).textContent = '';
    });
    // Restore TTD
    if (p.ttd) showExistingTtd(p.ttd, 'fppk-ttd-file','fppk-ttd-preview','fppk-ttd-b64','fppk-ttd-cur', p.ttdSizeW||120, p.ttdSizeH||55);
    // Restore Cap
    if (p.cap) showExistingTtd(p.cap, 'fppk-cap-file','fppk-cap-preview','fppk-cap-b64','fppk-cap-cur', p.capSizeW||80,  p.capSizeH||80);
    openModal('modal-ppk');
  } else if (type === 'pejabatPengadaan') {
    const p = masterState.pejabatPengadaan.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modal-pejabatPengadaan-title').textContent = 'Edit Pejabat Pengadaan';
    document.getElementById('fpp-nama').value = p.nama || '';
    document.getElementById('fpp-nip').value = p.nip || '';
    document.getElementById('fpp-jabatan').value = p.jabatan || '';
    openModal('modal-pejabatPengadaan');
  }
}

async function saveBidang() {
  const namaBidang = v('fb-namaBidang');
  if (!namaBidang) { toast('Nama Bidang wajib diisi', 'error'); return; }
  const data = { namaBidang, kodeSurat: v('fb-kodeSurat'), kepalaBidang: v('fb-kepalaBidang'), nip: v('fb-nip') };
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
  } catch(err) { console.error('[SI-DEVA]', err); toast('Gagal simpan Bidang: ' + (err.message || err), 'error'); }
}

async function saveOpd() {
  const namaOPD = v('fo-namaOPD');
  if (!namaOPD) { toast('Nama OPD wajib diisi', 'error'); return; }
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
  } catch(err) { console.error('[SI-DEVA]', err); toast('Gagal simpan OPD: ' + (err.message || err), 'error'); }
}

async function saveRekening() {
  // Guard: cegah double-call (terjadi saat tombol di dalam <form> tanpa type="button"
  // → klik sekali memicu onclick + form submit secara bersamaan)
  if (window._savingRekening) return;
  window._savingRekening = true;
  try {
    const kodeEl = document.getElementById('frk-kodeRekening') || document.getElementById('fr-kodeRekening');
    const linkEl = document.getElementById('frk-linkEKatalog') || document.getElementById('fr-linkKatalog');
    const kodeRekening = (kodeEl?.value || '').trim();
    if (!kodeRekening) { toast('Kode Rekening wajib diisi', 'error'); return; }
    const linkKatalog = (linkEl?.value || '').trim();
    const data = { kodeRekening, linkKatalog };
    if (masterEditId) data.id = masterEditId;
    await dbPut('rekening', data);
    masterState.rekening = await dbGetAll('rekening');
    renderMaster();
    populateDropdowns();
    populateDashboardFilters();
    closeModal('modal-rekening');
    toast(masterEditId ? 'Kode Rekening berhasil diperbarui' : 'Kode Rekening berhasil ditambahkan', 'success');
    masterEditId = null;
  } catch(err) { console.error('[SI-DEVA]', err); toast('Gagal simpan Kode Rekening: ' + (err.message || err), 'error'); }
  finally { window._savingRekening = false; }
}

// ============================================================
//  E-CATALOG — Referensi Link E-Catalog
// ============================================================
if (typeof ecatalogEditId === 'undefined') var ecatalogEditId = null;

function renderEcatalog(data) {
  const list = data || masterState.ecatalog;
  const tbody = document.getElementById('tbody-ecatalog');
  if (!tbody) return;
  tbody.innerHTML = list.map((ec, i) => `<tr>
    <td class="no-col">${i+1}</td>
    <td style="font-size:12px;">${ec.jenisBelanja || '-'}</td>
    <td>${ec.linkEcatalog
      ? `<a href="${ec.linkEcatalog}" target="_blank" style="color:var(--accent-hover);font-size:12px;word-break:break-all;">${ec.linkEcatalog}</a>`
      : '<span style="color:var(--text3);font-style:italic;">Belum diisi</span>'}</td>
    <td>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" onclick="editEcatalog(${ec.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteEcatalog(${ec.id})">Hapus</button>
      </div>
    </td>
  </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text3)">Belum ada data referensi E-Catalog. Klik "+ Tambah" untuk menambahkan.</td></tr>';
  const info = document.getElementById('info-ecatalog');
  if (info) info.textContent = `Total: ${list.length} referensi`;
}

function filterEcatalog() {
  const q = (document.getElementById('search-ecatalog').value || '').toLowerCase();
  const filtered = masterState.ecatalog.filter(ec =>
    (ec.jenisBelanja || '').toLowerCase().includes(q) ||
    (ec.linkEcatalog || '').toLowerCase().includes(q)
  );
  renderEcatalog(filtered);
}

async function populateEcatalogJenisBelanja(setVal) {
  const sel = document.getElementById('fec-jenisBelanja');
  if (!sel) return;
  // Pastikan masterState.rekening terisi — ambil ulang dari DB jika perlu
  if (!masterState.rekening || masterState.rekening.length === 0) {
    masterState.rekening = await dbGetAll('rekening');
  }
  sel.innerHTML = '<option value="">-- Pilih Jenis Belanja (Mata Anggaran) --</option>';
  if (masterState.rekening.length > 0) {
    masterState.rekening.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.kodeRekening;
      opt.textContent = r.kodeRekening;
      sel.appendChild(opt);
    });
  } else {
    // Fallback: tampilkan pesan jika belum ada kode rekening
    sel.innerHTML += '<option value="" disabled style="color:#888;">⚠ Belum ada Kode Rekening — isi dulu di Data Master → Kode Rekening</option>';
  }
  if (setVal) sel.value = setVal;
}

async function openEcatalogModal() {
  ecatalogEditId = null;
  _ecatalogManualMode = false;
  const sel  = document.getElementById('fec-jenisBelanja');
  const inp  = document.getElementById('fec-jenisBelanja-manual');
  const btn  = document.getElementById('fec-toggle-manual');
  const hint = document.getElementById('fec-hint-text');
  const title = document.getElementById('modal-ecatalog-title');
  const link  = document.getElementById('fec-linkEcatalog');
  if (!title || !link) { toast('Modal E-Catalog tidak ditemukan. Pastikan index.html sudah diperbarui.', 'error'); return; }
  if (sel)  sel.style.display  = 'block';
  if (inp)  { inp.style.display = 'none'; inp.value = ''; }
  if (btn)  btn.textContent    = '✏ Input manual';
  if (hint) hint.textContent   = 'Pilih dari daftar Kode Rekening / Mata Anggaran Belanja';
  await populateEcatalogJenisBelanja('');
  title.textContent = 'Tambah Referensi E-Catalog';
  link.value = '';
  openModal('modal-ecatalog');
}

async function editEcatalog(id) {
  const ec = masterState.ecatalog.find(x => x.id === id);
  if (!ec) return;
  ecatalogEditId = id;
  const title = document.getElementById('modal-ecatalog-title');
  const link  = document.getElementById('fec-linkEcatalog');
  if (!title || !link) { toast('Modal E-Catalog tidak ditemukan. Pastikan index.html sudah diperbarui.', 'error'); return; }
  await populateEcatalogJenisBelanja(ec.jenisBelanja || '');
  title.textContent = 'Edit Referensi E-Catalog';
  link.value = ec.linkEcatalog || '';
  openModal('modal-ecatalog');
}

if (typeof _ecatalogManualMode === 'undefined') var _ecatalogManualMode = false;

function toggleEcatalogInput() {
  _ecatalogManualMode = !_ecatalogManualMode;
  const sel = document.getElementById('fec-jenisBelanja');
  const inp = document.getElementById('fec-jenisBelanja-manual');
  const btn = document.getElementById('fec-toggle-manual');
  const hint = document.getElementById('fec-hint-text');
  if (_ecatalogManualMode) {
    sel.style.display = 'none';
    inp.style.display = 'block';
    btn.textContent = '☰ Pilih dari daftar';
    hint.textContent = 'Ketik kode rekening secara manual';
    inp.focus();
  } else {
    sel.style.display = 'block';
    inp.style.display = 'none';
    btn.textContent = '✏ Input manual';
    hint.textContent = 'Pilih dari daftar Kode Rekening / Mata Anggaran Belanja';
  }
}

async function saveEcatalog() {
  const jenisBelanja = _ecatalogManualMode
    ? (document.getElementById('fec-jenisBelanja-manual').value || '').trim()
    : (document.getElementById('fec-jenisBelanja').value || '').trim();
  const linkEcatalog = document.getElementById('fec-linkEcatalog').value.trim();
  if (!jenisBelanja) { toast('Jenis Belanja wajib dipilih / diisi', 'error'); return; }
  if (!linkEcatalog) { toast('Link E-Catalog wajib diisi', 'error'); return; }
  const data = { jenisBelanja, linkEcatalog };
  if (ecatalogEditId) data.id = ecatalogEditId;
  try {
    await dbPut('ecatalog', data);
    masterState.ecatalog = await dbGetAll('ecatalog');
    renderEcatalog();
    closeModal('modal-ecatalog');
    _ecatalogManualMode = false;
    const sel = document.getElementById('fec-jenisBelanja');
    const inp = document.getElementById('fec-jenisBelanja-manual');
    const btn = document.getElementById('fec-toggle-manual');
    const hint = document.getElementById('fec-hint-text');
    if (sel) sel.style.display = 'block';
    if (inp) inp.style.display = 'none';
    if (btn) btn.textContent = '✏ Input manual';
    if (hint) hint.textContent = 'Pilih dari daftar Kode Rekening / Mata Anggaran Belanja';
    toast(ecatalogEditId ? 'Referensi E-Catalog berhasil diperbarui' : 'Referensi E-Catalog berhasil ditambahkan', 'success');
    ecatalogEditId = null;
  } catch(err) { console.error('[SI-DEVA]', err); toast('Gagal simpan E-Catalog: ' + (err.message || err), 'error'); }
}

async function deleteEcatalog(id) {
  if (!confirm('Hapus referensi E-Catalog ini?')) return;
  try {
    await dbDelete('ecatalog', id);
    masterState.ecatalog = await dbGetAll('ecatalog');
    renderEcatalog();
    toast('Referensi E-Catalog berhasil dihapus', 'success');
  } catch(err) { console.error('[SI-DEVA]', err); toast('Gagal hapus E-Catalog: ' + (err.message || err), 'error'); }
}

async function savePPK() {
  const nama = v('fppk-nama');
  if (!nama) { toast('Nama PPK wajib diisi', 'error'); return; }

  const ttdFileInput = document.getElementById('fppk-ttd-file');
  const capFileInput = document.getElementById('fppk-cap-file');
  const ttdB64New = document.getElementById('fppk-ttd-b64').value || '';
  const capB64New = document.getElementById('fppk-cap-b64').value || '';

  // Apakah user memilih file baru? Cek dari file input
  const ttdHasNewFile = ttdFileInput && ttdFileInput.files && ttdFileInput.files.length > 0;
  const capHasNewFile = capFileInput && capFileInput.files && capFileInput.files.length > 0;

  // Apakah user klik Hapus? b64 kosong tapi tidak ada file baru = sengaja dihapus
  // Flag ini disimpan di attribute data-cleared
  const ttdCleared = ttdFileInput && ttdFileInput.getAttribute('data-cleared') === '1';
  const capCleared = capFileInput && capFileInput.getAttribute('data-cleared') === '1';

  const ttdSizeW = parseInt(document.getElementById('fppk-ttd-size-w').value) || 120;
  const ttdSizeH = parseInt(document.getElementById('fppk-ttd-size-h').value) || 55;
  const capSizeW = parseInt(document.getElementById('fppk-cap-size-w').value) || 80;
  const capSizeH = parseInt(document.getElementById('fppk-cap-size-h').value) || 80;

  const data = { nama, nip: v('fppk-nip'), jabatan: v('fppk-jabatan'),
    ttdSizeW, ttdSizeH, capSizeW, capSizeH };

  if (masterEditId) {
    const old = masterState.ppk.find(x => x.id === masterEditId);
    // TTD: pakai baru jika ada file baru, hapus jika di-clear, else pertahankan lama
    if (ttdHasNewFile && ttdB64New) {
      data.ttd = ttdB64New;
    } else if (ttdCleared) {
      data.ttd = '';
    } else {
      data.ttd = (old && old.ttd) ? old.ttd : '';
    }
    // Cap: sama
    if (capHasNewFile && capB64New) {
      data.cap = capB64New;
    } else if (capCleared) {
      data.cap = '';
    } else {
      data.cap = (old && old.cap) ? old.cap : '';
    }
    data.id = masterEditId;
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
  } catch(err) { console.error('[SI-DEVA]', err); toast('Gagal simpan PPK: ' + (err.message || err), 'error'); }
}

// ============================================================
//  SCAN TTD & CAP — Upload · Compress · Preview · Ukuran · Toggle
// ============================================================

// TTD dan Cap dikelola secara terpisah
// _ttdMode.formspek / formdpp = { ttd: bool, cap: bool }
window._ttdMode = {
  formspek: { ttd: false, cap: false },
  formdpp:  { ttd: false, cap: false },
  sppbj:    { ttd: false, cap: false }
};

// Fungsi lama dipertahankan sebagai alias (untuk kompatibilitas)
function toggleTtdMode(slug) { toggleTtdOnly(slug); }

function toggleTtdOnly(slug) {
  window._ttdMode[slug].ttd = !window._ttdMode[slug].ttd;
  const btn = document.getElementById(slug + '-ttd-toggle');
  const layoutBtn = document.getElementById(slug + '-layout-btn');
  if (window._ttdMode[slug].ttd) {
    btn.textContent = '🖼 TTD Disertakan';
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-success');
  } else {
    btn.textContent = '🖊 Tanpa TTD';
    btn.classList.remove('btn-success');
    btn.classList.add('btn-secondary');
  }
  // Tampilkan tombol layout jika TTD atau Cap aktif
  if (layoutBtn) layoutBtn.style.display = (window._ttdMode[slug].ttd || window._ttdMode[slug].cap) ? '' : 'none';
  if (slug === 'formspek') loadFormSpekData();
  if (slug === 'formdpp')  loadFormDppData();
  if (slug === 'sppbj')    loadSppbjData();
}

function toggleCapOnly(slug) {
  window._ttdMode[slug].cap = !window._ttdMode[slug].cap;
  const btn = document.getElementById(slug + '-cap-toggle');
  const layoutBtn = document.getElementById(slug + '-layout-btn');
  if (window._ttdMode[slug].cap) {
    btn.textContent = '🔴 Cap Disertakan';
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-success');
    // Jika TTD juga aktif, set posisi awal cap menimpa TTD (30% dari atas, sisi kanan)
    if (window._ttdMode[slug].ttd) {
      const T = window._ttdLayout[slug].ttd;
      window._ttdLayout[slug].cap.x = T.x + Math.round(T.w * 0.55);
      window._ttdLayout[slug].cap.y = T.y + Math.round(T.h * 0.30);
    }
  } else {
    btn.textContent = '🔴 Tanpa Cap';
    btn.classList.remove('btn-success');
    btn.classList.add('btn-secondary');
  }
  // Tampilkan tombol layout jika TTD atau Cap aktif
  if (layoutBtn) layoutBtn.style.display = (window._ttdMode[slug].ttd || window._ttdMode[slug].cap) ? '' : 'none';
  if (slug === 'formspek') loadFormSpekData();
  if (slug === 'formdpp')  loadFormDppData();
  if (slug === 'sppbj')    loadSppbjData();
}

// ── Layout state per dokumen ──────────────────────────────────
window._ttdLayout = {
  formspek: { ttd:{x:0,y:0,w:120,h:55,r:0,o:100}, cap:{x:80,y:-20,w:80,h:80,r:0,o:85} },
  formdpp:  { ttd:{x:0,y:0,w:120,h:55,r:0,o:100}, cap:{x:80,y:-20,w:80,h:80,r:0,o:85} },
  sppbj:    { ttd:{x:0,y:0,w:120,h:55,r:0,o:100}, cap:{x:80,y:-20,w:80,h:80,r:0,o:85} },
};
window._activeLayoutSlug = 'formspek';

if (!window._layoutDefaults) window._layoutDefaults = {
  ttd: {x:0,  y:0,  w:120, h:55, r:0, o:100},
  cap: {x:80, y:-20, w:80, h:80, r:0, o:85},
};
var _layoutDefaults = window._layoutDefaults;

function openLayoutPanel(slug) {
  window._activeLayoutSlug = slug;
  const lbl = document.getElementById('layout-doc-label');
  if (lbl) lbl.textContent = slug === 'formspek' ? 'Form Spek' : 'Form DPP';
  const layout = window._ttdLayout[slug];
  ['ttd','cap'].forEach(k => {
    const s = layout[k];
    ['x','y','w','h','r','o'].forEach(p => {
      const sl  = document.getElementById(`layout-${k}-${p}`);
      const num = document.getElementById(`layout-${k}-${p}-num`);
      if (sl)  sl.value  = s[p];
      if (num) num.value = s[p];
    });
  });
  openModal('modal-layout-ttd');
}

function syncLayoutSlider(k, p) {
  const num = document.getElementById(`layout-${k}-${p}-num`);
  const sl  = document.getElementById(`layout-${k}-${p}`);
  if (!num || !sl) return;
  const val = parseInt(num.value) || 0;
  sl.value = val;
  onLayoutChange();
}

function onLayoutChange() {
  const slug   = window._activeLayoutSlug;
  const layout = window._ttdLayout[slug];
  ['ttd','cap'].forEach(k => {
    ['x','y','w','h','r','o'].forEach(p => {
      const sl  = document.getElementById(`layout-${k}-${p}`);
      const num = document.getElementById(`layout-${k}-${p}-num`);
      const val = parseInt(sl ? sl.value : (num ? num.value : 0)) || 0;
      layout[k][p] = val;
      if (sl  && document.activeElement !== sl)  sl.value  = val;
      if (num && document.activeElement !== num) num.value = val;
    });
  });
  // Re-render dokumen secara live tanpa reload penuh — update style elemen TTD/Cap langsung
  applyLayoutToDoc(slug);
}

function applyLayoutToDoc(slug) {
  const layout = window._ttdLayout[slug];
  const ttdEl  = document.getElementById(`doc-ttd-img-${slug}`);
  const capEl  = document.getElementById(`doc-cap-img-${slug}`);
  if (ttdEl) {
    const s = layout.ttd;
    ttdEl.style.width     = s.w + 'px';
    ttdEl.style.height    = s.h + 'px';
    ttdEl.style.transform = `translate(${s.x}px,${s.y}px) rotate(${s.r}deg)`;
    ttdEl.style.opacity   = (s.o / 100).toFixed(2);
  }
  if (capEl) {
    const s = layout.cap;
    capEl.style.width     = s.w + 'px';
    capEl.style.height    = s.h + 'px';
    capEl.style.transform = `translate(${s.x}px,${s.y}px) rotate(${s.r}deg)`;
    capEl.style.opacity   = (s.o / 100).toFixed(2);
  }
}

function resetLayout(k) {
  const slug   = window._activeLayoutSlug;
  const def    = _layoutDefaults[k];
  window._ttdLayout[slug][k] = {...def};
  ['x','y','w','h','r','o'].forEach(p => {
    const sl  = document.getElementById(`layout-${k}-${p}`);
    const num = document.getElementById(`layout-${k}-${p}-num`);
    if (sl)  sl.value  = def[p];
    if (num) num.value = def[p];
  });
  applyLayoutToDoc(slug);
}

function applyAndCloseLayout() {
  const slug = window._activeLayoutSlug;
  onLayoutChange();
  closeModal('modal-layout-ttd');
  // Re-render dokumen dengan layout baru
  if (slug === 'formspek') loadFormSpekData();
  if (slug === 'formdpp')  loadFormDppData();
}

// ── Drag TTD/Cap langsung di dokumen ─────────────────────────
function makeDraggableTtd(elId, slug, key) {
  const el = document.getElementById(elId);
  if (!el) return;
  let startX, startY, origX, origY, dragging = false;
  el.style.cursor = 'grab';
  el.title = 'Drag untuk pindahkan posisi';

  el.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    origX  = window._ttdLayout[slug][key].x;
    origY  = window._ttdLayout[slug][key].y;
    el.style.cursor = 'grabbing';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    window._ttdLayout[slug][key].x = origX + dx;
    window._ttdLayout[slug][key].y = origY + dy;
    applyLayoutToDoc(slug);
    // Sync panel slider/num jika terbuka
    ['x','y'].forEach(p => {
      const val = window._ttdLayout[slug][key][p];
      const sl  = document.getElementById(`layout-${key}-${p}`);
      const num = document.getElementById(`layout-${key}-${p}-num`);
      if (sl)  sl.value  = val;
      if (num) num.value = val;
    });
  });
  document.addEventListener('mouseup', () => {
    if (dragging) { dragging = false; el.style.cursor = 'grab'; }
  });

  // Touch support
  el.addEventListener('touchstart', e => {
    const t = e.touches[0];
    dragging = true; startX = t.clientX; startY = t.clientY;
    origX = window._ttdLayout[slug][key].x;
    origY = window._ttdLayout[slug][key].y;
    e.preventDefault();
  }, {passive:false});
  el.addEventListener('touchmove', e => {
    if (!dragging) return;
    const t = e.touches[0];
    window._ttdLayout[slug][key].x = origX + (t.clientX - startX);
    window._ttdLayout[slug][key].y = origY + (t.clientY - startY);
    applyLayoutToDoc(slug);
    e.preventDefault();
  }, {passive:false});
  el.addEventListener('touchend', () => { dragging = false; });
}

/* ── Kompresi gambar ke Base64 (simpan resolusi asli, hanya batasi maksimal) ── */
function compressImageToBase64(file, maxW, maxH, quality) {
  return new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('Ukuran file melebihi 2 MB. Gunakan file yang lebih kecil.')); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * ratio); h = Math.round(h * ratio);
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        // Background putih hanya untuk TTD (bukan cap — cap biasanya PNG transparan)
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        // Gunakan PNG agar transparan cap tetap terjaga
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Gagal membaca gambar'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

/* ── Preview + apply ukuran slider ke img element ── */
async function previewTtd(fileInputId, previewDivId, b64InputId, curDivId) {
  const fileInput = document.getElementById(fileInputId);
  const file = fileInput.files[0];
  if (!file) return;
  // Reset flag cleared karena user memilih file baru
  fileInput.removeAttribute('data-cleared');
  try {
    const b64 = await compressImageToBase64(file, 800, 600, 0.92);
    document.getElementById(b64InputId).value = b64;

    const previewDiv = document.getElementById(previewDivId);
    const imgEl      = document.getElementById(fileInputId.replace('-file', '-img'));
    if (imgEl) {
      imgEl.src = b64;
      // Terapkan ukuran slider saat ini
      const slug = fileInputId.includes('-ttd-') ? 'ttd' : 'cap';
      const prefix = fileInputId.replace('-file','');   // misal: fppk-ttd atau fppk-cap
      const wEl = document.getElementById(prefix + '-w');
      const hEl = document.getElementById(prefix + '-h');
      if (wEl && hEl) {
        imgEl.style.width  = wEl.value + 'px';
        imgEl.style.height = hEl.value + 'px';
      }
    }
    if (previewDiv) previewDiv.style.display = 'block';

    const kb = Math.round(b64.length * 0.75 / 1024);
    const curEl = document.getElementById(curDivId);
    if (curEl) curEl.textContent = `✅ Berhasil dikompres (~${kb} KB) — geser slider untuk atur ukuran`;
    toast('Gambar berhasil dimuat dan siap disimpan', 'success');
  } catch(err) {
    toast(err.message, 'error');
    document.getElementById(fileInputId).value = '';
  }
}

/* ── Slider ukuran — update preview img + hidden size inputs ── */
function updateTtdSize(imgId, wSliderId, hSliderId, wLblId, hLblId) {
  const imgEl  = document.getElementById(imgId);
  const wSlider = document.getElementById(wSliderId);
  const hSlider = document.getElementById(hSliderId);
  const w = parseInt(wSlider.value);
  const h = parseInt(hSlider.value);

  if (imgEl) { imgEl.style.width = w + 'px'; imgEl.style.height = h + 'px'; }
  document.getElementById(wLblId).textContent = w + 'px';
  document.getElementById(hLblId).textContent = h + 'px';

  // Simpan ke hidden input agar ikut ke savePPK
  // Deteksi prefix dari imgId: fppk-ttd-img → fppk-ttd-size-w
  const base = imgId.replace('-img','');
  const hidW = document.getElementById(base + '-size-w');
  const hidH = document.getElementById(base + '-size-h');
  if (hidW) hidW.value = w;
  if (hidH) hidH.value = h;
}

/* ── Hapus TTD / Cap ── */
function clearTtd(fileInputId, previewDivId, b64InputId, curDivId) {
  const fileInput = document.getElementById(fileInputId);
  if (fileInput) { fileInput.value = ''; fileInput.setAttribute('data-cleared','1'); }
  document.getElementById(b64InputId).value  = '';
  const previewDiv = document.getElementById(previewDivId);
  if (previewDiv) previewDiv.style.display = 'none';
  const curEl = document.getElementById(curDivId);
  if (curEl) curEl.textContent = '🗑 Gambar dihapus — klik Simpan untuk menyimpan perubahan';
}

/* ── Restore gambar + ukuran saat edit PPK ── */
function showExistingTtd(b64, fileInputId, previewDivId, b64InputId, curDivId, sizeW, sizeH) {
  if (!b64) return;
  const previewDiv = document.getElementById(previewDivId);
  const imgEl      = document.getElementById(fileInputId.replace('-file','-img'));
  const b64Input   = document.getElementById(b64InputId);
  const curEl      = document.getElementById(curDivId);
  const fileInput  = document.getElementById(fileInputId);

  // Reset flag cleared & file input saat restore data lama
  if (fileInput) { fileInput.value = ''; fileInput.removeAttribute('data-cleared'); }

  if (imgEl) {
    imgEl.src = b64;
    if (sizeW) imgEl.style.width  = sizeW + 'px';
    if (sizeH) imgEl.style.height = sizeH + 'px';
  }
  if (previewDiv) previewDiv.style.display = 'block';
  if (b64Input)   b64Input.value = b64;
  if (curEl)      curEl.textContent = '📎 Gambar tersimpan (upload baru untuk mengganti)';

  // Restore slider posisi
  const prefix = fileInputId.replace('-file','');
  const wSlider = document.getElementById(prefix + '-w');
  const hSlider = document.getElementById(prefix + '-h');
  const wLbl    = document.getElementById(prefix + '-wlbl');
  const hLbl    = document.getElementById(prefix + '-hlbl');
  const hidW    = document.getElementById(prefix + '-size-w');
  const hidH    = document.getElementById(prefix + '-size-h');
  if (wSlider && sizeW) { wSlider.value = sizeW; if (wLbl) wLbl.textContent = sizeW + 'px'; }
  if (hSlider && sizeH) { hSlider.value = sizeH; if (hLbl) hLbl.textContent = sizeH + 'px'; }
  if (hidW && sizeW) hidW.value = sizeW;
  if (hidH && sizeH) hidH.value = sizeH;
}

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
  } catch(err) { console.error('[SI-DEVA]', err); toast('Gagal simpan Pejabat Pengadaan: ' + (err.message || err), 'error'); }
}

function confirmDeleteMaster(type, id, name) {
  document.getElementById('delete-confirm-msg').innerHTML = `Yakin ingin menghapus <strong>"${name}"</strong>?`;
  const inp = document.getElementById('delete-confirm-input');
  const btn = document.getElementById('delete-confirm-btn');
  inp.value = ''; btn.disabled = true;
  btn.onclick = async () => {
    if (inp.value !== 'HAPUS') return;
    inp.value = ''; btn.disabled = true;
    await deleteMaster(type, id);
    closeModal('modal-delete');
  };
  openModal('modal-delete');
}

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
  } catch(err) { console.error('[SI-DEVA]', err); toast('Gagal hapus data: ' + (err.message || err), 'error'); }
}

// ============================================================
//  PAGINATION
// ============================================================
function renderPagination(tbl, current, pages) {
  const s = state[tbl];
  const el = document.getElementById('pag-' + tbl);
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = `<button class="page-btn" ${current===1?'disabled':''} onclick="gotoPage('${tbl}',${current-1})">‹</button>`;
  const range = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= current-1 && i <= current+1)) range.push(i);
    else if (range[range.length-1] !== '…') range.push('…');
  }
  range.forEach(p => {
    if (p === '…') html += `<span class="page-btn" style="cursor:default">…</span>`;
    else html += `<button class="page-btn ${p===current?'active':''}" onclick="gotoPage('${tbl}',${p})">${p}</button>`;
  });
  html += `<button class="page-btn" ${current===pages?'disabled':''} onclick="gotoPage('${tbl}',${current+1})">›</button>`;
  el.innerHTML = html;
}

function gotoPage(tbl, page) {
  state[tbl].page = page;
  if (tbl === 'paket')    renderPaket();
  if (tbl === 'rincian')  renderRincian();
  if (tbl === 'harga')    renderHarga();
  if (tbl === 'penyedia') renderPenyedia();
}


// ============================================================
//  EXPORT CSV
// ============================================================
function exportCurrentView() {
  const maps = {
    paket: {
      keys: ['noPaket','opd','namaPaket','rup','program','kegiatan','subKegiatan','masaKerja','durasi','tanggalPesanan','tanggalSelesai','paguAnggaran','kodeRekening','bidang','kepalaBidang','nip','output'],
      headers: ['No Paket','OPD','Nama Paket','RUP','Program','Kegiatan','Sub Kegiatan','Masa Kerja','Durasi','Tgl Pesanan','Tgl Selesai','Pagu Anggaran','Kode Rekening','Bidang','Kepala Bidang','NIP','Output'],
    },
    rincian: {
      keys: ['no','rup','itemBarang','vol','satuan','hargaSatuan','jumlah','user','tanggalInput'],
      headers: ['No','RUP','Item Barang & Spek','Vol','Satuan','Harga Satuan','Jumlah','User','Tanggal Input'],
    },
    harga: {
      keys: ['rup','namaPaket','hps','namaItem','namaProduk','namaPenyedia','qty','satuan','hargaTayang','dpp','ppn','ongkir','totalHarga','statusPajak','pdn','umkm','lokasi','statusKatalog','negoFinal'],
      headers: ['RUP','Nama Paket','HPS','Nama Item','Nama Produk','Nama Penyedia','Qty','Satuan','Harga Tayang','DPP','PPN','Ongkir','Total Harga','Status Pajak','PDN','UMKM','Lokasi','Status Katalog','Nego Final'],
    },
    penyedia: {
      keys: ['no','namaPenyedia','alamat','bentukUsaha','status','tipe','linkToko'],
      headers: ['No','Nama Penyedia','Alamat','Bentuk Usaha','Status','Tipe','Link Toko'],
    },
  };
  const page = currentPage;
  if (!maps[page]) { toast('Export tidak tersedia untuk halaman ini', 'error'); return; }
  const m = maps[page];
  const data = state[page].filtered;
  let csv = m.headers.join(',') + '\n';
  csv += data.map(r => m.keys.map(k => {
    let val = r[k] !== undefined ? r[k] : '';
    val = String(val).replace(/"/g, '""');
    if (val.includes(',') || val.includes('\n') || val.includes('"')) val = `"${val}"`;
    return val;
  }).join(',')).join('\n');

  const blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SIDEVA_${page}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast('File CSV berhasil diunduh!', 'success');
}

// ============================================================
//  IMPORT CSV / JSON
// ============================================================
if (!window.CSV_FORMATS) window.CSV_FORMATS = {
  paket: 'OPD, RUP, Nama Paket, Program, Kegiatan, Sub Kegiatan, Masa Kerja, Durasi, Tanggal Pesanan (YYYY-MM-DD), Tanggal Selesai, Pagu Anggaran, Kode Rekening, Bidang, Output',
  rincian: 'RUP, Item Barang & Spek, Vol, Satuan, Harga Satuan, User',
  harga: 'RUP, Nama Item, Nama Produk, Nama Penyedia, Qty, Satuan, Harga Tayang, Status Pajak, Ongkir, PDN, UMKM, Lokasi, Status Katalog, Nego Final',
  penyedia: 'Nama Penyedia, Alamat, Bentuk Usaha, Status, Tipe, Link Toko',
};
var CSV_FORMATS = window.CSV_FORMATS;

document.getElementById('import-csv-target').addEventListener('change', function() {
  document.getElementById('csv-format-hint').textContent = CSV_FORMATS[this.value] || '';
});

function parseCSVLine(line) {
  const result = []; let cur = ''; let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQuote && line[i+1] === '"') { cur += '"'; i++; } else inQuote = !inQuote; }
    else if (c === ',' && !inQuote) { result.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  result.push(cur.trim());
  return result;
}

async function importCSV() {
  const file = document.getElementById('csv-file').files[0];
  const target = document.getElementById('import-csv-target').value;
  if (!file) { toast('Pilih file CSV terlebih dahulu!', 'error'); return; }
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g,''));
  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h,j) => { obj[h] = vals[j] || ''; });
    const rec = mapCSVToRecord(target, obj);
    if (rec) { await dbPut(target, rec); count++; }
  }
  await loadAll();
  toast(`Berhasil import ${count} data ${target}!`, 'success');
}

function mapCSVToRecord(target, obj) {
  const keys = Object.keys(obj);
  const get = (patterns) => {
    const k = keys.find(k => patterns.some(p => k.includes(p)));
    return k ? obj[k] : '';
  };
  const getN = (patterns) => Number(get(patterns)) || 0;

  if (target === 'paket') return {
    opd: get(['opd']), rup: get(['rup']), namaPaket: get(['namapaket','nama']),
    program: get(['program']), kegiatan: get(['kegiatan']), subKegiatan: get(['sub']),
    masaKerja: get(['masakerja','masa']) || 'Hari Kalender', durasi: getN(['durasi']),
    tanggalPesanan: get(['pesanan']), tanggalSelesai: get(['selesai']),
    paguAnggaran: getN(['pagu']), kodeRekening: get(['rekening','kode']),
    bidang: get(['bidang']), output: get(['output']),
  };
  if (target === 'rincian') return {
    rup: get(['rup']), itemBarang: get(['item','barang']), vol: getN(['vol']),
    satuan: get(['satuan']), hargaSatuan: getN(['hargasatuan','harga']),
    jumlah: getN(['jumlah']) || (getN(['vol']) * getN(['harga'])), user: get(['user']),
    tanggalInput: new Date().toISOString(),
  };
  if (target === 'harga') return {
    rup: get(['rup']), namaItem: get(['item','namaitem']), namaProduk: get(['produk']),
    namaPenyedia: get(['penyedia']), qty: getN(['qty']), satuan: get(['satuan']),
    hargaTayang: getN(['hargatayang','harga']), statusPajak: get(['pajak']) || 'Tidak Kena Pajak',
    ongkir: getN(['ongkir']), pdn: get(['pdn']) || 'Ya', umkm: get(['umkm']) || 'Ya',
    lokasi: get(['lokasi']) || 'Kapus Hulu', statusKatalog: get(['statuskatalog','status']) || 'Aktif',
    negoFinal: getN(['nego']),
  };
  if (target === 'penyedia') return {
    namaPenyedia: get(['nama','penyedia']), alamat: get(['alamat']),
    bentukUsaha: get(['bentuk']), status: get(['status']) || 'Aktif',
    tipe: get(['tipe']) || 'UMKM', linkToko: get(['link']),
  };
}

async function importJSON() {
  const file = document.getElementById('json-file').files[0];
  const target = document.getElementById('import-json-target').value;
  if (!file) { toast('Pilih file JSON terlebih dahulu!', 'error'); return; }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : data[target] || [];
    for (const rec of arr) {
      const clean = {...rec}; delete clean.id;
      await dbPut(target, clean);
    }
    await loadAll();
    toast(`Berhasil import ${arr.length} data!`, 'success');
  } catch(e) { toast('File JSON tidak valid: ' + e.message, 'error'); }
}

// ============================================================
//  BACKUP / RESTORE
// ============================================================
async function backupDB() {
  const backup = {};
  for (const store of Object.keys(STORES)) {
    backup[store] = await dbGetAll(store);
  }
  backup._meta = { version: DB_VER, exported: new Date().toISOString(), app: 'SI-DEVA v2.0' };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SIDEVA_backup_${new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}.json`;
  a.click();
  toast('Backup berhasil diunduh!', 'success');
}

// ── Helper: konversi array of object → CSV string ──
function arrayToCSV(data) {
  if (!data || data.length === 0) return '';
  // Kumpulkan semua key unik (kecuali 'id' internal)
  const allKeys = [...new Set(data.flatMap(r => Object.keys(r)))].filter(k => k !== 'id');
  const escape = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    s = s.replace(/"/g, '""');
    if (s.includes(',') || s.includes('\n') || s.includes('"')) s = `"${s}"`;
    return s;
  };
  const header = allKeys.join(',');
  const rows   = data.map(r => allKeys.map(k => escape(r[k])).join(','));
  return '\uFEFF' + [header, ...rows].join('\n');
}

// ── Export satu tabel ke CSV ──
async function exportStoreCSV(storeName) {
  const data = await dbGetAll(storeName);
  if (!data || data.length === 0) {
    toast(`Tidak ada data pada tabel "${storeName}"`, 'error'); return;
  }
  const csv  = arrayToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `SIDEVA_${storeName}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast(`Export "${storeName}" berhasil diunduh!`, 'success');
}

// ── Export semua tabel sekaligus (satu per satu dengan delay) ──
async function exportAllCSV() {
  const stores = Object.keys(STORES);
  let exported = 0;
  for (const storeName of stores) {
    const data = await dbGetAll(storeName);
    if (!data || data.length === 0) continue;
    const csv  = arrayToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `SIDEVA_${storeName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    exported++;
    await new Promise(r => setTimeout(r, 400)); // delay antar file
  }
  if (exported === 0) toast('Tidak ada data untuk diekspor', 'error');
  else toast(`${exported} file CSV berhasil diunduh!`, 'success');
}

async function restoreDB() {
  const file = document.getElementById('restore-file').files[0];
  if (!file) { toast('Pilih file backup JSON!', 'error'); return; }
  if (!confirm('PERINGATAN: Ini akan menghapus semua data yang ada dan menggantinya dengan backup. Lanjutkan?')) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    for (const store of Object.keys(STORES)) {
      if (Array.isArray(data[store])) {
        await dbClear(store);
        for (const rec of data[store]) await dbPut(store, rec);
      }
    }
    await loadAll();
    toast('Database berhasil dipulihkan!', 'success');
  } catch(e) { toast('Gagal restore: ' + e.message, 'error'); }
}

async function resetDB() {
  if (!confirm('PERINGATAN: Semua data akan dihapus permanen! Yakin?')) return;
  for (const store of Object.keys(STORES)) await dbClear(store);
  await loadAll();
  toast('Database berhasil direset!', 'success');
}

// ============================================================
//  SAMPLE DATA LOAD
// ============================================================
async function loadSampleData() {
  if (!confirm('Data yang ada akan digantikan dengan sample data. Lanjutkan?')) return;

  // Clear all
  for (const store of Object.keys(STORES)) await dbClear(store);

  // Master - Bidang
  const bidangData = [
    {namaBidang:'Sekretariatan', kodeSurat:'/BAPPERIDA/SET-B', kepalaBidang:'DEDY, ST., MT', nip:'NIP. 19970'},
    {namaBidang:'Bidang Perencanaan Pengendalian dan Evaluasi Daerah', kodeSurat:'/BAPPERIDA/PPEPD', kepalaBidang:"EKA FITRIADI SYAFA'AT, S.Kom., M.A.P", nip:'NIP. 19830712 2011011004'},
    {namaBidang:'Bidang Pemerintah dan Pembangunan Manusia', kodeSurat:'/BAPPERIDA/PPM', kepalaBidang:'KRISTOFORUS ORLANDO, S.IP., M. Si', nip:'NIP. 199009232014021003'},
    {namaBidang:'Bidang Sumber Daya Alam Infrastruktur dan Kewilayahan', kodeSurat:'/BAPPERIDA/PSIK', kepalaBidang:'JIMMY, SP.,M.Eng', nip:'NIP. 19970'},
    {namaBidang:'Bidang Riset dan Inovasi Daerah', kodeSurat:'/BAPPERIDA/RIDA', kepalaBidang:'AGUS DARMANTA, ST., MT', nip:'NIP. 197008092000031005'},
  ];
  for (const b of bidangData) await dbPut('bidang', b);

  // Master - OPD
  const opdData = [
    {namaOpd:'Badan Perencanaan Pembangunan Riset dan Inovasi Daerah'},
    {namaOpd:'Dinas Kepemudaan Olahraga dan Pariwisata'},
  ];
  for (const o of opdData) await dbPut('opd', o);

  // Master - Rekening
  const rekData = [
    {kodeRekening:'5.1.02.01.001.00024 - Belanja Alat/Bahan untuk Kegiatan Kantor - Alat Tulis Kantor', linkKatalog:'https://katalog.inaproc.id/search?keyword=alat+tulis'},
    {kodeRekening:'5.1.02.01.001.00026 - Belanja Alat/Bahan untuk Kegiatan Kantor- Bahan Cetak', linkKatalog:'https://katalog.inaproc.id/search?keyword=fotocopy'},
    {kodeRekening:'5.1.02.01.001.00029 - Belanja Alat/Bahan untuk Kegiatan Kantor - Bahan Komputer', linkKatalog:'https://katalog.inaproc.id/search?keyword=tinta'},
    {kodeRekening:'5.1.02.01.001.00052 - Belanja Makanan dan Minuman Rapat', linkKatalog:'https://katalog.inaproc.id/search?keyword=nasi'},
  ];
  for (const r of rekData) await dbPut('rekening', r);

  // E-Catalog Referensi (cocok dengan kodeRekening di atas)
  const ecatalogData = [
    {jenisBelanja:'5.1.02.01.001.00024 - Belanja Alat/Bahan untuk Kegiatan Kantor - Alat Tulis Kantor', linkEcatalog:'https://katalog.inaproc.id/search?keyword=alat+tulis+kantor'},
    {jenisBelanja:'5.1.02.01.001.00026 - Belanja Alat/Bahan untuk Kegiatan Kantor- Bahan Cetak', linkEcatalog:'https://katalog.inaproc.id/search?keyword=fotocopy+bahan+cetak'},
    {jenisBelanja:'5.1.02.01.001.00029 - Belanja Alat/Bahan untuk Kegiatan Kantor - Bahan Komputer', linkEcatalog:'https://katalog.inaproc.id/search?keyword=tinta+komputer'},
    {jenisBelanja:'5.1.02.01.001.00052 - Belanja Makanan dan Minuman Rapat', linkEcatalog:'https://katalog.inaproc.id/search?keyword=nasi+kotak+rapat'},
  ];
  for (const ec of ecatalogData) await dbPut('ecatalog', ec);

  // Paket
  const paketData = [
    {noPaket:1, opd:'Badan Perencanaan Pembangunan Riset dan Inovasi Daerah', rup:'64408812', namaPaket:'Belanja Makanan dan Minuman Rapat', program:'5.01.02 - Program Perencanaan, Pengendalian dan Evaluasi Pembangunan Daerah', kegiatan:'5.01.02.2.01 - Penyusunan Perencanaan dan Pendanaan', subKegiatan:'5.01.02.2.01.0003 - Pelaksanaan Konsultasi Publik', masaKerja:'Hari Kalender', durasi:1, tanggalPesanan:'2026-01-31', tanggalSelesai:'2026-02-01', paguAnggaran:19000000, kodeRekening:'5.1.02.01.001.00052 - Belanja Makanan dan Minuman Rapat', bidang:'Bidang Perencanaan Pengendalian dan Evaluasi Daerah', kepalaBidang:"EKA FITRIADI SYAFA'AT, S.Kom., M.A.P", nip:'NIP. 19830712 2011011004', output:'Tersedianya Makan Minum Rapat sesuai Kebutuhan'},
    {noPaket:2, opd:'Badan Perencanaan Pembangunan Riset dan Inovasi Daerah', rup:'65859208', namaPaket:'Belanja Alat/Bahan untuk Kegiatan Kantor- Bahan Cetak (PPEPD A)', program:'5.01.02 Program Perencanaan, Pengendalian dan Evaluasi Pembangunan Daerah', kegiatan:'5.01.02.2.01 Penyusunan Perencanaan dan Pendanaan', subKegiatan:'5.01.02.2.01.0004 - Koordinasi Pelaksanaan Forum Perangkat Daerah', masaKerja:'Hari Kalender', durasi:3, tanggalPesanan:'2026-02-19', tanggalSelesai:'2026-02-22', paguAnggaran:25300000, kodeRekening:'5.1.02.01.001.00026 - Belanja Alat/Bahan untuk Kegiatan Kantor- Bahan Cetak', bidang:'Bidang Perencanaan Pengendalian dan Evaluasi Daerah', kepalaBidang:"EKA FITRIADI SYAFA'AT, S.Kom., M.A.P", nip:'NIP. 19830712 2011011004', output:'Tersedianya Bahan Cetak sesuai kebutuhan'},
    {noPaket:3, opd:'Badan Perencanaan Pembangunan Riset dan Inovasi Daerah', rup:'65862910', namaPaket:'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor (RIDA)', program:'5.01.02 Program Penelitian dan Pengembangan Daerah', kegiatan:'5.05.02.2.01 Penelitian dan Pengembangan', subKegiatan:'5.05.02.2.04.0001 - Penelitian, Pengembangan, dan Perekayasaan di Bidang Teknologi', masaKerja:'Hari Kalender', durasi:3, tanggalPesanan:'2026-02-24', tanggalSelesai:'2026-02-27', paguAnggaran:8323800, kodeRekening:'5.1.02.01.001.00024 - Belanja Alat/Bahan untuk Kegiatan Kantor - Alat Tulis Kantor', bidang:'Bidang Riset dan Inovasi Daerah', kepalaBidang:'AGUS DARMANTA, ST., MT', nip:'NIP. 197008092000031005', output:'Tersedianya Alat Tulis Kantor sesuai kebutuhan'},
  ];
  for (const p of paketData) await dbPut('paket', p);

  // Penyedia
  const penyediaData = [
    {no:1, namaPenyedia:'CV. MURIA SETIA', alamat:'Jl. Kom Yos Sudarso No. 50 Putussibau Kabupaten Kapuas Hulu', bentukUsaha:'CV', status:'Aktif', tipe:'UMKM', linkToko:'https://katalog.inaproc.id/cv-muria-setia'},
    {no:2, namaPenyedia:'RIAN ALBHENI', alamat:'JL LINTAS UTARA NO.2 PUTUSSIBAU KOTA, KAB KAPUAS HULU', bentukUsaha:'Perorangan', status:'Aktif', tipe:'UMKM', linkToko:'https://katalog.inaproc.id/rian-albheni'},
    {no:3, namaPenyedia:'DANANG SUHAIMI', alamat:'Jln. Tanjung Pura No12 Kedamin Hilir, Putussibau Selatan, Kabupaten Kapuas Hulu', bentukUsaha:'Perorangan', status:'Aktif', tipe:'UMKM', linkToko:'https://katalog.inaproc.id/danang-suhaimi'},
    {no:4, namaPenyedia:'FOTO COPY "PRIMA"', alamat:'Jl jeranding Abdurahman, Putussibau, Kapuas Hulu', bentukUsaha:'Perorangan', status:'Aktif', tipe:'UMKM', linkToko:'https://katalog.inaproc.id/foto-copy-prima-2rob'},
    {no:5, namaPenyedia:'SARIFAH SUHAIDA', alamat:'Jl. Antasari Putussibau, Kapuas Hulu', bentukUsaha:'Perorangan', status:'Aktif', tipe:'UMKM', linkToko:'https://katalog.inaproc.id/sarifah-suhaida'},
    {no:6, namaPenyedia:'EMIYATI', alamat:'JL.PATIMURA NO.14 PUTUSSIBAU, KAPUAS HULU', bentukUsaha:'Perorangan', status:'Aktif', tipe:'UMKM', linkToko:'https://katalog.inaproc.id/emiyati'},
    {no:7, namaPenyedia:'RUSPINI', alamat:'JL WR SUPRATMAN NO 46 PUTUSSIBAU, KAPUAS HULU', bentukUsaha:'Perorangan', status:'Aktif', tipe:'UMKM', linkToko:'https://katalog.inaproc.id/ruspini'},
  ];
  for (const p of penyediaData) await dbPut('penyedia', p);

  // Rincian
  const rincianData = [
    {no:1, rup:'64408812', itemBarang:'Konsumsi Rapat  Spesifikasi: Nasi Lengkap', vol:250, satuan:'Kotak', hargaSatuan:44000, jumlah:11000000, user:'Satria', tanggalInput:'2026-03-10T02:05:00Z'},
    {no:2, rup:'64408812', itemBarang:'Konsumsi Rapat  Spesifikasi: Snack', vol:500, satuan:'Kotak', hargaSatuan:16000, jumlah:8000000, user:'Satria', tanggalInput:'2026-03-10T02:05:00Z'},
    {no:3, rup:'65859208', itemBarang:'Cetak  Spesifikasi : Penggandaan/fotocopy', vol:50600, satuan:'Lembar', hargaSatuan:500, jumlah:25300000, user:'Satria', tanggalInput:'2026-03-10T04:18:00Z'},
    {no:4, rup:'65862910', itemBarang:'Binder Clip No. 260', vol:20, satuan:'Kotak', hargaSatuan:30900, jumlah:618000, user:'Satria', tanggalInput:'2026-03-12T03:01:00Z'},
    {no:5, rup:'65862910', itemBarang:'Clip Paper Trigonal No. 3', vol:20, satuan:'Kotak', hargaSatuan:5000, jumlah:100000, user:'Satria', tanggalInput:'2026-03-12T03:01:00Z'},
    {no:6, rup:'65862910', itemBarang:'HVS A4 Folio 70 GR', vol:34, satuan:'Rim', hargaSatuan:73600, jumlah:2502400, user:'Satria', tanggalInput:'2026-03-12T03:01:00Z'},
    {no:7, rup:'65862910', itemBarang:'HVS F4 Folio 70 G', vol:34, satuan:'Rim', hargaSatuan:81200, jumlah:2760800, user:'Satria', tanggalInput:'2026-03-12T03:01:00Z'},
    {no:8, rup:'65862910', itemBarang:'Map GOBI 401', vol:20, satuan:'Buah', hargaSatuan:40000, jumlah:800000, user:'Satria', tanggalInput:'2026-03-12T03:01:00Z'},
    {no:9, rup:'65862910', itemBarang:'Map Merk Biola', vol:4, satuan:'Box', hargaSatuan:170000, jumlah:680000, user:'Satria', tanggalInput:'2026-03-12T03:01:00Z'},
    {no:10, rup:'65862910', itemBarang:'Pulpen /Ball Point Wedaya', vol:2, satuan:'Kotak', hargaSatuan:129800, jumlah:259600, user:'Satria', tanggalInput:'2026-03-12T03:01:00Z'},
    {no:11, rup:'65862910', itemBarang:'Refille / isi staples Kecil No 10', vol:2, satuan:'Kotak', hargaSatuan:80000, jumlah:160000, user:'Satria', tanggalInput:'2026-03-12T03:01:00Z'},
    {no:12, rup:'65862910', itemBarang:'Clip Paper Trigonal No 5', vol:10, satuan:'Kotak', hargaSatuan:8300, jumlah:83000, user:'Satria', tanggalInput:'2026-03-12T03:01:00Z'},
    {no:13, rup:'65862910', itemBarang:'Pulpen / Balliner isi 12', vol:1, satuan:'Kotak', hargaSatuan:360000, jumlah:360000, user:'Satria', tanggalInput:'2026-03-12T03:01:00Z'},
  ];
  for (const r of rincianData) await dbPut('rincian', r);

  // Harga
  const hargaData = [
    {rup:'64408812', namaPaket:'Belanja Makanan dan Minuman Rapat', hps:19000000, namaItem:'Konsumsi Rapat  Spesifikasi: Nasi Lengkap', namaProduk:'Nasi Box Paket Lengkap', namaPenyedia:'SARIFAH SUHAIDA', qty:250, satuan:'Kotak', hargaTayang:44000, statusPajak:'Tidak Kena Pajak', dpp:44000, ppn:0, ongkir:0, totalHarga:11000000, linkKatalog:'https://katalog.inaproc.id/sarifah-suhaida/nasi-box-paket-lengkap', pdn:'Ya', umkm:'Ya', lokasi:'Kapus Hulu', statusKatalog:'Aktif', negoFinal:44000},
    {rup:'64408812', namaPaket:'Belanja Makanan dan Minuman Rapat', hps:19000000, namaItem:'Konsumsi Rapat  Spesifikasi: Snack', namaProduk:'Snack Box Paket Lengkap', namaPenyedia:'SARIFAH SUHAIDA', qty:500, satuan:'Kotak', hargaTayang:16000, statusPajak:'Tidak Kena Pajak', dpp:16000, ppn:0, ongkir:0, totalHarga:8000000, linkKatalog:'https://katalog.inaproc.id/sarifah-suhaida/snack-box-paket-lengkap', pdn:'Ya', umkm:'Ya', lokasi:'Kapus Hulu', statusKatalog:'Aktif', negoFinal:16000},
    {rup:'64408812', namaPaket:'Belanja Makanan dan Minuman Rapat', hps:19000000, namaItem:'Konsumsi Rapat  Spesifikasi: Nasi Lengkap', namaProduk:'NASI KOTAK 3', namaPenyedia:'EMIYATI', qty:250, satuan:'Kotak', hargaTayang:47000, statusPajak:'Tidak Kena Pajak', dpp:47000, ppn:0, ongkir:0, totalHarga:11750000, pdn:'Ya', umkm:'Ya', lokasi:'Kapus Hulu', statusKatalog:'Aktif'},
    {rup:'64408812', namaPaket:'Belanja Makanan dan Minuman Rapat', hps:19000000, namaItem:'Konsumsi Rapat  Spesifikasi: Snack', namaProduk:'snack manis', namaPenyedia:'EMIYATI', qty:500, satuan:'Kotak', hargaTayang:17000, statusPajak:'Tidak Kena Pajak', dpp:17000, ppn:0, ongkir:0, totalHarga:8500000, pdn:'Ya', umkm:'Ya', lokasi:'Kapus Hulu', statusKatalog:'Aktif'},
    {rup:'65859208', namaPaket:'Belanja Alat/Bahan untuk Kegiatan Kantor- Bahan Cetak (PPEPD A)', hps:25300000, namaItem:'Cetak  Spesifikasi : Penggandaan/fotocopy', namaProduk:'Fotocopy Jilid Risalah', namaPenyedia:'FOTO COPY "PRIMA"', qty:50600, satuan:'Lembar', hargaTayang:500, statusPajak:'Tidak Kena Pajak', dpp:500, ppn:0, ongkir:0, totalHarga:25300000, linkKatalog:'https://katalog.inaproc.id/foto-copy-prima-2rob/fotocopy-jilid-risalah', pdn:'Ya', umkm:'Ya', lokasi:'Kapus Hulu', statusKatalog:'Aktif', negoFinal:499},
    {rup:'65862910', namaPaket:'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor (RIDA)', hps:8323800, namaItem:'Binder Clip No. 260', namaProduk:'Binder Clip No. 260', namaPenyedia:'FOTO COPY "PRIMA"', qty:20, satuan:'Kotak', hargaTayang:30000, statusPajak:'Tidak Kena Pajak', dpp:30000, ppn:0, ongkir:0, totalHarga:600000, pdn:'Ya', umkm:'Ya', lokasi:'Kapus Hulu', statusKatalog:'Aktif', negoFinal:29900},
    {rup:'65862910', namaPaket:'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor (RIDA)', hps:8323800, namaItem:'HVS A4 Folio 70 GR', namaProduk:'HVS A4 Folio 70 GR', namaPenyedia:'RIAN ALBHENI', qty:34, satuan:'Rim', hargaTayang:60000, statusPajak:'Tidak Kena Pajak', dpp:60000, ppn:0, ongkir:0, totalHarga:2040000, pdn:'Ya', umkm:'Ya', lokasi:'Kapus Hulu', statusKatalog:'Aktif'},
  ];
  for (const h of hargaData) await dbPut('harga', h);

  await loadAll();
  toast('Sample data berhasil dimuat! Silakan jelajahi aplikasi.', 'success');
  showPage('dashboard');
}

// ============================================================
//  HELPERS
// ============================================================
function v(id) { return (document.getElementById(id)?.value||'').trim(); }
function vn(id) { return Number(document.getElementById(id)?.value) || 0; }

// Konversi teks multiline ke HTML (newline → <br>)
function fmtText(str) {
  if (!str) return '-';
  return String(str).replace(/\r\n/g,'\n').split('\n').map(s => s.trim()).filter(s => s).join('<br>');
}

// Auto-format: pisahkan kode (pola digit.digit) dari nama di field yang panjang
function autoFormatField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  let val = el.value.trim();
  if (!val) return;
  // Pisahkan di setiap kemunculan kode baru (digit+titik+digit bukan di awal string)
  val = val.replace(/(?<![\n])\s+(\d[\d.]+[-\s])/g, (match, p1) => '\n' + p1.trimStart());
  val = val.split('\n').map(s => s.trim()).filter(s => s).join('\n');
  el.value = val;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  toast('Format otomatis diterapkan', 'success');
}

// ============================================================
//  EV_AT FUNCTIONS - Evaluasi Administrasi Teknis
// ============================================================
function populateEvatRupSelect() {
  const select = document.getElementById('evat-rup-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih No RUP --</option>';
  state.paket.data.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.rup;
    opt.textContent = `${p.rup} - ${strTrunc(p.namaPaket, 40)}`;
    select.appendChild(opt);
  });
  // Sync EV_HP select
  populateEvhpRupSelect();
}

function populateEvatPejabatSelect() {
  const select = document.getElementById('evat-pejabat-select');
  if (!select) return;
  const cur = select.value;
  select.innerHTML = '<option value="">-- Pilih Pejabat Pengadaan --</option>';
  masterState.pejabatPengadaan.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nama;
    select.appendChild(opt);
  });
  select.value = cur;
}

function loadEvatData() {
  const rup = document.getElementById('evat-rup-select').value;
  const pejabatId = document.getElementById('evat-pejabat-select').value;
  const content = document.getElementById('evat-content');
  
  if (!rup) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-title">Pilih No RUP</div>
        <div class="empty-sub">Pilih nomor RUP di atas untuk menampilkan data evaluasi administrasi dan teknis</div>
      </div>`;
    return;
  }

  // Get pejabat pengadaan yang dipilih (dari master atau default)
  let pejabatPengadaan = { nama: '<span style="color:#c05050;font-style:italic;">⚠ Belum dipilih — tambahkan di Data Master</span>', nip: '-' };
  if (pejabatId) {
    const found = masterState.pejabatPengadaan.find(p => String(p.id) === String(pejabatId));
    if (found) pejabatPengadaan = found;
  }

  // Get paket data for this RUP
  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Data tidak ditemukan</div></div>`;
    return;
  }

  // Get penyedia data from harga table for this RUP
  const hargaForRup = state.harga.data.filter(h => String(h.rup) === String(rup));
  const penyediaNames = [...new Set(hargaForRup.map(h => h.namaPenyedia).filter(Boolean))];
  
  // If no penyedia found, get from penyedia master (take first 2)
  let penyediaList = penyediaNames.length > 0 ? penyediaNames : state.penyedia.data.slice(0, 3).map(p => p.namaPenyedia);
  penyediaList = penyediaList.slice(0, 3); // Max 3 penyedia
  // Pastikan selalu ada 3 kolom penyedia (pad dengan placeholder jika kurang)
  while (penyediaList.length < 2) {
    penyediaList.push('PENYEDIA ' + (penyediaList.length + 1));
  }

  // Ambil tanggal dari tanggalPesanan paket, fallback ke hari ini
  const tglSrc = paket.tanggalPesanan ? paket.tanggalPesanan : '';
  // Parse tanggal secara lokal (YYYY-MM-DD) agar tidak terjadi offset zona waktu
  let tglDate;
  if (tglSrc) {
    const parts = tglSrc.split('-');
    tglDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    tglDate = new Date();
  }
  const namaHari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const satuanAngka = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan','Sepuluh','Sebelas','Dua Belas','Tiga Belas','Empat Belas','Lima Belas','Enam Belas','Tujuh Belas','Delapan Belas','Sembilan Belas','Dua Puluh','Dua Puluh Satu','Dua Puluh Dua','Dua Puluh Tiga','Dua Puluh Empat','Dua Puluh Lima','Dua Puluh Enam','Dua Puluh Tujuh','Dua Puluh Delapan','Dua Puluh Sembilan','Tiga Puluh','Tiga Puluh Satu'];
  // Terbilang untuk tahun (mendukung 2020-2099)
  function terbilangTahun(y) {
    const ratusan = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan'];
    const ribuan  = Math.floor(y / 1000);
    const sisa    = y % 1000;
    const r       = Math.floor(sisa / 100);
    const puluhan = sisa % 100;
    let result = (ribuan === 1 ? 'Seribu' : ratusan[ribuan] + ' Ribu');
    if (r > 0) result += ' ' + ratusan[r] + ' Ratus';
    if (puluhan > 0) result += ' ' + (puluhan < satuanAngka.length ? satuanAngka[puluhan] : '');
    return result.trim();
  }
  const tglAngka  = tglDate.getDate();          // 1-31
  const bulanIdx  = tglDate.getMonth();          // 0-11
  const tahunNum  = tglDate.getFullYear();
  const hariText      = namaHari[tglDate.getDay()];
  const bulanText     = namaBulan[bulanIdx];
  const tanggalTerb   = satuanAngka[tglAngka] || String(tglAngka);
  const tahunTerb     = terbilangTahun(tahunNum);
  const tanggalPanjang = `${tanggalTerb} Bulan ${bulanText} Tahun ${tahunTerb}`;
  const now = tglDate; // gunakan tanggal pesanan sebagai referensi nomor dokumen
  const docCfg = getActiveDocConfig();
  const docInstansi = docCfg.namaInstansi || 'Instansi Pemerintah';
  const docKabupaten = docCfg.kabupaten || 'Kabupaten Kapuas Hulu';
  const docSingkatan = docCfg.singkatan || 'SIDEVA';
  const savedNomorEvat = String(paket.nomorEvat || '');
  const nomorEvatDefault = `PP/${paket.rup || '...'}/BAHEV-AT/${docSingkatan}/${tahunNum}`;
  const nomorEvat = savedNomorEvat && !(docSingkatan !== 'BAPPERIDA' && savedNomorEvat.includes('/BAPPERIDA/'))
    ? savedNomorEvat
    : nomorEvatDefault;

  // Aspek penilaian evaluasi administrasi teknis
  const aspekPenilaian = [
    { no: 1, aspek: 'NIB/OSS; NPWP', nilai: 'Ada' },
    { no: 2, aspek: 'KBLI', nilai: 'Ada' },
    { no: 3, aspek: 'Tidak sedang dikenakan Sanksi Daftar Hitam', nilai: 'Ya' },
    { no: 4, aspek: 'Status Penyedia Terdaftar aktif di katalog elektronik LKPP', nilai: 'Aktif' },
    { no: 5, aspek: 'Jenis Penyedia UMKM', nilai: 'Ya' },
    { no: 6, aspek: 'Alamat penyedia di Kab. Kapuas Hulu', nilai: 'Ya' },
    { no: 7, aspek: 'Barang di Etalase minimal menampilkan (Nama produk, harga, no. KBKI, satuan produk, berat produk dan dimensi produk)', nilai: 'Ya' },
    { no: 8, aspek: 'Jenis Produk PDN', nilai: 'Ya' },
    { no: 9, aspek: 'Menjamin ketersediaan Barang dan/atau Jasa yang sesuai dengan spesifikasi', nilai: 'Tersedia dan Spesifikasi Sesuai Kebutuhan' },
    { no: 10, aspek: 'Jaminan Bebas Cacat Mutu dan Garansi purna jual', nilai: 'Ya' },
    { no: 11, aspek: 'Memastikan kesesuaian informasi Barang dan/atau Jasa Produk yang diunggah pada Katalog Elektronik sesuai', nilai: 'Ya' },
    { no: 12, aspek: 'Penyedia bersedia memberikan layanan tambahan yang diperjanjikan seperti instalasi, testing, asuransi dan pelatihan (apabila ada).', nilai: 'Ya' },
    { no: 13, aspek: 'Layanan jasa pengiriman disiapkan oleh Penyedia', nilai: 'Ya' },
  ];

  // Build the document HTML
  content.innerHTML = `
    <div id="evat-print-area" style="background:#fff;color:#000;padding:24px 28px;width:100%;max-width:900px;min-width:auto;margin:0 auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;box-sizing:border-box;">
      
      <!-- KOP SURAT -->
      ${kopSurat()}

      <!-- JUDUL DOKUMEN -->
      <div class="section-block" style="text-align:center;margin-bottom:20px;">
        <div style="font-size:14pt;font-weight:bold;text-decoration:underline;color:#000;">BERITA ACARA HASIL EVALUASI PENYEDIA E-PURCHASING</div>
        <div style="font-size:12pt;color:#000;">Nomor : ${nomorEvat} <button onclick="openNomorDialog(this)" data-slug="evat" data-rup="${paket.rup}" data-field="nomorEvat" data-cur="${nomorEvat}" title="Edit nomor dokumen" class="doc-nomor-edit" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:0.5;vertical-align:middle;line-height:1;">✏️</button></div>
      </div>

      <!-- PARAGRAF PEMBUKA -->
      <p style="text-align:justify;margin-bottom:16px;color:#000;">
        Pada Hari ini ${hariText} Tanggal ${tanggalPanjang} yang bertandatangan dibawah ini selaku Pejabat Pengadaan pada ${docInstansi} ${docKabupaten} telah melaksanakan verifikasi penyedia jasa melalui E-Purchasing, dengan hasil sebagai berikut :
      </p>

      <!-- A. DATA UMUM -->
      <div style="margin-bottom:16px;">
        <div style="font-weight:bold;margin-bottom:8px;color:#000;">A.&nbsp;&nbsp;&nbsp;DATA UMUM</div>
        <table style="margin-left:24px;font-size:13px;color:#000;border-collapse:collapse;">
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;width:180px;color:#000;border:none;">Kode RUP</td><td style="padding:2px 8px;vertical-align:top;width:16px;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${paket.rup || '-'}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Nama Paket</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${paket.namaPaket || '-'}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Pagu</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${fmtRp(paket.paguAnggaran)}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Mata Anggaran Belanja</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${paket.kodeRekening || '-'}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Metode</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">E - Purchasing dengan Negosiasi Harga</td></tr>
        </table>
      </div>

      <!-- B. EVALUASI ADMINISTRASI DAN TEKNIS -->
      <div style="margin-bottom:16px;">
        <div style="font-weight:bold;margin-bottom:8px;color:#000;">B.&nbsp;&nbsp;&nbsp;EVALUASI ADMINISTRASI DAN TEKNIS</div>
        <p style="margin-left:24px;margin-bottom:12px;color:#000;">Verifikasi Penyedia Jasa (Berdasarkan Syarat dan Ketentuan Katalog Elektronik Versi 6)</p>
        
        <table style="width:100%;border-collapse:collapse;font-size:11pt;table-layout:fixed;color:#000;">
          <colgroup>
            <col style="width:36px;">
            <col style="width:auto;">
            ${penyediaList.map(() => '<col style="width:110px;">').join('')}
            <col style="width:46px;">
          </colgroup>
          <thead style="display:table-header-group;">
            <tr>
              <th class="no-col" style="border:1px solid #000;padding:8px;text-align:center;vertical-align:middle;color:#000;background:#fff;" rowspan="2">No</th>
              <th style="border:1px solid #000;padding:8px;text-align:center;vertical-align:middle;color:#000;background:#fff;" rowspan="2">Aspek penilaian</th>
              <th style="border:1px solid #000;padding:8px;text-align:center;color:#000;background:#fff;" colspan="${penyediaList.length}">Nama Penyedia</th>
              <th style="border:1px solid #000;padding:8px;text-align:center;vertical-align:middle;color:#000;background:#fff;" rowspan="2">Ket</th>
            </tr>
            <tr>
              ${penyediaList.map(name => `<th style="border:1px solid #000;padding:6px 4px;text-align:center;font-weight:bold;color:#000;background:#fff;word-wrap:break-word;white-space:normal;font-size:10pt;">${name.toUpperCase()}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${aspekPenilaian.map(item => `
              <tr style="page-break-inside:avoid;">
                <td style="border:1px solid #000;padding:6px;text-align:center;vertical-align:top;color:#000;">${item.no}</td>
                <td style="border:1px solid #000;padding:6px;vertical-align:top;color:#000;">${item.aspek}</td>
                ${penyediaList.map(() => `<td style="border:1px solid #000;padding:6px;text-align:center;vertical-align:top;color:#000;">${item.nilai}</td>`).join('')}
                <td style="border:1px solid #000;padding:6px;color:#000;"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- PARAGRAF PENUTUP -->
      <p style="text-align:justify;margin:20px 0;color:#000;">
        Dari beberapa penyedia produk pada E-Katalog lokal Kabupaten Kapuas Hulu yang produknya sesuai dengan kebutuhan dan spesifikasi pada paket pekerjaan tersebut pilih untuk pembanding sebanyak ${penyediaList.length} penyedia serta dari hasil verifikasi dan evaluasi memenuhi persyaratan Administrasi dan Teknis.
      </p>

      <p style="text-align:justify;margin-bottom:24px;color:#000;">
        Demikian Berita Acara Pemilihan Calon Penyedia ini dibuat untuk dapat digunakan sebagaimana mestinya.
      </p>

      <!-- TTD -->
      <div class="section-block" style="display:flex;justify-content:flex-end;margin-top:40px;">
        <div style="text-align:left;width:320px;color:#000;">
          <div style="color:#000;">${docInstansi}</div>
          <div style="font-weight:bold;margin-bottom:60px;color:#000;">Pejabat Pengadaan</div>
          <div style="font-weight:bold;text-decoration:underline;color:#000;">${pejabatPengadaan.nama || '<span style="color:#c05050;font-style:italic;">⚠ Pilih Pejabat Pengadaan</span>'}</div>
          <div style="color:#000;">${pejabatPengadaan.nip || 'NIP. 198711182015021003'}</div>
        </div>
      </div>
    </div>
  `;
}


// ============================================================
//  PRINT MARGIN SETTINGS (per-form, disimpan di localStorage)
// ============================================================
if (!window.PRINT_MARGIN_DEFAULTS) window.PRINT_MARGIN_DEFAULTS = {
  evat:     { top: 20, right: 20, bottom: 20, left: 25 },
  evhp:     { top: 18, right: 20, bottom: 20, left: 25 },
  formspek: { top: 18, right: 20, bottom: 20, left: 25 },
  formdpp:  { top: 18, right: 20, bottom: 20, left: 25 },
  nodis:    { top: 18, right: 20, bottom: 20, left: 25 },
  riviu:    { top: 18, right: 20, bottom: 20, left: 25 },
  penetapan:{ top: 18, right: 20, bottom: 20, left: 25 },
  idkb:     { top: 18, right: 20, bottom: 20, left: 25 },
  bahpe:    { top: 18, right: 20, bottom: 20, left: 25 }
};
var PRINT_MARGIN_DEFAULTS = window.PRINT_MARGIN_DEFAULTS;
function getPrintMargins(key){
  const def = PRINT_MARGIN_DEFAULTS[key] || { top:18, right:20, bottom:18, left:20 };
  try {
    const raw = localStorage.getItem('printMargin_' + key);
    if (!raw) return def;
    const v = JSON.parse(raw);
    return {
      top:    Number.isFinite(+v.top)    ? +v.top    : def.top,
      right:  Number.isFinite(+v.right)  ? +v.right  : def.right,
      bottom: Number.isFinite(+v.bottom) ? +v.bottom : def.bottom,
      left:   Number.isFinite(+v.left)   ? +v.left   : def.left
    };
  } catch(e){ return def; }
}
function buildPageRule(key){
  const m = getPrintMargins(key);
  return `@page { size: A4; margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; }
  @media print {
    .doc-nomor-edit { display: none !important; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    img { page-break-inside: avoid; max-width: 100%; }
    h1,h2,h3,h4 { page-break-after: avoid; }
    p { orphans: 3; widows: 3; }
    .section-block { page-break-inside: avoid; }
    tbody tr { page-break-inside: avoid; }
    table { page-break-inside: auto; }
  }`;
}
function openMarginDialog(key, label){
  const cur = getPrintMargins(key);
  const def = PRINT_MARGIN_DEFAULTS[key];
  // Hapus dialog lama bila ada
  const old = document.getElementById('margin-dialog'); if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'margin-dialog';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:"Plus Jakarta Sans",system-ui,sans-serif;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;padding:22px 24px;width:360px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <div style="font-size:16px;font-weight:700;margin-bottom:4px;color:#111;">⚙️ Pengaturan Margin Cetak</div>
      <div style="font-size:12px;color:#666;margin-bottom:14px;">${label} — satuan milimeter (mm), kertas A4</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <label style="font-size:12px;color:#333;">Atas (top)
          <input id="mg-top" type="number" min="0" max="60" step="1" value="${cur.top}" style="width:100%;margin-top:4px;padding:8px;border:1px solid #d0d7de;border-radius:6px;font-size:13px;">
        </label>
        <label style="font-size:12px;color:#333;">Bawah (bottom)
          <input id="mg-bottom" type="number" min="0" max="60" step="1" value="${cur.bottom}" style="width:100%;margin-top:4px;padding:8px;border:1px solid #d0d7de;border-radius:6px;font-size:13px;">
        </label>
        <label style="font-size:12px;color:#333;">Kiri (left)
          <input id="mg-left" type="number" min="0" max="60" step="1" value="${cur.left}" style="width:100%;margin-top:4px;padding:8px;border:1px solid #d0d7de;border-radius:6px;font-size:13px;">
        </label>
        <label style="font-size:12px;color:#333;">Kanan (right)
          <input id="mg-right" type="number" min="0" max="60" step="1" value="${cur.right}" style="width:100%;margin-top:4px;padding:8px;border:1px solid #d0d7de;border-radius:6px;font-size:13px;">
        </label>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap;">
        <button id="mg-reset" style="padding:8px 12px;border:1px solid #d0d7de;background:#fff;border-radius:6px;font-size:13px;cursor:pointer;">Reset Default</button>
        <button id="mg-cancel" style="padding:8px 12px;border:1px solid #d0d7de;background:#fff;border-radius:6px;font-size:13px;cursor:pointer;">Batal</button>
        <button id="mg-save" style="padding:8px 14px;border:0;background:#2563eb;color:#fff;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600;">Simpan</button>
      </div>
      <div style="font-size:11px;color:#888;margin-top:10px;">Tip: kurangi margin atas/bawah untuk mengurangi area kosong saat cetak.</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });
  document.getElementById('mg-cancel').onclick = ()=> overlay.remove();
  document.getElementById('mg-reset').onclick = ()=> {
    document.getElementById('mg-top').value    = def.top;
    document.getElementById('mg-right').value  = def.right;
    document.getElementById('mg-bottom').value = def.bottom;
    document.getElementById('mg-left').value   = def.left;
  };
  document.getElementById('mg-save').onclick = ()=> {
    const v = {
      top:    +document.getElementById('mg-top').value    || 0,
      right:  +document.getElementById('mg-right').value  || 0,
      bottom: +document.getElementById('mg-bottom').value || 0,
      left:   +document.getElementById('mg-left').value   || 0
    };
    localStorage.setItem('printMargin_' + key, JSON.stringify(v));
    overlay.remove();
    if (typeof toast === 'function') toast('Margin tersimpan untuk ' + label, 'success');
  };
}

// ── PRINT CURRENT DOC (tombol PDF di topbar) ──────────────────────────────────
function printCurrentDoc() {
  const btn  = document.getElementById('topbar-print-btn');
  const slug = btn ? btn.getAttribute('data-slug') : currentPage;
  const printFnMap = {
    evat:      printEvat,
    evhp:      printEvhp,
    bahpe:     printBahpe,
  };
  if (printFnMap[slug]) {
    printFnMap[slug]();
  } else if (['formspek','formdpp','nodis','riviu','penetapan','idkb'].includes(slug)) {
    saveToPDF(slug);
  } else {
    toast('Pilih dokumen terlebih dahulu', 'error');
  }
}

// ── SAVE TO PDF (universal) ──────────────────────────────────────────────────
if (!window._PDF_META) window._PDF_META = {
  evat:      { title: 'BA_Evaluasi_Penyedia_E-Purchasing' },
  evhp:      { title: 'BA_Evaluasi_Harga_Penawaran' },
  formspek:  { title: 'Spesifikasi_Teknis' },
  formdpp:   { title: 'Formulir_DPP' },
  nodis:     { title: 'Nota_Dinas_Pengajuan_Belanja' },
  riviu:     { title: 'BA_Riviu_DPP_E-Purchasing' },
  penetapan: { title: 'Formulir_Penetapan_BJ' },
  idkb:      { title: 'Identifikasi_Kebutuhan_BJ' },
  bahpe:     { title: 'BA_Hasil_Penetapan_E-Purchasing' },
  sppbj:     { title: 'Surat_Perintah_Pengadaan_BJ' },
};
var _PDF_META = window._PDF_META;

function saveToPDF(slug) {
  const areaId = slug + '-print-area';
  const printArea = document.getElementById(areaId);
  if (!printArea) { toast('Pilih No RUP terlebih dahulu', 'error'); return; }

  const meta     = _PDF_META[slug] || { title: slug };
  const instansi = (appConfig.singkatan || 'SIDEVA').replace(/\s+/g,'_');
  const tgl      = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `${meta.title}_${instansi}_${tgl}`;

  const hint = `<div id="pdf-hint-bar" style="
      position:fixed;bottom:0;left:0;right:0;z-index:99999;
      background:#16a34a;color:#fff;
      font-family:system-ui,-apple-system,sans-serif;font-size:13px;
      padding:10px 20px;display:flex;align-items:center;
      justify-content:space-between;gap:16px;
      box-shadow:0 -2px 16px rgba(0,0,0,.25);
    ">
      <span>
        💡 <strong>Simpan sebagai PDF:</strong>
        Di dialog cetak pilih <em>Destination → Save as PDF</em>
        ${isMac ? '— atau tekan <strong>⌘P</strong>' : '— atau tekan <strong>Ctrl+P</strong>'}
      </span>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button onclick="window.print()"
          style="background:#fff;color:#16a34a;border:none;border-radius:6px;
                 padding:7px 16px;font-size:13px;font-weight:700;cursor:pointer;">
          🖨️ Cetak / Simpan PDF
        </button>
        <button onclick="document.getElementById('pdf-hint-bar').remove()"
          style="background:rgba(255,255,255,.25);color:#fff;border:none;
                 border-radius:6px;padding:7px 10px;font-size:12px;cursor:pointer;">
          ✕
        </button>
      </div>
    </div>`;

  const sharedCss = `
    ${buildPageRule(slug)}
    @media screen {
      body { max-width:210mm; margin:0 auto; padding:20mm 20mm 80px; background:#f0f0f0; }
      body > *:not(#pdf-hint-bar) { background:#fff; }
    }
    @media print { #pdf-hint-bar { display:none !important; } }
    * { box-sizing:border-box; color:#000 !important; }
    body { margin:0; padding:0; font-family:'Times New Roman',Times,serif; font-size:12pt;
           color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; line-height:1.5; }
    table { border-collapse:collapse; width:100%; }
    thead { display:table-header-group; }
    tfoot { display:table-footer-group; }
    tbody tr { page-break-inside:auto; }
    th, td { border:1px solid #000; word-wrap:break-word; }
    p { margin:4px 0; orphans:3; widows:3; }
    .section-block { page-break-inside:auto; }
    [id$="-print-area"] { padding:0!important; max-width:100%!important; width:100%!important;
      margin:0!important; box-shadow:none!important; border-radius:0!important;
      background:#fff!important; line-height:1.45; }
    img { max-width:100%; height:auto; display:block; }
    table { table-layout:fixed; width:100%!important; }
    table.data-tbl th:first-child, table.data-tbl td:first-child,
    th.no-col, td.no-col { width:34px!important; text-align:center!important;
      vertical-align:middle!important; white-space:nowrap;
      padding-left:4px!important; padding-right:4px!important; }
    thead th { text-align:center!important; vertical-align:middle!important; }
    .num, td.num { text-align:right!important; white-space:nowrap; }
    td > table { border:0!important; }
    .doc-nomor-edit { display:none!important; }`;

  const win = window.open('', '_blank');
  if (!win) { toast('Popup diblokir browser. Izinkan popup untuk halaman ini.', 'error'); return; }
  win.document.write(`<!DOCTYPE html>
    <html><head>
      <title>${filename}</title>
      <style>${sharedCss}</style>
    </head>
    <body>${printArea.innerHTML}${hint}</body>
    </html>`);
  win.document.close();
  win.focus();
}
// ─────────────────────────────────────────────────────────────────────────────

function printEvat() {
  const printArea = document.getElementById('evat-print-area');
  if (!printArea) {
    toast('Pilih No RUP terlebih dahulu', 'error');
    return;
  }

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Berita Acara Hasil Evaluasi Penyedia E-Purchasing</title>
      <style>
        ${buildPageRule('evat')}
        @media screen {
          body { max-width: 210mm; margin: 0 auto; padding: 20mm; background: #f0f0f0; }
          body > * { background: #fff; }
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        /* Semua teks hitam */
        * { color: #000 !important; }
        /* Tabel: header ulang di setiap halaman */
        table {
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }
        thead {
          display: table-header-group;
        }
        tfoot {
          display: table-footer-group;
        }
        tbody tr {
          page-break-inside: auto;
        }
        th, td {
          border: 1px solid #000;
          word-wrap: break-word;
        }
        p { margin: 4px 0; orphans: 3; widows: 3; }
        /* Paragraf dan section jangan terpotong sembarangan */
        .section-block { page-break-inside: auto; }
        /* ── A4 layout overrides — rapikan hasil print ── */
        [id$="-print-area"] {
          padding: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          line-height: 1.45;
        }
        img { max-width: 100%; height: auto; display: block; }
        table { table-layout: fixed; width: 100% !important; }
        /* Kolom "No" tabel data – sempit, center, rapat */
        table.data-tbl th:first-child,
        table.data-tbl td:first-child,
        th.no-col, td.no-col {
          width: 34px !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        /* Header tabel selalu center */
        thead th { text-align: center !important; vertical-align: middle !important; }
        /* Hindari kolom mata uang/angka wrap aneh */
        .num, td.num { text-align: right !important; white-space: nowrap; }
        /* Sub-tabel jangan dobel border */
        td > table { border: 0 !important; }
      </style>
    </head>
    <body>
      ${printArea.innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

// ============================================================
//  EV_HP FUNCTIONS - Evaluasi Harga Penawaran E-Purchasing
// ============================================================
function populateEvhpRupSelect() {
  const select = document.getElementById('evhp-rup-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih No RUP --</option>';
  state.paket.data.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.rup;
    opt.textContent = `${p.rup} - ${strTrunc(p.namaPaket, 40)}`;
    select.appendChild(opt);
  });
}

function populateEvhpPejabatSelect() {
  const select = document.getElementById('evhp-pejabat-select');
  if (!select) return;
  const cur = select.value;
  select.innerHTML = '<option value="">-- Pilih Pejabat Pengadaan --</option>';
  masterState.pejabatPengadaan.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nama;
    select.appendChild(opt);
  });
  select.value = cur;
}

function evhpNormalizeText(s) {
  return (s || '').toLowerCase()
    .replace(/[/\\.,;:'"()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function evhpMatchScore(a, b) {
  const na = evhpNormalizeText(a);
  const nb = evhpNormalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  const wa = new Set(na.split(' ').filter(Boolean));
  const wb = new Set(nb.split(' ').filter(Boolean));
  let common = 0;
  wa.forEach(w => { if (wb.has(w)) common++; });
  const union = wa.size + wb.size - common;
  return union > 0 ? common / union : 0;
}

function buildEvhpEvaluation({ hargaForRup, rincianForRup, penyediaList }) {
  const rincianItems = rincianForRup.length > 0
    ? rincianForRup.map(r => ({
        label: r.itemBarang || '-',
        hps: r.hargaSatuan || 0,
        vol: r.vol || 0,
        satuan: r.satuan || '',
      }))
    : [];
  const hargaItems = [...new Set(hargaForRup.map(h => h.namaItem).filter(Boolean))];
  const itemLabels = rincianItems.length > 0 ? rincianItems.map(r => r.label) : hargaItems;
  const filledItemLabels = itemLabels.filter(Boolean);
  const itemCountRequired = filledItemLabels.length;

  function getHargaRec(item, penyedia, occIdx = 0) {
    const candidates = hargaForRup.filter(h => h.namaPenyedia === penyedia);
    if (!candidates.length) return null;

    const exactMatches = candidates.filter(h => h.namaItem === item);
    if (exactMatches.length > 0) {
      return exactMatches[occIdx] || exactMatches[exactMatches.length - 1];
    }

    const fuzzyNameMatches = [];
    for (const h of candidates) {
      const s = evhpMatchScore(h.namaItem, item);
      if (s >= 0.75) fuzzyNameMatches.push({ h, s });
    }
    if (fuzzyNameMatches.length > 0) {
      fuzzyNameMatches.sort((a, b) => b.s - a.s);
      return (fuzzyNameMatches[occIdx] || fuzzyNameMatches[fuzzyNameMatches.length - 1]).h;
    }

    const fuzzyProdMatches = [];
    for (const h of candidates) {
      const s = evhpMatchScore(h.namaProduk, item);
      if (s >= 0.75) fuzzyProdMatches.push({ h, s });
    }
    if (fuzzyProdMatches.length > 0) {
      fuzzyProdMatches.sort((a, b) => b.s - a.s);
      return (fuzzyProdMatches[occIdx] || fuzzyProdMatches[fuzzyProdMatches.length - 1]).h;
    }
    return null;
  }

  function getHargaNego(item, penyedia, occIdx = 0) {
    const h = getHargaRec(item, penyedia, occIdx);
    if (!h) return null;
    return (Number(h.negoFinal) > 0) ? Number(h.negoFinal) : (h.hargaTayang || null);
  }

  const evaluasiPenyedia = penyediaList.map(penyedia => {
    const occ = {};
    let total = 0;
    let pricedCount = 0;
    let itemCount = 0;

    filledItemLabels.forEach(item => {
      const occIdx = occ[item] || 0;
      occ[item] = occIdx + 1;
      const h = getHargaRec(item, penyedia, occIdx);
      const harga = h ? ((Number(h.negoFinal) > 0) ? Number(h.negoFinal) : (h.hargaTayang || 0)) : 0;
      if (h && harga > 0) {
        pricedCount += 1;
        total += harga * (h.qty || 1);
      }
    });

    const rankOcc = {};
    itemCount = filledItemLabels.filter(item => {
      const occIdx = rankOcc[item] || 0;
      rankOcc[item] = occIdx + 1;
      const hNego = getHargaNego(item, penyedia, occIdx);
      if (hNego === null || hNego <= 0) return false;
      const allNego = penyediaList.map(pp => getHargaNego(item, pp, occIdx)).filter(v => v !== null && v > 0);
      return allNego.length > 0 && hNego === Math.min(...allNego);
    }).length;

    return {
      nama: penyedia,
      itemCount,
      pricedCount,
      complete: pricedCount >= itemCountRequired,
      total,
    };
  });

  const penyediaRank = evaluasiPenyedia
    .slice()
    .sort((a, b) => Number(b.complete) - Number(a.complete) || a.total - b.total || b.itemCount - a.itemCount);

  return {
    rincianItems,
    itemLabels,
    totalRows: itemLabels.length,
    getHargaRec,
    getHargaNego,
    evaluasiPenyedia,
    totalPerPenyedia: evaluasiPenyedia.map(p => p.total),
    penyediaRank,
  };
}

function loadEvhpData() {
  const rup      = document.getElementById('evhp-rup-select').value;
  const pejabatId = document.getElementById('evhp-pejabat-select').value;
  const content  = document.getElementById('evhp-content');

  if (!rup) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📑</div>
        <div class="empty-title">Pilih No RUP</div>
        <div class="empty-sub">Pilih nomor RUP untuk menampilkan evaluasi harga penawaran</div>
      </div>`;
    return;
  }

  // Pejabat pengadaan
  let pejabatPengadaan = { nama: '<span style="color:#c05050;font-style:italic;">⚠ Belum dipilih — tambahkan di Data Master</span>', nip: '-' };
  if (pejabatId) {
    const found = masterState.pejabatPengadaan.find(p => String(p.id) === String(pejabatId));
    if (found) pejabatPengadaan = found;
  }

  // Data paket
  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Data tidak ditemukan</div></div>`;
    return;
  }

  // Data harga untuk RUP ini
  const hargaForRup = state.harga.data.filter(h => String(h.rup) === String(rup));

  // Daftar nama penyedia unik (max 2)
  const allPenyediaNames = [...new Set(hargaForRup.map(h => h.namaPenyedia).filter(Boolean))];
  let penyediaList = allPenyediaNames.length > 0 ? allPenyediaNames.slice(0, 3) : state.penyedia.data.slice(0, 3).map(p => p.namaPenyedia);
  while (penyediaList.length < 2) penyediaList.push('PENYEDIA ' + (penyediaList.length + 1));

  // Data rincian untuk RUP ini
  const rincianForRup = state.rincian.data.filter(r => String(r.rup) === String(rup));

  // Tanggal
  const tglSrc = paket.tanggalPesanan || '';
  let tglDate;
  if (tglSrc) {
    const parts = tglSrc.split('-');
    tglDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    tglDate = new Date();
  }
  const namaHari   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const namaBulan  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const satuanAngka = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan','Sepuluh','Sebelas','Dua Belas','Tiga Belas','Empat Belas','Lima Belas','Enam Belas','Tujuh Belas','Delapan Belas','Sembilan Belas','Dua Puluh','Dua Puluh Satu','Dua Puluh Dua','Dua Puluh Tiga','Dua Puluh Empat','Dua Puluh Lima','Dua Puluh Enam','Dua Puluh Tujuh','Dua Puluh Delapan','Dua Puluh Sembilan','Tiga Puluh','Tiga Puluh Satu'];
  function terbilangTahun(y) {
    const ratusan = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan'];
    const ribuan = Math.floor(y / 1000);
    const sisa   = y % 1000;
    const r      = Math.floor(sisa / 100);
    const puluhan = sisa % 100;
    let result = (ribuan === 1 ? 'Seribu' : ratusan[ribuan] + ' Ribu');
    if (r > 0) result += ' ' + ratusan[r] + ' Ratus';
    if (puluhan > 0) result += ' ' + (puluhan < satuanAngka.length ? satuanAngka[puluhan] : '');
    return result.trim();
  }
  const hariText      = namaHari[tglDate.getDay()];
  const tglAngka      = tglDate.getDate();
  const bulanText     = namaBulan[tglDate.getMonth()];
  const tahunNum      = tglDate.getFullYear();
  const tanggalTerb   = satuanAngka[tglAngka] || String(tglAngka);
  const tahunTerb     = terbilangTahun(tahunNum);
  const tanggalPanjang = `${tanggalTerb} Bulan ${bulanText} Tahun ${tahunTerb}`;
  const docCfg = getActiveDocConfig();
  const docInstansi = docCfg.namaInstansi || 'Instansi Pemerintah';
  const docKabupaten = docCfg.kabupaten || 'Kabupaten Kapuas Hulu';
  const docSingkatan = docCfg.singkatan || 'SIDEVA';
  const savedNomorEvhp = String(paket.nomorEvhp || '');
  const nomorEvhpDefault = `PP/${paket.rup || '...'}/BAHEV-HP/${docSingkatan}/${tahunNum}`;
  const nomorEvhp = savedNomorEvhp && !(docSingkatan !== 'BAPPERIDA' && savedNomorEvhp.includes('/BAPPERIDA/'))
    ? savedNomorEvhp
    : nomorEvhpDefault;

  const evhpEval = buildEvhpEvaluation({ hargaForRup, rincianForRup, penyediaList });
  const {
    rincianItems,
    itemLabels,
    totalRows,
    getHargaRec,
    getHargaNego,
    totalPerPenyedia,
    penyediaRank,
  } = evhpEval;

  // ── B. Tabel Evaluasi Pembanding Harga ──
  // Kolom: No | Nama Item Barang & Spek Minimal | HPS | [penyedia1..N] | Terendah | Terpilih
  // PENTING: Kolom harga per penyedia & terendah menggunakan harga NEGO FINAL (jika ada),
  //          fallback ke harga tayang jika nego belum diisi.
  const thStyle   = `border:1px solid #000;padding:6px 4px;text-align:center;vertical-align:middle;color:#000;background:#fff;font-size:10pt;word-wrap:break-word;white-space:normal;`;
  const tdStyle   = `border:1px solid #000;padding:5px 4px;vertical-align:top;color:#000;font-size:10pt;`;
  const tdCStyle  = `border:1px solid #000;padding:5px 4px;text-align:center;vertical-align:top;color:#000;font-size:10pt;`;
  const tdRStyle  = `border:1px solid #000;padding:5px 4px;text-align:right;vertical-align:top;color:#000;font-size:10pt;`;

  // Total HPS dari rincian
  const totalHPS = rincianItems.reduce((s, r) => s + (r.hps * r.vol), 0) ||
                   paket.paguAnggaran || 0;

  // Baris tabel evaluasi — harga per penyedia = negoFinal (atau hargaTayang jika belum nego)
  let rowsEval = '';
  const hasHarga   = hargaForRup.length > 0;
  const hasRincian = rincianForRup.length > 0;
  const hideSec    = (hide) => hide ? 'style="display:none"' : '';
  const _evalOcc = {}; // track occurrence index per item label
  for (let i = 0; i < totalRows; i++) {
    const item  = itemLabels[i] || '';
    const occIdx = item ? (_evalOcc[item] || 0) : 0;
    if (item) _evalOcc[item] = occIdx + 1;
    const rItem = rincianItems[i];
    const hpsVal = rItem ? (rItem.hps || 0) : (item ? (() => {
      // Cari HPS dari harga data, gunakan fuzzy match agar konsisten
      let bestH = null, bestS = 0;
      for (const h of hargaForRup) {
        const s = evhpMatchScore(h.namaItem, item);
        if (s > bestS) { bestS = s; bestH = h; }
      }
      return (bestH && bestS >= 0.75) ? (bestH.hps || paket.paguAnggaran || 0) : (paket.paguAnggaran || 0);
    })() : 0);

    // Harga penawaran per penyedia (negoFinal jika ada, fallback hargaTayang)
    const hargaPenyedia = penyediaList.map(p => getHargaNego(item, p, occIdx));
    const validHarga    = hargaPenyedia.filter(h => h !== null && h > 0);
    const minHarga      = validHarga.length > 0 ? Math.min(...validHarga) : null;
    const penyediaTerpilih = minHarga !== null
      ? penyediaList[hargaPenyedia.indexOf(minHarga)]
      : '';

    rowsEval += `<tr>
      <td style="${tdCStyle}">${item ? (i + 1) : ''}</td>
      <td style="${tdStyle}">${item}</td>
      <td style="${tdRStyle}">${hpsVal ? 'Rp ' + hpsVal.toLocaleString('id-ID') : (item ? 'Rp -' : '')}</td>
      ${hargaPenyedia.map(h => `<td style="${tdRStyle}">${h !== null ? 'Rp ' + h.toLocaleString('id-ID') : (item ? 'Rp -' : '')}</td>`).join('')}
      <td style="${tdRStyle}">${minHarga !== null ? 'Rp ' + minHarga.toLocaleString('id-ID') : (item ? 'Rp -' : '')}</td>
      <td style="${tdStyle}word-wrap:break-word;white-space:normal;">${penyediaTerpilih}</td>
    </tr>`;
  }

  const rowsRank = penyediaRank.map((p, i) => `<tr>
    <td style="${tdCStyle}">${i + 1}</td>
    <td style="${tdStyle}">${p.nama}</td>
    <td style="${tdCStyle}">${p.itemCount}</td>
    <td style="${tdRStyle}">${p.total ? 'Rp ' + p.total.toLocaleString('id-ID') : 'Rp -'}</td>
    <td style="${tdStyle}">${i === 0 ? 'Dilanjutkan' : 'Tidak dilanjutkan'}</td>
  </tr>`).join('');

  // Penyedia terpilih (rank 1)
  const penyediaTerpilihFinal = penyediaRank.length > 0 ? penyediaRank[0].nama : '-';

  // ── D. Negosiasi Harga Satuan ──
  // Menampilkan: Harga Tayang (sebelum nego) → Nego Final → Selisih → Efisiensi
  let rowsNego = '';
  const _negoOcc = {}; // track occurrence index per item label
  for (let i = 0; i < itemLabels.length; i++) {
    const item  = itemLabels[i] || '';
    const occIdx = item ? (_negoOcc[item] || 0) : 0;
    if (item) _negoOcc[item] = occIdx + 1;
    const h = item ? getHargaRec(item, penyediaTerpilihFinal, occIdx) : null;
    const hargaAwal  = h ? (h.hargaTayang || null) : null;
    const negoFinal  = h ? ((Number(h.negoFinal) > 0) ? Number(h.negoFinal) : h.hargaTayang) : null;
    const selisih    = (hargaAwal !== null && negoFinal !== null) ? (negoFinal - hargaAwal) : null;
    const efisiensi  = (hargaAwal && selisih !== null && hargaAwal !== 0)
      ? ((Math.abs(selisih) / hargaAwal) * 100).toFixed(2)
      : null;

    rowsNego += `<tr>
      <td style="${tdCStyle}">${item ? (i + 1) : ''}</td>
      <td style="${tdStyle}">${item}</td>
      <td style="${tdRStyle}">${hargaAwal !== null ? 'Rp ' + hargaAwal.toLocaleString('id-ID') : (item ? 'Rp -' : '')}</td>
      <td style="${tdRStyle}">${negoFinal !== null ? 'Rp ' + negoFinal.toLocaleString('id-ID') : (item ? 'Rp -' : '')}</td>
      <td style="${tdRStyle}">${selisih !== null ? (selisih > 0 ? '+' : '') + 'Rp ' + selisih.toLocaleString('id-ID') : (item ? 'Rp -' : '')}</td>
      <td style="${tdCStyle}">${efisiensi !== null ? efisiensi + '%' : (item ? '-' : '')}</td>
      <td style="${tdStyle}">${item ? (selisih !== null && selisih <= 0 ? 'Disepakati' : 'Disepakati') : ''}</td>
    </tr>`;
  }

  // ── Data Tabel C & D (untuk manipulasi dinamis) ─────────────
  // dataTabelC: satu baris per penyedia di Tabel C Peringkatan Harga Terendah
  //   .kolomTerendah = total harga hasil nego penyedia tersebut (kolom "Total Harga Hasil Nego")
  const dataTabelC = penyediaRank.map((p, idx) => ({
    rank:          idx + 1,
    nama:          p.nama,
    itemCount:     p.itemCount,
    kolomTerendah: p.total,          // nilai kolom Total Harga Hasil Nego baris ini
    tindakLanjut:  idx === 0 ? 'Dilanjutkan' : 'Tidak dilanjutkan'
  }));

  // dataTabelD: satu entri per item di Tabel D Negosiasi Harga Satuan
  //   .length = total jumlah item yang dinegosiasi
  const _dataDOcc = {};
  const dataTabelD = itemLabels.filter(Boolean).map((item, i) => {
    const occIdx = _dataDOcc[item] || 0;
    _dataDOcc[item] = occIdx + 1;
    const h      = getHargaRec(item, penyediaTerpilihFinal, occIdx);
    const hAwal  = h ? (h.hargaTayang || null) : null;
    const hNego  = h ? (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : h.hargaTayang) : null;
    const selisih = (hAwal !== null && hNego !== null) ? (hNego - hAwal) : null;
    return { no: i + 1, item, hargaAwal: hAwal, negoFinal: hNego, selisih };
  });

  // ── E. Rekap Perbandingan Nilai ──
  // totalHargaTayang = total harga tayang (sebelum nego) penyedia terpilih × qty
  const totalHargaTayang = hargaForRup
    .filter(h => h.namaPenyedia === penyediaTerpilihFinal)
    .reduce((s, h) => s + (h.hargaTayang || 0) * (h.qty || 1), 0);
  // totalNego = total nilai nego final × qty penyedia terpilih
  const totalNego = hargaForRup
    .filter(h => h.namaPenyedia === penyediaTerpilihFinal)
    .reduce((s, h) => s + ((Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (h.hargaTayang || 0)) * (h.qty || 1)), 0);
  const effisiensiHPS = paket.paguAnggaran
    ? (((paket.paguAnggaran - totalNego) / paket.paguAnggaran) * 100).toFixed(1)
    : '0';
  const penghematanHPS = (paket.paguAnggaran || 0) - totalNego;
  const penghematanNego = totalHargaTayang - totalNego;
  const pctNego = totalHargaTayang ? (((totalHargaTayang - totalNego) / totalHargaTayang) * 100).toFixed(1) : '0';

  // ── Build HTML Document ──
  const colWidthPenyedia = Math.floor(90 / (penyediaList.length + 2)); // rough distribution
  content.innerHTML = `
    <div id="evhp-print-area" style="background:#fff;color:#000;padding:24px 28px;width:100%;max-width:960px;min-width:auto;margin:0 auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;box-sizing:border-box;">

      <!-- KOP SURAT -->
      ${kopSurat()}

      <!-- JUDUL -->
      <div class="section-block" style="text-align:center;margin-bottom:18px;">
        <div style="font-size:14pt;font-weight:bold;text-decoration:underline;color:#000;">BERITA ACARA HASIL EVALUASI HARGA PENAWARAN E-PURCHASING</div>
        <div style="font-size:12pt;color:#000;">Nomor : ${nomorEvhp} <button onclick="openNomorDialog(this)" data-slug="evhp" data-rup="${paket.rup}" data-field="nomorEvhp" data-cur="${nomorEvhp}" title="Edit nomor dokumen" class="doc-nomor-edit" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:0.5;vertical-align:middle;line-height:1;">✏️</button></div>
      </div>

      <!-- PARAGRAF PEMBUKA -->
      <p style="text-align:justify;margin-bottom:14px;color:#000;">
        Pada Hari ini ${hariText} Tanggal ${tanggalPanjang} yang bertandatangan dibawah ini selaku Pejabat Pengadaan pada ${docInstansi} ${docKabupaten} telah melaksanakan verifikasi penyedia jasa melalui E-Purchasing, dengan hasil sebagai berikut :
      </p>

      <!-- A. DATA UMUM -->
      <div style="margin-bottom:14px;">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">A.&nbsp;&nbsp;&nbsp;DATA UMUM</div>
        <table style="margin-left:24px;font-size:12pt;color:#000;border-collapse:collapse;">
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;width:180px;color:#000;border:none;">Kode RUP</td><td style="padding:2px 8px;vertical-align:top;width:16px;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${paket.rup || '-'}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Nama Paket</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${paket.namaPaket || '-'}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Pagu</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${fmtRp(paket.paguAnggaran)}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Mata Anggaran Belanja</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${paket.kodeRekening || '-'}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Metode</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">E - Purchasing dengan Negosiasi Harga</td></tr>
        </table>
      </div>

      <!-- B. EVALUASI PEMBANDING HARGA SURVEY DENGAN METODE NILAI TERENDAH -->
      <div ${hideSec(!hasHarga)} style="margin-bottom:14px;">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">B.&nbsp;&nbsp;&nbsp;EVALUASI PEMBANDING HARGA SURVEY DENGAN METODE NILAI TERENDAH</div>
        <table style="width:100%;border-collapse:collapse;font-size:10pt;table-layout:fixed;color:#000;">
          <colgroup>
            <col style="width:32px;">
            <col style="width:auto;">
            <col style="width:72px;">
            ${penyediaList.map(() => '<col style="width:80px;">').join('')}
            <col style="width:70px;">
            <col style="width:80px;">
          </colgroup>
          <thead style="display:table-header-group;">
            <tr>
              <th class="no-col" style="${thStyle}" rowspan="2">No</th>
              <th style="${thStyle}" rowspan="2">Nama Item Barang dan Spek Minimal</th>
              <th style="${thStyle}" rowspan="2">Harga Satuan HPS</th>
              ${penyediaList.map(p => `<th style="${thStyle}" rowspan="2">${p.toUpperCase()}</th>`).join('')}
              <th style="${thStyle}" rowspan="2">Terendah</th>
              <th style="${thStyle}" rowspan="2">Terpilih</th>
            </tr>
            <tr></tr>
          </thead>
          <tbody>
            ${rowsEval}
          </tbody>
        </table>
        <p style="text-align:justify;margin-top:10px;color:#000;font-size:12px;">
          Dari beberapa penyedia yang mencantumkan harga masing-masing produk pada E-Katalog lokal Kabupaten Kapuas Hulu yang produknya sesuai dengan kebutuhan dan spesifikasi pada paket pekerjaan tersebut sebanyak ${penyediaList.length} penyedia. Hasil tangkap layar harga satuan tayang masing-masing penyedia terlampir pada lampiran Dokumen Persiapan Pengadaan (DPP)
        </p>
      </div>

      <!-- C. PERINGKATAN HARGA TERENDAH -->
      <div ${hideSec(!hasHarga)} style="margin-bottom:14px;">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">C.&nbsp;&nbsp;&nbsp;PERINGKATAN HARGA TERENDAH</div>
        <table style="width:100%;border-collapse:collapse;font-size:10pt;table-layout:fixed;color:#000;">
          <colgroup>
            <col style="width:48px;">
            <col style="width:auto;">
            <col style="width:90px;">
            <col style="width:110px;">
            <col style="width:100px;">
          </colgroup>
          <thead>
            <tr>
              <th style="${thStyle}">Rank</th>
              <th style="${thStyle}">Nama Penyedia</th>
              <th style="${thStyle}">Item Terendah</th>
              <th style="${thStyle}">Total Harga Hasil Nego</th>
              <th style="${thStyle}">Tindak Lanjut</th>
            </tr>
          </thead>
          <tbody>${rowsRank}</tbody>
        </table>
        <p style="text-align:justify;margin-top:10px;color:#000;font-size:12px;">
          Dari hasil verifikasi calon penyedia yang memiliki item pekerjaan/sub kategori produk lengkap sesuai kebutuhan pekerjaan, memiliki kualifikasi usaha yang sesuai, memenuhi persyaratan administrasi dan teknis, serta total harga hasil negosiasi terendah adalah :
        </p>
        <p style="font-weight:bold;margin-left:24px;color:#000;font-size:12px;">${penyediaTerpilihFinal}</p>
        <p style="text-align:justify;margin-top:6px;color:#000;font-size:12px;">
          Dengan total harga hasil negosiasi terendah sebesar <strong>${fmtRp(dataTabelC[0]?.kolomTerendah || 0)}</strong>.
        </p>
      </div>

      <!-- D. NEGOSIASI HARGA SATUAN -->
      <div ${hideSec(!hasHarga)} style="margin-bottom:14px;">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">D.&nbsp;&nbsp;&nbsp;NEGOSIASI HARGA SATUAN</div>
        <table style="width:100%;border-collapse:collapse;font-size:10pt;table-layout:fixed;color:#000;">
          <colgroup>
            <col style="width:32px;">
            <col style="width:auto;">
            <col style="width:84px;">
            <col style="width:84px;">
            <col style="width:80px;">
            <col style="width:70px;">
            <col style="width:80px;">
          </colgroup>
          <thead style="display:table-header-group;">
            <tr>
              <th class="no-col" style="${thStyle}">No</th>
              <th style="${thStyle}">Nama Item Barang dan Spek Minimal</th>
              <th style="${thStyle}">Harga Awal Penyedia</th>
              <th style="${thStyle}">Harga Hasil Negosiasi</th>
              <th style="${thStyle}">Selisih</th>
              <th style="${thStyle}">% Efisiensi</th>
              <th style="${thStyle}">Keterangan</th>
            </tr>
          </thead>
          <tbody>${rowsNego}</tbody>
        </table>
        <p style="text-align:justify;margin-top:10px;color:#000;font-size:12px;">
          Proses negosiasi harga satuan dilakukan terhadap <strong>${dataTabelD.length}</strong> item pekerjaan bersama penyedia terpilih. Seluruh item telah disepakati harganya sesuai ketentuan yang berlaku.
        </p>
      </div>

      <!-- E. REKAP PERBANDINGAN NILAI -->
      <div style="margin-bottom:14px;" class="section-block">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">E.&nbsp;&nbsp;&nbsp;REKAP PERBANDINGAN NILAI</div>
        <table style="width:auto;min-width:auto;border-collapse:collapse;font-size:10pt;color:#000;">
          <colgroup><col style="width:32px;"><col style="width:auto;"><col style="width:130px;"></colgroup>
          <thead>
            <tr>
              <th class="no-col" style="${thStyle}">No</th>
              <th style="${thStyle}">Uraian</th>
              <th style="${thStyle}">Nilai</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="${tdCStyle}">1</td><td style="${tdStyle}">Total HPS</td><td style="${tdRStyle}">${fmtRp(paket.paguAnggaran)}</td></tr>
            <tr><td style="${tdCStyle}">2</td><td style="${tdStyle}">Total Harga Tayang Penyedia Terpilih</td><td style="${tdRStyle}">${fmtRp(totalHargaTayang)}</td></tr>
            <tr><td style="${tdCStyle}">3</td><td style="${tdStyle}">Total Hasil Negosiasi</td><td style="${tdRStyle}">${fmtRp(totalNego)}</td></tr>
            <tr><td style="${tdCStyle}">4</td><td style="${tdStyle}">Efisiensi terhadap HPS</td><td style="${tdRStyle}">${fmtRp(penghematanHPS)}</td></tr>
            <tr><td style="${tdCStyle}">5</td><td style="${tdStyle}">% Efisiensi terhadap HPS</td><td style="${tdRStyle}">${effisiensiHPS}%</td></tr>
            <tr><td style="${tdCStyle}">6</td><td style="${tdStyle}">Penghematan dari Negosiasi</td><td style="${tdRStyle}">${fmtRp(penghematanNego)}</td></tr>
            <tr><td style="${tdCStyle}">7</td><td style="${tdStyle}">% Penghematan Negosiasi</td><td style="${tdRStyle}">${pctNego}%</td></tr>
          </tbody>
        </table>
      </div>

      <!-- F. ANALISIS KEWAJARAN HARGA -->
      <div style="margin-bottom:14px;" class="section-block">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">F.&nbsp;&nbsp;&nbsp;ANALISIS KEWAJARAN HARGA</div>
        <table style="width:auto;min-width:auto;border-collapse:collapse;font-size:10pt;color:#000;">
          <colgroup><col style="width:32px;"><col style="width:auto;"><col style="width:80px;"></colgroup>
          <thead>
            <tr>
              <th class="no-col" style="${thStyle}">No</th>
              <th style="${thStyle}">Aspek</th>
              <th style="${thStyle}">Hasil</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="${tdCStyle}">1</td><td style="${tdStyle}">Harga di bawah atau sama dengan HPS</td><td style="${tdCStyle}">Ya</td></tr>
            <tr><td style="${tdCStyle}">2</td><td style="${tdStyle}">Spesifikasi sesuai kebutuhan</td><td style="${tdCStyle}">Ya</td></tr>
            <tr><td style="${tdCStyle}">3</td><td style="${tdStyle}">Penyedia memiliki item lengkap</td><td style="${tdCStyle}">Ya</td></tr>
            <tr><td style="${tdCStyle}">4</td><td style="${tdStyle}">Harga masih dapat dinegosiasikan</td><td style="${tdCStyle}">Ya</td></tr>
            <tr><td style="${tdCStyle}">5</td><td style="${tdStyle}">Harga final dinilai wajar</td><td style="${tdCStyle}">Ya</td></tr>
          </tbody>
        </table>
        <div style="margin-top:8px;font-size:11pt;color:#000;">
          <strong>Catatan Analisis:</strong>
          <ul style="margin:4px 0 0 20px;padding:0;color:#000;">
            <li>Seluruh harga satuan setelah negosiasi berada di bawah atau sama dengan HPS;</li>
            <li>Spesifikasi barang yang ditawarkan sesuai dengan kebutuhan pengguna;</li>
            <li>Penyedia mampu menyediakan seluruh item yang dibutuhkan;</li>
            <li>Dengan demikian, harga akhir dinilai wajar dan layak untuk ditetapkan.</li>
          </ul>
        </div>
      </div>

      <!-- G. JUSTIFIKASI PEMILIHAN PENYEDIA -->
      <div style="margin-bottom:14px;" class="section-block">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">G.&nbsp;&nbsp;&nbsp;JUSTIFIKASI PEMILIHAN PENYEDIA</div>
        <table style="width:100%;border-collapse:collapse;font-size:10pt;table-layout:fixed;color:#000;">
          <colgroup><col style="width:32px;"><col style="width:160px;"><col style="width:auto;"></colgroup>
          <thead>
            <tr>
              <th class="no-col" style="${thStyle}">No</th>
              <th style="${thStyle}">Kriteria</th>
              <th style="${thStyle}">Penjelasan</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="${tdCStyle}">1</td><td style="${tdStyle}">Harga Hasil Negosiasi Terendah</td><td style="${tdStyle}">Penyedia menawarkan total harga hasil negosiasi terendah untuk item yang dievaluasi.</td></tr>
            <tr><td style="${tdCStyle}">2</td><td style="${tdStyle}">Kesesuaian Spesifikasi</td><td style="${tdStyle}">Seluruh spesifikasi ${paket.namaPaket ? paket.namaPaket.toLowerCase().replace(/belanja /i,'') : 'barang/jasa'} sesuai kebutuhan.</td></tr>
            <tr><td style="${tdCStyle}">3</td><td style="${tdStyle}">Kelengkapan Item</td><td style="${tdStyle}">Penyedia dapat menyediakan seluruh item dalam satu paket.</td></tr>
            <tr><td style="${tdCStyle}">4</td><td style="${tdStyle}">Hasil Negosiasi</td><td style="${tdStyle}">Penyedia sepakat dengan harga negosiasi seperti yang tertera pada tabel D point 3</td></tr>
            <tr><td style="${tdCStyle}">5</td><td style="${tdStyle}">Reputasi/Kinerja Penyedia</td><td style="${tdStyle}">Penyedia aktif di e-Katalog dan memiliki kinerja yang baik.</td></tr>
          </tbody>
        </table>
      </div>

      <!-- H. KESIMPULAN DAN REKOMENDASI -->
      <div style="margin-bottom:20px;" class="section-block">
        <div style="font-weight:bold;margin-bottom:8px;color:#000;">H.&nbsp;&nbsp;&nbsp;KESIMPULAN DAN REKOMENDASI</div>
        <p style="text-align:justify;color:#000;font-size:12px;margin-bottom:10px;">
          Berdasarkan hasil evaluasi pembanding harga dari beberapa penyedia pada e-Katalog serta hasil negosiasi harga satuan, diperoleh bahwa penyedia <strong>${penyediaTerpilihFinal}</strong> menawarkan harga yang paling kompetitif dengan total nilai setelah negosiasi sebesar ${fmtRp(totalNego)}. Harga tersebut berada di bawah/sama dengan HPS dan dinilai wajar serta memenuhi seluruh spesifikasi teknis yang dipersyaratkan. Oleh karena itu, penyedia tersebut direkomendasikan untuk ditetapkan sebagai pelaksana pekerjaan.
        </p>
        <p style="text-align:justify;color:#000;font-size:12px;margin-bottom:10px;">
          Selanjutnya apabila disetujui oleh PPK dan/atau Kepala Satuan Kerja, Kami selaku Pejabat Pengadaan akan segera memproses transaksi pembelian pada sistem E-Katalog.
        </p>
        <p style="text-align:justify;color:#000;font-size:12px;">
          Demikian Berita Acara Pemilihan Calon Penyedia ini dibuat untuk dapat digunakan sebagaimana mestinya.
        </p>
      </div>

      <!-- TTD -->
      <div class="section-block" style="display:flex;justify-content:flex-end;margin-top:40px;">
        <div style="text-align:left;width:320px;color:#000;">
          <div style="color:#000;">${docInstansi}</div>
          <div style="font-weight:bold;margin-bottom:60px;color:#000;">Pejabat Pengadaan</div>
          <div style="font-weight:bold;text-decoration:underline;color:#000;">${pejabatPengadaan.nama || '<span style="color:#c05050;font-style:italic;">⚠ Pilih Pejabat Pengadaan</span>'}</div>
          <div style="color:#000;">${pejabatPengadaan.nip || 'NIP. 198711182015021003'}</div>
        </div>
      </div>
    </div>
  `;
}

function printEvhp() {
  const printArea = document.getElementById('evhp-print-area');
  if (!printArea) {
    toast('Pilih No RUP terlebih dahulu', 'error');
    return;
  }
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Berita Acara Hasil Evaluasi Harga Penawaran E-Purchasing</title>
      <style>
        ${buildPageRule('evhp')}
        @media screen {
          body { max-width: 210mm; margin: 0 auto; padding: 20mm; background: #f0f0f0; }
          body > * { background: #fff; }
        }
        * { box-sizing: border-box; color: #000 !important; }
        body { margin:0; padding:0; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        table { border-collapse:collapse; width:100%; table-layout:fixed; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        tbody tr { page-break-inside:auto; }
        th, td { border:1px solid #000; word-wrap:break-word; }
        p { margin:4px 0; orphans:3; widows:3; }
        .section-block { page-break-inside:auto; }
        ul { margin:4px 0 0 20px; }
        /* ── A4 layout overrides — rapikan hasil print ── */
        [id$="-print-area"] {
          padding: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          line-height: 1.45;
        }
        img { max-width: 100%; height: auto; display: block; }
        table { table-layout: fixed; width: 100% !important; }
        /* Kolom "No" tabel data – sempit, center, rapat */
        table.data-tbl th:first-child,
        table.data-tbl td:first-child,
        th.no-col, td.no-col {
          width: 34px !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        /* Header tabel selalu center */
        thead th { text-align: center !important; vertical-align: middle !important; }
        /* Hindari kolom mata uang/angka wrap aneh */
        .num, td.num { text-align: right !important; white-space: nowrap; }
        /* Sub-tabel jangan dobel border */
        td > table { border: 0 !important; }
      </style>
    </head>
    <body>${printArea.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

// ============================================================
//  FORM SPEK FUNCTIONS - Spesifikasi Teknis Paket E-Purchasing
// ============================================================
function populateFormSpekSelects() {
  // RUP select
  const rupSel = document.getElementById('formspek-rup-select');
  if (rupSel) {
    const cur = rupSel.value;
    rupSel.innerHTML = '<option value="">-- Pilih No RUP --</option>';
    state.paket.data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.rup;
      opt.textContent = `${p.rup} - ${strTrunc(p.namaPaket, 40)}`;
      rupSel.appendChild(opt);
    });
    rupSel.value = cur;
  }
  // PPK select
  const ppkSel = document.getElementById('formspek-pejabat-select');
  if (ppkSel) {
    const cur = ppkSel.value;
    ppkSel.innerHTML = '<option value="">-- Pilih PPK --</option>';
    const allPpk = masterState.ppk.length > 0 ? masterState.ppk : masterState.pejabatPengadaan;
    allPpk.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nama || p.namaPPK || p.namaPejabat || JSON.stringify(p);
      ppkSel.appendChild(opt);
    });
    ppkSel.value = cur;
  }
}

function loadFormSpekData() {
  const rup = document.getElementById('formspek-rup-select').value;
  const ppkId = document.getElementById('formspek-pejabat-select').value;
  const content = document.getElementById('formspek-content');

  if (!rup) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧷</div>
        <div class="empty-title">Pilih No RUP</div>
        <div class="empty-sub">Pilih nomor RUP di atas untuk menampilkan Spesifikasi Teknis Paket E-Purchasing</div>
      </div>`;
    return;
  }

  // Cari paket
  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Data tidak ditemukan</div></div>`;
    return;
  }

  // PPK / PPKom
  let ppk = { nama: 'NAMA PPK', nip: 'NIP. -', ttd: '', cap: '', ttdSizeW:120, ttdSizeH:55, capSizeW:80, capSizeH:80 };
  if (ppkId) {
    const allPpk = [...masterState.ppk, ...masterState.pejabatPengadaan];
    const found = allPpk.find(p => String(p.id) === String(ppkId));
    if (found) ppk = { nama: found.nama || found.namaPPK || '-', nip: found.nip || found.nipPPK || '-', ttd: found.ttd||'', cap: found.cap||'', ttdSizeW: found.ttdSizeW||120, ttdSizeH: found.ttdSizeH||55, capSizeW: found.capSizeW||80, capSizeH: found.capSizeH||80 };
  }
  const rincianForRup = state.rincian.data.filter(r => String(r.rup) === String(rup));

  // Data harga untuk mendapatkan link katalog & qty terjual
  const hargaForRup = state.harga.data.filter(h => String(h.rup) === String(rup));

  // Penyedia terpilih (negoFinal terkecil)
  let penyediaTerpilih = '';
  let linkEkatalog = '';
  let tanggalAkses = '';
  if (hargaForRup.length > 0) {
    // Cari penyedia dengan total harga negosiasi terendah
    const totalPerPenyedia = {};
    hargaForRup.forEach(h => {
      if (!h.namaPenyedia) return;
      totalPerPenyedia[h.namaPenyedia] = (totalPerPenyedia[h.namaPenyedia] || 0) + (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0)) * (Number(h.qty) || 1);
    });
    const sorted = Object.entries(totalPerPenyedia).sort((a, b) => a[1] - b[1]);
    if (sorted.length > 0) penyediaTerpilih = sorted[0][0];
    // Link katalog dari harga penyedia terpilih
    const linkItem = hargaForRup.find(h => h.namaPenyedia === penyediaTerpilih && h.linkKatalog);
    if (linkItem) linkEkatalog = linkItem.linkKatalog;
    if (!linkEkatalog) {
      const anyLink = hargaForRup.find(h => h.linkKatalog);
      if (anyLink) linkEkatalog = anyLink.linkKatalog;
    }
  }

  // Prioritas: Link dari Referensi E-Catalog (cocokkan Jenis Belanja = kodeRekening paket)
  if (paket.kodeRekening && masterState.ecatalog && masterState.ecatalog.length > 0) {
    const ecMatch = masterState.ecatalog.find(ec =>
      ec.jenisBelanja && ec.jenisBelanja.trim() === paket.kodeRekening.trim()
    );
    if (ecMatch && ecMatch.linkEcatalog) {
      linkEkatalog = ecMatch.linkEcatalog;
    }
  }

  // Tanggal (dari tanggalPesanan paket)
  const tglSrc = paket.tanggalPesanan || '';
  let tglDate;
  if (tglSrc) {
    const parts = tglSrc.split('-');
    tglDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    tglDate = new Date();
  }
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tglFormatted = `${tglDate.getDate()} ${namaBulan[tglDate.getMonth()]} ${tglDate.getFullYear()}`;
  const docOrg = getDocOrg(paket);
  const nomorFormspekDefault = `SPEK/${paket.rup || '...'}/${docOrg.singkatan}/${tglDate.getFullYear()}`;
  const nomorFormspek = getDefaultDocNumber(paket.nomorFormspek, nomorFormspekDefault, docOrg.singkatan);

  // Durasi / waktu pengiriman
  const durasi = paket.durasi ? `${paket.durasi} ${paket.masaKerja || 'Hari Kalender'}` : '3 Hari Kalender';

  // Tempat pengiriman mengikuti OPD aktif/config OPD.
  const tempatPengiriman = docOrg.tempatPengiriman;

  // Tingkat layanan (standar)
  const tingkatLayanan = `Penyedia wajib memenuhi tingkat layanan meliputi ketepatan waktu, kesesuaian spesifikasi, kualitas hasil, ketepatan jumlah, responsivitas, pengemasan dan pengiriman, jaminan/garansi, fleksibilitas layanan, kepatuhan administratif, serta standar keamanan dan kepatuhan. Penyedia juga wajib menindaklanjuti setiap ketidaksesuaian melalui perbaikan atau penggantian tanpa biaya tambahan sesuai ketentuan yang disepakati serta bertanggung jawab penuh atas pengadaan.`;

  // Bangun baris item rincian
  const EMPTY_ROWS = 0; // tidak ada baris kosong padding
  let itemRows = '';
  const hasRincian = rincianForRup.length > 0;
  const hasHarga   = hargaForRup.length > 0;
  const hideSec    = (hide) => hide ? 'style="display:none"' : '';
  if (rincianForRup.length > 0) {
    rincianForRup.forEach(r => {
      // Cari spesifikasi produk dari harga
      const hargaItem = hargaForRup.find(h => h.namaItem === r.itemBarang || h.namaProduk === r.itemBarang);
      const spek = hargaItem ? (hargaItem.namaProduk ? `Spesifikasi : ${hargaItem.namaProduk}` : '') : '';
      const qty = r.vol || '';
      const satuan = r.satuan || '';
      const hargaSatuan = r.hargaSatuan ? Number(r.hargaSatuan).toLocaleString('id-ID', {minimumFractionDigits:2}) : '';
      itemRows += `
        <tr>
          <td style="border:1px solid #000;padding:5px 7px;vertical-align:top;color:#000;">${r.itemBarang || ''}<br><span style="font-size:10px;">${spek}</span></td>
          <td style="border:1px solid #000;padding:5px 7px;text-align:center;vertical-align:top;color:#000;">${qty}</td>
          <td style="border:1px solid #000;padding:5px 7px;text-align:center;vertical-align:top;color:#000;">${satuan}</td>
          <td style="border:1px solid #000;padding:5px 7px;text-align:right;vertical-align:top;color:#000;">${hargaSatuan}</td>
        </tr>`;
    });
    // Tidak ada baris kosong padding
  } else {
    // Tidak ada data — tidak tampilkan baris kosong
  }

  // Build HTML dokumen
  content.innerHTML = `
    <div id="formspek-print-area" style="background:#fff;color:#000;padding:24px 28px;width:100%;max-width:900px;min-width:auto;margin:0 auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;box-sizing:border-box;">

      <!-- KOP SURAT -->
      ${kopSurat()}

      <!-- JUDUL -->
      <div style="text-align:center;margin-bottom:18px;">
        <div style="font-size:14pt;font-weight:bold;text-decoration:underline;color:#000;letter-spacing:0.5px;">SPESIFIKASI TEKNIS PAKET E-PURCHASING</div>
        <div style="font-size:12pt;color:#000;">Nomor : ${nomorFormspek} <button onclick="openNomorDialog(this)" data-slug="formspek" data-rup="${paket.rup}" data-field="nomorFormspek" data-cur="${nomorFormspek}" title="Edit nomor dokumen" class="doc-nomor-edit" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:0.5;vertical-align:middle;line-height:1;">✏️</button></div>
      </div>

      <!-- HEADER INFO PAKET -->
      <table style="width:100%;border-collapse:collapse;font-size:12pt;color:#000;margin-bottom:16px;" class="section-block">
        <colgroup><col style="width:160px;"><col style="width:12px;"><col style="width:auto;"></colgroup>
        <tbody>
          <tr>
            <td style="padding:3px 6px 3px 0;vertical-align:top;color:#000;border:none;">Perangkat Daerah</td>
            <td style="padding:3px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:3px 0;vertical-align:top;color:#000;border:none;">${docOrg.namaInstansi}</td>
          </tr>
          <tr>
            <td style="padding:3px 6px 3px 0;vertical-align:top;color:#000;border:none;">Program</td>
            <td style="padding:3px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:3px 0;vertical-align:top;color:#000;border:none;">${fmtText(paket.program)}</td>
          </tr>
          <tr>
            <td style="padding:3px 6px 3px 0;vertical-align:top;color:#000;border:none;">Kegiatan</td>
            <td style="padding:3px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:3px 0;vertical-align:top;color:#000;border:none;">${fmtText(paket.kegiatan)}</td>
          </tr>
          <tr>
            <td style="padding:3px 6px 3px 0;vertical-align:top;color:#000;border:none;">Sub Kegiatan</td>
            <td style="padding:3px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:3px 0;vertical-align:top;color:#000;border:none;">${fmtText(paket.subKegiatan)}</td>
          </tr>
        </tbody>
      </table>

      <!-- RUP + PAKET INFO -->
      <table style="width:100%;border-collapse:collapse;font-size:12pt;color:#000;margin-bottom:16px;" class="section-block">
        <colgroup><col style="width:160px;"><col style="width:12px;"><col style="width:auto;"></colgroup>
        <tbody>
          <tr>
            <td style="padding:3px 6px 3px 0;vertical-align:top;color:#000;border:none;">RUP</td>
            <td style="padding:3px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:3px 0;vertical-align:top;color:#000;border:none;">${paket.rup || '-'}</td>
          </tr>
          <tr>
            <td style="padding:3px 6px 3px 0;vertical-align:top;color:#000;border:none;">Nama Paket Pengadaan</td>
            <td style="padding:3px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:3px 0;vertical-align:top;color:#000;border:none;">${paket.namaPaket || '-'}</td>
          </tr>
          <tr>
            <td style="padding:3px 6px 3px 0;vertical-align:top;color:#000;border:none;">Pagu</td>
            <td style="padding:3px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:3px 0;vertical-align:top;color:#000;border:none;">${fmtRp(paket.paguAnggaran)}</td>
          </tr>
          <tr>
            <td style="padding:3px 6px 3px 0;vertical-align:top;color:#000;border:none;">Mata Anggaran Belanja</td>
            <td style="padding:3px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:3px 0;vertical-align:top;color:#000;border:none;">${paket.kodeRekening || '-'}</td>
          </tr>
          <tr>
            <td style="padding:3px 6px 3px 0;vertical-align:top;color:#000;border:none;">Sumber Dana</td>
            <td style="padding:3px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:3px 0;vertical-align:top;color:#000;border:none;">${docOrg.sumberDana} ${docOrg.kabupaten} TA ${tglDate.getFullYear()}</td>
          </tr>
        </tbody>
      </table>

      <!-- TABEL SPESIFIKASI UTAMA -->
      <table ${hideSec(!hasRincian)} style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:0;" class="section-block">
        <colgroup>
          <col style="width:32px;">
          <col style="width:150px;">
          <col style="width:auto;">
          <col style="width:80px;">
        </colgroup>
        <thead>
          <tr>
            <th class="no-col" style="border:1px solid #000;padding:7px;text-align:center;background:#fff;color:#000;font-weight:bold;">No</th>
            <th style="border:1px solid #000;padding:7px;text-align:center;background:#fff;color:#000;font-weight:bold;">Elemen Spesifikasi</th>
            <th style="border:1px solid #000;padding:7px;text-align:center;background:#fff;color:#000;font-weight:bold;">Uraian Spesifikasi</th>
            <th style="border:1px solid #000;padding:7px;text-align:center;background:#fff;color:#000;font-weight:bold;">Ket</th>
          </tr>
        </thead>
        <tbody>
          <!-- BARIS 1: Jenis, Spesifikasi, Kuantitas, Satuan dan Harga -->
          <tr>
            <td style="border:1px solid #000;padding:7px;text-align:center;vertical-align:top;color:#000;">1.</td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;color:#000;font-weight:bold;">Jenis, Spesifikasi, Kuantitas, Satuan dan Harga</td>
            <td style="border:1px solid #000;padding:0;vertical-align:top;color:#000;">
              <!-- Sub-tabel item barang -->
              <table style="width:100%;border-collapse:collapse;font-size:10pt;color:#000;">
                <colgroup>
                  <col style="width:auto;">
                  <col style="width:60px;">
                  <col style="width:60px;">
                  <col style="width:90px;">
                </colgroup>
                <thead>
                  <tr>
                    <th style="border-bottom:1px solid #000;border-right:1px solid #000;padding:5px 7px;text-align:center;color:#000;font-weight:bold;background:#fff;">Nama Barang dan Spesifikasi</th>
                    <th style="border-bottom:1px solid #000;border-right:1px solid #000;padding:5px 7px;text-align:center;color:#000;font-weight:bold;background:#fff;">Qty</th>
                    <th style="border-bottom:1px solid #000;border-right:1px solid #000;padding:5px 7px;text-align:center;color:#000;font-weight:bold;background:#fff;">Satuan</th>
                    <th style="border-bottom:1px solid #000;padding:5px 7px;text-align:center;color:#000;font-weight:bold;background:#fff;">Harga Satuan (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;color:#000;"></td>
          </tr>

          <!-- BARIS 2: Tempat -->
          <tr>
            <td style="border:1px solid #000;padding:7px;text-align:center;vertical-align:top;color:#000;">2.</td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;color:#000;font-weight:bold;">Tempat</td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;color:#000;">${tempatPengiriman}</td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;color:#000;"></td>
          </tr>

          <!-- BARIS 3: Waktu -->
          <tr>
            <td style="border:1px solid #000;padding:7px;text-align:center;vertical-align:top;color:#000;">3.</td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;color:#000;font-weight:bold;">Waktu</td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;color:#000;">${durasi}</td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;color:#000;"></td>
          </tr>

          <!-- BARIS 4: Tingkat Layanan -->
          <tr>
            <td style="border:1px solid #000;padding:7px;text-align:center;vertical-align:top;color:#000;">4.</td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;color:#000;font-weight:bold;">Tingkat Layanan</td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;text-align:justify;color:#000;">${tingkatLayanan}</td>
            <td style="border:1px solid #000;padding:7px;vertical-align:top;color:#000;"></td>
          </tr>
        </tbody>
      </table>

      <!-- LINK E-CATALOG -->
      <div style="margin-top:10px;margin-bottom:6px;color:#000;" class="section-block">
        <div style="color:#0000EE;font-weight:bold;margin-bottom:4px;">Link E-Catalog:</div>
        ${linkEkatalog
          ? `<div style="margin-bottom:4px;"><a href="${linkEkatalog}" style="color:#0000EE;word-break:break-all;">${linkEkatalog}</a></div>`
          : `<div style="color:#888;font-style:italic;">Link katalog belum tersedia. Tambahkan melalui data Survey Harga.</div>`
        }
        <div style="color:#000;">Di akses tanggal,&nbsp;&nbsp;&nbsp;${tglFormatted}</div>
      </div>

      <!-- TTD PPKom -->
      <div class="section-block" style="display:flex;justify-content:flex-end;margin-top:36px;">
        <div style="text-align:left;width:320px;color:#000;">
          <div style="color:#000;">Putussibau, &nbsp;${tglFormatted}</div>
          <div style="color:#000;">Di tetapkan oleh :</div>
          <div style="font-weight:bold;margin-bottom:4px;color:#000;">Pejabat Pembuat Komitmen (PPKom)</div>
          <div style="color:#000;">${docOrg.namaInstansi}</div>
          ${(()=>{
              const mode = (window._ttdMode && window._ttdMode['formspek']) || {ttd:false, cap:false};
              const showTtd = mode.ttd && ppk.ttd;
              const showCap = mode.cap && ppk.cap;
              const L = (window._ttdLayout && window._ttdLayout['formspek']) || {};
              const T = L.ttd || {x:0,y:0,w:120,h:55,r:0,o:100};
              const C = L.cap || {x:80,y:-20,w:80,h:80,r:0,o:85};
              // Container SELALU 70px (sama dengan placeholder kosong) — gambar mengambang di atas (wrap in front)
              return `<div style="position:relative;height:70px;margin-top:4px;background:transparent;overflow:visible;">
                ${showTtd ? `<img id="doc-ttd-img-formspek" src="${ppk.ttd}"
                  style="position:absolute;left:0;top:0;width:${T.w}px;height:${T.h}px;object-fit:contain;
                  background:transparent;
                  transform:translate(${T.x}px,${T.y}px) rotate(${T.r}deg);opacity:${T.o/100};
                  cursor:grab;user-select:none;z-index:2;"
                  draggable="false"
                  title="Drag untuk pindah posisi TTD">` : ''}
                ${showCap ? `<img id="doc-cap-img-formspek" src="${ppk.cap}"
                  style="position:absolute;left:0;top:0;width:${C.w}px;height:${C.h}px;object-fit:contain;
                  background:transparent;
                  transform:translate(${C.x}px,${C.y}px) rotate(${C.r}deg);opacity:${C.o/100};
                  cursor:grab;user-select:none;z-index:3;"
                  draggable="false"
                  title="Drag untuk pindah posisi Cap">` : ''}
              </div>`;
            })()}
          <div style="font-weight:bold;text-decoration:underline;color:#000;">${ppk.nama}</div>
          <div style="color:#000;">${ppk.nip}</div>
        </div>
      </div>

    </div>
  `;
  // Pasang drag handler setelah render
  setTimeout(() => {
    makeDraggableTtd('doc-ttd-img-formspek', 'formspek', 'ttd');
    makeDraggableTtd('doc-cap-img-formspek', 'formspek', 'cap');
  }, 50);
}

// ============================================================
//  RIVIU — Berita Acara Reviu DPP E-Purchasing
// ============================================================

function populateRiviuSelects() {
  // RUP select
  const rupSel = document.getElementById('riviu-rup-select');
  if (rupSel) {
    const cur = rupSel.value;
    rupSel.innerHTML = '<option value="">-- Pilih No RUP --</option>';
    state.paket.data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.rup;
      opt.textContent = `${p.rup} - ${strTrunc(p.namaPaket, 40)}`;
      rupSel.appendChild(opt);
    });
    rupSel.value = cur;
  }
  // PPK select
  const ppkSel = document.getElementById('riviu-ppk-select');
  if (ppkSel) {
    const cur = ppkSel.value;
    ppkSel.innerHTML = '<option value="">-- Pilih PPK --</option>';
    const allPpk = [...masterState.ppk, ...masterState.pejabatPengadaan.filter(p => p.jabatan && p.jabatan.toUpperCase().includes('PPK'))];
    masterState.ppk.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nama || p.namaPPK || '-';
      ppkSel.appendChild(opt);
    });
    ppkSel.value = cur;
  }
  // Pejabat Pengadaan select
  const pejSel = document.getElementById('riviu-pejabat-select');
  if (pejSel) {
    const cur = pejSel.value;
    pejSel.innerHTML = '<option value="">-- Pilih Pejabat Pengadaan --</option>';
    masterState.pejabatPengadaan.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nama || '-';
      pejSel.appendChild(opt);
    });
    pejSel.value = cur;
  }
}

function loadRiviuData() {
  const rup = document.getElementById('riviu-rup-select').value;
  const ppkId = document.getElementById('riviu-ppk-select').value;
  const pejId = document.getElementById('riviu-pejabat-select').value;
  const content = document.getElementById('riviu-content');

  if (!rup) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-title">Pilih No RUP</div>
        <div class="empty-sub">Pilih PPK, Pejabat Pengadaan, dan No RUP untuk menampilkan Berita Acara Reviu DPP</div>
      </div>`;
    return;
  }

  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Data tidak ditemukan</div></div>`;
    return;
  }

  // PPK
  let ppk = { nama: 'NAMA PPK', nip: '-', jabatan: 'PA/KPA/PPK', ttd: '', cap: '', ttdSizeW:120, ttdSizeH:55, capSizeW:80, capSizeH:80 };
  if (ppkId) {
    const found = masterState.ppk.find(p => String(p.id) === String(ppkId));
    if (found) ppk = { nama: found.nama||found.namaPPK||'-', nip: found.nip||found.nipPPK||'-', jabatan: found.jabatan||'PA/KPA/PPK', ttd: found.ttd||'', cap: found.cap||'', ttdSizeW: found.ttdSizeW||120, ttdSizeH: found.ttdSizeH||55, capSizeW: found.capSizeW||80, capSizeH: found.capSizeH||80 };
  }

  // Pejabat Pengadaan
  let pejabat = { nama: 'NAMA PEJABAT PENGADAAN', nip: '-', jabatan: 'Pejabat Pengadaan' };
  if (pejId) {
    const found = masterState.pejabatPengadaan.find(p => String(p.id) === String(pejId));
    if (found) pejabat = { nama: found.nama || '-', nip: found.nip || '-', jabatan: found.jabatan || 'Pejabat Pengadaan' };
  }

  // Tanggal
  const tglSrc = paket.tanggalPesanan || '';
  let tglDate;
  if (tglSrc) {
    const parts = tglSrc.split('-');
    tglDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    tglDate = new Date();
  }
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tglFormatted = `${tglDate.getDate()} ${namaBulan[tglDate.getMonth()]} ${tglDate.getFullYear()}`;
  const tahun = tglDate.getFullYear();
  const docOrg = getDocOrg(paket);

  // Nomor BAR
  const nomorBarDefault = `BAR-DPP/${paket.rup}/${docOrg.singkatan}/${tahun}`;
  const nomorBar = getDefaultDocNumber(paket.nomorBar, nomorBarDefault, docOrg.singkatan);

  // Harga survey
  const hargaForRup = state.harga.data.filter(h => String(h.rup) === String(rup));
  let sumberHarga = 'bersumber dari penyedia dalam epuchasing katalog v.6';
  if (hargaForRup.length > 0 && hargaForRup[0].namaPenyedia) {
    sumberHarga = `bersumber dari penyedia dalam epuchasing katalog v.6`;
  }

  // Build HTML dokumen Riviu
  content.innerHTML = `
    <div id="riviu-print-area" style="background:#fff;color:#000;padding:24px 28px;width:100%;max-width:900px;min-width:auto;margin:0 auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;box-sizing:border-box;">

      <!-- KOP SURAT -->
      ${kopSurat()}

      <!-- JUDUL -->
      <div style="text-align:center;margin-bottom:6px;" class="section-block">
        <div style="font-size:12pt;font-weight:bold;text-decoration:underline;color:#000;letter-spacing:0.3px;">BERITA ACARA REVIU DOKUMEN PERSIAPAN PENGADAAN <em>E-PURCHASING</em></div>
        <div style="font-size:12pt;color:#000;">Nomor : ${nomorBar} <button onclick="openNomorDialog(this)" data-slug="riviu" data-rup="${paket.rup}" data-field="nomorBar" data-cur="${nomorBar}" title="Edit nomor dokumen" class="doc-nomor-edit" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:0.5;vertical-align:middle;line-height:1;">✏️</button></div>
      </div>

      <!-- HEADER INFO PAKET -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin:14px 0 16px;" class="section-block">
        <colgroup><col style="width:155px;"><col style="width:10px;"><col style="width:auto;"></colgroup>
        <tbody>
          <tr><td style="padding:2px 6px 2px 0;border:none;color:#000;">Perangkat Daerah</td><td style="padding:2px 4px;border:none;color:#000;">:</td><td style="padding:2px 0;border:none;color:#000;">${docOrg.namaInstansi}</td></tr>
          <tr><td style="padding:2px 6px 2px 0;border:none;color:#000;">Program</td><td style="padding:2px 4px;border:none;color:#000;">:</td><td style="padding:2px 0;border:none;color:#000;">${fmtText(paket.program)}</td></tr>
          <tr><td style="padding:2px 6px 2px 0;border:none;color:#000;">Kegiatan</td><td style="padding:2px 4px;border:none;color:#000;">:</td><td style="padding:2px 0;border:none;color:#000;">${fmtText(paket.kegiatan)}</td></tr>
          <tr><td style="padding:2px 6px 2px 0;border:none;color:#000;">Sub Kegiatan</td><td style="padding:2px 4px;border:none;color:#000;">:</td><td style="padding:2px 0;border:none;color:#000;">${fmtText(paket.subKegiatan)}</td></tr>
          <tr><td style="padding:2px 6px 2px 0;border:none;color:#000;">RUP</td><td style="padding:2px 4px;border:none;color:#000;">:</td><td style="padding:2px 0;border:none;color:#000;">${paket.rup || '-'}</td></tr>
          <tr><td style="padding:2px 6px 2px 0;border:none;color:#000;">Nama Paket Pengadaan</td><td style="padding:2px 4px;border:none;color:#000;">:</td><td style="padding:2px 0;border:none;color:#000;">${paket.namaPaket || '-'}</td></tr>
          <tr><td style="padding:2px 6px 2px 0;border:none;color:#000;">Pagu</td><td style="padding:2px 4px;border:none;color:#000;">:</td><td style="padding:2px 0;border:none;color:#000;">${fmtRp(paket.paguAnggaran)}</td></tr>
          <tr><td style="padding:2px 6px 2px 0;border:none;color:#000;">Mata Anggaran Belanja</td><td style="padding:2px 4px;border:none;color:#000;">:</td><td style="padding:2px 0;border:none;color:#000;">${paket.kodeRekening || '-'}</td></tr>
          <tr><td style="padding:2px 6px 2px 0;border:none;color:#000;">Sumber Dana</td><td style="padding:2px 4px;border:none;color:#000;">:</td><td style="padding:2px 0;border:none;color:#000;">${docOrg.sumberDana} ${docOrg.kabupaten} TA ${tahun}</td></tr>
        </tbody>
      </table>

      <!-- TABEL 1: Evaluasi Spesifikasi Teknis -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:10px;table-layout:fixed;border:1px solid #000;" class="section-block">
        <colgroup>
          <col style="width:42px;">
          <col style="width:auto;">
          <col style="width:42px;">
          <col style="width:42%;">
        </colgroup>
        <thead>
          <tr>
            <td colspan="4" style="border:none;padding:3px 0 4px;font-weight:bold;color:#000;">1&nbsp;&nbsp;&nbsp;Kertas Kerja Evaluasi Spesifikasi Teknis</td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;white-space:nowrap;">NO.</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;">KEGIATAN</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;white-space:nowrap;">NO.</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;">HASIL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Memastikan spesifikasi teknis telah dituangkan dengan lengkap sehingga peserta memahami dan mampu menyusun penawaran dengan baik.</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Spesifikasi teknis telah dituangkan dengan lengkap sesuai <em>Formulir Penetapan Penyedia Barang/Jasa E-Purchasing</em></td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">
              Memastikan spesifikasi teknis telah dijabarkan dengan :<br>
              <span style="display:inline-block;width:18px;text-align:right;">a</span>&nbsp;Kesesuaian spesifikasi teknis dengan kebutuhan<br>
              <span style="display:inline-block;width:18px;text-align:right;">b</span>&nbsp;Karakteristik antara lain ukuran, dimensi, bentuk, bahan, warna, komposisi<br>
              <span style="display:inline-block;width:18px;text-align:right;">c</span>&nbsp;Kinerja : ketahanan, efisiensi, batas pemakaian, dst<br>
              <span style="display:inline-block;width:18px;text-align:right;">d</span>&nbsp;Standar yang digunakan : SNI, JIS, ASTM, ISO, dst<br>
              <span style="display:inline-block;width:18px;text-align:right;">e</span>&nbsp;Validitas : standar yang digunakan sudah tepat dan sesuai (SNI berlaku dan valid)<br>
              <span style="display:inline-block;width:18px;text-align:right;">f</span>&nbsp;Pengepakan dan cara pengiriman disesuaikan dengan sifat dan/atau jenis barang<br>
              <span style="display:inline-block;width:18px;text-align:right;">g</span>&nbsp;Mencantumkan macam, jenis, kapasitas dan jumlah peralatan
            </td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">
              Spesifikasi teknis telah dijabarkan dengan :<br>
              <span style="display:inline-block;width:18px;text-align:right;">a</span>&nbsp;Spesifikasi teknis telah diuraikan sesuai<br>
              <span style="display:inline-block;width:18px;text-align:right;">b</span>&nbsp;Ukuran/Dimensi telah diuraikan sesuai kebutuhan<br>
              <span style="display:inline-block;width:18px;text-align:right;">c</span>&nbsp;Kinerja barang telah sesuai<br>
              <span style="display:inline-block;width:18px;text-align:right;">d</span>&nbsp;ISO tidak dipersyaratkan<br>
              <span style="display:inline-block;width:18px;text-align:right;">e</span>&nbsp;SNI tidak dipersyaratkan<br>
              <span style="display:inline-block;width:18px;text-align:right;">f</span>&nbsp;Pengepakan dan cara pengiriman sesuai <em>Dokumen Penetapan Kebutuhan Barang dan Jasa</em><br>
              <span style="display:inline-block;width:18px;text-align:right;">g</span>&nbsp;tidak dipersyaratkan
            </td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Hal lain yang relevan dan perlu dilakukan reviu terkait spesifikasi teknis</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">Tidak ada</td>
          </tr>
        </tbody>
      </table>

      <!-- TABEL 2: Evaluasi Referensi Harga -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:10px;table-layout:fixed;" class="section-block">
        <colgroup>
          <col style="width:42px;">
          <col style="width:auto;">
          <col style="width:42px;">
          <col style="width:42%;">
        </colgroup>
        <thead>
          <tr>
            <td colspan="4" style="border:none;padding:3px 0 4px;font-weight:bold;color:#000;">2&nbsp;&nbsp;&nbsp;Kertas Kerja Evaluasi terhadap Pengumpulan Referensi Harga</td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;white-space:nowrap;">NO.</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;">KEGIATAN</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;white-space:nowrap;">NO.</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;">HASIL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Memastikan PPK telah mengumpulkan referensi harga yang cukup dan memadai sehingga dapat menjadi dasar penentuan harga.</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">PA/KPA selaku PPK telah mengumpulkan referensi survey harga di e-katalog</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Memastikan harga yang digunakan PPK relevan dengan harga pasar, kontrak sejenis yang pernah dilakukan, atau sumber lainnya.</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Daftar harga yang digunakan adalah ${sumberHarga}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Hal lain yang relevan dan perlu dilakukan reviu terkait referensi harga</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">tidak ada</td>
          </tr>
        </tbody>
      </table>

      <!-- TABEL 3: Evaluasi Rancangan Kontrak -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:10px;table-layout:fixed;" class="section-block">
        <colgroup>
          <col style="width:42px;">
          <col style="width:auto;">
          <col style="width:42px;">
          <col style="width:42%;">
        </colgroup>
        <thead>
          <tr>
            <td colspan="4" style="border:none;padding:3px 0 4px;font-weight:bold;color:#000;">3&nbsp;&nbsp;&nbsp;Kertas Kerja Evaluasi terhadap Rancangan Kontrak (Surat Pesanan dan/atau Surat Perjanjian Kerja)</td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;white-space:nowrap;">NO.</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;">KEGIATAN</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;white-space:nowrap;">NO.</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;">HASIL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">
              Memastikan Surat Pesanan/SPK telah dituangkan secara lengkap dan benar terkait dengan :<br>
              <span style="display:inline-block;width:18px;text-align:right;">a</span>&nbsp;Paket pengadaan<br>
              <span style="display:inline-block;width:18px;text-align:right;">b</span>&nbsp;Sumber dana<br>
              <span style="display:inline-block;width:18px;text-align:right;">c</span>&nbsp;Nilai kontrak termasuk pajak<br>
              <span style="display:inline-block;width:18px;text-align:right;">d</span>&nbsp;Jenis Kontrak<br>
              <span style="display:inline-block;width:18px;text-align:right;">e</span>&nbsp;Waktu pelaksanaan
            </td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">
              Surat Pesanan/SPK telah dituangkan secara lengkap dan benar yang memuat :<br>
              <span style="display:inline-block;width:18px;text-align:right;">a</span>&nbsp;telah sesuai dengan rancangan SP<br>
              <span style="display:inline-block;width:18px;text-align:right;">b</span>&nbsp;telah sesuai dengan rancangan SP<br>
              <span style="display:inline-block;width:18px;text-align:right;">c</span>&nbsp;belum ditetapkan<br>
              <span style="display:inline-block;width:18px;text-align:right;">d</span>&nbsp;telah sesuai dengan rancangan SP<br>
              <span style="display:inline-block;width:18px;text-align:right;">e</span>&nbsp;telah sesuai dengan rancangan SP
            </td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Memastikan Syarat-Syarat Umum Kontrak dan Syarat-Syarat Khusus Kontrak</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">telah sesuai dengan rancangan SP</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Memastikan jenis kontrak dalam SPK sudah sesuai dengan dokumen persiapan lainnya</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">telah sesuai dengan rancangan SP</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">4</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Hal lain yang relevan dan perlu dilakukan reviu terkait rancangan kontrak</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">4</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">tidak ada</td>
          </tr>
        </tbody>
      </table>

      <!-- TABEL 4: Evaluasi Rencana Metode Pemilihan Penyedia -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:10px;table-layout:fixed;" class="section-block">
        <colgroup>
          <col style="width:42px;">
          <col style="width:auto;">
          <col style="width:42px;">
          <col style="width:42%;">
        </colgroup>
        <thead>
          <tr>
            <td colspan="4" style="border:none;padding:3px 0 4px;font-weight:bold;color:#000;">4&nbsp;&nbsp;&nbsp;Kertas Kerja Evaluasi terhadap Rencana Metode Pemilihan Penyedia</td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;white-space:nowrap;">NO.</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;">KEGIATAN</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;white-space:nowrap;">NO.</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;">HASIL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Memastikan PPK telah menentukan metode pemilihan penyedia</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">Telah ditetapkan</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">
              Memastikan kesesuaian metode pemilihan penyedia yang dipilih PPK dengan ketentuan :<br>
              <span style="display:inline-block;width:18px;text-align:right;">a</span>&nbsp;Negosiasi harga dilakukan terhadap harga satuan produk dengan mempertimbangkan kualitas, kuantitas produk, ongkos kirim, biaya instalasi, mobilisasi, SMKK, dan ketersediaan produk<br>
              <span style="display:inline-block;width:18px;text-align:right;">b</span>&nbsp;<em>Mini kompetisi</em> dilakukan terhadap 2 (dua) atau lebih penyedia katalog elektronik yang memiliki produk yang sama atau produk dengan spesifikasi sejenis yang dibutuhkan oleh PPK/PP dengan tujuan mendapatkan harga terbaik; atau<br>
              <span style="display:inline-block;width:18px;text-align:right;">c</span>&nbsp;<em>Competitive Catalogue</em> memuat data dan informasi yang ditawarkan oleh Penyedia Katalog Elektronik dalam lingkup pekerjaan konstruksi berupa komponen dasar konstruksi yang kemudian dikompetisikan melalui sistem.
            </td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">
              Telah memastikan metode yang dipilih :<br>
              <span style="display:inline-block;width:18px;text-align:right;">a</span>&nbsp;Metode Negosiasi Harga sesuai Formulir Penetapan Penyedia Barang/Jasa E-Purchasing<br>
              <span style="display:inline-block;width:18px;text-align:right;">b</span>&nbsp;-<br>
              <span style="display:inline-block;width:18px;text-align:right;">c</span>&nbsp;-
            </td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Hal lain yang relevan dan perlu dilakukan reviu terkait metode pemilihan penyedia</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">tidak ada</td>
          </tr>
        </tbody>
      </table>

      <!-- TABEL 5: Evaluasi Ketersediaan Produk di Katalog Elektronik -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:16px;table-layout:fixed;" class="section-block">
        <colgroup>
          <col style="width:42px;">
          <col style="width:auto;">
          <col style="width:42px;">
          <col style="width:42%;">
        </colgroup>
        <thead>
          <tr>
            <td colspan="4" style="border:none;padding:3px 0 4px;font-weight:bold;color:#000;">5&nbsp;&nbsp;&nbsp;Kertas Kerja Evaluasi terhadap Ketersediaan Produk di Katalog Elektronik</td>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;white-space:nowrap;">NO.</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;">KEGIATAN</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;white-space:nowrap;">NO.</th>
            <th style="border:1px solid #000;padding:4px 6px;text-align:center;color:#000;font-weight:bold;">HASIL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Memastikan ketersediaan produk di katalog elektronik.</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">1</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Produk tersedia pada katalog Sektoral v.6 sesuai hasil survey harga di e-katalog</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Memastikan berapa banyak penyedia katalog yang menyediakan produk yang akan di-purchase.</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">2</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Penyedia tersedia sesuai hasil survey harga di e-katalog</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">Hal lain yang relevan dan perlu dilakukan reviu terkait dengan ketersediaan produk di katalog elektronik.</td>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">3</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">tidak ada</td>
          </tr>
        </tbody>
      </table>

      <!-- TANDA TANGAN -->
      <div class="section-block" style="display:flex;justify-content:space-between;margin-top:24px;">
        <div style="text-align:left;width:45%;color:#000;">
          <div style="color:#000;">Disusun/ditetapkan oleh :</div>
          <div style="color:#000;">PA/KPA/PPK</div>
          ${(()=>{
              const mode = (window._ttdMode && window._ttdMode['formdpp']) || {ttd:false, cap:false};
              const showTtd = mode.ttd && ppk.ttd;
              const showCap = mode.cap && ppk.cap;
              const L = (window._ttdLayout && window._ttdLayout['formdpp']) || {};
              const T = L.ttd || {x:0,y:0,w:120,h:55,r:0,o:100};
              const C = L.cap || {x:80,y:-20,w:80,h:80,r:0,o:85};
              // Container SELALU 70px — gambar mengambang di atas (wrap in front)
              return `<div style="position:relative;height:70px;margin-top:4px;background:transparent;overflow:visible;">
                ${showTtd ? `<img id="doc-ttd-img-formdpp" src="${ppk.ttd}"
                  style="position:absolute;left:0;top:0;width:${T.w}px;height:${T.h}px;object-fit:contain;
                  background:transparent;
                  transform:translate(${T.x}px,${T.y}px) rotate(${T.r}deg);opacity:${T.o/100};
                  cursor:grab;user-select:none;z-index:2;"
                  draggable="false"
                  title="Drag untuk pindah posisi TTD">` : ''}
                ${showCap ? `<img id="doc-cap-img-formdpp" src="${ppk.cap}"
                  style="position:absolute;left:0;top:0;width:${C.w}px;height:${C.h}px;object-fit:contain;
                  background:transparent;
                  transform:translate(${C.x}px,${C.y}px) rotate(${C.r}deg);opacity:${C.o/100};
                  cursor:grab;user-select:none;z-index:3;"
                  draggable="false"
                  title="Drag untuk pindah posisi Cap">` : ''}
              </div>`;
            })()}
          <div style="font-weight:bold;text-decoration:underline;color:#000;">${ppk.nama}</div>
          <div style="color:#000;">${ppk.nip !== '-' ? 'NIP. ' + ppk.nip : ''}</div>
        </div>
        <div style="text-align:left;width:45%;color:#000;">
          <div style="color:#000;">Diperiksa / Direviu</div>
          <div style="color:#000;">Pejabat Pengadaan</div>
          <div style="margin-top:60px;font-weight:bold;text-decoration:underline;color:#000;">${pejabat.nama}</div>
          <div style="color:#000;">${pejabat.nip !== '-' ? 'NIP. ' + pejabat.nip : ''}</div>
        </div>
      </div>

    </div>
  `;
}


// ============================================================
//  PENETAPAN — Formulir Penetapan Barang/Jasa E-Purchasing
// ============================================================

function populatePenetapanSelects() {
  const rupSel = document.getElementById('penetapan-rup-select');
  if (rupSel) {
    const cur = rupSel.value;
    rupSel.innerHTML = '<option value="">— Pilih No RUP —</option>';
    state.paket.data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.rup;
      opt.textContent = `${p.rup} - ${strTrunc(p.namaPaket, 40)}`;
      rupSel.appendChild(opt);
    });
    rupSel.value = cur;
  }
  const ppkSel = document.getElementById('penetapan-ppk-select');
  if (ppkSel) {
    const cur = ppkSel.value;
    ppkSel.innerHTML = '<option value="">— Pilih PPKom —</option>';
    const allPpk = masterState.ppk.length > 0 ? masterState.ppk : masterState.pejabatPengadaan;
    allPpk.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nama || p.namaPPK || '-';
      ppkSel.appendChild(opt);
    });
    ppkSel.value = cur;
  }
  // Populate kepala bidang dari masterState.bidang
  const bidangSel = document.getElementById('penetapan-bidang-select');
  if (bidangSel) {
    const cur = bidangSel.value;
    bidangSel.innerHTML = '<option value="">— Pilih Kepala Bidang —</option>';
    masterState.bidang.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.kepalaBidang || '-'} (${strTrunc(b.namaBidang || '', 30)})`;
      bidangSel.appendChild(opt);
    });
    bidangSel.value = cur;
  }
}

function loadPenetapanData() {
  const rup = document.getElementById('penetapan-rup-select').value;
  const ppkId = document.getElementById('penetapan-ppk-select').value;
  const bidangId = document.getElementById('penetapan-bidang-select').value;
  const content = document.getElementById('penetapan-content');

  if (!rup) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <div class="empty-title">Pilih No RUP</div>
        <div class="empty-sub">Pilih PPKom, Kepala Bidang, dan No RUP untuk menampilkan Formulir Penetapan Barang/Jasa E-Purchasing</div>
      </div>`;
    return;
  }

  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Data tidak ditemukan</div></div>`;
    return;
  }

  // PPK
  let ppk = { nama: 'NAMA PPK', nip: '-', jabatan: 'Pejabat Pembuat Komitmen' };
  if (ppkId) {
    const allPpk = [...masterState.ppk, ...masterState.pejabatPengadaan];
    const found = allPpk.find(p => String(p.id) === String(ppkId));
    if (found) ppk = { nama: found.nama || found.namaPPK || '-', nip: found.nip || found.nipPPK || '-', jabatan: found.jabatan || 'Pejabat Pembuat Komitmen' };
  }

  // Kepala Bidang dari master bidang
  let kepBidang = { nama: '', nip: '', namaBidang: paket.bidang || '', namaJabatan: '' };
  if (bidangId) {
    const found = masterState.bidang.find(b => String(b.id) === String(bidangId));
    if (found) kepBidang = { nama: found.kepalaBidang || '', nip: found.nip || '', namaBidang: found.namaBidang || '', namaJabatan: found.kodeSurat || '' };
  } else if (paket.bidang) {
    // Auto-match dari bidang paket jika belum dipilih manual
    const auto = masterState.bidang.find(b => b.namaBidang === paket.bidang);
    if (auto) kepBidang = { nama: auto.kepalaBidang || '', nip: auto.nip || '', namaBidang: auto.namaBidang || '', namaJabatan: auto.kodeSurat || '' };
  }

  const rincianForRup = state.rincian.data.filter(r => String(r.rup) === String(rup));
  const hargaForRup   = state.harga.data.filter(h => String(h.rup) === String(rup));

  // Penetapan = awal alur (sebelum survey harga) — penyediaTerpilih belum tersedia
  // Gunakan data harga jika sudah ada (untuk menampilkan spek), tapi bukan penentu alur
  let penyediaTerpilih = '-';
  let negoFinalTotal = 0;
  let hargaTayangTotal = 0;
  if (hargaForRup.length > 0) {
    const totalPerPenyedia = {};
    hargaForRup.forEach(h => {
      if (!h.namaPenyedia) return;
      const nilaiItem = Number(h.negoFinal) > 0
        ? Number(h.negoFinal) * Number(h.qty || 1)
        : Number(h.totalHarga) || 0;
      totalPerPenyedia[h.namaPenyedia] = (totalPerPenyedia[h.namaPenyedia] || 0) + nilaiItem;
    });
    const sorted = Object.entries(totalPerPenyedia).sort((a,b) => a[1]-b[1]);
    if (sorted.length > 0) { penyediaTerpilih = sorted[0][0]; negoFinalTotal = sorted[0][1]; }
    hargaTayangTotal = hargaForRup.reduce((s, h) => s + (h.totalHarga || 0), 0);
  }

  // Tanggal
  const tglSrc = paket.tanggalPesanan || '';
  let tglDate = tglSrc ? (() => { const p=tglSrc.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); })() : new Date();
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tglFormatted = `${tglDate.getDate()} ${namaBulan[tglDate.getMonth()]} ${tglDate.getFullYear()}`;
  const tahun = tglDate.getFullYear();
  const docOrg = getDocOrg(paket);
  const nomorPenetapanDefault = `PENETAPAN/${paket.rup || '...'}/${docOrg.singkatan}/${tahun}`;
  const nomorPenetapan = getDefaultDocNumber(paket.nomorPenetapan, nomorPenetapanDefault, docOrg.singkatan);

  const durasi = paket.durasi ? `${paket.durasi} ${paket.masaKerja || 'Hari Kalender'}` : '3 Hari Kalender';

  const tdL = 'border:none;padding:3px 6px 3px 0;vertical-align:top;color:#000;';
  const tdC = 'border:none;padding:3px 6px;vertical-align:top;color:#000;';
  const tdR = 'border:none;padding:3px 0;vertical-align:top;color:#000;';

  // ── Visibility flags ──
  const hasRincian = rincianForRup.length > 0;
  const hasHarga   = hargaForRup.length > 0;
  const hideSec    = (hide) => hide ? 'style="display:none"' : '';

  // Tabel A: Jenis Barang/Jasa - baris
  const TOTAL_ROWS = 0; // tidak ada baris kosong padding
  let rowsA = '';
  const dataRows = rincianForRup.length > 0 ? rincianForRup : [];
  const _penOccA = {};
  dataRows.forEach((r, i) => {
    const _keyA = r.itemBarang || '';
    const _occA = _penOccA[_keyA] || 0; _penOccA[_keyA] = _occA + 1;
    const _matchesA = hargaForRup.filter(h => h.namaItem === r.itemBarang);
    const hItem = _matchesA[_occA] || _matchesA[_matchesA.length - 1] || null;
    const spekTeks = hItem && hItem.namaProduk ? `Spesifikasi : ${hItem.namaProduk}` : '';
    rowsA += `<tr>
      <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">${i+1}.</td>
      <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">${r.itemBarang || ''}<br><span style="font-size:10px;">${spekTeks}</span></td>
      <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">${r.vol || ''}</td>
      <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">${r.satuan || ''}</td>
    </tr>`;
  });
  // tidak ada baris kosong padding

  // Tabel B: Spesifikasi Minimal - baris
  let rowsB = '';
  const _penOccB = {};
  dataRows.forEach((r, i) => {
    const _keyB = r.itemBarang || '';
    const _occB = _penOccB[_keyB] || 0; _penOccB[_keyB] = _occB + 1;
    const _matchesB = hargaForRup.filter(h => h.namaItem === r.itemBarang);
    const hItem = _matchesB[_occB] || _matchesB[_matchesB.length - 1] || null;
    const spekTeks = hItem && hItem.namaProduk ? `Spesifikasi : ${hItem.namaProduk}` : '';
    rowsB += `<tr>
      <td style="border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:top;color:#000;">${i+1}.</td>
      <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">${r.itemBarang || ''}${spekTeks ? '<br><span style="font-size:10px;">'+spekTeks+'</span>' : ''}</td>
    </tr>`;
  });
  // tidak ada baris kosong padding

  const tingkatLayanan = `Penyedia wajib memenuhi tingkat layanan meliputi ketepatan waktu, kesesuaian spesifikasi, kualitas hasil, ketepatan jumlah, responsivitas, pengemasan dan pengiriman, jaminan/garansi, fleksibilitas layanan, kepatuhan administratif, serta standar keamanan dan kepatuhan. Penyedia juga wajib menindaklanjuti setiap ketidaksesuaian melalui perbaikan atau penggantian tanpa biaya tambahan sesuai ketentuan yang disepakati serta bertanggung jawab penuh atas pengadaan.`;

  content.innerHTML = `
    <div id="penetapan-print-area" style="background:#fff;color:#000;padding:24px 28px;width:100%;max-width:900px;min-width:auto;margin:0 auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;box-sizing:border-box;">

      <!-- KOP SURAT -->
      ${kopSurat()}

      <!-- JUDUL -->
      <div style="text-align:center;margin-bottom:18px;" class="section-block">
        <div style="font-size:14pt;font-weight:bold;text-decoration:underline;color:#000;letter-spacing:0.5px;">FORMULIR PENETAPAN BARANG/JASA E-PURCHASING</div>
        <div style="font-size:12pt;color:#000;">Nomor : ${nomorPenetapan} <button onclick="openNomorDialog(this)" data-slug="penetapan" data-rup="${paket.rup}" data-field="nomorPenetapan" data-cur="${nomorPenetapan}" title="Edit nomor dokumen" class="doc-nomor-edit" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:0.5;vertical-align:middle;line-height:1;">✏️</button></div>
      </div>

      <!-- TABEL PERUBAHAN -->
      <table style="width:100%;border-collapse:collapse;font-size:12pt;color:#000;margin-bottom:12px;" class="section-block">
        <tbody>
          <tr>
            <td style="${tdL}width:160px;">Perubahan ke</td>
            <td style="${tdC}width:12px;">:</td>
            <td style="${tdR}min-width:auto;">&nbsp;</td>
          </tr>
          <tr>
            <td style="${tdL}">Tanggal</td>
            <td style="${tdC}">:</td>
            <td style="${tdR}">${tglFormatted}</td>
          </tr>
        </tbody>
      </table>

      <!-- TABEL INFO PAKET -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:16px;border:1px solid #000;" class="section-block">
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;width:160px;vertical-align:top;color:#000;">Pemerintah Daerah</td>
            <td style="border:1px solid #000;padding:4px 6px;width:10px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${docOrg.namaInstansi}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">PA/KPA/PPK *)</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${ppk.nama}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">Program</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${fmtText(paket.program)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">Kegiatan</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${fmtText(paket.kegiatan)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">Sub Kegiatan</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${fmtText(paket.subKegiatan)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">Output</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${paket.output || '-'}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">Mata Anggaran</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${paket.kodeRekening || '-'}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">Pagu</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${paket.paguAnggaran ? Number(paket.paguAnggaran).toLocaleString('id-ID') : '-'}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">Jenis Pengadaan</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;"><span style="text-decoration:underline;font-weight:bold;">Pengadaan Barang</span></td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">Nama Paket</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${paket.namaPaket || '-'}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">Masa Pelaksanaan</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${durasi}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">Sumber Dana</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">:</td>
            <td style="border:1px solid #000;padding:4px 8px;vertical-align:top;color:#000;">${docOrg.sumberDana} ${docOrg.kabupaten} TA ${tahun}</td>
          </tr>
        </tbody>
      </table>

      <!-- SEKSI A: JENIS BARANG/JASA -->
      <table ${hideSec(!hasRincian)} style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:0;" class="section-block">
        <thead>
          <tr>
            <th class="no-col" style="border:1px solid #000;padding:5px 8px;text-align:center;background:#d9d9d9;color:#000;font-weight:bold;width:36px;">No</th>
            <th colspan="3" style="border:1px solid #000;padding:5px 8px;text-align:left;background:#d9d9d9;color:#000;font-weight:bold;">A&nbsp;&nbsp;&nbsp;Meliputi Pengadaan Barang :</th>
          </tr>
          <tr>
            <th style="border:1px solid #000;padding:5px 8px;text-align:center;background:#fff;color:#000;font-weight:bold;width:36px;"></th>
            <th style="border:1px solid #000;padding:5px 8px;text-align:center;background:#fff;color:#000;font-weight:bold;">JENIS BARANG/JASA</th>
            <th style="border:1px solid #000;padding:5px 8px;text-align:center;background:#fff;color:#000;font-weight:bold;width:80px;">QTY</th>
            <th style="border:1px solid #000;padding:5px 8px;text-align:center;background:#fff;color:#000;font-weight:bold;width:90px;">SATUAN</th>
          </tr>
        </thead>
        <tbody>
          ${rowsA}
        </tbody>
      </table>

      <!-- SEKSI B: SPESIFIKASI MINIMAL -->
      <table ${hideSec(!hasRincian)} style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:0;" class="section-block">
        <thead>
          <tr>
            <th style="border:1px solid #000;padding:5px 8px;text-align:center;background:#d9d9d9;color:#000;font-weight:bold;width:36px;">B</th>
            <th style="border:1px solid #000;padding:5px 8px;text-align:left;background:#d9d9d9;color:#000;font-weight:bold;">Spesifikasi Minimal</th>
          </tr>
        </thead>
        <tbody>
          ${rowsB}
        </tbody>
      </table>

      <!-- SEKSI C: PERSYARATAN LAIN -->
      <table ${hideSec(!hasRincian)} style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:0;table-layout:fixed;" class="section-block">
        <colgroup>
          <col style="width:36px;">
          <col style="width:auto;">
          <col style="width:40%;">
        </colgroup>
        <thead>
          <tr>
            <th colspan="3" style="border:1px solid #000;padding:5px 8px;text-align:left;background:#d9d9d9;color:#000;font-weight:bold;">C&nbsp;&nbsp;&nbsp;Persyaratan Lain Yang Diperlukan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;white-space:nowrap;color:#000;">1.</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Cara pengiriman</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Darat</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;white-space:nowrap;color:#000;">2.</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Cara pengangkutan</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Roda Dua/Roda Empat</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;white-space:nowrap;color:#000;">3.</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Cara pemasangan</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">-</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;white-space:nowrap;color:#000;">4.</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Cara penyimpanan</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Dibungkus Rapi</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;white-space:nowrap;color:#000;">5.</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Cara pengoperasian/penggunaan</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">-</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;white-space:nowrap;vertical-align:top;color:#000;">6.</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">Kebutuhan pelatihan untuk pengoperasian/pemeliharaan Barang</td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">Tidak</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;white-space:nowrap;color:#000;">7.</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Aspek pengadaan berkelanjutan</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Ya</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;white-space:nowrap;color:#000;">8.</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Metode Pemilihan</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Sekali Proses</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;text-align:center;white-space:nowrap;color:#000;">9.</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Metode Pembayaran</td>
            <td style="border:1px solid #000;padding:4px 6px;color:#000;">Sekaligus</td>
          </tr>
        </tbody>
      </table>

      <!-- SEKSI D: PENETAPAN METODE E-PURCHASING -->
      <table ${hideSec(!hasRincian)} style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:0;" class="section-block">
        <thead>
          <tr>
            <th colspan="2" style="border:1px solid #000;padding:5px 8px;text-align:left;background:#d9d9d9;color:#000;font-weight:bold;">D&nbsp;&nbsp;&nbsp;PENETAPAN METODE E-PURCHASING</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;width:50%;vertical-align:top;color:#000;">1. Penetapan Metode E-Purchasing</td>
            <td style="border:1px solid #000;padding:4px 6px;width:50%;vertical-align:top;color:#000;font-weight:bold;">Negosiasi Harga</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;">2. Dasar Pemilihan Metode E-Purchasing<br><em style="font-weight:bold;">(termasuk justifikasi memilih penyedia secara berulang)</em></td>
            <td style="border:1px solid #000;padding:4px 6px;vertical-align:top;color:#000;text-align:justify;">
              Dasar memilih Metode e-purchasing dengan Negosiasi melalui Katalog Elektronik LKPP dipilih berdasarkan pertimbangan berikut :
              <table style="width:100%;border-collapse:collapse;margin-top:6px;">
                <tr>
                  <td style="border:none;padding:2px 6px 2px 0;vertical-align:top;width:22px;color:#000;text-align:right;">a)</td>
                  <td style="border:none;padding:2px 0;color:#000;text-align:justify;"><strong>Efisiensi Waktu :</strong> E-purchasing memungkinkan proses pengadaan yang lebih cepat dibandingkan metode lain, mengurangi waktu administratif dan prosedural</td>
                </tr>
                <tr>
                  <td style="border:none;padding:2px 6px 2px 0;vertical-align:top;width:22px;color:#000;text-align:right;">b)</td>
                  <td style="border:none;padding:2px 0;color:#000;text-align:justify;"><strong>Transparansi :</strong> Harga dan spesifikasi produk sudah tercantum dalam Katalog Elektronik, meningkatkan transparansi dan mengurangi risiko mark-up harga</td>
                </tr>
                <tr>
                  <td style="border:none;padding:2px 6px 2px 0;vertical-align:top;width:22px;color:#000;text-align:right;">c)</td>
                  <td style="border:none;padding:2px 0;color:#000;text-align:justify;"><strong>Kemudahan Komparasi :</strong> Katalog Elektronik memungkinkan perbandingan langsung antara berbagai produk dan penyedia, memudahkan pemilihan opsi terbaik sesuai kebutuhan dan anggaran</td>
                </tr>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- SEKSI E: CATATAN LAINNYA -->
      <table ${hideSec(!hasRincian)} style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:0;" class="section-block">
        <thead>
          <tr>
            <th style="border:1px solid #000;padding:5px 8px;text-align:left;background:#d9d9d9;color:#000;font-weight:bold;">E&nbsp;&nbsp;&nbsp;CATATAN LAINNYA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:6px 8px;color:#000;text-align:justify;">${tingkatLayanan}</td>
          </tr>
        </tbody>
      </table>

      <!-- TANDA TANGAN -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-top:0;" class="section-block">
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:5px 8px;width:50%;vertical-align:top;color:#000;">Ditetapkan pada tanggal</td>
            <td style="border:1px solid #000;padding:5px 8px;width:50%;vertical-align:top;color:#000;">${tglFormatted}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">
              <div>Ditetapkan oleh</div>
              <div>PA/KPA/PPK</div>
              <div style="margin-top:60px;font-weight:bold;text-decoration:underline;color:#000;">${ppk.nama}</div>
              <div style="color:#000;">${ppk.nip && ppk.nip !== '-' ? 'NIP. ' + ppk.nip : ''}</div>
            </td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;text-align:left;">
              <div>Disusun oleh</div>
              <div>a.n ${kepBidang.namaJabatan || kepBidang.namaBidang || (paket.bidang || 'Bidang')}</div>
              ${kepBidang.nama
                ? `<div style="margin-top:60px;font-weight:bold;text-decoration:underline;color:#000;">${kepBidang.nama}</div>
                   <div style="color:#000;">${kepBidang.nip ? 'NIP. ' + kepBidang.nip : ''}</div>`
                : `<div style="margin-top:60px;color:#000;">&nbsp;</div>`
              }
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  `;
}

// ============================================================
//  IDKB — Formulir Identifikasi Kebutuhan Barang/Jasa
// ============================================================

function populateIdkbSelects() {
  const rupSel = document.getElementById('idkb-rup-select');
  if (rupSel) {
    const cur = rupSel.value;
    rupSel.innerHTML = '<option value="">— Pilih No RUP —</option>';
    state.paket.data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.rup;
      opt.textContent = `${p.rup} - ${strTrunc(p.namaPaket, 40)}`;
      rupSel.appendChild(opt);
    });
    rupSel.value = cur;
  }
  const ppkSel = document.getElementById('idkb-ppk-select');
  if (ppkSel) {
    const cur = ppkSel.value;
    ppkSel.innerHTML = '<option value="">— Pilih PPKom —</option>';
    const allPpk = masterState.ppk.length > 0 ? masterState.ppk : masterState.pejabatPengadaan;
    allPpk.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nama || p.namaPPK || '-';
      ppkSel.appendChild(opt);
    });
    ppkSel.value = cur;
  }
  const bidangSel = document.getElementById('idkb-bidang-select');
  if (bidangSel) {
    const cur = bidangSel.value;
    bidangSel.innerHTML = '<option value="">— Pilih Kepala Bidang —</option>';
    masterState.bidang.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.kepalaBidang || '-'} (${strTrunc(b.namaBidang || '', 30)})`;
      bidangSel.appendChild(opt);
    });
    bidangSel.value = cur;
  }
}

function loadIdkbData() {
  const rup      = document.getElementById('idkb-rup-select').value;
  const ppkId    = document.getElementById('idkb-ppk-select').value;
  const bidangId = document.getElementById('idkb-bidang-select').value;
  const content  = document.getElementById('idkb-content');

  if (!rup) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🪪</div>
        <div class="empty-title" style="font-family:'Plus Jakarta Sans',sans-serif;">Pilih No RUP</div>
        <div class="empty-sub" style="font-family:'Plus Jakarta Sans',sans-serif;">Pilih PPKom, Kepala Bidang, dan No RUP untuk menampilkan Formulir Identifikasi Kebutuhan Barang/Jasa</div>
      </div>`;
    return;
  }

  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Data tidak ditemukan</div></div>`;
    return;
  }

  // PPK
  let ppk = { nama: 'NAMA PPK', nip: '-', jabatan: 'PA/KPA/PPK' };
  if (ppkId) {
    const allPpk = [...masterState.ppk, ...masterState.pejabatPengadaan];
    const found = allPpk.find(p => String(p.id) === String(ppkId));
    if (found) ppk = { nama: found.nama || found.namaPPK || '-', nip: found.nip || found.nipPPK || '-', jabatan: found.jabatan || 'PA/KPA/PPK' };
  }

  // Kepala Bidang
  let kepBidang = { nama: '', nip: '', namaBidang: paket.bidang || '', namaJabatan: '' };
  if (bidangId) {
    const found = masterState.bidang.find(b => String(b.id) === String(bidangId));
    if (found) kepBidang = { nama: found.kepalaBidang || '', nip: found.nip || '', namaBidang: found.namaBidang || '', namaJabatan: found.kodeSurat || '' };
  } else if (paket.bidang) {
    const auto = masterState.bidang.find(b => b.namaBidang === paket.bidang);
    if (auto) kepBidang = { nama: auto.kepalaBidang || '', nip: auto.nip || '', namaBidang: auto.namaBidang || '', namaJabatan: auto.kodeSurat || '' };
  }

  const rincianForRup = state.rincian.data.filter(r => String(r.rup) === String(rup));
  const hargaForRup   = state.harga.data.filter(h => String(h.rup) === String(rup));

  // Penyedia terpilih (dari survey harga - penyedia dengan total negosiasi terendah)
  let penyediaList = [];
  if (hargaForRup.length > 0) {
    const allNames = [...new Set(hargaForRup.map(h => h.namaPenyedia).filter(Boolean))];
    // Ambil semua penyedia unik beserta linknya
    allNames.forEach(nama => {
      const h = hargaForRup.find(h2 => h2.namaPenyedia === nama && h2.linkKatalog);
      penyediaList.push({ nama, link: h ? h.linkKatalog : '' });
    });
  }
  // Jika tidak ada dari harga, ambil dari master penyedia
  if (penyediaList.length === 0) {
    state.penyedia.data.slice(0, 3).forEach(p => {
      penyediaList.push({ nama: p.namaPenyedia, link: p.linkToko || '' });
    });
  }

  // Tanggal — gunakan tanggalDPP jika ada, fallback ke tanggalPesanan
  const tglSrc = paket.tanggalDPP || paket.tanggalPesanan || '';
  let tglDate = tglSrc ? (() => { const p = tglSrc.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); })() : new Date();
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tglFormatted = `${tglDate.getDate()} ${namaBulan[tglDate.getMonth()]} ${tglDate.getFullYear()}`;
  const tahun = tglDate.getFullYear();

  const durasi = paket.durasi ? `${paket.durasi} ${paket.masaKerja || 'Hari Kalender'}` : '3 Hari Kalender';

  const TOTAL_ROWS = 15;
  const bdS = 'border:1px solid #000;';
  const tdBase = `${bdS}padding:4px 6px;vertical-align:top;color:#000;font-size:11px;`;

  // --- Bagian A: Identifikasi jenis/tipe barang ---
  // a) Daftar barang
  let rowsAa = '';
  if (rincianForRup.length > 0) {
    rincianForRup.forEach((r, i) => {
      rowsAa += `<tr><td style="${tdBase}width:30px;text-align:center;">${i+1}.</td><td style="${tdBase}">${r.itemBarang || ''}</td></tr>`;
    });
    // tidak ada baris kosong padding
  } else {
    // tidak ada data — tidak tampilkan baris kosong
  }

  // b) Jumlah kebutuhan
  let rowsAb = '';
  if (rincianForRup.length > 0) {
    rincianForRup.forEach((r, i) => {
      rowsAb += `<tr>
        <td style="${tdBase}width:30px;text-align:center;">${i+1}.</td>
        <td style="${tdBase}">${r.itemBarang || ''}</td>
        <td style="${tdBase}width:30px;text-align:center;">=</td>
        <td style="${tdBase}width:70px;text-align:right;">${r.vol ? Number(r.vol).toLocaleString('id-ID') : ''}</td>
        <td style="${tdBase}width:70px;text-align:center;">${r.satuan || ''}</td>
      </tr>`;
    });
    // tidak ada baris kosong padding
  } else {
    // tidak ada data — tidak tampilkan baris kosong
  }

  // c) Waktu pemanfaatan
  const tglMulai = paket.tanggalPesanan ? (() => {
    const p = paket.tanggalPesanan.split('-');
    const d = new Date(+p[0], +p[1]-1, +p[2]);
    return namaBulan[d.getMonth()] + ' s.d Desember ' + d.getFullYear();
  })() : `Januari s.d Desember ${tahun}`;

  // --- Bagian B: Spesifikasi Teknis ---
  let rowsB = '';
  if (rincianForRup.length > 0) {
    rincianForRup.forEach((r, i) => {
      const hItem = hargaForRup.find(h => h.namaItem === r.itemBarang);
      const spek = hItem && hItem.namaProduk ? `Spesifikasi : ${hItem.namaProduk}` : '';
      rowsB += `<tr><td style="${tdBase}width:30px;text-align:center;">${i+1}.</td><td style="${tdBase}">${r.itemBarang || ''}${spek ? '<br><span style="font-size:10px;">'+spek+'</span>' : ''}</td></tr>`;
    });
    // tidak ada baris kosong padding
  } else {
    // tidak ada data — tidak tampilkan baris kosong
  }

  // --- Bagian C: Ketersediaan penyedia ---
  let rowsC = '';
  penyediaList.forEach((p, i) => {
    rowsC += `<tr>
      <td style="${tdBase}width:30px;text-align:center;">${i+1})</td>
      <td style="${tdBase}">${p.nama}<br>${p.link ? `<a href="${p.link}" style="color:#1f6feb;font-size:10px;">${p.link}</a>` : ''}</td>
    </tr>`;
  });
  if (penyediaList.length === 0) {
    rowsC = `<tr><td colspan="2" style="${tdBase}font-style:italic;color:#666;">Belum ada data penyedia</td></tr>`;
  }

  // Tabel F (tanda tangan)
  const tglIdkb = `22 Februari ${tahun}`; // gunakan tanggalDPP jika ada
  const tglIdkbReal = paket.tanggalDPP ? (() => {
    const p = paket.tanggalDPP.split('-');
    const d = new Date(+p[0], +p[1]-1, +p[2]);
    return `${d.getDate()} ${namaBulan[d.getMonth()]} ${d.getFullYear()}`;
  })() : tglFormatted;
  const docOrg = getDocOrg(paket);
  const nomorIdkbDefault = `IDKB/${paket.rup || '...'}/${docOrg.singkatan}/${tahun}`;
  const nomorIdkb = getDefaultDocNumber(paket.nomorIdkb, nomorIdkbDefault, docOrg.singkatan);

  content.innerHTML = `
    <div id="idkb-print-area" style="background:#fff;color:#000;padding:24px 28px;width:100%;max-width:900px;min-width:auto;margin:0 auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;box-sizing:border-box;">

      <!-- KOP SURAT -->
      ${kopSurat()}

      <!-- JUDUL -->
      <div style="text-align:center;margin-bottom:18px;" class="section-block">
        <div style="font-size:14pt;font-weight:bold;text-decoration:underline;color:#000;letter-spacing:0.5px;">FORMULIR IDENTIFIKASI KEBUTUHAN BARANG/JASA</div>
        <div style="font-size:12pt;color:#000;">Nomor : ${nomorIdkb} <button onclick="openNomorDialog(this)" data-slug="idkb" data-rup="${paket.rup}" data-field="nomorIdkb" data-cur="${nomorIdkb}" title="Edit nomor dokumen" class="doc-nomor-edit" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:0.5;vertical-align:middle;line-height:1;">✏️</button></div>
      </div>

      <!-- TABEL INFO PAKET -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:16px;" class="section-block">
        <colgroup><col style="width:160px;"><col style="width:14px;"><col></colgroup>
        <tbody>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">Pemerintah</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;">Pemerintah ${docOrg.kabupaten}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">PA/KPA/PPK *)</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;">${ppk.nama}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">Program</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;">${fmtText(paket.program)}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">Kegiatan</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;">${fmtText(paket.kegiatan)}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">Sub Kegiatan</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;">${fmtText(paket.subKegiatan)}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">Output</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;">${paket.output || '-'}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">Nama Paket</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;">${paket.namaPaket || '-'}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">Pagu</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;">Rp${paket.paguAnggaran ? Number(paket.paguAnggaran).toLocaleString('id-ID') : '-'}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">Mata Anggaran</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;">${paket.kodeRekening || '-'}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">Jenis Pengadaan</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;font-weight:bold;text-decoration:underline;">Pengadaan Barang</td>
          </tr>
          <tr>
            <td style="padding:2px 0;border:none;color:#000;">Sumber Dana</td>
            <td style="padding:2px 6px;border:none;color:#000;">:</td>
            <td style="padding:2px 0;border:none;color:#000;">${docOrg.sumberDana} ${docOrg.kabupatenShort} Tahun ${tahun}</td>
          </tr>
        </tbody>
      </table>

      <!-- A. IDENTIFIKASI JENIS/TIPE BARANG/JASA -->
      <div style="font-weight:bold;color:#000;margin-bottom:6px;" class="section-block">A.&nbsp;&nbsp;&nbsp;Identifikasi Jenis/Tipe Barang/Jasa</div>

      <!-- a) Identifikasi barang -->
      <div style="color:#000;margin-bottom:4px;margin-left:14px;">a)&nbsp;&nbsp;Identifikasi barang/jasa yang dibutuhkan :</div>
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:10px;" class="section-block">
        <tbody>
          ${rowsAa}
        </tbody>
      </table>

      <!-- b) Jumlah Kebutuhan -->
      <div style="color:#000;margin-bottom:4px;margin-left:14px;">b)&nbsp;&nbsp;Jumlah Kebutuhan barang/jasa :</div>
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:10px;" class="section-block">
        <tbody>
          ${rowsAb}
        </tbody>
      </table>

      <!-- c) Waktu Pemanfaatan -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:4px;" class="section-block">
        <tbody>
          <tr>
            <td style="padding:2px 0 2px 14px;border:none;color:#000;width:220px;">c)&nbsp;&nbsp;Waktu Pemanfaatan barang/jasa</td>
            <td style="padding:2px 6px;border:none;color:#000;width:14px;">=</td>
            <td style="padding:2px 0;border:none;color:#000;">${tglMulai}</td>
          </tr>
          <tr>
            <td style="padding:2px 0 2px 14px;border:none;color:#000;">d)&nbsp;&nbsp;Perkiraan Waktu (termasuk pengiriman)</td>
            <td style="padding:2px 6px;border:none;color:#000;">=</td>
            <td style="padding:2px 0;border:none;color:#000;">${durasi}</td>
          </tr>
          <tr>
            <td style="padding:2px 0 2px 14px;border:none;color:#000;">e)&nbsp;&nbsp;Terdapat di Katalog LKPP</td>
            <td style="padding:2px 6px;border:none;color:#000;">=</td>
            <td style="padding:2px 0;border:none;color:#000;">Katalog Lokal v.6</td>
          </tr>
          <tr>
            <td style="padding:2px 0 2px 14px;border:none;color:#000;">f)&nbsp;&nbsp;Perkiraan Biaya</td>
            <td style="padding:2px 6px;border:none;color:#000;">=</td>
            <td style="padding:2px 0;border:none;color:#000;">Rp${paket.paguAnggaran ? Number(paket.paguAnggaran).toLocaleString('id-ID') : '-'}</td>
          </tr>
        </tbody>
      </table>

      <!-- B. SPESIFIKASI TEKNIS MINIMAL -->
      <div style="font-weight:bold;color:#000;margin:12px 0 6px;" class="section-block">B.&nbsp;&nbsp;&nbsp;Spesifikasi Teknis Minimal Barang/Jasa</div>
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:10px;" class="section-block">
        <tbody>
          ${rowsB}
        </tbody>
      </table>

      <!-- C. KETERSEDIAAN PRODUK DAN PELAKU USAHA -->
      <div style="font-weight:bold;color:#000;margin-bottom:6px;" class="section-block">C.&nbsp;&nbsp;&nbsp;Ketersediaan Produk dan Pelaku Usaha</div>
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:10px;" class="section-block">
        <tbody>
          ${rowsC}
        </tbody>
      </table>

      <!-- E. PENENTUAN PRIORITAS -->
      <div style="font-weight:bold;color:#000;margin-bottom:4px;" class="section-block">E.&nbsp;&nbsp;&nbsp;Penentuan Prioritas Barang/Jasa</div>
      <div style="color:#000;margin-bottom:14px;margin-left:20px;">Prioritas PDN, UMKM, Lokal Kapuas Hulu</div>

      <!-- F. TANDA TANGAN -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-top:4px;" class="section-block">
        <tbody>
          <tr>
            <td style="${tdBase}width:50%;">Disusun pada tanggal</td>
            <td style="${tdBase}width:50%;">${tglIdkbReal}</td>
          </tr>
          <tr>
            <td style="${tdBase}vertical-align:top;">
              <div style="color:#000;">Ditetapkan oleh,</div>
              <div style="color:#000;">PA/KPA/PPK</div>
              <div style="color:#000;">${docOrg.namaInstansi}</div>
              <div style="margin-top:60px;font-weight:bold;text-decoration:underline;color:#000;">${ppk.nama}</div>
              <div style="color:#000;">${ppk.nip && ppk.nip !== '-' ? 'NIP. ' + ppk.nip : ''}</div>
            </td>
            <td style="${tdBase}vertical-align:top;">
              <div style="color:#000;">Disusun oleh,</div>
              <div style="color:#000;">${kepBidang.namaJabatan || kepBidang.namaBidang || (paket.bidang || 'Bidang')}</div>
              <div style="margin-top:60px;font-weight:bold;text-decoration:underline;color:#000;">${kepBidang.nama || '&nbsp;'}</div>
              <div style="color:#000;">${kepBidang.nip ? 'NIP. ' + kepBidang.nip : ''}</div>
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  `;
}

function printIdkb() {
  const printArea = document.getElementById('idkb-print-area');
  if (!printArea) {
    toast('Pilih No RUP terlebih dahulu', 'error');
    return;
  }
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Formulir Identifikasi Kebutuhan Barang/Jasa</title>
      <style>
        ${buildPageRule('idkb')}
        @media screen {
          body { max-width: 210mm; margin: 0 auto; padding: 20mm; background: #f0f0f0; }
          body > * { background: #fff; }
        }
        * { box-sizing: border-box; color: #000 !important; }
        body { margin:0; padding:0; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; line-height:1.5; }
        table { border-collapse:collapse; width:100%; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        tbody tr { page-break-inside:auto; }
        th, td { word-wrap:break-word; }
        p { margin:4px 0; orphans:3; widows:3; }
        .section-block { page-break-inside:auto; }
        a { color:#000 !important; text-decoration:none; }
        /* ── A4 layout overrides — rapikan hasil print ── */
        [id$="-print-area"] {
          padding: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          line-height: 1.45;
        }
        img { max-width: 100%; height: auto; display: block; }
        table { table-layout: fixed; width: 100% !important; }
        /* Kolom "No" tabel data – sempit, center, rapat */
        table.data-tbl th:first-child,
        table.data-tbl td:first-child,
        th.no-col, td.no-col {
          width: 34px !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        /* Header tabel selalu center */
        thead th { text-align: center !important; vertical-align: middle !important; }
        /* Hindari kolom mata uang/angka wrap aneh */
        .num, td.num { text-align: right !important; white-space: nowrap; }
        /* Sub-tabel jangan dobel border */
        td > table { border: 0 !important; }
      </style>
    </head>
    <body>${printArea.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

function printPenetapan() {
  const printArea = document.getElementById('penetapan-print-area');
  if (!printArea) {
    toast('Pilih No RUP terlebih dahulu', 'error');
    return;
  }
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Formulir Penetapan Barang/Jasa E-Purchasing</title>
      <style>
        ${buildPageRule('penetapan')}
        @media screen {
          body { max-width: 210mm; margin: 0 auto; padding: 20mm; background: #f0f0f0; }
          body > * { background: #fff; }
        }
        * { box-sizing: border-box; color: #000 !important; }
        body { margin:0; padding:0; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; line-height:1.5; }
        table { border-collapse:collapse; width:100%; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        tbody tr { page-break-inside:auto; }
        th, td { border:1px solid #000; word-wrap:break-word; }
        p { margin:4px 0; orphans:3; widows:3; }
        .section-block { page-break-inside:auto; }
        /* ── A4 layout overrides — rapikan hasil print ── */
        [id$="-print-area"] {
          padding: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          line-height: 1.45;
        }
        img { max-width: 100%; height: auto; display: block; }
        table { table-layout: fixed; width: 100% !important; }
        /* Kolom "No" tabel data – sempit, center, rapat */
        table.data-tbl th:first-child,
        table.data-tbl td:first-child,
        th.no-col, td.no-col {
          width: 34px !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        /* Header tabel selalu center */
        thead th { text-align: center !important; vertical-align: middle !important; }
        /* Hindari kolom mata uang/angka wrap aneh */
        .num, td.num { text-align: right !important; white-space: nowrap; }
        /* Sub-tabel jangan dobel border */
        td > table { border: 0 !important; }
      </style>
    </head>
    <body>${printArea.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

function printRiviu() {
  const printArea = document.getElementById('riviu-print-area');
  if (!printArea) {
    toast('Pilih No RUP terlebih dahulu', 'error');
    return;
  }
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Berita Acara Reviu DPP E-Purchasing</title>
      <style>
        ${buildPageRule('riviu')}
        @media screen {
          body { max-width: 210mm; margin: 0 auto; padding: 20mm; background: #f0f0f0; }
          body > * { background: #fff; }
        }
        * { box-sizing: border-box; color: #000 !important; }
        body { margin:0; padding:0; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; line-height:1.5; }
        table { border-collapse:collapse; width:100%; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        tbody tr { page-break-inside:auto; }
        th, td { word-wrap:break-word; }
        p { margin:3px 0; orphans:3; widows:3; }
        em { font-style:italic; }
        .section-block { page-break-inside:auto; }
        /* ── A4 layout overrides — rapikan hasil print ── */
        [id$="-print-area"] {
          padding: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          line-height: 1.45;
        }
        img { max-width: 100%; height: auto; display: block; }
        table { table-layout: fixed; width: 100% !important; }
        /* Kolom "No" tabel data – sempit, center, rapat */
        table.data-tbl th:first-child,
        table.data-tbl td:first-child,
        th.no-col, td.no-col {
          width: 34px !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        /* Header tabel selalu center */
        thead th { text-align: center !important; vertical-align: middle !important; }
        /* Hindari kolom mata uang/angka wrap aneh */
        .num, td.num { text-align: right !important; white-space: nowrap; }
        /* Sub-tabel jangan dobel border */
        td > table { border: 0 !important; }
      </style>
    </head>
    <body>${printArea.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

// ============================================================
//  NODIS — Nota Dinas Pengajuan Belanja
// ============================================================

function populateNodisSelects() {
  // RUP select
  const rupSel = document.getElementById('nodis-rup-select');
  if (rupSel) {
    const cur = rupSel.value;
    rupSel.innerHTML = '<option value="">— Pilih No RUP —</option>';
    state.paket.data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.rup;
      opt.textContent = `${p.rup} - ${strTrunc(p.namaPaket, 40)}`;
      rupSel.appendChild(opt);
    });
    rupSel.value = cur;
  }
  // PPK select
  const ppkSel = document.getElementById('nodis-pejabat-select');
  if (ppkSel) {
    const cur = ppkSel.value;
    ppkSel.innerHTML = '<option value="">— Pilih PPKom —</option>';
    const allPpk = masterState.ppk.length > 0 ? masterState.ppk : masterState.pejabatPengadaan;
    allPpk.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nama || p.namaPPK || '-';
      ppkSel.appendChild(opt);
    });
    ppkSel.value = cur;
  }
  // Kepala Bidang select
  const bidangSel = document.getElementById('nodis-bidang-select');
  if (bidangSel) {
    const cur = bidangSel.value;
    bidangSel.innerHTML = '<option value="">— Pilih Kepala Bidang —</option>';
    masterState.bidang.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.kepalaBidang || '-'} (${strTrunc(b.namaBidang || '', 30)})`;
      bidangSel.appendChild(opt);
    });
    bidangSel.value = cur;
  }
}

function loadNodisData() {
  const rup = document.getElementById('nodis-rup-select').value;
  const ppkId = document.getElementById('nodis-pejabat-select').value;
  const bidangId = document.getElementById('nodis-bidang-select').value;
  const content = document.getElementById('nodis-content');

  if (!rup) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📬</div>
        <div class="empty-title" style="font-family:'Plus Jakarta Sans',sans-serif;">Pilih No RUP</div>
        <div class="empty-sub" style="font-family:'Plus Jakarta Sans',sans-serif;">Pilih PPKom, Kepala Bidang, dan No RUP untuk menampilkan Nota Dinas Pengajuan Belanja</div>
      </div>`;
    return;
  }

  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Data tidak ditemukan</div></div>`;
    return;
  }

  // PPK / PPKom
  let ppk = { nama: 'NAMA PPK', nip: 'NIP. -' };
  if (ppkId) {
    const allPpk = [...masterState.ppk, ...masterState.pejabatPengadaan];
    const found = allPpk.find(p => String(p.id) === String(ppkId));
    if (found) ppk = { nama: found.nama || found.namaPPK || '-', nip: found.nip || found.nipPPK || '-' };
  }

  // Kepala Bidang
  let kepBidang = { nama: '', nip: '', namaBidang: paket.bidang || '', namaJabatan: '' };
  if (bidangId) {
    const found = masterState.bidang.find(b => String(b.id) === String(bidangId));
    if (found) kepBidang = { nama: found.kepalaBidang || '', nip: found.nip || '', namaBidang: found.namaBidang || '', namaJabatan: found.kodeSurat || '' };
  } else if (paket.bidang) {
    const auto = masterState.bidang.find(b => b.namaBidang === paket.bidang);
    if (auto) kepBidang = { nama: auto.kepalaBidang || '', nip: auto.nip || '', namaBidang: auto.namaBidang || '', namaJabatan: auto.kodeSurat || '' };
  }

  // Data rincian (item barang) untuk RUP ini
  const rincianForRup = state.rincian.data.filter(r => String(r.rup) === String(rup));
  const hargaForRup = state.harga.data.filter(h => String(h.rup) === String(rup));

  // Tanggal (dari tanggalPesanan paket)
  const tglSrc = paket.tanggalPesanan || '';
  let tglDate;
  if (tglSrc) {
    const parts = tglSrc.split('-');
    tglDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    tglDate = new Date();
  }
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tglFormatted = `${tglDate.getDate()} ${namaBulan[tglDate.getMonth()]} ${tglDate.getFullYear()}`;
  const docOrg = getDocOrg(paket);

  // Nomor nodis dari RUP atau paket
  const nomorNodisDefault = `NODIS/${paket.rup}/${docOrg.singkatan}/${tglDate.getFullYear()}`;
  const nomorNodis = getDefaultDocNumber(paket.nomorNodis, nomorNodisDefault, docOrg.singkatan);

  // Kepala bidang
  const kepalaBidang = paket.kepalaBidang || '-';
  const nipKepalaBidang = paket.nip || '-';
  const bidang = paket.bidang || 'Bidang Perencanaan Pengendalian dan Evaluasi Daerah';

  // Hitung total pagu
  const totalPagu = paket.paguAnggaran ? Number(paket.paguAnggaran) : 0;

  // Bangun baris item rincian untuk tabel nodis
  const TOTAL_ROWS = 0; // tidak ada baris kosong padding
  let itemRows = '';
  const numRincian = rincianForRup.length;
  const hasRincian = numRincian > 0;
  const hasHarga   = hargaForRup.length > 0;
  const hideSec    = (hide) => hide ? 'style="display:none"' : '';

  if (numRincian > 0) {
    rincianForRup.forEach((r, idx) => {
      const hargaItem = hargaForRup.find(h => h.namaItem === r.itemBarang || h.namaProduk === r.itemBarang);
      const spek = hargaItem && hargaItem.namaProduk ? hargaItem.namaProduk : (r.spesifikasi || '');
      const qty = r.vol || '';
      const satuan = r.satuan || '';
      const hargaSatuan = r.hargaSatuan ? Number(r.hargaSatuan) : 0;
      const jumlah = qty && hargaSatuan ? qty * hargaSatuan : 0;
      const hargaSatuanFmt = hargaSatuan ? `Rp${Number(hargaSatuan).toLocaleString('id-ID')}` : '';
      const jumlahFmt = jumlah ? `Rp${jumlah.toLocaleString('id-ID')}` : '';
      itemRows += `
        <tr>
          <td style="border:1px solid #000;padding:6px 8px;text-align:center;vertical-align:top;color:#000;">${idx + 1}</td>
          <td style="border:1px solid #000;padding:6px 8px;vertical-align:top;color:#000;">
            ${r.itemBarang || ''}${spek ? `<br><span style="font-size:10px;color:#333;">Spesifikasi : ${spek}</span>` : ''}
          </td>
          <td style="border:1px solid #000;padding:6px 8px;text-align:center;vertical-align:top;color:#000;">${qty}</td>
          <td style="border:1px solid #000;padding:6px 8px;text-align:center;vertical-align:top;color:#000;">${satuan}</td>
          <td style="border:1px solid #000;padding:6px 8px;text-align:right;vertical-align:top;color:#000;">${hargaSatuanFmt}</td>
          <td style="border:1px solid #000;padding:6px 8px;text-align:right;vertical-align:top;color:#000;">${jumlahFmt}</td>
        </tr>`;
    });
    // Tidak ada baris kosong padding
  } else {
    // Tidak ada data — tidak tampilkan baris kosong
  }

  // Build HTML dokumen Nodis
  content.innerHTML = `
    <div id="nodis-print-area" style="background:#fff;color:#000;padding:24px 28px;width:100%;max-width:900px;min-width:auto;margin:0 auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.6;box-sizing:border-box;">

      <!-- KOP SURAT -->
      ${kopSurat()}

      <!-- HEADER NOTA DINAS -->
      <table style="width:100%;border-collapse:collapse;font-size:12pt;color:#000;margin-bottom:18px;" class="section-block">
        <colgroup><col style="width:80px;"><col style="width:10px;"><col style="width:auto;"></colgroup>
        <tbody>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Yth.</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">Pejabat Pembuat Komitmen (PPK)</td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Dari</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">${bidang}</td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Tanggal</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">${tglFormatted}</td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Nomor</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">${nomorNodis} <button onclick="openNomorDialog(this)" data-slug="nodis" data-rup="${paket.rup}" data-field="nomorNodis" data-cur="${nomorNodis}" title="Edit nomor dokumen" class="doc-nomor-edit" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:0.5;vertical-align:middle;line-height:1;">✏️</button></td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Sifat</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">Biasa</td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Lampiran</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">1 (satu) lampiran</td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Perihal</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">Biasa</td>
          </tr>
        </tbody>
      </table>

      <!-- KALIMAT PEMBUKA -->
      <p style="margin:0 0 14px 0;color:#000;text-align:justify;">Terlampir disampaikan pengajuan dengan rincian sebagian berikut :</p>

      <!-- TABEL INFO PAKET -->
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;margin-bottom:0;border:1px solid #000;" class="section-block">
        <colgroup><col style="width:28px;"><col style="width:160px;"><col style="width:auto;"></colgroup>
        <tbody>
          <tr>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;text-align:center;">1.</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">Nama Program</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">${fmtText(paket.program)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;text-align:center;">2.</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">Nama Kegiatan</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">${fmtText(paket.kegiatan)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;text-align:center;">3.</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">Nama Sub Kegiatan</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">${fmtText(paket.subKegiatan)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;text-align:center;">4.</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">Nama Paket</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">${paket.namaPaket || '-'}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;text-align:center;">5.</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">Pagu Anggaran</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">${fmtRp(paket.paguAnggaran)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;text-align:center;">6.</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">Kode Rekening Belanja</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;">${paket.kodeRekening || '-'}</td>
          </tr>
          <tr ${hideSec(!hasRincian)}>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;text-align:center;">7.</td>
            <td style="border:1px solid #000;padding:5px 8px;vertical-align:top;color:#000;" colspan="2">Rincian Belanja :
              <!-- SUB TABEL RINCIAN BELANJA -->
              <table style="width:100%;border-collapse:collapse;font-size:10pt;color:#000;margin-top:8px;">
                <colgroup>
                  <col style="width:42px;">
                  <col style="width:auto;">
                  <col style="width:55px;">
                  <col style="width:65px;">
                  <col style="width:95px;">
                  <col style="width:110px;">
                </colgroup>
                <thead>
                  <tr>
                    <th class="no-col" style="border:1px solid #000;padding:6px 8px;text-align:center;background:#fff;color:#000;font-weight:bold;white-space:nowrap;">No</th>
                    <th style="border:1px solid #000;padding:6px 8px;text-align:center;background:#fff;color:#000;font-weight:bold;">Item Barang dan Spek Minimal</th>
                    <th style="border:1px solid #000;padding:6px 8px;text-align:center;background:#fff;color:#000;font-weight:bold;">Qty</th>
                    <th style="border:1px solid #000;padding:6px 8px;text-align:center;background:#fff;color:#000;font-weight:bold;">Satuan</th>
                    <th style="border:1px solid #000;padding:6px 8px;text-align:center;background:#fff;color:#000;font-weight:bold;">Harga Satuan (Rp)</th>
                    <th style="border:1px solid #000;padding:6px 8px;text-align:center;background:#fff;color:#000;font-weight:bold;">Jumlah (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- KALIMAT PENUTUP -->
      <p style="margin:20px 0 0 0;color:#000;text-align:justify;">Demikian disampaikan untuk dapat dipergunakan sebagaimana mestinya.</p>

      <!-- TANDA TANGAN -->
      <div class="section-block" style="display:flex;justify-content:space-between;margin-top:32px;align-items:flex-end;">
        <div style="text-align:left;width:45%;color:#000;display:flex;flex-direction:column;">
            <div>
              <div style="color:#000;">Mengetahui,</div>
              <div style="color:#000;">Pejabat Pembuat Komitmen (PPKom)</div>
            <div style="color:#000;">${docOrg.namaInstansi}</div>
          </div>
          <div style="margin-top:60px;">
            <div style="font-weight:bold;text-decoration:underline;color:#000;">${ppk.nama}</div>
            <div style="color:#000;">${ppk.nip && ppk.nip !== 'NIP. -' ? (ppk.nip.startsWith('NIP') ? ppk.nip : 'NIP. ' + ppk.nip) : ''}</div>
          </div>
        </div>
        <div style="text-align:left;width:45%;color:#000;display:flex;flex-direction:column;">
          <div>
            <div style="color:#000;">a.n &nbsp;&nbsp;${kepBidang.namaBidang || bidang}</div>
            <div style="margin-top:8px;color:#000;">${kepBidang.namaJabatan || 'Kepala Bidang'}</div>
          </div>
          <div style="margin-top:60px;">
            <div style="font-weight:bold;text-decoration:underline;color:#000;">${kepBidang.nama || kepalaBidang}</div>
            <div style="color:#000;">${(kepBidang.nip || nipKepalaBidang) !== '-' ? ((kepBidang.nip || nipKepalaBidang).startsWith('NIP') ? (kepBidang.nip || nipKepalaBidang) : 'NIP. ' + (kepBidang.nip || nipKepalaBidang)) : ''}</div>
          </div>
        </div>
      </div>

    </div>
  `;
}

// ============================================================
//  SPPBJ — Surat Perintah Pengadaan Barang/Jasa
// ============================================================

function populateSppbjSelects() {
  // RUP select
  const rupSel = document.getElementById('sppbj-rup-select');
  if (rupSel) {
    const cur = rupSel.value;
    rupSel.innerHTML = '<option value="">— Pilih No RUP —</option>';
    state.paket.data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.rup;
      opt.textContent = `${p.rup} - ${strTrunc(p.namaPaket, 40)}`;
      rupSel.appendChild(opt);
    });
    rupSel.value = cur;
  }
  // PPKom select
  const ppkSel = document.getElementById('sppbj-ppk-select') || document.getElementById('sppbj-pejabat-select');
  if (ppkSel) {
    const cur = ppkSel.value;
    ppkSel.innerHTML = '<option value="">— Pilih PPKom —</option>';
    const allPpk = masterState.ppk.length > 0 ? masterState.ppk : masterState.pejabatPengadaan;
    allPpk.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nama || p.namaPPK || '-';
      ppkSel.appendChild(opt);
    });
    ppkSel.value = cur;
  }

  if (rupSel?.value) setTimeout(loadSppbjData, 0);
}

if (typeof _sppbjRenderTimer === 'undefined') var _sppbjRenderTimer = null;
function scheduleLoadSppbjData() {
  clearTimeout(_sppbjRenderTimer);
  _sppbjRenderTimer = setTimeout(loadSppbjData, 30);
}

function loadSppbjData() {
  const rupEl = document.getElementById('sppbj-rup-select');
  const ppkEl = document.getElementById('sppbj-ppk-select') || document.getElementById('sppbj-pejabat-select');
  const content = document.getElementById('sppbj-content');
  if (!rupEl || !content) return;

  const rup   = rupEl.value;
  const ppkId = ppkEl ? ppkEl.value : '';

  if (!rup) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📨</div>
        <div class="empty-title" style="font-family:'Plus Jakarta Sans',sans-serif;">Pilih No RUP</div>
        <div class="empty-sub" style="font-family:'Plus Jakarta Sans',sans-serif;">Pilih PPKom dan No RUP untuk menampilkan Surat Perintah Pengadaan Barang/Jasa</div>
      </div>`;
    return;
  }

  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Data tidak ditemukan</div></div>`;
    return;
  }

  // PPKom
  let ppk = { nama: 'NAMA PPKom', nip: 'NIP. -', ttd: '', cap: '', ttdSizeW:120, ttdSizeH:55, capSizeW:80, capSizeH:80 };
  if (ppkId) {
    const allPpk = [...masterState.ppk, ...masterState.pejabatPengadaan];
    const found = allPpk.find(p => String(p.id) === String(ppkId));
    if (found) ppk = { nama: found.nama || found.namaPPK || '-', nip: found.nip || found.nipPPK || '-', ttd: found.ttd||'', cap: found.cap||'', ttdSizeW: found.ttdSizeW||120, ttdSizeH: found.ttdSizeH||55, capSizeW: found.capSizeW||80, capSizeH: found.capSizeH||80 };
  }

  // Tanggal
  const tglSrc = paket.tanggalPesanan || '';
  let tglDate;
  if (tglSrc) {
    const parts = tglSrc.split('-');
    tglDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    tglDate = new Date();
  }
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tglFormatted = `${tglDate.getDate()} ${namaBulan[tglDate.getMonth()]} ${tglDate.getFullYear()}`;
  const docOrg = getDocOrg(paket);
  const tahun = paket.tahunAnggaran || docOrg.tahunAnggaran || tglDate.getFullYear();
  const namaInstansi = docOrg.namaInstansi;
  const singkatan    = docOrg.singkatan;
  const kabupaten    = docOrg.kabupaten;
  const kotaKab      = docOrg.kabupatenShort || 'Putussibau';

  // Nomor surat
  const nomorSppbjDefault = `${paket.rup || '...'}/${singkatan}/${tglDate.getFullYear()}`;
  const nomorSppbj = getDefaultDocNumber(paket.nomorSppbj, nomorSppbjDefault, singkatan);

  // TTD/Cap
  const mode = (window._ttdMode && window._ttdMode['sppbj']) || {ttd:false, cap:false};
  const showTtd = mode.ttd && ppk.ttd;
  const showCap = mode.cap && ppk.cap;
  const L = (window._ttdLayout && window._ttdLayout['sppbj']) || {};
  const T = L.ttd || {x:0,y:0,w:120,h:55,r:0,o:100};
  const C = L.cap || {x:80,y:-20,w:80,h:80,r:0,o:85};

  content.innerHTML = `
    <div id="sppbj-print-area" style="background:#fff;color:#000;padding:24px 28px;width:100%;max-width:900px;min-width:auto;margin:0 auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.6;box-sizing:border-box;">

      <!-- KOP SURAT -->
      ${kopSurat()}

      <!-- HEADER SURAT -->
      <table style="width:100%;border-collapse:collapse;font-size:12pt;color:#000;margin-bottom:18px;" class="section-block">
        <colgroup><col style="width:90px;"><col style="width:10px;"><col style="width:auto;"></colgroup>
        <tbody>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Nomor</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">${nomorSppbj} <button onclick="openNomorDialog(this)" data-slug="sppbj" data-rup="${paket.rup}" data-field="nomorSppbj" data-cur="${nomorSppbj}" title="Edit nomor dokumen" class="doc-nomor-edit" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:0.5;vertical-align:middle;line-height:1;">✏️</button></td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Sifat</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">Biasa</td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Lampiran</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">1 (satu) rangkap</td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Perihal</td>
            <td style="padding:2px 6px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;font-weight:bold;">Perintah Pengadaan Barang &amp; Jasa</td>
          </tr>
        </tbody>
      </table>

      <!-- TUJUAN SURAT -->
      <table style="width:100%;border-collapse:collapse;font-size:12pt;color:#000;margin-bottom:18px;" class="section-block">
        <colgroup><col style="width:90px;"><col style="width:auto;"></colgroup>
        <tbody>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;">Yth.</td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">Pejabat Pengadaan pada ${namaInstansi}</td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;"></td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">di -</td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;vertical-align:top;color:#000;border:none;"></td>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;"><span style="text-decoration:underline;">${kotaKab}</span></td>
          </tr>
        </tbody>
      </table>

      <!-- ISI SURAT -->
      <p style="margin:0 0 12px 0;color:#000;text-align:justify;">Sehubungan dengan akan dilaksanakannya kegiatan pengadaan barang/jasa di lingkungan ${namaInstansi} ${kabupaten} Tahun Anggaran ${tahun} melalui E-Purchasing, maka dengan ini disampaikan untuk segera melakukan proses kegiatan dimaksud sebagai dasar pelaksanaan dan berikut lampiran:</p>

      <table style="width:100%;border-collapse:collapse;font-size:12pt;color:#000;margin-bottom:12px;" class="section-block">
        <colgroup><col style="width:30px;"><col style="width:auto;"></colgroup>
        <tbody>
          <tr>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">1.</td>
            <td style="padding:2px 0 2px 8px;vertical-align:top;color:#000;border:none;">Spesifikasi Teknis Barang/Jasa;</td>
          </tr>
          <tr>
            <td style="padding:2px 0;vertical-align:top;color:#000;border:none;">2.</td>
            <td style="padding:2px 0 2px 8px;vertical-align:top;color:#000;border:none;">Dokumen Persiapan Pengadaan Barang/Jasa.</td>
          </tr>
        </tbody>
      </table>

      <p style="margin:0 0 12px 0;color:#000;text-align:justify;">Dalam melakukan proses kegiatan tersebut harus berpedoman pada peraturan perundang-undangan yang berlaku dengan tetap memperhatikan batasan waktu yang tersedia.</p>

      <p style="margin:0 0 20px 0;color:#000;text-align:justify;">Demikian disampaikan untuk dapat dipergunakan sebagaimana mestinya.</p>

      <!-- TANDA TANGAN -->
      <div class="section-block" style="display:flex;justify-content:flex-end;margin-top:8px;">
        <div style="text-align:left;width:320px;color:#000;">
          <div style="color:#000;">${kotaKab}, &nbsp;${tglFormatted}</div>
          <div style="font-weight:bold;color:#000;">Pejabat Pembuat Komitmen (PPKom)</div>
          <div style="color:#000;">${namaInstansi}</div>
          <div style="position:relative;height:70px;margin-top:4px;background:transparent;overflow:visible;">
            ${showTtd ? `<img id="doc-ttd-img-sppbj" src="${ppk.ttd}"
              style="position:absolute;left:0;top:0;width:${T.w}px;height:${T.h}px;object-fit:contain;
              background:transparent;
              transform:translate(${T.x}px,${T.y}px) rotate(${T.r}deg);opacity:${T.o/100};
              cursor:grab;user-select:none;z-index:2;"
              draggable="false"
              title="Drag untuk pindah posisi TTD">` : ''}
            ${showCap ? `<img id="doc-cap-img-sppbj" src="${ppk.cap}"
              style="position:absolute;left:0;top:0;width:${C.w}px;height:${C.h}px;object-fit:contain;
              background:transparent;
              transform:translate(${C.x}px,${C.y}px) rotate(${C.r}deg);opacity:${C.o/100};
              cursor:grab;user-select:none;z-index:3;"
              draggable="false"
              title="Drag untuk pindah posisi Cap">` : ''}
          </div>
          <div style="font-weight:bold;text-decoration:underline;color:#000;">${ppk.nama}</div>
          <div style="color:#000;">${ppk.nip && ppk.nip !== 'NIP. -' ? (ppk.nip.startsWith('NIP') ? ppk.nip : 'NIP. ' + ppk.nip) : ''}</div>
        </div>
      </div>

    </div>
  `;
  // Pasang drag handler setelah render
  setTimeout(() => {
    makeDraggableTtd('doc-ttd-img-sppbj', 'sppbj', 'ttd');
    makeDraggableTtd('doc-cap-img-sppbj', 'sppbj', 'cap');
  }, 50);
}

function printSppbj() {
  const printArea = document.getElementById('sppbj-print-area');
  if (!printArea) {
    toast('Pilih No RUP terlebih dahulu', 'error');
    return;
  }
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Surat Perintah Pengadaan Barang/Jasa</title>
      <style>
        ${buildPageRule('sppbj')}
        @media screen {
          body { max-width: 210mm; margin: 0 auto; padding: 20mm; background: #f0f0f0; }
          body > * { background: #fff; }
        }
        * { box-sizing: border-box; color: #000 !important; }
        body { margin:0; padding:0; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; line-height:1.6; }
        table { border-collapse:collapse; width:100%; table-layout:fixed; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        tbody tr { page-break-inside:auto; }
        th, td { word-wrap:break-word; }
        p { margin:4px 0; orphans:3; widows:3; }
        .section-block { page-break-inside:auto; }
        [id$="-print-area"] { padding:0!important; max-width:100%!important; width:100%!important; margin:0!important; box-shadow:none!important; border-radius:0!important; background:#fff!important; line-height:1.45; }
        img { max-width:100%; height:auto; display:block; }
        .doc-nomor-edit { display:none!important; }
      </style>
    </head>
    <body>${printArea.innerHTML}</body>
    </html>`);
  printWindow.document.close();
  setTimeout(() => { printWindow.focus(); printWindow.print(); }, 400);
}

function printNodis() {
  const printArea = document.getElementById('nodis-print-area');
  if (!printArea) {
    toast('Pilih No RUP terlebih dahulu', 'error');
    return;
  }
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Nota Dinas Pengajuan Belanja</title>
      <style>
        ${buildPageRule('nodis')}
        @media screen {
          body { max-width: 210mm; margin: 0 auto; padding: 20mm; background: #f0f0f0; }
          body > * { background: #fff; }
        }
        * { box-sizing: border-box; color: #000 !important; }
        body { margin:0; padding:0; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; line-height:1.6; }
        table { border-collapse:collapse; width:100%; table-layout:fixed; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        tbody tr { page-break-inside:auto; }
        th, td { border:1px solid #000; word-wrap:break-word; }
        p { margin:4px 0; orphans:3; widows:3; }
        .section-block { page-break-inside:auto; }
        /* ── A4 layout overrides — rapikan hasil print ── */
        [id$="-print-area"] {
          padding: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          line-height: 1.45;
        }
        img { max-width: 100%; height: auto; display: block; }
        table { table-layout: fixed; width: 100% !important; }
        /* Kolom "No" tabel data – sempit, center, rapat */
        table.data-tbl th:first-child,
        table.data-tbl td:first-child,
        th.no-col, td.no-col {
          width: 34px !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        /* Header tabel selalu center */
        thead th { text-align: center !important; vertical-align: middle !important; }
        /* Hindari kolom mata uang/angka wrap aneh */
        .num, td.num { text-align: right !important; white-space: nowrap; }
        /* Sub-tabel jangan dobel border */
        td > table { border: 0 !important; }
      </style>
    </head>
    <body>${printArea.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

function printFormSpek() {
  const printArea = document.getElementById('formspek-print-area');
  if (!printArea) {
    toast('Pilih No RUP terlebih dahulu', 'error');
    return;
  }
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Spesifikasi Teknis Paket E-Purchasing</title>
      <style>
        ${buildPageRule('formspek')}
        @media screen {
          body { max-width: 210mm; margin: 0 auto; padding: 20mm; background: #f0f0f0; }
          body > * { background: #fff; }
        }
        * { box-sizing: border-box; color: #000 !important; }
        body { margin:0; padding:0; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        table { border-collapse:collapse; width:100%; table-layout:fixed; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        tbody tr { page-break-inside:auto; }
        th, td { border:1px solid #000; word-wrap:break-word; }
        p { margin:4px 0; orphans:3; widows:3; }
        .section-block { page-break-inside:auto; }
        a { color:#0000EE !important; }
        /* ── A4 layout overrides — rapikan hasil print ── */
        [id$="-print-area"] {
          padding: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          line-height: 1.45;
        }
        img { max-width: 100%; height: auto; display: block; }
        table { table-layout: fixed; width: 100% !important; }
        /* Kolom "No" tabel data – sempit, center, rapat */
        table.data-tbl th:first-child,
        table.data-tbl td:first-child,
        th.no-col, td.no-col {
          width: 34px !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        /* Header tabel selalu center */
        thead th { text-align: center !important; vertical-align: middle !important; }
        /* Hindari kolom mata uang/angka wrap aneh */
        .num, td.num { text-align: right !important; white-space: nowrap; }
        /* Sub-tabel jangan dobel border */
        td > table { border: 0 !important; }
      </style>
    </head>
    <body>${printArea.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}


// ============================================================
//  FORM DPP FUNCTIONS - Dokumen Persiapan Pengadaan E-Purchasing
// ============================================================
function populateFormDppSelects() {
  const rupSel = document.getElementById('formdpp-rup-select');
  if (rupSel) {
    const cur = rupSel.value;
    rupSel.innerHTML = '<option value="">-- Pilih No RUP --</option>';
    state.paket.data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.rup;
      opt.textContent = `${p.rup} - ${strTrunc(p.namaPaket, 40)}`;
      rupSel.appendChild(opt);
    });
    rupSel.value = cur;
  }
  const ppkSel = document.getElementById('formdpp-pejabat-select');
  if (ppkSel) {
    const cur = ppkSel.value;
    ppkSel.innerHTML = '<option value="">-- Pilih PPK --</option>';
    const allPpk = masterState.ppk.length > 0 ? masterState.ppk : masterState.pejabatPengadaan;
    allPpk.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nama || p.namaPPK || '-';
      ppkSel.appendChild(opt);
    });
    ppkSel.value = cur;
  }
}

function loadFormDppData() {
  const rup     = document.getElementById('formdpp-rup-select').value;
  const ppkId   = document.getElementById('formdpp-pejabat-select').value;
  const content = document.getElementById('formdpp-content');

  if (!rup) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧮</div>
        <div class="empty-title">Pilih No RUP</div>
        <div class="empty-sub">Pilih nomor RUP di atas untuk menampilkan Dokumen Persiapan Pengadaan (DPP)</div>
      </div>`;
    return;
  }

  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Data tidak ditemukan</div></div>`;
    return;
  }

  let ppk = { nama: 'NAMA PPK', nip: '-', jabatan: 'PA/KPA/PPK', ttd: '', cap: '', ttdSizeW:120, ttdSizeH:55, capSizeW:80, capSizeH:80 };
  if (ppkId) {
    const allPpk = [...masterState.ppk, ...masterState.pejabatPengadaan];
    const found  = allPpk.find(p => String(p.id) === String(ppkId));
    if (found) ppk = { nama: found.nama||found.namaPPK||'-', nip: found.nip||found.nipPPK||'-', jabatan: found.jabatan||'PA/KPA/PPK', ttd: found.ttd||'', cap: found.cap||'', ttdSizeW: found.ttdSizeW||120, ttdSizeH: found.ttdSizeH||55, capSizeW: found.capSizeW||80, capSizeH: found.capSizeH||80 };
  }

  const rincianForRup = state.rincian.data.filter(r => String(r.rup) === String(rup));
  const hargaForRup   = state.harga.data.filter(h => String(h.rup) === String(rup));

  // Tanggal dari tanggalDPP, fallback tanggalPesanan
  const tglSrc = paket.tanggalDPP || paket.tanggalPesanan || '';
  let tglDate;
  if (tglSrc) {
    const parts = tglSrc.split('-');
    tglDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    tglDate = new Date();
  }

  // Tanggal selesai
  const tglSelesaiSrc = paket.tanggalSelesai || '';
  let tglSelesaiFormatted = '';
  const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  if (tglSelesaiSrc) {
    const p2 = tglSelesaiSrc.split('-');
    const d2 = new Date(Number(p2[0]), Number(p2[1]) - 1, Number(p2[2]));
    tglSelesaiFormatted = `${d2.getDate()} ${namaBulan[d2.getMonth()]} ${d2.getFullYear()}`;
  }

  const tglFormatted = `${tglDate.getDate()} ${namaBulan[tglDate.getMonth()]} ${tglDate.getFullYear()}`;
  const tahun = tglDate.getFullYear();
  const docOrg = getDocOrg(paket);
  const noDPPDefault = paket.rup ? `DPP/${paket.rup}/${docOrg.singkatan}/${tahun}` : `DPP/-/${docOrg.singkatan}/${tahun}`;
  const noDPP = getDefaultDocNumber(paket.nomorFormdpp, noDPPDefault, docOrg.singkatan);
  const durasi = paket.durasi ? `${paket.durasi} ${paket.masaKerja || 'Hari Kalender'}` : '3 Hari Kalender';
  const waktuSpek = tglSelesaiFormatted || durasi;

  // Baris tabel item
  const MIN_ROWS = 0; // tidak ada baris kosong padding
  let itemRows = '';
  let rowNum = 1;
  const hasRincian = rincianForRup.length > 0;
  const hasHarga   = hargaForRup.length > 0;
  const hideSec    = (hide) => hide ? 'style="display:none"' : '';
  if (rincianForRup.length > 0) {
    rincianForRup.forEach(r => {
      const hargaItem = hargaForRup.find(h => h.namaItem === r.itemBarang || h.namaProduk === r.itemBarang);
      const spek      = hargaItem && hargaItem.namaProduk ? `<br><span style="font-size:10px;">Spesifikasi : ${hargaItem.namaProduk}</span>` : '';
      const qty       = r.vol || '';
      const satuan    = r.satuan || '';
      const hargaSat  = r.hargaSatuan ? Number(r.hargaSatuan).toLocaleString('id-ID', {minimumFractionDigits:2}) : '';
      itemRows += `<tr>
        <td style="border:1px solid #000;padding:5px 7px;text-align:center;vertical-align:top;color:#000;">${rowNum++}.</td>
        <td style="border:1px solid #000;padding:5px 7px;vertical-align:top;color:#000;">${r.itemBarang || ''}${spek}</td>
        <td style="border:1px solid #000;padding:5px 7px;text-align:center;vertical-align:top;color:#000;">${qty}</td>
        <td style="border:1px solid #000;padding:5px 7px;text-align:center;vertical-align:top;color:#000;">${satuan}</td>
        <td style="border:1px solid #000;padding:5px 7px;text-align:right;vertical-align:top;color:#000;">${hargaSat}</td>
      </tr>`;
    });
    // Tidak ada baris kosong padding
  } else {
    // Tidak ada data — tidak tampilkan baris kosong
  }

  const tdL = 'padding:3px 6px 3px 0;vertical-align:top;color:#000;border:none;width:170px;';
  const tdC = 'padding:3px 8px;vertical-align:top;color:#000;border:none;width:10px;';
  const tdR = 'padding:3px 0;vertical-align:top;color:#000;border:none;';

  content.innerHTML = `
    <div id="formdpp-print-area" style="background:#fff;color:#000;padding:24px 28px;width:100%;max-width:900px;min-width:auto;margin:0 auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.6;box-sizing:border-box;">

      <!-- KOP SURAT -->
      ${kopSurat()}

      <!-- JUDUL -->
      <div style="text-align:center;margin-bottom:18px;" class="section-block">
        <div style="font-size:12pt;font-weight:bold;text-decoration:underline;color:#000;letter-spacing:0.3px;">DOKUMEN PERSIAPAN PENGADAAN (DPP) <em>E - PURCHASING</em></div>
        <div style="font-size:12pt;color:#000;">Nomor : ${noDPP} <button onclick="openNomorDialog(this)" data-slug="formdpp" data-rup="${paket.rup}" data-field="nomorFormdpp" data-cur="${noDPP}" title="Edit nomor dokumen" class="doc-nomor-edit" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:0.5;vertical-align:middle;line-height:1;">✏️</button></div>
      </div>

      <!-- HEADER INFO -->
      <table style="width:100%;border-collapse:collapse;font-size:12pt;color:#000;margin-bottom:18px;" class="section-block">
        <colgroup><col style="width:170px;"><col style="width:12px;"><col></colgroup>
        <tbody>
          <tr><td style="${tdL}">Tanggal</td><td style="${tdC}">:</td><td style="${tdR}">${tglFormatted}</td></tr>
          <tr><td style="${tdL}">Perangkat Daerah</td><td style="${tdC}">:</td><td style="${tdR}">${docOrg.namaInstansi}</td></tr>
          <tr><td style="${tdL}">Program</td><td style="${tdC}">:</td><td style="${tdR}">${fmtText(paket.program)}</td></tr>
          <tr><td style="${tdL}">Kegiatan</td><td style="${tdC}">:</td><td style="${tdR}">${fmtText(paket.kegiatan)}</td></tr>
          <tr><td style="${tdL}">Sub Kegiatan</td><td style="${tdC}">:</td><td style="${tdR}">${fmtText(paket.subKegiatan)}</td></tr>
          <tr><td style="${tdL}">RUP</td><td style="${tdC}">:</td><td style="${tdR}">${paket.rup || '-'}</td></tr>
          <tr><td style="${tdL}">Nama Paket Pengadaan</td><td style="${tdC}">:</td><td style="${tdR}">${paket.namaPaket || '-'}</td></tr>
          <tr><td style="${tdL}">Pagu Dana</td><td style="${tdC}">:</td><td style="${tdR}">${fmtRp(paket.paguAnggaran)}</td></tr>
          <tr><td style="${tdL}">Mata Anggaran Belanja</td><td style="${tdC}">:</td><td style="${tdR}">${paket.kodeRekening || '-'}</td></tr>
          <tr><td style="${tdL}">Sumber Dana</td><td style="${tdC}">:</td><td style="${tdR}">${docOrg.sumberDana} ${docOrg.kabupaten} TA ${tahun}</td></tr>
        </tbody>
      </table>

      <!-- I. SPESIFIKASI TEKNIS -->
      <div style="margin-bottom:14px;" class="section-block">
        <div style="font-weight:bold;color:#000;margin-bottom:6px;">I.&nbsp;&nbsp;&nbsp;Spesifikasi Teknis</div>
        <p style="text-align:justify;color:#000;margin:0 0 8px 20px;">Penyusunan spesifikasi teknis telah menguraikan hal-hal sebagai berikut antara lain :</p>
        <ol style="margin:0 0 10px 36px;padding:0;color:#000;">
          <li style="margin-bottom:3px;">Kesesuaian spesifikasi teknis dengan kebutuhan;</li>
          <li style="margin-bottom:3px;">Karakteristik : ukuran, dimensi, bentuk, bahan, warna, komposisi, dan lain-lain;</li>
          <li style="margin-bottom:3px;">Kinerja : ketahanan, efisiensi, batas pemakaian, dan lain-lain;</li>
          <li style="margin-bottom:3px;">Standar yang digunakan: SNI, JIS, ASTM, ISO, dan lain-lain;</li>
          <li style="margin-bottom:3px;">Validitas standar yang digunakan;</li>
          <li style="margin-bottom:3px;">Pengepakan dan cara pengiriman;</li>
          <li style="margin-bottom:3px;">Macam, jenis, kapasitas dan jumlah peralatan;</li>
          <li style="margin-bottom:3px;">Aspek layanan meliputi waktu penyelesaian, ketepatan pengiriman, dan responsivitas penyedia;</li>
          <li style="margin-bottom:3px;">Output atau hasil pekerjaan sesuai volume dan kualitas yang dipersyaratkan;</li>
          <li style="margin-bottom:3px;">Higienitas dan keamanan (khusus pengadaan makan minum);</li>
          <li style="margin-bottom:3px;">Kompatibilitas teknis (khusus bahan komputer);</li>
          <li style="margin-bottom:3px;">Ketentuan garansi atau penggantian atas ketidaksesuaian barang/jasa.</li>
        </ol>
        <p style="text-align:justify;color:#000;margin:0 0 10px 20px;">Spesifikasi teknis paket pengadaan/pekerjaan adalah sebagai berikut :</p>

        <!-- a. Tabel Item -->
        <div ${hideSec(!hasRincian)} style="margin-bottom:14px;margin-left:20px;" class="section-block">
      <div style="color:#000;margin-bottom:6px;">a.&nbsp;&nbsp;&nbsp;Spesifikasi Jenis, Mutu Barang/Bahan/Material, Jumlah, Satuan dan Harga</div>
      <table style="width:100%;border-collapse:collapse;font-size:11pt;color:#000;">
            <colgroup><col style="width:34px;"><col><col style="width:60px;"><col style="width:64px;"><col style="width:90px;"></colgroup>
            <thead>
              <tr>
                <th class="no-col" style="border:1px solid #000;padding:6px 7px;text-align:center;background:#fff;color:#000;font-weight:bold;">No</th>
                <th style="border:1px solid #000;padding:6px 7px;text-align:center;background:#fff;color:#000;font-weight:bold;">Nama/Jenis Barang Spesifikasi Mutu/Bahan/Matrial</th>
                <th style="border:1px solid #000;padding:6px 7px;text-align:center;background:#fff;color:#000;font-weight:bold;">Qty</th>
                <th style="border:1px solid #000;padding:6px 7px;text-align:center;background:#fff;color:#000;font-weight:bold;">Satuan</th>
                <th style="border:1px solid #000;padding:6px 7px;text-align:center;background:#fff;color:#000;font-weight:bold;">Harga Satuan</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>

        <!-- b. Justifikasi Merek -->
        <div style="margin-bottom:10px;margin-left:20px;" class="section-block">
          <div style="color:#000;margin-bottom:4px;">b.&nbsp;&nbsp;&nbsp;Justifikasi Teknis Dalam Penggunaan Merek (Jika ada)</div>
          <p style="color:#000;margin:0 0 0 28px;">Tidak menggunakan merk tertentu</p>
        </div>

        <!-- c. Spesifikasi Waktu -->
        <div style="margin-bottom:10px;margin-left:20px;" class="section-block">
          <div style="color:#000;margin-bottom:4px;">c.&nbsp;&nbsp;&nbsp;Spesifikasi Waktu</div>
          <p style="text-align:justify;color:#000;margin:0 0 0 28px;">
            Pelaksanaan pekerjaan mulai dari di terbitkannya surat pesanan sampai dengan tanggal,
            <strong>${waktuSpek}</strong>
          </p>
        </div>

        <!-- d. Spesifikasi Tempat -->
        <div style="margin-bottom:10px;margin-left:20px;" class="section-block">
          <div style="color:#000;margin-bottom:4px;">d.&nbsp;&nbsp;&nbsp;Spesifikasi Tempat</div>
          <p style="text-align:justify;color:#000;margin:0 0 4px 28px;">Pengiriman sampai ke lokasi yaitu ${docOrg.tempatPengiriman}</p>
          <p style="color:#000;margin:0 0 2px 28px;">Lokasi pengantaran: Langsung ke tempat/lokasi tujuan</p>
          <p style="color:#000;margin:0 0 0 28px;">Jarak dan akses lokasi diperhitungkan oleh penyedia tanpa biaya tambahan di luar harga satuan e-Katalog.</p>
        </div>

        <!-- e. Spesifikasi Layanan -->
        <div style="margin-bottom:14px;margin-left:20px;" class="section-block">
          <div style="color:#000;margin-bottom:4px;">e.&nbsp;&nbsp;&nbsp;Spesifikasi Layanan</div>
          <p style="text-align:justify;color:#000;margin:0 0 0 28px;">Penyedia wajib memenuhi tingkat layanan meliputi ketepatan waktu, kesesuaian spesifikasi, kualitas hasil, ketepatan jumlah, responsivitas, pengemasan dan pengiriman, jaminan/garansi, fleksibilitas layanan, kepatuhan administratif, serta standar keamanan dan kepatuhan. Penyedia juga wajib menindaklanjuti setiap ketidaksesuaian melalui perbaikan atau penggantian tanpa biaya tambahan sesuai ketentuan yang disepakati serta bertanggung jawab penuh atas pengadaan.</p>
        </div>
      </div>

      <!-- II. PRIORITAS PRODUK DALAM NEGERI -->
      <div style="margin-bottom:14px;" class="section-block">
        <div style="font-weight:bold;color:#000;margin-bottom:6px;">II.&nbsp;&nbsp;&nbsp;Prioritas Penggunaan Produk Dalam Negeri</div>
        <p style="text-align:justify;color:#000;margin:0 0 8px 20px;">Berdasarkan Pasal 66 ayat (1) dan (2) Peraturan Presiden Nomor 46 Tahun 2025 tentang Perubahan Kedua Atas Peraturan Presiden Nomor 16 Tahun 2018 Tentang Pengadaan Barang/Jasa Pemerintah, maka PPK/PP yang akan melakukan e-Purchasing memilih barang/jasa pada Katalog Elektronik dengan urutan/prioritas sebagai berikut:</p>
        <ol style="margin:0 0 0 36px;padding:0;color:#000;">
          <li style="margin-bottom:6px;text-align:justify;">Apabila barang/jasa yang dibutuhkan pada Katalog Elektronik terdapat produk dalam negeri yang memiliki jumlah nilai TKDN dan nilai BMP minimal 40% (empat puluh persen) maka PPK/PP memilih produk dalam negeri dengan nilai TKDN paling sedikit 25% (dua puluh lima persen);</li>
          <li style="margin-bottom:6px;text-align:justify;">Dalam hal kondisi pada angka 1 di atas tidak dapat dipenuhi, maka PPK/PP dapat memilih produk dalam negeri dengan nilai TKDN kurang dari 25% (dua puluh lima persen);</li>
          <li style="margin-bottom:6px;text-align:justify;">Dalam hal kondisi pada angka 1 dan 2 di atas tidak dapat dipenuhi, maka PPK/PP dapat memilih produk dengan label PDN namun belum mempunyai nilai TKDN;</li>
          <li style="margin-bottom:6px;text-align:justify;">Dalam hal kondisi pada angka 1, 2, dan 3 di atas tidak dapat dipenuhi, maka PPK/PP dapat memilih produk impor; dan</li>
          <li style="margin-bottom:6px;text-align:justify;">Dalam hal kondisi pada angka 1, 2, 3, dan 4 di atas tidak dapat dipenuhi, maka PPK/PP dapat menggunakan metode lain selain <em>e-Purchasing</em> Katalog sesuai ketentuan peraturan perundang-undangan.</li>
        </ol>
      </div>

      <!-- III. PRIORITAS PENYEDIA UMKM/KOPERASI -->
      <div style="margin-bottom:14px;" class="section-block">
        <div style="font-weight:bold;color:#000;margin-bottom:6px;">III.&nbsp;&nbsp;&nbsp;Prioritas Penggunaan Produk dari Penyedia dengan Kualifikasi Usaha Kecil serta Koperasi</div>
        <p style="text-align:justify;color:#000;margin:0 0 8px 20px;">Berdasarkan Pasal 65 ayat (3) dan (4) Peraturan Presiden Nomor 46 Tahun 2025 tentang Perubahan Kedua Atas Peraturan Presiden Nomor 16 Tahun 2018 Tentang Pengadaan Barang/Jasa Pemerintah, maka PPK/PP yang akan melakukan <em>e-Purchasing</em> Katalog memilih barang/jasa pada Katalog Elektronik dengan urutan/prioritas sebagai berikut:</p>
        <ol style="margin:0 0 0 36px;padding:0;color:#000;">
          <li style="margin-bottom:6px;text-align:justify;">Apabila nilai paket pengadaan barang/jasa dengan nilai pagu anggaran sampai dengan Rp. 15.000.000.000,00 (lima belas miliar rupiah) maka PPK/PP memilih Penyedia dengan Kualifikasi Usaha Kecil atau Koperasi untuk barang/jasa yang dibutuhkan yang tersedia pada Katalog Elektronik;</li>
          <li style="margin-bottom:6px;text-align:justify;">Dalam hal kondisi pada angka 1 di atas tidak dapat dipenuhi maka PPK/PP dapat memilih Penyedia Katalog Elektronik dengan Kualifikasi Usaha Non Kecil.</li>
        </ol>
      </div>

      <!-- IV. PENGUMPULAN REFERENSI HARGA -->
      <div style="margin-bottom:14px;" class="section-block">
        <div style="font-weight:bold;color:#000;margin-bottom:6px;">IV.&nbsp;&nbsp;&nbsp;Pengumpulan Referensi Harga</div>
        <p style="text-align:justify;color:#000;margin:0 0 8px 20px;">PPK/PP mempersiapkan referensi harga yang berfungsi sebagai referensi untuk melakukan Negosiasi Harga. Pengumpulan referensi harga dilakukan dengan memperhatikan hal-hal sebagai berikut:</p>
        <ol style="margin:0 0 0 36px;padding:0;color:#000;">
          <li style="margin-bottom:8px;text-align:justify;">
            Referensi harga disusun dengan sumber data sebagai berikut:
            <ol style="margin:6px 0 0 20px;padding:0;list-style-type:lower-alpha;color:#000;">
              <li style="margin-bottom:4px;text-align:justify;">Mencari produk dengan harga terbaik yang tercantum pada Katalog Elektronik sesuai dengan spesifikasi teknis yang dibutuhkan dengan memperhatikan ketentuan terkait Prioritas Penggunaan Produk Dalam Negeri dan Prioritas Penggunaan Produk dari Penyedia dengan Kualifikasi Usaha Kecil serta Koperasi;</li>
              <li style="margin-bottom:4px;text-align:justify;">Mencari harga pembanding produk sejenis di luar aplikasi Katalog Elektronik (apabila ada);</li>
              <li style="margin-bottom:4px;text-align:justify;">Informasi biaya/harga satuan yang dipublikasikan secara resmi oleh Kementerian/Lembaga/ Pemerintah Daerah (apabila ada); dan</li>
              <li style="margin-bottom:4px;text-align:justify;">Dokumen lainnya yang dapat dipertanggungjawabkan (apabila ada).</li>
            </ol>
          </li>
          <li style="margin-bottom:8px;text-align:justify;">Selain referensi harga, PPK/PP juga dapat mempersiapkan kebutuhan terkait layanan teknis pendukung dari barang/jasa untuk dijadikan referensi dalam melakukan negosiasi dengan Penyedia apabila diperlukan. Layanan teknis pendukung adalah layanan yang dapat diberikan Penyedia untuk mendukung penggunaan dari barang/jasa yang akan dibeli. Negosiasi layanan teknis pendukung tidak digunakan untuk menegosiasi teknis barang seperti mengubah/menambah spesifikasi barang/jasa yang telah tayang pada Katalog Elektronik.</li>
          <li style="margin-bottom:4px;text-align:justify;">Pengumpulan referensi harga tidak diperlukan jika harga produk yang tayang pada aplikasi Katalog Elektronik berupa <em>fixed price</em> atau harga tidak bisa dinegosiasi.</li>
        </ol>
      </div>

      <!-- V. RANCANGAN KONTRAK -->
      <div style="margin-bottom:12px;" class="section-block">
        <div style="font-weight:bold;color:#000;margin-bottom:6px;">V.&nbsp;&nbsp;&nbsp;Rancangan Kontrak</div>
        <p style="text-align:justify;color:#000;margin:0 0 0 20px;">Rancangan Kontrak menggunakan Surat Pesanan sesuai yang tertuang di aplikasi <strong><em>E-purchasing.</em></strong></p>
      </div>

      <!-- VI. RENCANA METODE PEMILIHAN PENYEDIA -->
      <div style="margin-bottom:12px;" class="section-block">
        <div style="font-weight:bold;color:#000;margin-bottom:6px;">VI.&nbsp;&nbsp;&nbsp;Rencana Metode Pemilihan Penyedia</div>
        <p style="color:#000;margin:0 0 0 20px;">Rencana metode pemilihan penyedia Katalog Elektronik menggunakan: <strong>Negosiasi Harga;</strong></p>
      </div>

      <!-- VII. PENUTUP -->
      <div style="margin-bottom:20px;" class="section-block">
        <div style="font-weight:bold;color:#000;margin-bottom:6px;">VII.&nbsp;&nbsp;&nbsp;Penutup</div>
        <p style="text-align:justify;color:#000;margin:0 0 0 20px;">Demikian Dokumen Persiapan e-Purchasing dibuat untuk dapat diketahui bersama sebagai acuan bagi pelaksanaan proses pengadaan barang/jasa bagi pihak terkait dan dibuat untuk digunakan sebagaimana mestinya.</p>
      </div>

      <!-- TTD PPKom -->
      <div class="section-block" style="display:flex;justify-content:flex-end;margin-top:40px;">
        <div style="text-align:left;width:320px;color:#000;">
          <div style="color:#000;">Putussibau, &nbsp;${tglFormatted}</div>
          <div style="color:#000;">Di tetapkan oleh :</div>
          <div style="font-weight:bold;margin-bottom:4px;color:#000;">Pejabat Pembuat Komitmen (PPKom)</div>
          <div style="color:#000;">${docOrg.namaInstansi}</div>
          ${(()=>{
              const mode = (window._ttdMode && window._ttdMode['formdpp']) || {ttd:false, cap:false};
              const showTtd = mode.ttd && ppk.ttd;
              const showCap = mode.cap && ppk.cap;
              const L = (window._ttdLayout && window._ttdLayout['formdpp']) || {};
              const T = L.ttd || {x:0,y:0,w:120,h:55,r:0,o:100};
              const C = L.cap || {x:80,y:-20,w:80,h:80,r:0,o:85};
              return `<div style="position:relative;height:70px;margin-top:4px;background:transparent;overflow:visible;">
                ${showTtd ? `<img id="doc-ttd-img-formdpp" src="${ppk.ttd}"
                  style="position:absolute;left:0;top:0;width:${T.w}px;height:${T.h}px;object-fit:contain;
                  background:transparent;
                  transform:translate(${T.x}px,${T.y}px) rotate(${T.r}deg);opacity:${T.o/100};
                  cursor:grab;user-select:none;z-index:2;"
                  draggable="false"
                  title="Drag untuk pindah posisi TTD">` : ''}
                ${showCap ? `<img id="doc-cap-img-formdpp" src="${ppk.cap}"
                  style="position:absolute;left:0;top:0;width:${C.w}px;height:${C.h}px;object-fit:contain;
                  background:transparent;
                  transform:translate(${C.x}px,${C.y}px) rotate(${C.r}deg);opacity:${C.o/100};
                  cursor:grab;user-select:none;z-index:3;"
                  draggable="false"
                  title="Drag untuk pindah posisi Cap">` : ''}
              </div>`;
            })()}
          <div style="font-weight:bold;text-decoration:underline;color:#000;">${ppk.nama}</div>
          <div style="color:#000;">${ppk.nip !== '-' ? 'NIP. ' + ppk.nip : ''}</div>
        </div>
      </div>

    </div>
  `;
  // Pasang drag handler setelah render
  setTimeout(() => {
    makeDraggableTtd('doc-ttd-img-formdpp', 'formdpp', 'ttd');
    makeDraggableTtd('doc-cap-img-formdpp', 'formdpp', 'cap');
  }, 50);
}

function printFormDpp() {
  const printArea = document.getElementById('formdpp-print-area');
  if (!printArea) {
    toast('Pilih No RUP terlebih dahulu', 'error');
    return;
  }
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dokumen Persiapan Pengadaan (DPP) E-Purchasing</title>
      <style>
        ${buildPageRule('formdpp')}
        @media screen {
          body { max-width: 210mm; margin: 0 auto; padding: 20mm; background: #f0f0f0; }
          body > * { background: #fff; }
        }
        * { box-sizing: border-box; color: #000 !important; }
        body { margin:0; padding:0; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; line-height:1.6; }
        table { border-collapse:collapse; width:100%; table-layout:fixed; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        tbody tr { page-break-inside:auto; }
        th, td { border:1px solid #000; word-wrap:break-word; }
        p { margin:4px 0; orphans:3; widows:3; }
        ol { margin:4px 0; }
        li { margin-bottom:3px; }
        .section-block { page-break-inside:auto; }
        /* ── A4 layout overrides — rapikan hasil print ── */
        [id$="-print-area"] {
          padding: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          background: #fff !important;
          line-height: 1.45;
        }
        img { max-width: 100%; height: auto; display: block; }
        table { table-layout: fixed; width: 100% !important; }
        /* Kolom "No" tabel data – sempit, center, rapat */
        table.data-tbl th:first-child,
        table.data-tbl td:first-child,
        th.no-col, td.no-col {
          width: 34px !important;
          text-align: center !important;
          vertical-align: middle !important;
          white-space: nowrap;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        /* Header tabel selalu center */
        thead th { text-align: center !important; vertical-align: middle !important; }
        /* Hindari kolom mata uang/angka wrap aneh */
        .num, td.num { text-align: right !important; white-space: nowrap; }
        /* Sub-tabel jangan dobel border */
        td > table { border: 0 !important; }
      </style>
    </head>
    <body>${printArea.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

// ============================================================
//  BAHPE — Berita Acara Hasil Penetapan E-Purchasing
// ============================================================

function populateBahpeSelects() {
  // PPKom
  const ppkSel = document.getElementById('bahpe-ppk-select');
  if (ppkSel) {
    const cur = ppkSel.value;
    ppkSel.innerHTML = '<option value="">— Pilih PPKom —</option>';
    const allPpk = masterState.ppk.length > 0 ? masterState.ppk : masterState.pejabatPengadaan;
    allPpk.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nama || p.namaPPK || '-';
      ppkSel.appendChild(opt);
    });
    ppkSel.value = cur;
  }
  // Pejabat Pengadaan
  const pejSel = document.getElementById('bahpe-pejabat-select');
  if (pejSel) {
    const cur = pejSel.value;
    pejSel.innerHTML = '<option value="">— Pilih Pejabat Pengadaan —</option>';
    masterState.pejabatPengadaan.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nama;
      pejSel.appendChild(opt);
    });
    pejSel.value = cur;
  }
  // RUP
  const rupSel = document.getElementById('bahpe-rup-select');
  if (rupSel) {
    const cur = rupSel.value;
    rupSel.innerHTML = '<option value="">— Pilih No RUP —</option>';
    state.paket.data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.rup;
      opt.textContent = `${p.rup} - ${strTrunc(p.namaPaket, 40)}`;
      rupSel.appendChild(opt);
    });
    rupSel.value = cur;
  }

  if (rupSel?.value) setTimeout(loadBahpeData, 0);
}

if (typeof _bahpeRenderTimer === 'undefined') var _bahpeRenderTimer = null;
function scheduleLoadBahpeData() {
  clearTimeout(_bahpeRenderTimer);
  _bahpeRenderTimer = setTimeout(loadBahpeData, 30);
}

function loadBahpeData() {
  const rupEl   = document.getElementById('bahpe-rup-select');
  const ppkEl   = document.getElementById('bahpe-ppk-select');
  const pejEl   = document.getElementById('bahpe-pejabat-select');
  const content = document.getElementById('bahpe-content');
  if (!rupEl || !content) return;

  const rup     = rupEl.value;
  const ppkId   = ppkEl ? ppkEl.value : '';
  const pejId   = pejEl ? pejEl.value : '';

  if (!rup) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">Pilih No RUP</div>
        <div class="empty-sub">Pilih PPKom, Pejabat Pengadaan, dan No RUP untuk menampilkan Berita Acara Hasil Penetapan E-Purchasing</div>
      </div>`;
    return;
  }

  // PPKom
  let ppk = { nama: 'NAMA PPK', nip: '-' };
  if (ppkId) {
    const allPpk = [...masterState.ppk, ...masterState.pejabatPengadaan];
    const found  = allPpk.find(p => String(p.id) === String(ppkId));
    if (found) ppk = { nama: found.nama || found.namaPPK || '-', nip: found.nip || found.nipPPK || '-' };
  }

  // Pejabat Pengadaan
  let pejabat = { nama: '<span style="color:#c05050;font-style:italic;">⚠ Belum dipilih — tambahkan di Data Master</span>', nip: '-' };
  if (pejId) {
    const found = masterState.pejabatPengadaan.find(p => String(p.id) === String(pejId));
    if (found) pejabat = found;
  }

  // Data paket
  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Data paket tidak ditemukan</div></div>`;
    return;
  }

  const hargaForRup   = state.harga.data.filter(h => String(h.rup) === String(rup));
  const rincianForRup = state.rincian.data.filter(r => String(r.rup) === String(rup));


  // ── Helper: tentukan pemenang konsisten dengan EV_HP ──
  // Prioritas: (1) paling banyak item harga terendah, (2) total nilai terendah
  function _determineWinner(hargaAll, rincianAll) {
    if (!hargaAll.length) return { penyedia: '-', total: 0 };
    const penyedias = [...new Set(hargaAll.map(h => h.namaPenyedia).filter(Boolean))];
    // Total nilai per penyedia
    const totals = {};
    penyedias.forEach(p => {
      totals[p] = hargaAll.filter(h => h.namaPenyedia === p).reduce((s, h) => {
        const v = (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0)) * (Number(h.qty) || 1);
        return s + v;
      }, 0);
    });
    // Item list (dari rincian jika ada, fallback ke urutan harga)
    const itemList = rincianAll.length > 0
      ? rincianAll.map(r => r.itemBarang)
      : [...new Set(hargaAll.map(h => h.namaItem).filter(Boolean))];
    // Hitung kemenangan per penyedia (per item position, dengan occurrence index)
    const wins = {};
    const _occ = {};
    itemList.forEach(item => {
      const occ = _occ[item] || 0;
      _occ[item] = occ + 1;
      const prices = {};
      penyedias.forEach(p => {
        const matches = hargaAll.filter(h => h.namaPenyedia === p && h.namaItem === item);
        const rec = matches[occ] || matches[matches.length - 1];
        if (rec) {
          const v = Number(rec.negoFinal) > 0 ? Number(rec.negoFinal) : (Number(rec.hargaTayang) || 0);
          if (v > 0) prices[p] = v;
        }
      });
      if (Object.keys(prices).length > 0) {
        const minVal = Math.min(...Object.values(prices));
        Object.keys(prices).forEach(p => { if (prices[p] === minVal) wins[p] = (wins[p] || 0) + 1; });
      }
    });
    const sorted = penyedias.slice().sort((a, b) => {
      const tA = totals[a] || 0, tB = totals[b] || 0;
      if (tA !== tB) return tA - tB;
      const wA = wins[a] || 0, wB = wins[b] || 0;
      return wB - wA;
    });
    const winner = sorted[0] || '-';
    return { penyedia: winner, total: totals[winner] || 0 };
  }
  // Tentukan penyedia terpilih — konsisten dengan algoritma EV_HP
  let penyediaTerpilih = '-';
  let negoFinalTotal = 0;
  if (hargaForRup.length > 0) {
    const _w = _determineWinner(hargaForRup, rincianForRup);
    penyediaTerpilih = _w.penyedia;
    negoFinalTotal   = _w.total;
  }

  // Tanggal dari tanggalPesanan paket
  const tglSrc = paket.tanggalPesanan || '';
  let tglDate = tglSrc
    ? (() => { const p = tglSrc.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); })()
    : new Date();
  const namaHari   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const namaBulan  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const satuanAngka = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan','Sepuluh','Sebelas','Dua Belas','Tiga Belas','Empat Belas','Lima Belas','Enam Belas','Tujuh Belas','Delapan Belas','Sembilan Belas','Dua Puluh','Dua Puluh Satu','Dua Puluh Dua','Dua Puluh Tiga','Dua Puluh Empat','Dua Puluh Lima','Dua Puluh Enam','Dua Puluh Tujuh','Dua Puluh Delapan','Dua Puluh Sembilan','Tiga Puluh','Tiga Puluh Satu'];
  function terbilangTahunBahpe(y) {
    const ratusan = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan'];
    const ribuan  = Math.floor(y / 1000);
    const sisa    = y % 1000;
    const r       = Math.floor(sisa / 100);
    const puluhan = sisa % 100;
    let result = (ribuan === 1 ? 'Seribu' : ratusan[ribuan] + ' Ribu');
    if (r > 0) result += ' ' + ratusan[r] + ' Ratus';
    if (puluhan > 0) result += ' ' + (puluhan < satuanAngka.length ? satuanAngka[puluhan] : '');
    return result.trim();
  }
  const tglAngka     = tglDate.getDate();
  const hariText     = namaHari[tglDate.getDay()];
  const bulanText    = namaBulan[tglDate.getMonth()];
  const tahunNum     = tglDate.getFullYear();
  const tanggalTerb  = satuanAngka[tglAngka] || String(tglAngka);
  const tahunTerb    = terbilangTahunBahpe(tahunNum);
  const docOrg = getDocOrg(paket);
  const nomorBahpeDefault = `PP/${paket.rup || '...'}/BAHPE/${docOrg.singkatan}/${tahunNum}`;
  const nomorBahpe = getDefaultDocNumber(paket.nomorBahpe, nomorBahpeDefault, docOrg.singkatan);
  const tanggalPanjang = `${tanggalTerb} Bulan ${bulanText} Tahun ${tahunTerb}`;
  const tglFormatted = `${tglAngka} ${namaBulan[tglDate.getMonth()]} ${tahunNum}`;

  // Visibility flags
  const hasRincian = rincianForRup.length > 0;
  const hasHarga   = hargaForRup.length > 0;
  const hideSec    = (hide) => hide ? 'style="display:none"' : '';
  const fmtNum = v => v > 0 ? Number(v).toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '-';

  // Baris tabel penetapan (kolom: No | Nama Barang/Spek | Vol | Satuan | Harga Sat HPS | Harga Nego | Jumlah Nego)
  let itemRows = '';
  let totalNegoAkumulasi = 0;

  if (rincianForRup.length > 0) {
    const _bahpeOcc = {};
    rincianForRup.forEach((r, i) => {
      const _key = r.itemBarang || '';
      const _occIdx = _bahpeOcc[_key] || 0;
      _bahpeOcc[_key] = _occIdx + 1;
      // occurrence-aware: ambil record ke-N untuk item yang sama
      const _exactWinner = hargaForRup.filter(h =>
        h.namaPenyedia === penyediaTerpilih &&
        (h.namaItem === r.itemBarang || h.namaProduk === r.itemBarang)
      );
      const _exactAll = hargaForRup.filter(h =>
        h.namaItem === r.itemBarang || h.namaProduk === r.itemBarang
      );
      const hItem = (_exactWinner.length > 0
        ? (_exactWinner[_occIdx] || _exactWinner[_exactWinner.length - 1])
        : (_exactAll.length > 0 ? (_exactAll[_occIdx] || _exactAll[_exactAll.length - 1]) : null));

      const vol     = Number(r.vol) || 0;
      const satuan  = r.satuan || '';
      const hpsVal  = Number(r.hargaSatuan) || 0;
      const negoVal = hItem ? (Number(hItem.negoFinal) || Number(hItem.hargaTayang) || hpsVal) : hpsVal;
      const jumlah  = negoVal * vol;
      totalNegoAkumulasi += jumlah;

      // Stacked: Baris 1 = nama barang (bold), Baris 2 = badge PRODUK TAYANG + namaProduk
      const _npBahpe = (hItem && (hItem.namaProduk||'').trim() && hItem.namaProduk !== r.itemBarang)
        ? hItem.namaProduk.trim() : '';
      const _npBadge = _npBahpe
        ? `<div style="margin-top:3px;display:flex;align-items:baseline;gap:4px;flex-wrap:wrap;">` +
          `<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;font-size:7.5pt;font-weight:700;` +
          `text-transform:uppercase;padding:1px 4px;border-radius:3px;white-space:nowrap;line-height:1.5;">PRODUK TAYANG</span>` +
          `<span style="font-style:italic;font-size:9pt;color:#374151;">${_npBahpe}</span></div>`
        : '';

      itemRows += `<tr style="page-break-inside:avoid;">
        <td style="border:1px solid #000;padding:5px 4px;text-align:center;vertical-align:top;color:#000;white-space:nowrap;">${i + 1}.</td>
        <td style="border:1px solid #000;padding:5px 7px;vertical-align:top;color:#000;">
          <div style="font-weight:700;color:#000;">${r.itemBarang || '-'}</div>${_npBadge}
        </td>
        <td style="border:1px solid #000;padding:5px 4px;text-align:center;vertical-align:top;color:#000;white-space:nowrap;">${vol || '-'}</td>
        <td style="border:1px solid #000;padding:5px 5px;text-align:center;vertical-align:top;color:#000;">${satuan}</td>
        <td style="border:1px solid #000;padding:5px 6px;text-align:right;vertical-align:top;color:#000;">${fmtNum(hpsVal)}</td>
        <td style="border:1px solid #000;padding:5px 6px;text-align:right;vertical-align:top;color:#000;">${fmtNum(negoVal)}</td>
        <td style="border:1px solid #000;padding:5px 6px;text-align:right;vertical-align:top;color:#000;">${fmtNum(jumlah)}</td>
      </tr>`;
    });
  } else if (hasHarga) {
    const hargaTerpilih = hargaForRup.filter(h => h.namaPenyedia === penyediaTerpilih);
    hargaTerpilih.forEach((h, i) => {
      const negoVal = Number(h.negoFinal) || Number(h.hargaTayang) || 0;
      const qtyVal  = Number(h.qty) || 1;
      totalNegoAkumulasi += negoVal * qtyVal;
      itemRows += `<tr style="page-break-inside:avoid;">
        <td style="border:1px solid #000;padding:5px 4px;text-align:center;vertical-align:top;color:#000;white-space:nowrap;">${i + 1}.</td>
        <td style="border:1px solid #000;padding:5px 7px;vertical-align:top;color:#000;">${h.namaItem || h.namaProduk || '-'}</td>
        <td style="border:1px solid #000;padding:5px 4px;text-align:center;vertical-align:top;color:#000;white-space:nowrap;">${qtyVal > 1 ? qtyVal : '-'}</td>
        <td style="border:1px solid #000;padding:5px 5px;text-align:center;vertical-align:top;color:#000;">${h.satuan || '-'}</td>
        <td style="border:1px solid #000;padding:5px 6px;text-align:right;vertical-align:top;color:#000;">${fmtNum(Number(h.hargaTayang) || 0)}</td>
        <td style="border:1px solid #000;padding:5px 6px;text-align:right;vertical-align:top;color:#000;">${fmtNum(negoVal)}</td>
        <td style="border:1px solid #000;padding:5px 6px;text-align:right;vertical-align:top;color:#000;">${fmtNum(negoVal * qtyVal)}</td>
      </tr>`;
    });
  }

  const paguNum = Number(paket.paguAnggaran) || 0;
  // Hitung nilaiNego dengan formula IDENTIK EV_HP: (negoFinal || hargaTayang) × qty
  // Ini menjamin BAHPE selalu konsisten dengan "Total Hasil Negosiasi" di EV_HP
  const nilaiNego = hargaForRup
    .filter(h => h.namaPenyedia === penyediaTerpilih)
    .reduce((s, h) => s + ((Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0)) * (Number(h.qty) || 1)), 0);
  const efisiensi = paguNum > 0 && nilaiNego > 0 ? paguNum - nilaiNego : 0;

  // Cari data lengkap penyedia terpilih dari store penyedia
  const penyediaRec = state.penyedia.data.find(p => p.namaPenyedia === penyediaTerpilih);
  const pBentuk = penyediaRec ? (penyediaRec.bentukUsaha || '-') : '-';
  const pTipe   = penyediaRec ? (penyediaRec.tipe        || '-') : '-';
  const pStatus = penyediaRec ? (penyediaRec.status      || '-') : '-';
  const pAlamat = penyediaRec ? (penyediaRec.alamat      || '-') : '-';


  // ── Validasi sinkronisasi pemenang ──
  // Bandingkan: (A) algo baru (EV_HP style) vs (B) algo lama (total terendah saja)
  // Cek juga kelengkapan data negoFinal pemenang terpilih
  function _buildSinkronBanner(hargaAll, rincianAll, pemenangBaru) {
    // Algo lama: total negoFinal×qty (fallback totalHarga)
    const totalsLama = {};
    hargaAll.forEach(h => {
      if (!h.namaPenyedia) return;
      const v = Number(h.negoFinal) > 0
        ? Number(h.negoFinal) * Number(h.qty || 1)
        : Number(h.totalHarga) || 0;
      totalsLama[h.namaPenyedia] = (totalsLama[h.namaPenyedia] || 0) + v;
    });
    const sortedLama = Object.entries(totalsLama).sort((a, b) => a[1] - b[1]);
    const pemenangLama = sortedLama.length > 0 ? sortedLama[0][0] : '-';

    // Cek kelengkapan negoFinal untuk pemenang terpilih
    const recsWinner = hargaAll.filter(h => h.namaPenyedia === pemenangBaru);
    const missingNego = recsWinner.filter(h => !(Number(h.negoFinal) > 0));
    const totalItems  = recsWinner.length;
    const filledItems = totalItems - missingNego.length;

    // Tentukan status
    let status, icon, bg, border, msg;
    if (missingNego.length > 0) {
      status = 'warning';
      icon   = '⚠️';
      bg     = '#fffbeb'; border = '#f59e0b';
      msg    = `<strong>${missingNego.length} dari ${totalItems} item</strong> belum memiliki data negoFinal untuk <strong>${pemenangBaru}</strong>. Dokumen mungkin tidak akurat — isi terlebih dahulu harga negosiasi di Survey Harga.`;
    } else if (pemenangLama !== pemenangBaru) {
      status = 'changed';
      icon   = '🔄';
      bg     = '#eff6ff'; border = '#3b82f6';
      msg    = `Pemenang berhasil dikoreksi: <strong style="color:#dc2626;">${pemenangLama}</strong> → <strong style="color:#16a34a;">${pemenangBaru}</strong>. Data negosiasi lengkap dan valid.`;
    } else {
      status = 'ok';
      icon   = '✅';
      bg     = '#f0fdf4'; border = '#22c55e';
      msg    = `Pemenang <strong>${pemenangBaru}</strong> sinkron dengan EV_HP. Semua data negosiasi lengkap (${filledItems}/${totalItems} item).`;
    }

    return `<div class="no-print" style="
      background:${bg};border:1.5px solid ${border};border-radius:8px;
      padding:10px 14px;margin-bottom:12px;font-family:'Plus Jakarta Sans',sans-serif;
      font-size:11pt;color:#1f2937;display:flex;align-items:flex-start;gap:10px;
      box-shadow:0 1px 4px rgba(0,0,0,0.07);">
      <span style="font-size:16px;margin-top:1px;">${icon}</span>
      <div>
        <div style="font-weight:700;margin-bottom:2px;">Validasi Sinkronisasi EV_HP</div>
        <div style="font-size:10.5pt;">${msg}</div>
      </div>
    </div>`;
  }
  const _sinkronBannerBahpe = _buildSinkronBanner(hargaForRup, rincianForRup, penyediaTerpilih);

  content.innerHTML = `
    ${_sinkronBannerBahpe}
    <div id="bahpe-print-area" style="background:#fff;color:#000;padding:24px 28px;width:100%;max-width:900px;min-width:auto;margin:0 auto;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;box-sizing:border-box;">

      <!-- KOP SURAT -->
      ${kopSurat()}

      <!-- JUDUL -->
      <div class="section-block" style="text-align:center;margin-bottom:20px;">
        <div style="font-size:14pt;font-weight:bold;text-decoration:underline;color:#000;">BERITA ACARA HASIL PENETAPAN E-PURCHASING</div>
        <div style="font-size:12pt;color:#000;margin-top:4px;">Nomor : ${nomorBahpe} <button onclick="openNomorDialog(this)" data-slug="bahpe" data-rup="${paket.rup}" data-field="nomorBahpe" data-cur="${nomorBahpe}" title="Edit nomor dokumen" class="doc-nomor-edit" style="background:none;border:none;cursor:pointer;font-size:12px;padding:0 2px;opacity:0.5;vertical-align:middle;line-height:1;">✏️</button></div>
      </div>

      <!-- PEMBUKA -->
      <p style="text-align:justify;margin-bottom:16px;color:#000;line-height:1.6;">
        Pada Hari ini ${hariText} Tanggal ${tanggalPanjang} yang bertandatangan di bawah ini selaku Pejabat Pengadaan pada ${docOrg.namaInstansi} ${docOrg.kabupaten} telah melaksanakan Penetapan Penyedia melalui E-Purchasing, dengan hasil sebagai berikut :
      </p>

      <!-- A. DATA UMUM -->
      <div style="margin-bottom:16px;" class="section-block">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">A.&nbsp;&nbsp;&nbsp;DATA UMUM</div>
        <table style="margin-left:24px;font-size:12pt;color:#000;border-collapse:collapse;">
          <colgroup><col style="width:190px;"><col style="width:16px;"><col></colgroup>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Kode RUP</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${paket.rup || '-'}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Nama Paket</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${paket.namaPaket || '-'}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Pagu Anggaran</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${fmtRp(paket.paguAnggaran)}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Mata Anggaran Belanja</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">${paket.kodeRekening || '-'}</td></tr>
          <tr><td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Metode Pengadaan</td><td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td><td style="padding:2px 0;color:#000;border:none;">E-Purchasing dengan Negosiasi Harga</td></tr>
        </table>
      </div>

      <!-- B. TABEL PENETAPAN -->
      <div style="margin-bottom:16px;" class="section-block">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">B.&nbsp;&nbsp;&nbsp;HASIL PENETAPAN PENYEDIA</div>
        <div ${hideSec(!hasRincian && !hasHarga)}>
          <table style="width:100%;border-collapse:collapse;font-size:12pt;font-family:'Times New Roman',Times,serif;table-layout:fixed;color:#000;">
            <colgroup>
              <col style="width:38px;">
              <col>
              <col style="width:42px;">
              <col style="width:62px;">
              <col style="width:108px;">
              <col style="width:105px;">
              <col style="width:112px;">
            </colgroup>
            <thead style="display:table-header-group;">
              <tr style="background:#fff;">
                <th style="border:1px solid #000;padding:4px 3px;text-align:center;vertical-align:middle;color:#000;font-size:10pt;font-weight:bold;white-space:nowrap;overflow:hidden;">No</th>
                <th style="border:1px solid #000;padding:4px 5px;text-align:center;vertical-align:middle;color:#000;font-size:10pt;font-weight:bold;overflow:hidden;">Nama Barang/Jasa</th>
                <th style="border:1px solid #000;padding:4px 3px;text-align:center;vertical-align:middle;color:#000;font-size:10pt;font-weight:bold;overflow:hidden;">Vol</th>
                <th style="border:1px solid #000;padding:4px 3px;text-align:center;vertical-align:middle;color:#000;font-size:10pt;font-weight:bold;overflow:hidden;">Satuan</th>
                <th style="border:1px solid #000;padding:4px 3px;text-align:center;vertical-align:middle;color:#000;font-size:10pt;font-weight:bold;overflow:hidden;">Harga Satuan HPS (Rp)</th>
                <th style="border:1px solid #000;padding:4px 3px;text-align:center;vertical-align:middle;color:#000;font-size:10pt;font-weight:bold;overflow:hidden;">Harga Nego (Rp)</th>
                <th style="border:1px solid #000;padding:4px 3px;text-align:center;vertical-align:middle;color:#000;font-size:10pt;font-weight:bold;overflow:hidden;">Jumlah Nego (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows || '<tr><td colspan="7" style="border:1px solid #000;padding:8px;text-align:center;color:#000;font-size:12pt;">— Tidak ada data item —</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" style="border:1px solid #000;padding:5px 8px;text-align:right;font-weight:bold;color:#000;font-size:12pt;">Total Nilai Nego</td>
                <td style="border:1px solid #000;padding:5px 8px;text-align:right;font-weight:bold;color:#000;font-size:12pt;">${fmtNum(nilaiNego)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div ${hideSec(hasRincian || hasHarga)} style="margin-left:24px;color:#888;font-style:italic;">Belum ada data item dan harga untuk RUP ini.</div>
      </div>

      <!-- C. REKAP NILAI -->
      <div style="margin-bottom:16px;" class="section-block">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">C.&nbsp;&nbsp;&nbsp;REKAP NILAI</div>
        <table style="margin-left:24px;font-size:12pt;font-family:'Times New Roman',Times,serif;color:#000;border-collapse:collapse;">
          <colgroup><col style="width:200px;"><col style="width:16px;"><col></colgroup>
          <tr>
            <td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Nilai Pagu Anggaran</td>
            <td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;color:#000;border:none;">${fmtRp(paguNum)}</td>
          </tr>
          <tr>
            <td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Nilai Hasil Negosiasi</td>
            <td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;color:#000;border:none;">${nilaiNego > 0 ? fmtRp(nilaiNego) : '-'}</td>
          </tr>
          <tr>
            <td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Efisiensi</td>
            <td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;color:#000;border:none;">${efisiensi > 0 ? fmtRp(efisiensi) : '-'}</td>
          </tr>
        </table>
      </div>

      <!-- D. KESIMPULAN -->
      <div style="margin-bottom:20px;" class="section-block">
        <div style="font-weight:bold;margin-bottom:6px;color:#000;">D.&nbsp;&nbsp;&nbsp;KESIMPULAN</div>
        <p style="text-align:justify;margin-left:24px;margin-bottom:8px;color:#000;">
          Berdasarkan hasil evaluasi dan negosiasi harga yang telah dilaksanakan, maka ditetapkan Penyedia yang memenuhi persyaratan dan memberikan penawaran terbaik adalah :
        </p>
        <table style="margin-left:24px;font-size:12pt;font-family:'Times New Roman',Times,serif;color:#000;border-collapse:collapse;">
          <colgroup><col style="width:190px;"><col style="width:16px;"><col></colgroup>
          <tr>
            <td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Nama Penyedia</td>
            <td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;font-weight:bold;color:#000;border:none;">${penyediaTerpilih}</td>
          </tr>
          <tr>
            <td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Bentuk Usaha</td>
            <td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;color:#000;border:none;">${pBentuk}</td>
          </tr>
          <tr>
            <td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Tipe Usaha</td>
            <td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;color:#000;border:none;">${pTipe}</td>
          </tr>
          <tr>
            <td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Status Usaha</td>
            <td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;color:#000;border:none;">${pStatus}</td>
          </tr>
          <tr>
            <td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Alamat</td>
            <td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;color:#000;border:none;">${pAlamat}</td>
          </tr>
          <tr>
            <td style="padding:2px 8px 2px 0;vertical-align:top;color:#000;border:none;">Nilai Penetapan</td>
            <td style="padding:2px 8px;vertical-align:top;color:#000;border:none;">:</td>
            <td style="padding:2px 0;font-weight:bold;color:#000;border:none;">${nilaiNego > 0 ? fmtRp(nilaiNego) : '-'}</td>
          </tr>
        </table>
      </div>

      <p style="text-align:justify;margin-bottom:28px;color:#000;">
        Demikian Berita Acara Hasil Penetapan E-Purchasing ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>

      <!-- TTD — gunakan tabel agar nama & NIP sejajar kiri-kanan -->
      <table class="section-block" style="width:100%;margin-top:36px;border-collapse:collapse;font-size:12pt;font-family:'Times New Roman',Times,serif;color:#000;">
        <colgroup><col style="width:48%;"><col style="width:4%;"><col style="width:48%;"></colgroup>
        <tbody>
          <tr>
            <td style="border:none;vertical-align:top;color:#000;">&nbsp;</td>
            <td style="border:none;"></td>
            <td style="border:none;vertical-align:top;color:#000;">Putussibau, ${tglFormatted}</td>
          </tr>
          <tr>
            <td style="border:none;vertical-align:top;color:#000;font-weight:bold;">Pejabat Pembuat Komitmen (PPKom)</td>
            <td style="border:none;"></td>
            <td style="border:none;vertical-align:top;color:#000;font-weight:bold;">Pejabat Pengadaan</td>
          </tr>
          <tr>
            <td style="border:none;vertical-align:top;color:#000;">${docOrg.namaInstansi} ${docOrg.kabupaten}</td>
            <td style="border:none;"></td>
            <td style="border:none;vertical-align:top;color:#000;">${docOrg.namaInstansi} ${docOrg.kabupaten}</td>
          </tr>
          <tr style="height:64px;">
            <td style="border:none;"></td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
          </tr>
          <tr>
            <td style="border:none;vertical-align:top;color:#000;font-weight:bold;text-decoration:underline;">${ppk.nama}</td>
            <td style="border:none;"></td>
            <td style="border:none;vertical-align:top;color:#000;font-weight:bold;text-decoration:underline;">${pejabat.nama}</td>
          </tr>
          <tr>
            <td style="border:none;vertical-align:top;color:#000;">${ppk.nip && ppk.nip !== '-' ? 'NIP. ' + ppk.nip : ''}</td>
            <td style="border:none;"></td>
            <td style="border:none;vertical-align:top;color:#000;">${pejabat.nip && pejabat.nip !== '-' ? 'NIP. ' + pejabat.nip : ''}</td>
          </tr>
        </tbody>
      </table>

    </div>
  `;
}

function printBahpe() {
  const printArea = document.getElementById('bahpe-print-area');
  if (!printArea) {
    toast('Pilih No RUP terlebih dahulu', 'error');
    return;
  }
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Berita Acara Hasil Penetapan E-Purchasing</title>
      <style>
        ${buildPageRule('bahpe')}
        @media screen {
          body { max-width: 210mm; margin: 0 auto; padding: 20mm; background: #f0f0f0; }
          body > * { background: #fff; }
        }
        * { box-sizing: border-box; color: #000 !important; }
        body { margin:0; padding:0; font-family:'Times New Roman',Times,serif; font-size:12pt; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; line-height:1.5; }
        table { border-collapse:collapse; width:100%; table-layout:fixed; }
        thead { display:table-header-group; }
        tfoot { display:table-footer-group; }
        tbody tr { page-break-inside:auto; }
        th, td { border:1px solid #000; word-wrap:break-word; }
        p { margin:4px 0; orphans:3; widows:3; }
        .section-block { page-break-inside:auto; }
        [id$="-print-area"] {
          padding:0 !important; max-width:100% !important; width:100% !important;
          margin:0 !important; box-shadow:none !important; border-radius:0 !important;
          background:#fff !important; line-height:1.45;
        }
        img { max-width:100%; height:auto; display:block; }
        table { table-layout:fixed; width:100% !important; }
        table.data-tbl th:first-child,
        table.data-tbl td:first-child,
        th.no-col, td.no-col {
          width:34px !important; text-align:center !important;
          vertical-align:middle !important; white-space:nowrap;
          padding-left:4px !important; padding-right:4px !important;
        }
        thead th { text-align:center !important; vertical-align:middle !important; }
        .num, td.num { text-align:right !important; white-space:nowrap; }
        td > table { border:0 !important; }
        /* Page-break controls — cegah baris & section terpotong */
        tr { page-break-inside: avoid !important; }
        thead { display: table-header-group !important; }
        tfoot { display: table-footer-group !important; }
        .section-block { page-break-inside: avoid !important; }
        p { orphans:3; widows:3; }
        .doc-nomor-edit { display:none !important; }
      </style>
    </head>
    <body>${printArea.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

// ============================================================
//  GENERIC DOCUMENT ZOOM PREVIEW
//  Works for all documents: evat, evhp, formspek, formdpp,
//  nodis, riviu, penetapan, idkb, bahpe
// ============================================================
(function() {
  const _docZoomState = {};
  const MIN = 50, MAX = 150;

  function _applyDocZoom(slug) {
    const pct = _docZoomState[slug] || 100;
    const area    = document.getElementById(slug + '-print-area');
    const label   = document.getElementById(slug + '-zoom-label');
    const wrapper = document.getElementById(slug + '-content');
    if (!area) return;
    const scale = pct / 100;
    area.style.transform       = 'scale(' + scale + ')';
    area.style.transformOrigin = 'top center';
    if (wrapper) wrapper.style.minHeight = Math.round(area.scrollHeight * scale + 24) + 'px';
    if (label)   label.textContent = pct + '%';
  }

  window.docZoom = function(slug, delta) {
    _docZoomState[slug] = Math.min(MAX, Math.max(MIN, (_docZoomState[slug] || 100) + delta));
    _applyDocZoom(slug);
  };

  window.docZoomReset = function(slug) {
    _docZoomState[slug] = 100;
    _applyDocZoom(slug);
  };

  // Wrap every load*Data function to re-apply zoom after render
  const _loaders = [
    'loadBahpeData','loadEvatData','loadEvhpData','loadFormSpekData',
    'loadFormDppData','loadNodisData','loadRiviuData',
    'loadPenetapanData','loadIdkbData','loadSppbjData'
  ];
  const _slugMap = {
    loadBahpeData:'bahpe', loadEvatData:'evat', loadEvhpData:'evhp',
    loadFormSpekData:'formspek', loadFormDppData:'formdpp',
    loadNodisData:'nodis', loadRiviuData:'riviu',
    loadPenetapanData:'penetapan', loadIdkbData:'idkb',
    loadSppbjData:'sppbj'
  };
  _loaders.forEach(function(fn) {
    const orig = window[fn];
    if (typeof orig !== 'function') return;
    window[fn] = function() {
      orig.apply(this, arguments);
      setTimeout(function() { _applyDocZoom(_slugMap[fn]); }, 50);
    };
  });

  // Legacy aliases kept for BAHPE buttons already in HTML
  window.bahpeZoom      = function(d) { window.docZoom('bahpe', d); };
  window.bahpeZoomReset = function()  { window.docZoomReset('bahpe'); };
})();

// ============================================================
//  LIVE CLOCK
// ============================================================
(function initClock() {
  const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  function tick() {
    const now = new Date();
    const tEl = document.getElementById('tc-time');
    const dEl = document.getElementById('tc-date');
    if (tEl) tEl.textContent = now.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
    if (dEl) dEl.textContent = `${HARI[now.getDay()]}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;
  }
  tick();
  setInterval(tick, 1000);
})();

// ============================================================
//  SMOOTH NUMBER COUNTER
// ============================================================
function animateCount(el, target, duration) {
  if (!el) return;
  duration = duration || 750;
  const start = performance.now();
  const from = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;
  (function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (target - from) * eased).toLocaleString('id-ID');
    if (p < 1) requestAnimationFrame(frame);
  })(start);
}

// ============================================================
//  HERO STATS UPDATE
// ============================================================
// Logika sama persis dengan diagram Top 5 Penyedia:
// per RUP, penyedia terpilih = yang memiliki total terendah (negoFinal/totalHarga)
function getPenyediaTerpilih(hargaData) {
  const winners = new Set();
  const rupList = [...new Set(hargaData.map(h => h.rup).filter(Boolean))];
  rupList.forEach(rup => {
    const hargaRup = hargaData.filter(h => String(h.rup) === String(rup));
    if (!hargaRup.length) return;
    const totalsMap = {};
    hargaRup.forEach(h => {
      if (!h.namaPenyedia) return;
      const nilai = (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0)) * (Number(h.qty) || 1);
      totalsMap[h.namaPenyedia] = (totalsMap[h.namaPenyedia] || 0) + nilai;
    });
    const entries = Object.entries(totalsMap).filter(e => e[1] > 0);
    if (!entries.length) return;
    const winner = entries.reduce((a, b) => a[1] <= b[1] ? a : b);
    winners.add(winner[0]);
  });
  return winners;
}

function updateHeroStats() {
  const totalPaket     = state.paket.data.length;
  const totalItem      = state.rincian.data.length;
  const totalHarga     = state.harga.data.length;
  // Penyedia terpilih = sumber data sama dengan diagram Top 5 Penyedia
  const uniquePenyedia = getPenyediaTerpilih(state.harga.data).size;
  animateCount(document.getElementById('hero-total-paket'),    totalPaket);
  animateCount(document.getElementById('hero-total-item'),     totalItem);
  animateCount(document.getElementById('hero-total-penyedia'), uniquePenyedia);
  animateCount(document.getElementById('hero-total-harga'),    totalHarga);
}

// Init v3.0 — tunggu sb-ready dari supabase-db.js
window.addEventListener('sb-ready', async (e) => {
  loadAppConfig();
  applyAppConfig();
  try {
    document.getElementById('csv-format-hint').textContent = CSV_FORMATS['paket'];
  } catch(_) {}

  if (e.detail.loggedIn) {
    // Data sudah di-load oleh supabase-db.js, cukup render
    state.paket.filtered   = [...state.paket.data];
    state.rincian.filtered = [...state.rincian.data];
    state.harga.filtered   = [...state.harga.data];
    state.penyedia.filtered = [...state.penyedia.data];
    dashboardFilteredPaket   = [...state.paket.data];
    dashboardFilteredRincian = [...state.rincian.data];
    dashboardFilteredHarga   = [...state.harga.data];
    renderAll();
    updateBadges();
    populateDropdowns();
    populateEvatRupSelect();
    populateEvatPejabatSelect();
    populateEvhpRupSelect();
    populateEvhpPejabatSelect();
    populateFormSpekSelects();
    populateFormDppSelects();
    populatePenetapanSelects();
    populateIdkbSelects();
    populateDashboardFilters();
  }
  showPage('dashboard');
});

// Fallback jika sb-ready tidak terpanggil dalam 8 detik
setTimeout(() => {
  if (!window._sbReady) {
    loadAppConfig();
    applyAppConfig();
    showPage('dashboard');
  }
}, 8000);

// ── NOMOR DOKUMEN KUSTOM ──────────────────────────────────────────────────────
if (typeof _nomorState === 'undefined') var _nomorState = {};

function openNomorDialog(btn) {
  const slug  = btn.getAttribute('data-slug');
  const rup   = btn.getAttribute('data-rup');
  const field = btn.getAttribute('data-field');
  const cur   = btn.getAttribute('data-cur');
  _nomorState = { slug, rup, field };
  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  document.getElementById('nomor-dialog-sub').textContent =
    `Dokumen : ${slug.toUpperCase()}   •   RUP : ${rup}`;
  const inp = document.getElementById('nomor-dialog-input');
  inp.value       = paket && paket[field] ? paket[field] : '';
  inp.placeholder = cur;
  document.getElementById('nomor-dialog').style.display = 'flex';
  setTimeout(() => inp.focus(), 60);
}

function closeNomorDialog() {
  document.getElementById('nomor-dialog').style.display = 'none';
  _nomorState = {};
}

async function saveNomorDialog() {
  const { slug, rup, field } = _nomorState;
  const val   = (document.getElementById('nomor-dialog-input').value || '').trim();
  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) { closeNomorDialog(); return; }
  if (val) paket[field] = val; else delete paket[field];
  await dbPut('paket', paket);
  state.paket.data = await dbGetAll('paket');
  closeNomorDialog();
  const R = {
    evat: loadEvatData, evhp: loadEvhpData, formspek: loadFormSpekData,
    riviu: loadRiviuData, penetapan: loadPenetapanData, idkb: loadIdkbData,
    nodis: loadNodisData, formdpp: loadFormDppData, bahpe: loadBahpeData,
    sppbj: loadSppbjData
  };
  if (R[slug]) R[slug]();
}

// ============================================================
//  THEME TOGGLE (DARK / LIGHT)
// ============================================================
(function initTheme() {
  const saved = localStorage.getItem('sideva_theme') || 'dark';
  if (saved === 'light') document.body.classList.add('light-mode');
  updateThemeBtn();
})();
function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  localStorage.setItem('sideva_theme', isLight ? 'light' : 'dark');
  updateThemeBtn();
  toast('Tema ' + (isLight ? 'Terang ☀️' : 'Gelap 🌙') + ' aktif', 'info');
}
function updateThemeBtn() {
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
}

// ============================================================
//  KEYBOARD SHORTCUTS  (Mac ⌘ + Windows/Linux Ctrl)
// ============================================================
var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
              (navigator.userAgent||'').includes('Mac OS X');

// Simbol tampilan sesuai platform
if (!window.KBD) window.KBD = {
  mod:   isMac ? '⌘' : 'Ctrl',
  shift: isMac ? '⇧' : 'Shift',
  alt:   isMac ? '⌥' : 'Alt',
  ctrl:  isMac ? '⌃' : 'Ctrl',
};
var KBD = window.KBD;

// Helper: deteksi modifier key lintas platform
function _modKey(e)   { return isMac ? e.metaKey : e.ctrlKey; }
function _modOnly(e)  { return _modKey(e) && !e.shiftKey && !e.altKey; }
function _modShift(e) { return _modKey(e) && e.shiftKey && !e.altKey; }

document.addEventListener('keydown', function(e) {
  const tag = (document.activeElement?.tagName||'').toLowerCase();
  const typing = ['input','textarea','select'].includes(tag);

  if (e.key === 'Escape')                                   { closeGlobalSearch(); closeShortcutModal(); closeNotifPanel(); return; }
  if (_modOnly(e)  && e.key === 'k')                        { e.preventDefault(); openGlobalSearch(); return; }
  if (_modShift(e) && e.key === 'L')                        { e.preventDefault(); toggleTheme(); return; }
  if (_modShift(e) && e.key === 'N')                        { e.preventDefault(); toggleNotifPanel(); return; }
  if (_modOnly(e)  && e.key === 'n'     && !typing)         { e.preventDefault(); openAddModal(); return; }
  if (_modOnly(e)  && e.key === 'e'     && !typing)         { e.preventDefault(); exportCurrentView(); return; }
  if (_modOnly(e)  && e.key === 'b'     && !typing)         { e.preventDefault(); backupDB(); return; }
  if (_modOnly(e)  && e.key === '1')                        { e.preventDefault(); showPage('dashboard'); return; }
  if (_modOnly(e)  && e.key === '2')                        { e.preventDefault(); showPage('paket'); return; }
  if (_modOnly(e)  && e.key === '3')                        { e.preventDefault(); showPage('rincian'); return; }
  if (_modOnly(e)  && e.key === '4')                        { e.preventDefault(); showPage('harga'); return; }
  if (_modOnly(e)  && e.key === '5')                        { e.preventDefault(); showPage('penyedia'); return; }
  if (e.key === '?' && !typing)                             { openShortcutModal(); return; }
});

// Buat <kbd> untuk satu tombol (pakai class mac-sym untuk simbol Mac)
function _kbd(label) {
  const isSym = isMac && /^[⌘⇧⌥⌃]$/.test(label);
  return `<kbd${isSym ? ' class="mac-sym"' : ''}>${label}</kbd>`;
}
// Rangkai beberapa tombol
function _keys(...labels) {
  return `<span class="shortcut-key">${labels.map(_kbd).join('')}</span>`;
}
// Satu baris shortcut
function _srow(desc, ...keys) {
  return `<div class="shortcut-row"><span class="shortcut-desc">${desc}</span>${_keys(...keys)}</div>`;
}

function renderShortcutModal() {
  const M = KBD.mod;
  const S = KBD.shift;
  const platformLabel = isMac
    ? '🍎 macOS — tombol ⌘ Command'
    : '🪟 Windows / Linux — tombol Ctrl';

  const html = `
    <div class="shortcut-platform-badge">${platformLabel}</div>
    <div class="shortcut-grid">
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--gold-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-family:var(--font-display)">Navigasi</div>
        ${_srow('Pencarian Global',  M, 'K')}
        ${_srow('Dashboard',         M, '1')}
        ${_srow('Data Paket',        M, '2')}
        ${_srow('Rincian Belanja',   M, '3')}
        ${_srow('Survey Harga',      M, '4')}
        ${_srow('Data Penyedia',     M, '5')}
      </div>
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--gold-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-family:var(--font-display)">Aksi</div>
        ${_srow('Tambah Data Baru',  M, 'N')}
        ${_srow('Ekspor CSV',        M, 'E')}
        ${_srow('Backup Database',   M, 'B')}
        ${_srow('Toggle Tema',       M, S, 'L')}
        ${_srow('Notifikasi',        M, S, 'N')}
        ${_srow('Tutup / Batal',     'Esc')}
        ${_srow('Shortcut ini',      '?')}
      </div>
    </div>
    ${isMac ? `<div style="margin-top:12px;font-size:11px;color:var(--text3);border-top:1px solid var(--border-dim);padding-top:10px;">
      <span style="margin-right:16px;">${_kbd('⌘')} Command</span>
      <span style="margin-right:16px;">${_kbd('⇧')} Shift</span>
      <span style="margin-right:16px;">${_kbd('⌥')} Option</span>
      <span>${_kbd('⌃')} Control</span>
    </div>` : ''}
  `;
  const body = document.getElementById('shortcut-modal-body');
  if (body) body.innerHTML = html;
}

function openShortcutModal()  {
  renderShortcutModal();
  document.getElementById('shortcut-modal').classList.add('open');
}
function closeShortcutModal() { document.getElementById('shortcut-modal').classList.remove('open'); }

// ============================================================
//  GLOBAL SEARCH
// ============================================================
if (typeof _gsIndex === 'undefined') var _gsIndex = -1;
function openGlobalSearch() {
  document.getElementById('global-search-overlay').classList.add('open');
  const inp = document.getElementById('global-search-input');
  inp.value = '';
  document.getElementById('global-search-results').innerHTML = '';
  document.getElementById('global-search-empty').style.display = 'none';
  setTimeout(() => inp.focus(), 60);
  _gsIndex = -1;
}
function closeGlobalSearch() { document.getElementById('global-search-overlay').classList.remove('open'); }
function handleSearchKey(e) {
  const items = document.querySelectorAll('.gs-item');
  if (e.key === 'ArrowDown') { e.preventDefault(); _gsIndex = Math.min(_gsIndex+1, items.length-1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _gsIndex = Math.max(_gsIndex-1, 0); }
  else if (e.key === 'Enter' && items[_gsIndex]) { items[_gsIndex].click(); return; }
  items.forEach((el,i) => el.classList.toggle('gs-active', i === _gsIndex));
  if (items[_gsIndex]) items[_gsIndex].scrollIntoView({block:'nearest'});
}
function _gsGoto(page) { closeGlobalSearch(); showPage(page); }
function runGlobalSearch(q) {
  _gsIndex = -1;
  const container = document.getElementById('global-search-results');
  const empty = document.getElementById('global-search-empty');
  q = q.trim().toLowerCase();
  if (q.length < 2) { container.innerHTML = ''; empty.style.display = 'none'; return; }
  const results = [];

  // ── Data Utama ──
  state.paket.data.forEach(p => {
    if ([p.namaPaket,p.rup,p.opd,p.bidang,p.program,p.kegiatan,p.subKegiatan].some(f=>f&&String(f).toLowerCase().includes(q)))
      results.push({icon:'📦',title:p.namaPaket||'-',sub:'RUP: '+p.rup+' · '+(p.bidang||''),badge:'Paket',page:'paket'});
  });
  state.rincian.data.forEach(r => {
    if ([r.itemBarang,r.rup,r.satuan,r.user].some(f=>f&&String(f).toLowerCase().includes(q)))
      results.push({icon:'🧾',title:r.itemBarang||'-',sub:'RUP: '+r.rup+' · Vol: '+r.vol+' '+(r.satuan||''),badge:'Rincian',page:'rincian'});
  });
  state.harga.data.forEach(h => {
    if ([h.namaItem,h.namaPenyedia,h.rup,h.namaProduk,h.namaItem].some(f=>f&&String(f).toLowerCase().includes(q)))
      results.push({icon:'🏷️',title:h.namaItem||h.namaProduk||'-',sub:'Penyedia: '+(h.namaPenyedia||'-')+' · RUP: '+h.rup,badge:'Harga',page:'harga'});
  });
  state.penyedia.data.forEach(p => {
    if ([p.namaPenyedia,p.alamat,p.bentukUsaha,p.linkToko].some(f=>f&&String(f).toLowerCase().includes(q)))
      results.push({icon:'🏪',title:p.namaPenyedia||'-',sub:(p.bentukUsaha||'')+' · '+(p.tipe||''),badge:'Penyedia',page:'penyedia'});
  });

  // ── Data Master ──
  masterState.bidang.forEach(b => {
    if ([b.namaBidang,b.kepalaBidang,b.nip,b.kodeSurat].some(f=>f&&String(f).toLowerCase().includes(q)))
      results.push({icon:'🏢',title:b.namaBidang||'-',sub:'Kepala: '+(b.kepalaBidang||'-')+' · NIP: '+(b.nip||'-'),badge:'Bidang',page:'master'});
  });
  masterState.opd.forEach(o => {
    if (o.namaOpd && String(o.namaOpd).toLowerCase().includes(q))
      results.push({icon:'🏛️',title:o.namaOpd||'-',sub:'OPD',badge:'OPD',page:'master'});
  });
  masterState.rekening.forEach(r => {
    if ([r.kodeRekening,r.linkEkatalog].some(f=>f&&String(f).toLowerCase().includes(q)))
      results.push({icon:'💰',title:r.kodeRekening||'-',sub:'Kode Rekening Belanja',badge:'Rekening',page:'master'});
  });
  masterState.ppk.forEach(p => {
    if ([p.namaPPK||p.nama,p.nipPPK||p.nip,p.jabatan].some(f=>f&&String(f).toLowerCase().includes(q)))
      results.push({icon:'👤',title:p.namaPPK||p.nama||'-',sub:'NIP: '+(p.nipPPK||p.nip||'-')+' · '+(p.jabatan||'PPK'),badge:'PPK',page:'master'});
  });
  masterState.pejabatPengadaan.forEach(p => {
    if ([p.nama,p.nip,p.jabatan].some(f=>f&&String(f).toLowerCase().includes(q)))
      results.push({icon:'🪪',title:p.nama||'-',sub:'NIP: '+(p.nip||'-')+' · '+(p.jabatan||'Pejabat Pengadaan'),badge:'Pejabat',page:'master'});
  });
  masterState.ecatalog.forEach(e => {
    if ([e.jenisBelanja,e.linkEkatalog].some(f=>f&&String(f).toLowerCase().includes(q)))
      results.push({icon:'🔗',title:e.jenisBelanja||'-',sub:e.linkEkatalog||'-',badge:'E-Catalog',page:'ecatalog'});
  });

  // ── Navigasi Halaman ──
  const navPages = [
    {key:'dashboard',   icon:'📊', label:'Dashboard',         badge:'Halaman'},
    {key:'paket',       icon:'📦', label:'Data Paket',        badge:'Halaman'},
    {key:'rincian',     icon:'🧾', label:'Rincian Belanja',   badge:'Halaman'},
    {key:'harga',       icon:'🏷️', label:'Survey Harga',      badge:'Halaman'},
    {key:'penyedia',    icon:'🏪', label:'Data Penyedia',     badge:'Halaman'},
    {key:'master',      icon:'⚙️', label:'Data Master',       badge:'Halaman'},
    {key:'evat',        icon:'📄', label:'EV_AT',             badge:'Dokumen'},
    {key:'evhp',        icon:'📑', label:'EV_HP',             badge:'Dokumen'},
    {key:'formspek',    icon:'🧷', label:'Form Spek',         badge:'Dokumen'},
    {key:'formdpp',     icon:'🧮', label:'Form DPP',          badge:'Dokumen'},
    {key:'nodis',       icon:'📬', label:'Nota Dinas',        badge:'Dokumen'},
    {key:'riviu',       icon:'📝', label:'Riviu',             badge:'Dokumen'},
    {key:'penetapan',   icon:'✅', label:'Form Penetapan',    badge:'Dokumen'},
    {key:'idkb',        icon:'🪪', label:'Form IDKB',         badge:'Dokumen'},
    {key:'bahpe',       icon:'📋', label:'BAHPE',             badge:'Dokumen'},
    {key:'ecatalog',    icon:'🔗', label:'Link E-Catalog',    badge:'Halaman'},
    {key:'import',      icon:'📥', label:'Import Data',       badge:'Halaman'},
    {key:'backup',      icon:'💾', label:'Backup / Restore',  badge:'Halaman'},
    {key:'pengaturan',  icon:'🏛️', label:'Pengaturan Instansi',badge:'Halaman'},
    {key:'laporan',     icon:'📊', label:'Laporan Realisasi',  badge:'Halaman'},
  ];
  navPages.forEach(n => {
    if (n.label.toLowerCase().includes(q) || n.key.toLowerCase().includes(q))
      results.push({icon:n.icon, title:n.label, sub:'Buka halaman '+n.label, badge:n.badge, page:n.key});
  });

  if (!results.length) { container.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display = 'none';
  const grouped = {};
  results.slice(0,60).forEach(r => { if(!grouped[r.badge]) grouped[r.badge]=[]; grouped[r.badge].push(r); });
  let html = '';
  Object.entries(grouped).forEach(([label,items]) => {
    html += '<div class="gs-section-label">'+label+' ('+items.length+')</div>';
    items.forEach(r => {
      html += '<div class="gs-item" onclick="_gsGoto(\''+r.page+'\')"><span class="gs-item-icon">'+r.icon+'</span><div class="gs-item-main"><div class="gs-item-title">'+r.title+'</div><div class="gs-item-sub">'+r.sub+'</div></div><span class="gs-item-badge">'+r.badge+'</span></div>';
    });
  });
  if (results.length > 60) html += '<div style="padding:8px 22px;font-size:11px;color:var(--text3)">... dan '+(results.length-60)+' hasil lain. Perjelas kata kunci.</div>';
  container.innerHTML = html;
}

// ── Debounce helper (performa pencarian) ──
function _debounce(fn, delay) {
  let t;
  return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), delay); };
}
var runGlobalSearchDebounced = _debounce(runGlobalSearch, 200);

// ============================================================
//  PREFERENSI NOTIFIKASI
// ============================================================
if (!window.NOTIF_PREF_CATEGORIES) window.NOTIF_PREF_CATEGORIES = [
  { key: 'paket_deadline',  icon: '⏰', label: 'Paket mendekati deadline (≤7 hari)',       desc: 'Tampilkan pengingat ketika paket pengadaan hampir berakhir' },
  { key: 'paket_terlambat', icon: '❌', label: 'Paket melewati tanggal selesai',            desc: 'Tampilkan peringatan ketika paket sudah melewati batas waktu' },
  { key: 'anggaran_pagu',   icon: '💰', label: 'Harga nego mendekati/melebihi pagu total',  desc: 'Tampilkan notifikasi ketika total harga nego mencapai ≥90% dari total pagu' },
  { key: 'survey_kosong',   icon: '📊', label: 'Belum ada data Survey Harga',               desc: 'Ingatkan jika belum ada data survey harga sama sekali' },
  { key: 'auto_backup',     icon: '💾', label: 'Status auto backup',                        desc: 'Tampilkan notifikasi hasil backup otomatis (berhasil atau gagal)' },
  { key: 'kontrak_pagu',    icon: '🚨', label: 'Nilai kontrak melebihi/mendekati pagu RUP', desc: 'Tampilkan peringatan jika nilai kontrak per RUP melebihi atau hampir melebihi pagu' },
];

if (typeof DEFAULT_NOTIF_PREFS === 'undefined') var DEFAULT_NOTIF_PREFS = Object.fromEntries((window.NOTIF_PREF_CATEGORIES||[]).map(c => [c.key, true]));
if (typeof notifPrefs === 'undefined') var notifPrefs = { ...DEFAULT_NOTIF_PREFS };
var NOTIF_PREF_CATEGORIES = window.NOTIF_PREF_CATEGORIES;

function loadNotifPrefs() {
  try {
    const saved = localStorage.getItem('sideva_notif_prefs');
    if (saved) notifPrefs = { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(saved) };
  } catch(e) { notifPrefs = { ...DEFAULT_NOTIF_PREFS }; }
}
function saveNotifPrefs() {
  localStorage.setItem('sideva_notif_prefs', JSON.stringify(notifPrefs));
}
function isNotifEnabled(key) {
  return notifPrefs[key] !== false;
}
function saveNotifPrefsFromUI() {
  NOTIF_PREF_CATEGORIES.forEach(c => {
    const el = document.getElementById('notifpref-' + c.key);
    if (el) notifPrefs[c.key] = el.checked;
  });
  saveNotifPrefs();
  toast('Preferensi notifikasi berhasil disimpan!', 'success');
}
function resetNotifPrefs() {
  if (!confirm('Reset preferensi notifikasi ke default (semua aktif)?')) return;
  notifPrefs = { ...DEFAULT_NOTIF_PREFS };
  saveNotifPrefs();
  _fillNotifPrefsUI();
  toast('Preferensi notifikasi direset ke default.', 'info');
}
function _fillNotifPrefsUI() {
  NOTIF_PREF_CATEGORIES.forEach(c => {
    const el = document.getElementById('notifpref-' + c.key);
    if (el) el.checked = notifPrefs[c.key] !== false;
  });
}
function initNotifPrefsUI() {
  const page = document.getElementById('page-pengaturan');
  if (!page) return;
  const existingSection = document.getElementById('notif-prefs-section');
  if (existingSection) { _fillNotifPrefsUI(); return; }
  const section = document.createElement('div');
  section.id = 'notif-prefs-section';
  section.style.cssText = 'margin-top:24px;';
  section.innerHTML = `
    <div class="card" style="margin-bottom:0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:20px;">🔔</span>
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text);">Preferensi Notifikasi</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px;">Pilih jenis notifikasi yang ingin ditampilkan di panel notifikasi</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;" id="notif-prefs-list">
        ${NOTIF_PREF_CATEGORIES.map(c => `
          <label style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;"
                 onmouseover="this.style.borderColor='var(--primary,#4f6ef7)'" onmouseout="this.style.borderColor='var(--border)'">
            <input type="checkbox" id="notifpref-${c.key}"
                   style="width:16px;height:16px;margin-top:2px;accent-color:var(--primary,#4f6ef7);flex-shrink:0;cursor:pointer;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:6px;">
                <span>${c.icon}</span><span>${c.label}</span>
              </div>
              <div style="font-size:11.5px;color:var(--text2);margin-top:3px;line-height:1.45;">${c.desc}</div>
            </div>
          </label>`).join('')}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="saveNotifPrefsFromUI()" style="min-width:160px;">
          💾 Simpan Preferensi
        </button>
        <button class="btn btn-secondary" onclick="resetNotifPrefs()" style="min-width:130px;">
          🔄 Reset Default
        </button>
      </div>
    </div>
  `;
  page.appendChild(section);
  _fillNotifPrefsUI();
}

// Muat preferensi notifikasi saat script pertama kali dijalankan
loadNotifPrefs();

// ============================================================
//  NOTIFIKASI & PENGINGAT
// ============================================================
if (typeof _notifList === 'undefined') var _notifList = [];
function addNotif(icon, title) {
  _notifList.unshift({icon, title, time:new Date(), unread:true});
  if (_notifList.length > 50) _notifList = _notifList.slice(0,50);
  renderNotifPanel(); updateNotifBadge();
}
function renderNotifPanel() {
  const el = document.getElementById('notif-list');
  if (!el) return;
  if (!_notifList.length) { el.innerHTML='<div class="notif-empty">Tidak ada notifikasi saat ini.</div>'; return; }
  const BULAN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  el.innerHTML = _notifList.map(n => {
    const d=new Date(n.time);
    const t=d.getDate()+' '+BULAN[d.getMonth()]+' '+d.getFullYear()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    return '<div class="notif-item '+(n.unread?'unread':'')+'"><span class="notif-item-icon">'+n.icon+'</span><div class="notif-item-body"><div class="notif-item-title">'+n.title+'</div><div class="notif-item-time">'+t+'</div></div></div>';
  }).join('');
}
function updateNotifBadge() {
  const unread = _notifList.filter(n=>n.unread).length;
  const badge = document.getElementById('notif-badge');
  if (badge) { badge.style.display=unread>0?'flex':'none'; badge.textContent=unread>9?'9+':unread; }
}
function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) { _notifList.forEach(n=>n.unread=false); updateNotifBadge(); }
}
function closeNotifPanel() { document.getElementById('notif-panel').classList.remove('open'); }
function clearAllNotif() { _notifList.forEach(n=>n.unread=false); renderNotifPanel(); updateNotifBadge(); }
document.addEventListener('click', function(e) {
  const panel=document.getElementById('notif-panel'), btn=document.getElementById('notif-btn');
  if (panel&&panel.classList.contains('open')&&!panel.contains(e.target)&&btn&&!btn.contains(e.target))
    panel.classList.remove('open');
});
function checkNotifications() {
  const now = new Date();
  state.paket.data.forEach(p => {
    if (!p.tanggalSelesai) return;
    const selesai = new Date(p.tanggalSelesai);
    const diff = Math.ceil((selesai - now)/(1000*60*60*24));
    if (diff >= 0 && diff <= 7 && isNotifEnabled('paket_deadline')) addNotif(diff<=2?'🚨':'⏰','Paket "'+( p.namaPaket||p.rup)+'" berakhir dalam '+diff+' hari ('+p.tanggalSelesai+')');
    if (diff < 0 && diff >= -3 && isNotifEnabled('paket_terlambat')) addNotif('❌','Paket "'+(p.namaPaket||p.rup)+'" telah melewati tanggal selesai '+Math.abs(diff)+' hari lalu!');
  });
  const totalPagu = state.paket.data.reduce((s,p)=>s+(Number(p.paguAnggaran)||0),0);
  // FIX v1.2: gunakan _hitungNilaiPenetapan agar konsisten dengan tampilan UI & laporan
  const totalNego = typeof _hitungNilaiPenetapan === 'function'
    ? state.paket.data.reduce((s,p)=>s+_hitungNilaiPenetapan(p.rup),0)
    : state.paket.data.reduce((s,p)=>s+_nilaiNegoPemenang(state.harga.data.filter(h=>String(h.rup)===String(p.rup))),0);
  if (totalPagu>0 && totalNego>0 && (totalNego/totalPagu)>=0.9 && isNotifEnabled('anggaran_pagu'))
    addNotif('💰','Total harga nego sudah '+(((totalNego/totalPagu)*100).toFixed(1))+'% dari total pagu anggaran!');
  if (state.paket.data.length>0 && state.harga.data.length===0 && isNotifEnabled('survey_kosong'))
    addNotif('📊','Belum ada data Survey Harga. Silakan tambahkan data harga.');
}

// ============================================================
//  AUTO BACKUP TERJADWAL (setiap 24 jam)
//  — Jika lebih dari 24 jam sejak backup terakhir, langsung backup
//  — Kemudian jadwalkan ulang setiap 24 jam
// ============================================================
if (typeof _autoBackupTimer === 'undefined') var _autoBackupTimer = null;
var AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 jam

async function autoBackupSilent(isManual) {
  try {
    const backup = {};
    for (const store of Object.keys(STORES)) backup[store] = await dbGetAll(store);
    backup._meta = {
      version: DB_VER,
      exported: new Date().toISOString(),
      app: 'SI-DEVA v2.0',
      auto: !isManual,
      instansi: appConfig.singkatan
    };
    const blob = new Blob([JSON.stringify(backup)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    a.download = 'SIDEVA_autobackup_'+ts+'.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    const now = new Date();
    localStorage.setItem('sideva_last_backup', now.toISOString());
    _updateBackupStatusUI(now);
    if (isNotifEnabled('auto_backup')) addNotif('💾','Auto backup berhasil ('+ ts.replace('T',' ') +')');
  } catch(e) {
    if (isNotifEnabled('auto_backup')) addNotif('⚠️','Auto backup gagal: '+e.message);
  }
}

function _updateBackupStatusUI(date) {
  const el = document.getElementById('auto-backup-status');
  if (!el) return;
  const d = date instanceof Date ? date : new Date(date);
  const tgl = d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'2-digit'});
  const jam = d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  el.textContent = '💾 Backup: ' + tgl + ' ' + jam;
}

function startAutoBackup() {
  if (_autoBackupTimer) clearInterval(_autoBackupTimer);

  const lastBackupStr = localStorage.getItem('sideva_last_backup');
  const lastBackup    = lastBackupStr ? new Date(lastBackupStr) : null;
  const now           = new Date();
  const msElapsed     = lastBackup ? (now - lastBackup) : Infinity;

  if (lastBackup) {
    _updateBackupStatusUI(lastBackup);
    // Jika sudah lebih dari 24 jam sejak backup terakhir, langsung backup sekarang
    if (msElapsed >= AUTO_BACKUP_INTERVAL_MS) {
      setTimeout(autoBackupSilent, 5000); // tunda 5 detik agar app selesai inisalisasi
      _autoBackupTimer = setInterval(autoBackupSilent, AUTO_BACKUP_INTERVAL_MS);
    } else {
      // Jadwalkan sisa waktu menuju 24 jam, lalu interval normal
      const remaining = AUTO_BACKUP_INTERVAL_MS - msElapsed;
      const el = document.getElementById('auto-backup-status');
      if (el) {
        const nextDate = new Date(now.getTime() + remaining);
        const nextJam  = nextDate.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
        el.title = 'Backup berikutnya ± ' + nextJam;
      }
      setTimeout(function() {
        autoBackupSilent();
        _autoBackupTimer = setInterval(autoBackupSilent, AUTO_BACKUP_INTERVAL_MS);
      }, remaining);
    }
  } else {
    // Belum pernah backup — jadwalkan pertama kali setelah 24 jam
    const el = document.getElementById('auto-backup-status');
    if (el) el.textContent = '💾 Auto backup: aktif (24 jam)';
    _autoBackupTimer = setInterval(autoBackupSilent, AUTO_BACKUP_INTERVAL_MS);
  }
}

function updateBackupPageStatus() {
  const el = document.getElementById('backup-page-status');
  if (!el) return;
  const lastBackupStr = localStorage.getItem('sideva_last_backup');
  if (!lastBackupStr) {
    el.innerHTML = '<span style="color:var(--text3)">⏳ Belum ada backup yang tersimpan. Klik "Backup Sekarang" untuk mulai.</span>';
    return;
  }
  const d = new Date(lastBackupStr);
  const now = new Date();
  const msAgo = now - d;
  const hAgo  = Math.floor(msAgo / 3600000);
  const nextMs = AUTO_BACKUP_INTERVAL_MS - msAgo;
  const nextH  = Math.max(0, Math.floor(nextMs / 3600000));
  const nextM  = Math.max(0, Math.floor((nextMs % 3600000) / 60000));
  const tgl = d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
  const jam = d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  el.innerHTML = `
    <span style="color:var(--green)">✅ Backup terakhir: <strong>${tgl}, ${jam}</strong> (${hAgo > 0 ? hAgo + ' jam lalu' : 'baru saja'})</span>
    <span style="display:block;margin-top:4px;color:var(--text3);font-size:11px;">
      Auto backup berikutnya dalam ± ${nextH}j ${nextM}m
    </span>`;
}

// Init auto backup & notifikasi setelah app siap
setTimeout(function() { startAutoBackup(); checkNotifications(); }, 3000);

// ============================================================
//  FITUR BARU v3.0 — Progress Tracker · Validasi Pagu ·
//  Laporan Realisasi · Multi-User Role · Notifikasi Deadline
// ============================================================

// ── Inject CSS tambahan untuk fitur baru ──────────────────────
(function injectFeatureStyles() {
  const s = document.createElement('style');
  s.textContent = `
    /* Progress Tracker */
    .prog-wrap { display:flex; align-items:center; gap:6px; }
    .prog-steps { display:flex; align-items:center; gap:0; }
    .prog-step {
      width:22px; height:22px; border-radius:50%;
      border:2px solid var(--border2); background:var(--surface2);
      display:flex; align-items:center; justify-content:center;
      font-size:10px; cursor:default; transition:all .2s;
      color:var(--text3);
    }
    .prog-step.done { background:#22c55e; border-color:#16a34a; color:#fff; font-size:11px; }
    .prog-line { width:10px; height:2px; background:var(--border2); }
    .prog-line.done { background:#22c55e; }
    .prog-pct { font-size:10px; font-weight:700; color:var(--text3); min-width:28px; }
    /* Deadline Banner */
    #deadline-banner {
      display:none; background:linear-gradient(135deg,#7f1d1d,#991b1b);
      color:#fecaca; padding:10px 20px; border-radius:8px;
      margin-bottom:16px; font-size:12px; line-height:1.5;
    }
    .dl-item {
      display:inline-flex; align-items:center; gap:4px;
      background:rgba(255,255,255,.12); border-radius:20px;
      padding:3px 10px; margin:2px 4px; cursor:pointer;
      transition:background .15s;
    }
    .dl-item:hover { background:rgba(255,255,255,.22); }
    .dl-warn { background:rgba(251,191,36,.15); color:#fde68a; }
    /* Role Badge */
    .role-badge {
      display:inline-flex; align-items:center;
      padding:3px 10px; border-radius:20px; font-size:11px;
      font-weight:600; cursor:pointer; transition:opacity .2s;
      border:1px solid transparent;
    }
    .role-badge:hover { opacity:.8; }
    .role-admin    { background:#1d4ed820; color:#60a5fa; border-color:#1d4ed840; }
    .role-operator { background:#15803d20; color:#4ade80; border-color:#15803d40; }
    .role-viewer   { background:#78350f20; color:#fbbf24; border-color:#78350f40; }
    /* Laporan table */
    #laporan-content .stat-card { cursor:default !important; }
    #laporan-content .stat-card:hover { transform:none !important; box-shadow:none !important; }
    .pagu-bar-wrap { width:80px; height:8px; background:var(--surface2); border-radius:4px; overflow:hidden; }
    .pagu-bar-fill { height:100%; border-radius:4px; transition:width .4s; }
  `;
  document.head.appendChild(s);
})();

// ============================================================
//  FEATURE 8: MULTI-USER ROLE
// ============================================================
if (!window.ROLE_LABELS) window.ROLE_LABELS = { admin:'Admin 👑', operator:'Operator ✏️', viewer:'Viewer 👁️' };
var ROLE_LABELS = window.ROLE_LABELS;
if (typeof _currentRole === 'undefined') var _currentRole = 'operator';

function loadRole() {
  // SESUDAH
_currentRole = (typeof getRole === 'function' && getRole()) || 'viewer';
localStorage.setItem('sideva_role', _currentRole);
  _injectRoleUI();
  applyLegacyRoleUI();
  if (typeof window.applyRoleUI === 'function') window.applyRoleUI();
}
function _injectRoleUI() {
  if (document.getElementById('role-indicator')) return;
  const topbar = document.querySelector('.topbar-actions') || document.querySelector('.topbar');
  if (!topbar) return;
  const badge = document.createElement('button');
  badge.id = 'role-indicator';
  badge.className = 'role-badge role-' + _currentRole;
  badge.title = 'Klik untuk ganti role pengguna';
  badge.textContent = ROLE_LABELS[_currentRole] || _currentRole;
  badge.onclick = openRoleDialog;
  topbar.insertBefore(badge, topbar.firstChild);
}
function setRole(role) {
  _currentRole = role || 'viewer';
  localStorage.setItem('sideva_role', _currentRole);
  const badge = document.getElementById('role-indicator');
  if (badge) { badge.textContent = ROLE_LABELS[_currentRole] || _currentRole; badge.className = 'role-badge role-' + _currentRole; }
  applyLegacyRoleUI();
  if (typeof window.applyRoleUI === 'function') window.applyRoleUI();
  if (typeof toast === 'function') toast('Role: ' + (ROLE_LABELS[_currentRole] || _currentRole), 'success');
}
function getCurrentRole() { return _currentRole; }
function canEdit()  { return _currentRole !== 'viewer'; }
function isAdminRole() { return _currentRole === 'admin' || _currentRole === 'super_admin'; }
function applyLegacyRoleUI() {
  // Nonaktifkan tombol aksi jika viewer
  const sel = '.btn-danger,[onclick*="deleteRow"],[onclick*="deleteHarga"],[onclick*="deletePaket"],[onclick*="deleteRincian"],[onclick*="deletePenyedia"]';
  document.querySelectorAll(sel).forEach(btn => {
    if (!canEdit()) { btn.disabled = true; btn.style.opacity = '0.45'; btn.style.pointerEvents = 'none'; }
    else            { btn.disabled = false; btn.style.opacity = ''; btn.style.pointerEvents = ''; }
  });
}
function applyRoleUI() {
  const showAdmin = isAdminRole();
  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('sideva-visible', showAdmin);
  });
}
function openRoleDialog() {
  if (document.getElementById('role-dialog')) return;
  const cur = _currentRole;
  const roles = Object.entries(ROLE_LABELS);
  const desc  = { admin:'Akses penuh — tambah, edit, hapus semua data', operator:'Bisa input &amp; edit data', viewer:'Hanya bisa melihat — semua tombol edit dinonaktifkan' };
  const opts  = roles.map(([r,l]) => `
    <label style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:8px;
      border:2px solid ${cur===r?'var(--gold)':'var(--border)'};
      background:${cur===r?'var(--gold-subtle2)':'transparent'};cursor:pointer;margin-bottom:8px;">
      <input type="radio" name="rp" value="${r}" ${cur===r?'checked':''} style="accent-color:var(--gold);">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text);">${l}</div>
        <div style="font-size:11px;color:var(--text3);">${desc[r]}</div>
      </div>
    </label>`).join('');
  document.body.insertAdjacentHTML('beforeend', `
    <div id="role-dialog" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;">
      <div style="background:var(--surface);border-radius:12px;padding:28px;width:340px;box-shadow:0 24px 60px rgba(0,0,0,.5);">
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:18px;">👥 Pilih Role Pengguna</div>
        ${opts}
        <div style="display:flex;gap:10px;margin-top:18px;justify-content:flex-end;">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('role-dialog').remove()">Batal</button>
          <button class="btn btn-primary btn-sm" onclick="_applyRoleDialog()">Simpan</button>
        </div>
      </div>
    </div>`);
}
function _applyRoleDialog() {
  const sel = document.querySelector('input[name="rp"]:checked');
  if (sel) setRole(sel.value);
  document.getElementById('role-dialog').remove();
}

// ============================================================
//  FEATURE 1: PROGRESS TRACKER PER PAKET
// ============================================================
if (!window._PROG_STEPS) window._PROG_STEPS = [
  { key:'rincian',    label:'Rincian Belanja', icon:'🧾' },
  { key:'harga',      label:'Survey Harga',    icon:'🏷️' },
  { key:'nego',       label:'Negosiasi',       icon:'🤝' },
  { key:'penetapan',  label:'Penetapan',       icon:'✅' },
  { key:'selesai',    label:'Selesai',         icon:'🎯' },
];

function _getProgressSteps(rup) {
  const rincianOk = state.rincian.data.some(r => String(r.rup) === String(rup));
  const hItems    = state.harga.data.filter(h => String(h.rup) === String(rup));
  const hargaOk   = hItems.length > 0;
  const negoOk    = hItems.some(h => Number(h.negoFinal) > 0);
  const paket     = state.paket.data.find(p => String(p.rup) === String(rup));
  const st        = (paket ? paket.status || '' : '').toLowerCase();
  const penetapanOk = negoOk && (st.includes('kontrak') || st.includes('penetap') || st.includes('selesai') || st.includes('sppbj'));
  const selesaiOk   = st.includes('selesai');
  return [rincianOk, hargaOk, negoOk, penetapanOk, selesaiOk];
}

function renderProgressBar(rup) {
  const steps    = _getProgressSteps(rup);
  const done     = steps.filter(Boolean).length;
  const pct      = Math.round((done / steps.length) * 100);
  const barColor = pct === 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#64748b';
  const stepHtml = _PROG_STEPS.map((s, i) =>
    `<div class="prog-step${steps[i]?' done':''}" title="${s.label}: ${steps[i]?'✓ Selesai':'Belum'}">${steps[i]?'✓':s.icon}</div>` +
    (i < _PROG_STEPS.length - 1 ? `<div class="prog-line${steps[i]?' done':''}"></div>` : '')
  ).join('');
  return `<div class="prog-wrap"><div class="prog-steps">${stepHtml}</div>
    <span class="prog-pct" style="color:${barColor}">${pct}%</span></div>`;
}

function showProgressDetail(rup) {
  const steps = _getProgressSteps(rup);
  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  const nama  = paket ? (paket.namaPaket || 'RUP ' + rup) : 'RUP ' + rup;
  const rows  = _PROG_STEPS.map((s, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
      <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
        background:${steps[i]?'#22c55e20':'var(--surface2)'};border:2px solid ${steps[i]?'#22c55e':'var(--border2)'};">
var _PROG_STEPS = window._PROG_STEPS;
        <span style="font-size:14px;">${steps[i]?'✅':s.icon}</span>
      </div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:var(--text);">${s.label}</div>
        <div style="font-size:11px;color:${steps[i]?'#22c55e':'var(--text3)'};">${steps[i]?'Selesai':'Belum dikerjakan'}</div>
      </div>
    </div>`).join('');
  if (document.getElementById('prog-detail-dialog')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="prog-detail-dialog" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;">
      <div style="background:var(--surface);border-radius:12px;padding:24px;width:360px;max-height:80vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.5);">
        <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;">📊 Progress Tracker</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:16px;">${strTrunc(nama,50)}</div>
        ${rows}
        <button class="btn btn-secondary btn-sm" style="margin-top:16px;width:100%;" onclick="document.getElementById('prog-detail-dialog').remove()">Tutup</button>
      </div>
    </div>`);
}

// ============================================================
//  HELPER: hitung Total Hasil Negosiasi pemenang untuk satu RUP
//  Formula identik EV_HP & BAHPE:
//  → cari penyedia dengan total (negoFinal||hargaTayang)×qty terendah,
//    kemudian sum hanya baris milik pemenang tersebut.
// ============================================================
function _nilaiNegoPemenang(hargaArr) {
  if (!hargaArr || !hargaArr.length) return 0;
  const totMap = {};
  hargaArr.forEach(h => {
    if (!h.namaPenyedia) return;
    totMap[h.namaPenyedia] = (totMap[h.namaPenyedia] || 0)
      + (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0)) * (Number(h.qty) || 1);
  });
  const entries = Object.entries(totMap).filter(e => e[1] > 0);
  if (!entries.length) return 0;
  const winner = entries.reduce((a, b) => a[1] <= b[1] ? a : b)[0];
  return hargaArr
    .filter(h => h.namaPenyedia === winner)
    .reduce((s, h) => s + (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0)) * (Number(h.qty) || 1), 0);
}

function _getPemenangKontrakRup(rup) {
  const hargaArr = state.harga.data.filter(h => String(h.rup) === String(rup));
  if (!hargaArr.length) return { nama: '-', total: 0 };
  const totMap = {};
  hargaArr.forEach(h => {
    if (!h.namaPenyedia) return;
    totMap[h.namaPenyedia] = (totMap[h.namaPenyedia] || 0)
      + (Number(h.negoFinal) > 0 ? Number(h.negoFinal) : (Number(h.hargaTayang) || 0)) * (Number(h.qty) || 1);
  });
  const entries = Object.entries(totMap).filter(e => e[1] > 0);
  if (!entries.length) return { nama: '-', total: 0 };
  const winner = entries.reduce((a, b) => a[1] <= b[1] ? a : b);
  return { nama: winner[0], total: winner[1] || 0 };
}

// ============================================================
//  FEATURE 2: VALIDASI NILAI KONTRAK vs PAGU
// ============================================================
function cekValidasiPagu(rup) {
  const paket = state.paket.data.find(p => String(p.rup) === String(rup));
  if (!paket) return null;
  const pagu = Number(paket.paguAnggaran) || 0;
  if (!pagu) return null;
  // FIX v1.1: gunakan _hitungNilaiPenetapan (laporan-print-patch.js) agar
  // formula validasi identik dengan angka yang ditampilkan di UI & laporan.
  // Formula lama menjumlah semua baris harga tanpa filter penyedia terpilih,
  // sehingga nilai bisa lebih besar dari yang tampil → notifikasi palsu.
  const totalNego = typeof _hitungNilaiPenetapan === 'function'
    ? _hitungNilaiPenetapan(rup)
    : _nilaiNegoPemenang(state.harga.data.filter(h => String(h.rup) === String(rup)));
  const pct = (totalNego / pagu) * 100;
  return { pagu, totalNego, pct, over: totalNego > pagu, efisiensi: pagu - totalNego };
}

function validasiPaguAfterSave(rup) {
  if (!rup) return;
  const r = cekValidasiPagu(rup);
  if (!r || !r.totalNego) return;
  if (r.over) {
    if (isNotifEnabled('kontrak_pagu')) {
      addNotif('🚨', `RUP ${rup}: Nilai kontrak ${fmtRp(r.totalNego)} MELEBIHI pagu ${fmtRp(r.pagu)}!`);
      if (typeof toast === 'function')
        toast(`⚠️ Nilai kontrak melebihi pagu untuk RUP ${rup}! Selisih: ${fmtRp(Math.abs(r.efisiensi))}`, 'error');
    }
  } else if (r.pct >= 90) {
    if (isNotifEnabled('kontrak_pagu')) addNotif('💰', `RUP ${rup}: Nilai kontrak sudah ${r.pct.toFixed(1)}% dari pagu (${fmtRp(r.pagu)})`);
  }
}

// Patch: jalankan validasi setiap kali harga disimpan
// FIX v1.2:
// - Pakai flag _appFullyLoaded (di-set 2 detik setelah sb-ready) sehingga
//   semua renderHarga yang terjadi saat inisialisasi awal (renderAll, filter,
//   gotoPage, dsb.) tidak memicu notifikasi palsu.
// - Validasi hanya menyentuh RUP yang benar-benar berubah jumlah datanya,
//   bukan sekedar filter / paginasi / sort yang juga memanggil renderHarga.
if (!window._origRenderHarga) window._origRenderHarga = window.renderHarga;
var _origRenderHarga = window._origRenderHarga;
if (typeof _appFullyLoaded === 'undefined')  var _appFullyLoaded  = false;
if (typeof _lastHargaLength === 'undefined') var _lastHargaLength = -1;
window.addEventListener('sb-ready', function() {
  // Beri jeda 2 detik setelah data load agar semua render awal selesai dulu
  setTimeout(function() {
    _appFullyLoaded  = true;
    _lastHargaLength = state.harga.data.length;
  }, 2000);
});
if (typeof renderHarga === 'function') {
  const __origRH = renderHarga;
  window.renderHarga = function() {
    __origRH.apply(this, arguments);
    if (!_appFullyLoaded) return; // skip selama inisialisasi
    // Hanya validasi jika jumlah record harga benar-benar berubah
    const curLen = state.harga.data.length;
    if (curLen === _lastHargaLength) return;
    _lastHargaLength = curLen;
    const rupSet = [...new Set(state.harga.data.map(h => h.rup).filter(Boolean))];
    rupSet.forEach(r => validasiPaguAfterSave(r));
  };
}

// ============================================================
//  FEATURE 5: LAPORAN REALISASI ANGGARAN
// ============================================================
function renderLaporan() {
  const el = document.getElementById('laporan-content');
  if (!el) return;
  const bidangSel = document.getElementById('laporan-filter-bidang');
  const normTxt = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Pastikan opsi filter bidang selalu terisi dari data paket terbaru.
  if (bidangSel) {
    const curBidang = bidangSel.value || '';
    const bidangVals = [...new Set(state.paket.data.map(p => String(p.bidang || '').trim()).filter(Boolean))].sort();
    bidangSel.innerHTML = '<option value="">Semua Bidang</option>' +
      bidangVals.map(b => `<option value="${b}">${b}</option>`).join('');
    if (curBidang && bidangVals.some(b => normTxt(b) === normTxt(curBidang))) {
      const matched = bidangVals.find(b => normTxt(b) === normTxt(curBidang));
      bidangSel.value = matched || '';
    }
  }

  if (!state.paket.data.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Belum ada data</div><div class="empty-sub">Tambahkan Data Paket terlebih dahulu</div></div>';
    return;
  }
  const _lBidang  = bidangSel?.value || '';
  const _lProgres = document.getElementById('laporan-filter-progres')?.value || '';
  const _lPagu    = document.getElementById('laporan-filter-pagu')?.value    || '';
  const _lTahun   = document.getElementById('laporan-filter-tahun')?.value   || '';
  const _paketSrc = state.paket.data.filter(p => {
    if (_lBidang && normTxt(p.bidang) !== normTxt(_lBidang)) return false;
    if (_lTahun && !(p.tanggalPesanan && new Date(p.tanggalPesanan).getFullYear() === parseInt(_lTahun))) return false;
    return true;
  });
  const rows = _paketSrc.map(p => {
    const rup  = String(p.rup);
    const pagu = Number(p.paguAnggaran) || 0;
    const hi   = state.harga.data.filter(h => String(h.rup) === rup);
    const winner = _getPemenangKontrakRup(rup);
    const totalNego = typeof _hitungNilaiPenetapan === 'function'
      ? _hitungNilaiPenetapan(rup)
      : _nilaiNegoPemenang(hi);
    const pct  = pagu > 0 ? (totalNego / pagu * 100) : 0;
    const ef   = pagu - totalNego;
    return { ...p, pagu, totalNego, pct, ef, pemenangKontrak: winner.nama || '-' };
  });
  const _rows = rows.filter(r => {
    if (_lProgres === 'done' && r.pct < 100) return false;
    if (_lProgres === 'on'   && (r.pct <= 0 || r.pct >= 100)) return false;
    if (_lProgres === 'zero' && r.pct > 0) return false;
    if (_lPagu === 'over' && r.pct <= 100) return false;
    if (_lPagu === 'warn' && (r.pct < 90 || r.pct > 100)) return false;
    if (_lPagu === 'ok'   && r.pct >= 90) return false;
    return true;
  });
  const sumPagu = _rows.reduce((s, r) => s + r.pagu, 0);
  const sumNego = _rows.reduce((s, r) => s + r.totalNego, 0);
  const sumEf   = sumPagu - sumNego;
  const sumPct  = sumPagu > 0 ? (sumNego / sumPagu * 100) : 0;
  const avgPct  = _rows.length ? _rows.reduce((s, r) => s + r.pct, 0) / _rows.length : 0;
  const overCnt = _rows.filter(r => r.pct > 100).length;
  const nearCnt = _rows.filter(r => r.pct >= 90 && r.pct <= 100).length;
  const clr = p => p > 100 ? '#ef4444' : p >= 80 ? '#f59e0b' : p > 0 ? '#22c55e' : '#6b7280';

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value" style="font-size:16px;">${fmtRp(sumPagu)}</div>
        <div class="stat-label">Total Pagu Anggaran</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🤝</div>
        <div class="stat-value" style="font-size:16px;color:${clr(sumPct)};">${fmtRp(sumNego)}</div>
        <div class="stat-label">Total Nilai Kontrak (${sumPct.toFixed(1)}%)</div>
      </div>
      <div class="stat-card" style="border-color:${sumEf>=0?'#22c55e':'#ef4444'}40;">
        <div class="stat-icon">${sumEf>=0?'📉':'📈'}</div>
        <div class="stat-value" style="font-size:16px;color:${sumEf>=0?'#22c55e':'#ef4444'};">${sumEf>=0?'+':''}${fmtRp(sumEf)}</div>
        <div class="stat-label">Efisiensi Anggaran</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-value" style="font-size:16px;color:${clr(avgPct)};">${avgPct.toFixed(1)}%</div>
        <div class="stat-label">Rata-rata Serapan Paket</div>
      </div>
      <div class="stat-card" style="border-color:${overCnt>0?'#ef444440':'#f59e0b40'};">
        <div class="stat-icon">${overCnt>0?'🚨':'⚠️'}</div>
        <div class="stat-value" style="font-size:16px;color:${overCnt>0?'#ef4444':'#f59e0b'};">${overCnt} / ${nearCnt}</div>
        <div class="stat-label">Melebihi / Mendekati Pagu</div>
      </div>
    </div>

    <div class="chart-grid" style="margin-bottom:16px;display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;">
      <div class="card" style="min-width:280px;flex:1;">
        <div class="card-header"><div class="card-title">📊 Pagu vs Nilai Kontrak per Bidang</div></div>
        <div class="card-body"><div class="chart-container" style="height:260px;"><canvas id="chart-laporan-bidang"></canvas></div></div>
      </div>
      <div class="card" style="min-width:260px;flex:1;">
        <div class="card-header"><div class="card-title">🎯 Status Serapan Anggaran</div></div>
        <div class="card-body"><div class="chart-container" style="height:260px;"><canvas id="chart-laporan-status"></canvas></div></div>
      </div>
    </div>
    <div class="chart-grid" style="margin-bottom:24px;display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;">
      <div class="card" style="min-width:280px;flex:1;">
        <div class="card-header"><div class="card-title">🏆 Top Pemenang Kontrak</div></div>
        <div class="card-body"><div class="chart-container" style="height:260px;"><canvas id="chart-laporan-pemenang"></canvas></div></div>
      </div>
      <div class="card" style="min-width:280px;flex:1;">
        <div class="card-header"><div class="card-title">📦 Top Paket Berdasarkan Nilai Kontrak</div></div>
        <div class="card-body"><div class="chart-container" style="height:260px;"><canvas id="chart-laporan-paket"></canvas></div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">📋 Realisasi per Paket${_lTahun ? ' — TA '+_lTahun : ''}</div>
        <button class="btn btn-secondary btn-sm" onclick="exportLaporanCSV()">📥 Export CSV</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>RUP</th><th>Nama Paket</th><th>Bidang</th>
            <th>Pemenang Kontrak</th>
            <th style="text-align:right;">Pagu (Rp)</th>
            <th style="text-align:right;">Nilai Kontrak</th>
            <th>Serapan</th>
            <th style="text-align:right;">Efisiensi</th>
            <th>Progres</th>
          </tr></thead>
          <tbody>
            ${_rows.map(r => `<tr>
              <td style="font-family:monospace;font-size:12px;">${r.rup||'-'}</td>
              <td>${strTrunc(r.namaPaket||'-', 40)}</td>
              <td>${r.bidang||'-'}</td>
              <td title="${r.pemenangKontrak||'-'}">${strTrunc(r.pemenangKontrak||'-', 30)}</td>
              <td style="text-align:right;font-family:monospace;font-size:12px;">${r.pagu?fmtRp(r.pagu):'-'}</td>
              <td style="text-align:right;font-family:monospace;font-size:12px;color:${clr(r.pct)};">${r.totalNego?fmtRp(r.totalNego):'-'}</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;">
                  <div class="pagu-bar-wrap"><div class="pagu-bar-fill" style="width:${Math.min(r.pct,100)}%;background:${clr(r.pct)};"></div></div>
                  <span style="font-size:11px;color:${clr(r.pct)};">${r.pct>0?r.pct.toFixed(1)+'%':'-'}</span>
                </div>
              </td>
              <td style="text-align:right;font-weight:600;color:${r.ef>=0?'#22c55e':'#ef4444'};">
                ${r.pagu?((r.ef>=0?'+':'')+fmtRp(r.ef)):'-'}
              </td>
              <td><div onclick="showProgressDetail('${r.rup}')" style="cursor:pointer;">${renderProgressBar(r.rup)}</div></td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr style="font-weight:700;background:var(--surface2);">
            <td colspan="4" style="padding:10px 12px;">Total (${_rows.length} paket${_lTahun ? ' TA '+_lTahun : ''})</td>
            <td style="text-align:right;font-family:monospace;">${fmtRp(sumPagu)}</td>
            <td style="text-align:right;font-family:monospace;color:${clr(sumPct)};">${fmtRp(sumNego)}</td>
            <td><div class="pagu-bar-wrap"><div class="pagu-bar-fill" style="width:${Math.min(sumPct,100)}%;background:${clr(sumPct)};"></div></div></td>
            <td style="text-align:right;color:${sumEf>=0?'#22c55e':'#ef4444'};">${sumEf>=0?'+':''}${fmtRp(sumEf)}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>
    </div>`;

  _renderLaporanCharts(_rows);
}

function _renderLaporanCharts(rows) {
  const _fmtShort = (v) => {
    if (v >= 1e9) return 'Rp ' + (v / 1e9).toFixed(1) + 'M';
    if (v >= 1e6) return 'Rp ' + (v / 1e6).toFixed(0) + 'jt';
    return 'Rp ' + Number(v || 0).toLocaleString('id-ID');
  };

  const valueLabelPlugin = {
    id: 'valueLabel',
    afterDatasetsDraw(chart, args, opts) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = (opts && opts.font) || '10px sans-serif';
      ctx.fillStyle = (opts && opts.color) || '#111827';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      chart.data.datasets.forEach((ds, dsIndex) => {
        const meta = chart.getDatasetMeta(dsIndex);
        if (!meta || meta.hidden) return;
        meta.data.forEach((el, i) => {
          const val = ds.data[i];
          if (val == null) return;
          const pos = el.tooltipPosition();
          const text = typeof opts.format === 'function' ? opts.format(val) : _fmtShort(val);
          const offsetY = (opts && opts.offsetY != null) ? opts.offsetY : 4;
          ctx.fillText(text, pos.x, pos.y - offsetY);
        });
      });

      ctx.restore();
    }
  };

  const bidangMap = {};
  rows.forEach(r => {
    const b = r.bidang || 'Tidak Diketahui';
    if (!bidangMap[b]) bidangMap[b] = { pagu: 0, nego: 0 };
    bidangMap[b].pagu += r.pagu || 0;
    bidangMap[b].nego += r.totalNego || 0;
  });
  const bLabels = Object.keys(bidangMap).map(b => strTrunc(b, 22));
  const bPagu   = Object.values(bidangMap).map(v => v.pagu);
  const bNego   = Object.values(bidangMap).map(v => v.nego);

  if (window._chartLaporanBidang) { window._chartLaporanBidang.destroy(); window._chartLaporanBidang = null; }
  const ctx1 = document.getElementById('chart-laporan-bidang');
  if (ctx1 && bLabels.length) {
    window._chartLaporanBidang = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: bLabels,
        datasets: [
          { label: 'Pagu Anggaran',  data: bPagu, backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 5, borderSkipped: false },
          { label: 'Nilai Kontrak',  data: bNego, backgroundColor: 'rgba(34,197,94,0.7)',  borderRadius: 5, borderSkipped: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 } } },
          tooltip: { callbacks: { label: c => c.dataset.label + ': ' + _fmtShort(c.raw) } },
          valueLabel: { format: v => _fmtShort(v), offsetY: 2, font: '9px sans-serif', color: '#111827' }
        },
        plugins: [valueLabelPlugin],
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 30 } },
          y: { ticks: { callback: v => 'Rp ' + (v >= 1e9 ? (v/1e9).toFixed(1)+'M' : (v/1e6).toFixed(0)+'jt') } }
        }
      }
    });
  }

  const done       = rows.filter(r => r.pct >= 100).length;
  const onProgress = rows.filter(r => r.pct > 0 && r.pct < 100).length;
  const zero       = rows.filter(r => r.pct <= 0).length;

  if (window._chartLaporanStatus) { window._chartLaporanStatus.destroy(); window._chartLaporanStatus = null; }
  const ctx2 = document.getElementById('chart-laporan-status');
  if (ctx2 && rows.length) {
    window._chartLaporanStatus = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['Selesai (100%)', 'Berjalan (1–99%)', 'Belum Dimulai (0%)'],
        datasets: [{ data: [done, onProgress, zero], backgroundColor: ['#22c55e','#f59e0b','#6b7280'], borderWidth: 2, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 14 } },
          tooltip: { callbacks: { label: c => c.label + ': ' + c.raw + ' paket' } },
          valueLabel: { format: v => v + ' paket', offsetY: -6, font: '9px sans-serif', color: '#111827' }
        },
        plugins: [valueLabelPlugin]
      }
    });
  }

  const winnerMap = {};
  rows.forEach(r => {
    if (!r.pemenangKontrak || r.pemenangKontrak === '-') return;
    if (!winnerMap[r.pemenangKontrak]) winnerMap[r.pemenangKontrak] = 0;
    winnerMap[r.pemenangKontrak] += r.totalNego || 0;
  });
  const winnerTop = Object.entries(winnerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (window._chartLaporanPemenang) { window._chartLaporanPemenang.destroy(); window._chartLaporanPemenang = null; }
  const ctx3 = document.getElementById('chart-laporan-pemenang');
  if (ctx3 && winnerTop.length) {
    window._chartLaporanPemenang = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: winnerTop.map(x => strTrunc(x[0], 24)),
        datasets: [{
          label: 'Total Nilai Kontrak',
          data: winnerTop.map(x => x[1]),
          backgroundColor: 'rgba(14,165,233,0.75)',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => 'Nilai: ' + _fmtShort(c.raw) } },
          valueLabel: { format: v => _fmtShort(v), offsetY: -2, font: '9px sans-serif', color: '#111827' }
        },
        plugins: [valueLabelPlugin],
        scales: {
          x: { ticks: { callback: v => _fmtShort(v) } },
          y: { ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  const paketTop = rows
    .filter(r => Number(r.totalNego) > 0)
    .sort((a, b) => b.totalNego - a.totalNego)
    .slice(0, 8);
  if (window._chartLaporanPaket) { window._chartLaporanPaket.destroy(); window._chartLaporanPaket = null; }
  const ctx4 = document.getElementById('chart-laporan-paket');
  if (ctx4 && paketTop.length) {
    window._chartLaporanPaket = new Chart(ctx4, {
      type: 'line',
      data: {
        labels: paketTop.map(r => strTrunc(r.namaPaket || r.rup, 24)),
        datasets: [{
          label: 'Nilai Kontrak',
          data: paketTop.map(r => r.totalNego),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.2)',
          fill: true,
          tension: 0.28,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: c => paketTop[c[0].dataIndex]?.rup || '',
              label: c => 'Nilai: ' + _fmtShort(c.raw)
            }
          },
          valueLabel: { format: v => _fmtShort(v), offsetY: 4, font: '9px sans-serif', color: '#111827' }
        },
        plugins: [valueLabelPlugin],
        scales: {
          y: { ticks: { callback: v => _fmtShort(v) } },
          x: { ticks: { font: { size: 10 }, maxRotation: 30 } }
        }
      }
    });
  }
}

function exportLaporanCSV() {
  const _eTahun  = document.getElementById('laporan-filter-tahun')?.value  || '';
  const _eBidang = document.getElementById('laporan-filter-bidang')?.value || '';
  const _expSrc  = state.paket.data.filter(p => {
    if (_eBidang && p.bidang !== _eBidang) return false;
    if (_eTahun && !(p.tanggalPesanan && new Date(p.tanggalPesanan).getFullYear() === parseInt(_eTahun))) return false;
    return true;
  });
  const rows = _expSrc.map(p => {
    const rup  = String(p.rup);
    const pagu = Number(p.paguAnggaran) || 0;
    const winner = _getPemenangKontrakRup(rup);
    const totalNego = typeof _hitungNilaiPenetapan === 'function'
      ? _hitungNilaiPenetapan(rup)
      : _nilaiNegoPemenang(state.harga.data.filter(h => String(h.rup) === rup));
    const ef  = pagu ? ((pagu - totalNego) / pagu * 100).toFixed(2) : '';
    const done = _getProgressSteps(rup).filter(Boolean).length;
    return [p.rup, `"${(p.namaPaket||'').replace(/"/g,"'")}"`, p.bidang||'', `"${(winner.nama || '-').replace(/"/g,"'")}"`, pagu, totalNego, ef, done + '/5', p.status||''].join(',');
  });
  const csv = 'RUP,Nama Paket,Bidang,Pemenang Kontrak,Pagu (Rp),Nilai Kontrak (Rp),Efisiensi (%),Progres,Status\n' + rows.join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const _fTahun = document.getElementById('laporan-filter-tahun')?.value || '';
  a.download = 'laporan_realisasi' + (_fTahun ? '_TA'+_fTahun : '') + '_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
}

// ============================================================
//  FEATURE 9: NOTIFIKASI DEADLINE — DASHBOARD BANNER
// ============================================================
function _injectDeadlineBanner() {
  const dashPage = document.getElementById('page-dashboard');
  if (!dashPage || document.getElementById('deadline-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'deadline-banner';
  dashPage.insertBefore(banner, dashPage.firstChild);
}

function renderDeadlineBanner() {
  _injectDeadlineBanner();
  const banner = document.getElementById('deadline-banner');
  if (!banner) return;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const critical = [], warning = [];
  state.paket.data.forEach(p => {
    if (!p.tanggalSelesai) return;
    const sel  = new Date(p.tanggalSelesai); sel.setHours(0, 0, 0, 0);
    const diff = Math.ceil((sel - now) / 86400000);
    const nm   = strTrunc(p.namaPaket || ('RUP ' + p.rup), 35);
    if (diff < 0)        critical.push({ nm, diff, rup: p.rup });
    else if (diff <= 7)  warning.push({ nm, diff, rup: p.rup });
  });
  if (!critical.length && !warning.length) { banner.style.display = 'none'; return; }
  banner.style.display = 'block';
  const items = [
    ...critical.map(p => `<span class="dl-item" onclick="showPage('paket')" title="Buka Data Paket">🚨 <strong>${p.nm}</strong>: lewat ${Math.abs(p.diff)} hari</span>`),
    ...warning.map(p  => `<span class="dl-item dl-warn" onclick="showPage('paket')" title="Buka Data Paket">${p.diff<=2?'🔴':'⏰'} <strong>${p.nm}</strong>: ${p.diff===0?'hari ini':''+p.diff+' hari lagi'}</span>`)
  ];
  banner.innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
    <span style="font-weight:700;white-space:nowrap;font-size:13px;">⏱️ Deadline:</span>
    ${items.join('')}
    <button onclick="this.closest('#deadline-banner').style.display='none'"
      style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:20px;color:inherit;line-height:1;opacity:.7;">×</button>
    </div>`;
}

// ── Init semua fitur baru saat data siap ──────────────────────
window.addEventListener('sb-ready', function() {
  setTimeout(() => {
    loadRole();
    renderDeadlineBanner();
    _injectNavLaporan();
  }, 600);
});

// Fallback untuk non-SPA (jika sb-ready tidak fired)
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => { loadRole(); _injectNavLaporan(); }, 1200);
});

// ── Tambah menu Laporan ke sidebar secara otomatis ────────────
function _injectNavLaporan() {
  if (document.getElementById('nav-laporan')) return;
  // Cari nav-item terakhir sebagai anchor (backup sebelum pengaturan)
  const navItems = document.querySelectorAll('.nav-item');
  let anchor = null;
  navItems.forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes("'backup'")) anchor = n;
  });
  if (!anchor) return;
  const li = document.createElement('div');
  li.id = 'nav-laporan';
  li.className = 'nav-item';
  li.setAttribute('onclick', "showPage('laporan')");
  li.innerHTML = '<span class="nav-icon">📊</span><span class="nav-label">Laporan Realisasi</span>';
  anchor.after(li);
  // Pastikan page-laporan ada di DOM
  if (!document.getElementById('page-laporan')) {
    const p = document.createElement('div');
    p.id = 'page-laporan';
    p.className = 'page';
    p.innerHTML = '<div id="laporan-content"></div>';
    const anyPage = document.querySelector('.page');
    if (anyPage) anyPage.parentNode.appendChild(p);
  }
}

// ── Patch renderDashboard agar banner ikut refresh ────────────
if (!window._origRD) window._origRD = window.renderDashboard;
var _origRD = window._origRD;
if (typeof renderDashboard === 'function') {
  window.renderDashboard = function() {
    if (typeof _origRD === 'function') _origRD.apply(this, arguments);
    setTimeout(renderDeadlineBanner, 200);
  };
}

// ============================================================
//  AUDIT LOG — Riwayat Perubahan Data (v3.0)
//  Menyimpan max 200 entri di localStorage
// ============================================================
if (typeof AUDIT_KEY === 'undefined') var AUDIT_KEY   = 'sideva_audit_log';
if (typeof AUDIT_MAX === 'undefined') var AUDIT_MAX   = 200;
if (!window.AUDIT_STORE) window.AUDIT_STORE = { paket:'Paket', rincian:'Rincian', harga:'Survey Harga', penyedia:'Penyedia', bidang:'Bidang', opd:'OPD', rekening:'Rekening', ppk:'PPK' };
var AUDIT_STORE = window.AUDIT_STORE;

function auditLog(action, store, detail) {
  try {
    const role = typeof getCurrentRole === 'function' ? getCurrentRole() : 'operator';
    const entry = {
      ts:     new Date().toISOString(),
      action, // 'tambah' | 'edit' | 'hapus' | 'import' | 'backup'
      store:  AUDIT_STORE[store] || store || '-',
      detail: detail || '-',
      role
    };
    let log = [];
    try { log = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch(e) {}
    log.unshift(entry);
    if (log.length > AUDIT_MAX) log = log.slice(0, AUDIT_MAX);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
    _renderAuditPanel();
  } catch(e) {}
}

function getAuditLog() {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch(e) { return []; }
}

function clearAuditLog() {
  if (!confirm('Hapus semua riwayat perubahan?')) return;
  localStorage.removeItem(AUDIT_KEY);
  _renderAuditPanel();
  if (typeof toast === 'function') toast('Riwayat perubahan dihapus', 'success');
}

function _renderAuditPanel() {
  const el = document.getElementById('audit-log-list');
  if (!el) return;
  const log = getAuditLog();
  const countEl = document.getElementById('audit-log-count');
  if (countEl) countEl.textContent = log.length + ' entri';
  if (!log.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px;">Belum ada riwayat perubahan</div>';
    return;
  }
  const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const ICON  = { tambah:'➕', edit:'✏️', hapus:'🗑️', import:'📥', backup:'💾', login:'👤' };
  const CLR   = { tambah:'#22c55e', edit:'#60a5fa', hapus:'#ef4444', import:'#f59e0b', backup:'#a78bfa' };
  el.innerHTML = log.slice(0, 100).map(e => {
    const d  = new Date(e.ts);
    const ts = d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear()
             + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    const ic  = ICON[e.action]  || '📋';
    const clr = CLR[e.action]   || '#94a3b8';
    return `<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 14px;
              border-bottom:1px solid var(--border);font-size:12px;">
      <span style="font-size:15px;margin-top:1px;">${ic}</span>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <span style="font-weight:600;color:${clr};text-transform:capitalize;">${e.action}</span>
          <span style="background:var(--surface2);border-radius:4px;padding:1px 7px;color:var(--text2);font-size:11px;">${e.store}</span>
          <span style="background:var(--surface2);border-radius:4px;padding:1px 7px;color:var(--text3);font-size:11px;">${e.role}</span>
        </div>
        <div style="color:var(--text2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.detail}</div>
      </div>
      <span style="color:var(--text3);white-space:nowrap;font-size:11px;">${ts}</span>
    </div>`;
  }).join('');
}

// ── Panel Audit Log (floating drawer) ────────────────────────
function openAuditPanel() {
  let panel = document.getElementById('audit-panel');
  if (!panel) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="audit-panel" style="position:fixed;right:0;top:0;bottom:0;width:95vw;max-width:420px;
        background:var(--surface);border-left:1px solid var(--border);z-index:1200;
        display:flex;flex-direction:column;transform:translateX(100%);transition:transform .25s;">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
          <span style="font-size:16px;">📋</span>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;color:var(--text);">Riwayat Perubahan</div>
            <div style="font-size:11px;color:var(--text3);"><span id="audit-log-count">0 entri</span> tersimpan lokal</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="clearAuditLog()">🗑️ Hapus</button>
          <button onclick="closeAuditPanel()"
            style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--text3);padding:0 4px;">×</button>
        </div>
        <div id="audit-log-list" style="flex:1;overflow-y:auto;"></div>
      </div>`);
    panel = document.getElementById('audit-panel');
  }
  _renderAuditPanel();
  requestAnimationFrame(() => { panel.style.transform = 'translateX(0)'; });
}
function closeAuditPanel() {
  const p = document.getElementById('audit-panel');
  if (p) p.style.transform = 'translateX(100%)';
}

// ── Tambah tombol Audit Log ke topbar ────────────────────────
function _injectAuditButton() {
  if (document.getElementById('audit-log-btn')) return;
  const topbar = document.querySelector('.topbar-actions') || document.querySelector('.topbar');
  if (!topbar) return;
  const btn = document.createElement('button');
  btn.id = 'audit-log-btn';
  btn.className = 'btn btn-secondary btn-sm';
  btn.title = 'Riwayat perubahan data';
  btn.innerHTML = '📋 Log';
  btn.style.cssText = 'font-size:12px;padding:5px 10px;';
  btn.onclick = openAuditPanel;
  topbar.appendChild(btn);
}

// ── Patch dbPut & dbDelete agar otomatis mencatat ke audit log
(function _patchDb() {
  const _origPut = window.dbPut;
  if (typeof _origPut === 'function') {
    window.dbPut = async function(store, data, ...rest) {
      const result = await _origPut.call(this, store, data, ...rest);
      try {
        const isEdit  = !!(data && data.id);
        const action  = isEdit ? 'edit' : 'tambah';
        const name    = data.namaPaket || data.namaPenyedia || data.namaItem || data.itemBarang
                      || data.namaBidang || data.namaOpd || data.kodeRekening
                      || data.rup || data.id || '-';
        auditLog(action, store, `[${store}] ${name}`);
      } catch(e) {}
      return result;
    };
  }

  const _origDel = window.dbDelete;
  if (typeof _origDel === 'function') {
    window.dbDelete = async function(store, id, ...rest) {
      const result = await _origDel.call(this, store, id, ...rest);
      try { auditLog('hapus', store, `[${store}] id: ${id}`); } catch(e) {}
      return result;
    };
  }
})();

// ── Init audit button saat DOM siap ──────────────────────────
window.addEventListener('sb-ready', () => setTimeout(_injectAuditButton, 700));
document.addEventListener('DOMContentLoaded', () => setTimeout(_injectAuditButton, 1300));
