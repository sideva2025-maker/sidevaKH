// ============================================================
//  SI-DEVA — Logo & Kop Surat Upload (Ringan + Terkompresi)
//  File: js/logo-kop-upload.js
//
//  Pasang di index.html SETELAH dashboard.js:
//    <script src="js/logo-kop-upload.js"></script>
//
//  Meng-override fungsi kop surat lama (processKopFile) dan
//  menambahkan fungsi logo baru.
//  Gambar dikompresi otomatis via Canvas API — tidak berat.
// ============================================================

const LOGO_KEY    = 'sideva_logo_instansi';
const KOP_KEY     = 'sideva_kop_surat_img';

// ── KOMPRESI UNIVERSAL ────────────────────────────────────────
// maxW: lebar max px, quality: 0-1 (jpeg quality)
function _compressImage(file, maxW, quality, onDone, onError) {
  if (!file.type.startsWith('image/')) {
    onError('File harus berupa gambar (PNG, JPG, atau WEBP).'); return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const ratio  = img.width > maxW ? maxW / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      // Untuk PNG transparan (logo), gunakan putImageData dengan latar putih
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      const origKB  = Math.round(e.target.result.length * 0.75 / 1024);
      const compKB  = Math.round(compressed.length * 0.75 / 1024);
      onDone(compressed, { origKB, compKB, w: canvas.width, h: canvas.height });
    };
    img.onerror = () => onError('Gagal membaca gambar.');
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── LOGO INSTANSI ─────────────────────────────────────────────
function handleLogoFileSelect(event) {
  const file = event.target.files[0];
  if (file) _processLogo(file);
}

function handleLogoDrop(event) {
  event.preventDefault();
  document.getElementById('logo-upload-zone')?.classList.remove('logo-drag-over');
  const file = event.dataTransfer.files[0];
  if (file) _processLogo(file);
}

function _processLogo(file) {
  _showLogoMsg('', '');
  // Logo: max 300px, kualitas 0.85 → sangat ringan
  _compressImage(file, 300, 0.85,
    function(compressed, info) {
      try {
        localStorage.setItem(LOGO_KEY, compressed);
        _renderLogoPreview(compressed, info);
        _showLogoMsg(`✅ Logo berhasil disimpan! ${info.origKB} KB → ${info.compKB} KB (${info.w}×${info.h}px)`, 'success');
        if (typeof toast === 'function') toast('Logo instansi berhasil diupload!', 'success');
        // Sync ke Supabase config
        if (typeof sbSaveConfig === 'function' && typeof isLoggedIn === 'function' && isLoggedIn()) {
          const cfg = JSON.parse(localStorage.getItem('sideva_config') || '{}');
          sbSaveConfig({ ...cfg, _logoInstansi: compressed }).catch(() => {});
        }
      } catch(e) {
        _showLogoMsg('Gagal menyimpan logo: ' + e.message, 'error');
      }
    },
    function(err) { _showLogoMsg('Gagal: ' + err, 'error'); }
  );
}

function _renderLogoPreview(src, info) {
  const wrap = document.getElementById('logo-img-preview-wrap');
  const img  = document.getElementById('logo-img-preview');
  const meta = document.getElementById('logo-img-meta');
  const zone = document.getElementById('logo-upload-zone');
  if (!wrap || !img) return;
  img.src = src;
  if (meta && info) {
    meta.textContent = `${info.w}×${info.h}px · ${info.compKB} KB (terkompresi)`;
  }
  wrap.style.display = 'block';
  if (zone) zone.style.display = 'none';
}

function hapusLogo() {
  if (!confirm('Hapus logo instansi?')) return;
  localStorage.removeItem(LOGO_KEY);
  const wrap = document.getElementById('logo-img-preview-wrap');
  const zone = document.getElementById('logo-upload-zone');
  const inp  = document.getElementById('logo-file-input');
  if (wrap) wrap.style.display = 'none';
  if (zone) zone.style.display = '';
  if (inp)  inp.value = '';
  if (typeof toast === 'function') toast('Logo dihapus.', 'info');
  if (typeof sbSaveConfig === 'function' && typeof isLoggedIn === 'function' && isLoggedIn()) {
    const cfg = JSON.parse(localStorage.getItem('sideva_config') || '{}');
    sbSaveConfig({ ...cfg, _logoInstansi: null }).catch(() => {});
  }
}

function _showLogoMsg(msg, type) {
  const el = document.getElementById('logo-upload-msg');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; return; }
  const palette = {
    success: 'color:#22c55e;border-color:rgba(34,197,94,0.3);background:rgba(34,197,94,0.08)',
    error:   'color:#ef4444;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.08)',
    info:    'color:#C9A84C;border-color:rgba(201,168,76,0.3);background:rgba(201,168,76,0.08)',
  };
  el.style.cssText = `display:block;border:1px solid;border-radius:6px;padding:8px 12px;font-size:12px;margin-top:8px;${palette[type]||palette.info}`;
  el.textContent = msg;
  if (type !== 'error') setTimeout(() => el.style.display = 'none', 5000);
}

function initLogoUpload() {
  const saved = localStorage.getItem(LOGO_KEY);
  if (saved) {
    const approxKB = Math.round(saved.length * 0.75 / 1024);
    _renderLogoPreview(saved, { w:'', h:'', compKB: approxKB });
    const meta = document.getElementById('logo-img-meta');
    if (meta) meta.textContent = `Logo tersimpan · ~${approxKB} KB`;
  }
}

// ── KOP SURAT (override processKopFile dengan versi terkompresi) ──
// Override fungsi lama dari dashboard.js
window.processKopFile = function(file) {
  if (!file.type.startsWith('image/')) {
    if (typeof showKopMsg === 'function')
      showKopMsg('Gagal: File harus berupa gambar (PNG, JPG, atau WEBP).', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    if (typeof showKopMsg === 'function')
      showKopMsg('Gagal: Ukuran file melebihi 10 MB.', 'error');
    return;
  }
  if (typeof showKopMsg === 'function')
    showKopMsg('⏳ Mengompresi gambar…', 'info');

  // Kop surat: max 1400px lebar, kualitas 0.78
  _compressImage(file, 1400, 0.78,
    function(compressed, info) {
      try {
        localStorage.setItem(KOP_KEY, compressed);
        // Panggil fungsi render asli jika ada
        if (typeof renderKopUploadPreview === 'function') {
          renderKopUploadPreview(compressed, null);
          const meta = document.getElementById('kop-img-meta');
          if (meta) meta.textContent = `${file.name} · ${info.origKB} KB → ${info.compKB} KB (${info.w}×${info.h}px)`;
        }
        const area = document.getElementById('kop-preview-area');
        if (area && typeof kopSurat === 'function') area.innerHTML = kopSurat();
        const lbl = document.getElementById('kop-preview-label-text');
        if (lbl) lbl.textContent = 'Pratinjau kop surat — menggunakan gambar yang diupload';
        if (typeof showKopMsg === 'function')
          showKopMsg(`✅ Kop surat disimpan! ${info.origKB} KB → ${info.compKB} KB (terkompresi ${Math.round((1-info.compKB/info.origKB)*100)}%)`, 'success');
        if (typeof toast === 'function') toast('Kop surat berhasil diupload!', 'success');
        // Sync ke Supabase
        if (typeof sbSaveConfig === 'function' && typeof isLoggedIn === 'function' && isLoggedIn()) {
          const cfg = JSON.parse(localStorage.getItem('sideva_config') || '{}');
          sbSaveConfig({ ...cfg, _kopSuratImg: compressed }).catch(() => {});
        }
      } catch(e) {
        if (typeof showKopMsg === 'function')
          showKopMsg('Gagal menyimpan: ' + e.message + '. Coba perkecil gambar.', 'error');
      }
    },
    function(err) {
      if (typeof showKopMsg === 'function') showKopMsg('Gagal: ' + err, 'error');
    }
  );
};

// ── Hook ke initKopSuratUpload untuk load logo juga ───────────
const _origInitKop = window.initKopSuratUpload;
window.initKopSuratUpload = function() {
  if (typeof _origInitKop === 'function') _origInitKop.apply(this, arguments);
  initLogoUpload();
};

// ── Sinkron logo dari Supabase config ─────────────────────────
window.addEventListener('sb-ready', async function(e) {
  if (!e.detail?.loggedIn) return;
  try {
    if (typeof sbGetConfig !== 'function') return;
    const cfg = await sbGetConfig();
    if (cfg?._logoInstansi && !localStorage.getItem(LOGO_KEY)) {
      localStorage.setItem(LOGO_KEY, cfg._logoInstansi);
    }
  } catch(_) {}
});

// ── Export getter untuk dipakai di dokumen cetak ──────────────
function getLogoInstansi() {
  return localStorage.getItem(LOGO_KEY) || null;
}
function getKopSurat() {
  return localStorage.getItem(KOP_KEY) || null;
}
