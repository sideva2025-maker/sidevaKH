// ============================================================
//  SI-DEVA — Supabase Cloud Sync
//  File: js/supabase-sync.js
//
//  CARA PASANG:
//  1. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di bawah
//  2. Tambahkan script ini di index.html SEBELUM dashboard.js
//     <script src="js/supabase-sync.js"></script>
// ============================================================

// ── KONFIGURASI (ISI INI DULU!) ─────────────────────────────
const SUPABASE_URL      = 'https://lxoswmtgcdaoymqgutdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4b3N3bXRnY2Rhb3ltcWd1dGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Mjg0NjMsImV4cCI6MjA5NTEwNDQ2M30.1iv3-EznDFbkUZXozyyqUwJ4bmQ5tk45-6KkAAzg7rY';
// ─────────────────────────────────────────────────────────────

// Nama tabel di Supabase (harus sama dengan SQL yang dijalankan)
const SYNC_STORES = [
  'paket', 'rincian', 'harga', 'penyedia',
  'bidang', 'opd', 'rekening', 'ppk',
  'pejabatPengadaan', 'ecatalog'
];

// ── State ────────────────────────────────────────────────────
let supabaseSession = null;   // session login user
let syncUserId      = null;   // user_id yang sedang login
let syncOnline      = false;  // apakah sudah login & konek

// ============================================================
//  AUTH — Login / Register / Logout
// ============================================================

async function sbRequest(path, method = 'GET', body = null, token = null) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  // Header wajib agar Supabase upsert tidak error 406
  if (method === 'POST' && path.includes('/rest/')) {
    headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(SUPABASE_URL + path, opts);
  // Beberapa endpoint tidak return body (upsert minimal, logout)
  const text = await res.text();
  const json = text ? (() => { try { return JSON.parse(text); } catch(_) { return {}; } })() : {};
  if (!res.ok) throw new Error(json.error_description || json.message || JSON.stringify(json));
  return json;
}

// Login dengan email + password
async function syncLogin(email, password) {
  try {
    const data = await sbRequest('/auth/v1/token?grant_type=password', 'POST', { email, password });
    supabaseSession = data;
    syncUserId = data.user.id;
    syncOnline = true;
    localStorage.setItem('sideva_sync_session', JSON.stringify(data));
    updateSyncUI('online', email);
    await syncPullAll();   // tarik data dari cloud setelah login
    toast('☁️ Login berhasil! Data cloud dimuat.', 'success');
    return true;
  } catch (err) {
    toast('Login gagal: ' + err.message, 'error');
    return false;
  }
}

// Daftar akun baru
async function syncRegister(email, password) {
  try {
    await sbRequest('/auth/v1/signup', 'POST', { email, password });
    toast('✅ Akun dibuat! Silakan login.', 'success');
    return true;
  } catch (err) {
    toast('Daftar gagal: ' + err.message, 'error');
    return false;
  }
}

// Logout
async function syncLogout() {
  try {
    // Call local proxy endpoint to avoid CORS blocking
    console.log('[SyncDB] calling /api/logout proxy');
    const res = await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    console.log('[SyncDB] proxy logout response', { status: res.status, ok: res.ok });
  } catch (e) {
    console.warn('[SyncDB] proxy logout failed:', e);
    // Fallback: attempt direct logout
    try {
      if (supabaseSession) {
        console.log('[SyncDB] fallback: calling sbRequest logout');
        await sbRequest('/auth/v1/logout', 'POST', null, supabaseSession.access_token);
      }
    } catch (e2) { console.warn('[SyncDB] fallback logout failed:', e2); }
  }
  supabaseSession = null;
  syncUserId = null;
  syncOnline = false;
  localStorage.removeItem('sideva_sync_session');
  updateSyncUI('offline');
  toast('Keluar dari akun cloud.', 'info');
}

// Refresh token agar tidak expired
async function syncRefreshToken() {
  if (!supabaseSession?.refresh_token) return false;
  try {
    const data = await sbRequest(
      '/auth/v1/token?grant_type=refresh_token', 'POST',
      { refresh_token: supabaseSession.refresh_token }
    );
    supabaseSession = data;
    syncUserId = data.user.id;
    localStorage.setItem('sideva_sync_session', JSON.stringify(data));
    return true;
  } catch (_) {
    syncOnline = false;
    return false;
  }
}

// Restore session dari localStorage (agar tidak perlu login ulang)
async function syncRestoreSession() {
  const saved = localStorage.getItem('sideva_sync_session');
  if (!saved) return;
  try {
    supabaseSession = JSON.parse(saved);
    // Coba refresh dulu
    const ok = await syncRefreshToken();
    if (ok) {
      syncUserId = supabaseSession.user.id;
      syncOnline = true;
      updateSyncUI('online', supabaseSession.user.email);
      await syncPullAll();
    }
  } catch (_) {
    localStorage.removeItem('sideva_sync_session');
  }
}

// ============================================================
//  SYNC — Push & Pull data ke/dari Supabase
// ============================================================

// Kirim SEMUA data lokal ke cloud (upsert)
async function syncPushAll() {
  if (!syncOnline) { toast('Belum login ke cloud.', 'error'); return; }
  try {
    for (const store of SYNC_STORES) {
      const rows = await dbGetAll(store);
      if (rows.length === 0) continue;
      await sbUpsert(store, rows);
    }
    // Sync config
    const cfg = JSON.parse(localStorage.getItem('sideva_config') || '{}');
    await sbUpsertConfig(cfg);

    toast('☁️ Data berhasil dikirim ke cloud!', 'success');
  } catch (err) {
    if (err.message.includes('JWT')) {
      await syncRefreshToken();
      toast('Sesi diperbarui. Coba lagi.', 'info');
    } else {
      toast('Gagal push ke cloud: ' + err.message, 'error');
    }
  }
}

// Ambil SEMUA data dari cloud → simpan ke IndexedDB lokal
async function syncPullAll() {
  if (!syncOnline) return;
  try {
    for (const store of SYNC_STORES) {
      const rows = await sbGetAll(store);
      if (!rows || rows.length === 0) continue;
      await dbClear(store);
      for (const row of rows) {
        // Kembalikan id ke integer agar cocok dengan IndexedDB autoIncrement
        const originalId = Number(row.id);
        const item = { ...row.data, id: isNaN(originalId) ? row.id : originalId };
        await dbPut(store, item);
      }
    }
    // Sync config
    const cfg = await sbGetConfig();
    if (cfg) {
      localStorage.setItem('sideva_config', JSON.stringify(cfg));
    }

    toast('☁️ Data cloud berhasil dimuat!', 'success');
    // Refresh tampilan - pakai renderAll dari dashboard.js
    if (typeof renderAll === 'function') renderAll();
    else if (typeof renderDashboard === 'function') renderDashboard();
  } catch (err) {
    toast('Gagal pull dari cloud: ' + err.message, 'error');
  }
}

// ── Helper: operasi DB Supabase ──────────────────────────────

async function sbUpsert(tableName, rows) {
  const token = supabaseSession.access_token;
  const payload = rows.map(row => ({
    id:      String(row.id),   // selalu string agar cocok dengan kolom text
    user_id: syncUserId,
    data:    row,
    updated_at: new Date().toISOString()
  }));
  return sbRequest(
    `/rest/v1/${tableName}?on_conflict=id`,
    'POST',
    payload,
    token
  );
}

async function sbGetAll(tableName) {
  const token = supabaseSession.access_token;
  return sbRequest(
    `/rest/v1/${tableName}?user_id=eq.${syncUserId}&select=id,data`,
    'GET', null, token
  );
}

async function sbUpsertConfig(cfg) {
  const token = supabaseSession.access_token;
  const payload = [{
    id:      syncUserId + '_config',
    user_id: syncUserId,
    data:    cfg,
    updated_at: new Date().toISOString()
  }];
  return sbRequest('/rest/v1/config?on_conflict=id', 'POST', payload, token);
}

async function sbGetConfig() {
  const token = supabaseSession.access_token;
  const res = await sbRequest(
    `/rest/v1/config?id=eq.${syncUserId}_config&select=data`,
    'GET', null, token
  );
  return res?.[0]?.data || null;
}

// ============================================================
//  UI — Panel login cloud di dalam aplikasi
// ============================================================

function updateSyncUI(status, email = '') {
  const badge = document.getElementById('sync-status-badge');
  const info  = document.getElementById('sync-user-info');
  if (!badge) return;

  if (status === 'online') {
    badge.textContent  = '☁️ Cloud: Aktif';
    badge.style.color  = '#4ade80';
    if (info) info.textContent = email;
    document.getElementById('sync-login-area') ?.classList.add('hidden');
    document.getElementById('sync-loggedin-area')?.classList.remove('hidden');
  } else {
    badge.textContent  = '☁️ Cloud: Offline';
    badge.style.color  = '#f87171';
    if (info) info.textContent = '';
    document.getElementById('sync-login-area') ?.classList.remove('hidden');
    document.getElementById('sync-loggedin-area')?.classList.add('hidden');
  }
}

// Inject panel sync ke halaman Backup
function injectSyncPanel() {
  const target = document.getElementById('sync-panel-mount');
  if (!target) return;

  target.innerHTML = `
    <div style="margin-bottom:16px;">
      <h3 style="margin:0 0 4px;font-size:15px;">☁️ Cloud Sync</h3>
      <p style="margin:0;font-size:12px;opacity:.6;">Data tersimpan di cloud — bisa diakses dari browser & laptop mana saja.</p>
    </div>

    <!-- Status -->
    <div style="margin-bottom:12px;">
      <span id="sync-status-badge" style="font-size:13px;font-weight:600;">☁️ Cloud: Offline</span>
      <span id="sync-user-info" style="font-size:12px;opacity:.6;margin-left:8px;"></span>
    </div>

    <!-- Form Login -->
    <div id="sync-login-area">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <input id="sync-email"    type="email"    placeholder="Email"     style="flex:1;min-width:160px;padding:7px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;">
        <input id="sync-password" type="password" placeholder="Password"  style="flex:1;min-width:140px;padding:7px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="doSyncLogin()"    class="btn btn-primary"   style="font-size:13px;">Masuk</button>
        <button onclick="doSyncRegister()" class="btn btn-secondary" style="font-size:13px;">Daftar Akun Baru</button>
      </div>
    </div>

    <!-- Area setelah login -->
    <div id="sync-loggedin-area" class="hidden">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="syncPushAll()" class="btn btn-primary"   style="font-size:13px;">⬆️ Kirim ke Cloud</button>
        <button onclick="syncPullAll()" class="btn btn-secondary" style="font-size:13px;">⬇️ Ambil dari Cloud</button>
        <button onclick="syncLogout()"  class="btn btn-danger"    style="font-size:13px;">Keluar</button>
      </div>
      <p style="font-size:11px;opacity:.5;margin:8px 0 0;">Kirim = lokal → cloud &nbsp;|&nbsp; Ambil = cloud → lokal</p>
    </div>
  `;

  // Update status berdasarkan kondisi saat ini
  updateSyncUI(syncOnline ? 'online' : 'offline', supabaseSession?.user?.email || '');
}

async function doSyncLogin() {
  const email    = document.getElementById('sync-email')?.value.trim();
  const password = document.getElementById('sync-password')?.value;
  if (!email || !password) { toast('Isi email dan password dulu.', 'error'); return; }
  await syncLogin(email, password);
}

async function doSyncRegister() {
  const email    = document.getElementById('sync-email')?.value.trim();
  const password = document.getElementById('sync-password')?.value;
  if (!email || !password) { toast('Isi email dan password dulu.', 'error'); return; }
  await syncRegister(email, password);
}

// ============================================================
//  INIT — Jalankan saat halaman load
// ============================================================

// Tambahkan style .hidden jika belum ada
(function addHiddenStyle() {
  if (!document.getElementById('sync-style')) {
    const s = document.createElement('style');
    s.id = 'sync-style';
    s.textContent = '.hidden { display: none !important; }';
    document.head.appendChild(s);
  }
})();

// Restore session + inject panel saat DOM siap
document.addEventListener('DOMContentLoaded', async () => {
  // Inject panel langsung jika elemen sudah ada
  if (document.getElementById('sync-panel-mount')) {
    injectSyncPanel();
  }

  window.addEventListener('sideva:page-changed', (e) => {
    if (e?.detail?.page !== 'backup') return;
    setTimeout(() => {
      if (document.getElementById('sync-panel-mount')) injectSyncPanel();
    }, 50);
  });

  // Restore session cloud (dengan timeout agar tidak hang)
  const sessionTimeout = setTimeout(() => {
    console.warn('SI-DEVA: syncRestoreSession timeout, skip.');
  }, 5000);
  try {
    await syncRestoreSession();
  } catch(_) {}
  clearTimeout(sessionTimeout);
});
