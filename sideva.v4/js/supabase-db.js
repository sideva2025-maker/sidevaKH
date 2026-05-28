// CLEANED v1.0 - Opsi 1: rapi tanpa ubah fungsi
'use strict';

// ============================================================
//  SI-DEVA — Supabase Database Layer v3.0
//  File: js/supabase-db.js
//  Menggantikan IndexedDB. Semua CRUD langsung ke Supabase.
//  Pasang di index.html SEBELUM dashboard.js:
//    <script src="js/supabase-db.js"></script>
//    <script src="js/supabase-auth.js"></script>
//    <script src="js/dashboard.js"></script>
//    <script src="js/pengajuan.js"></script>
// ============================================================

if (!window.SUPABASE_URL)      window.SUPABASE_URL      = 'https://jdzkallojiavqquksrbc.supabase.co';
if (!window.SUPABASE_ANON_KEY) window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkemthbGxvamlhdnFxdWtzcmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzU1OTgsImV4cCI6MjA5NTUxMTU5OH0.iSQImX0lxF7PbXG17scvc7P5ApJxFbWJ1g-Re_qahtw';
var SUPABASE_URL      = window.SUPABASE_URL;
var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

// ── Mapping: nama store lama → nama tabel Supabase baru ──────
if (!window.TABLE_MAP) window.TABLE_MAP = {
  paket:             'paket',
  rincian:           'rincian',
  harga:             'harga',
  penyedia:          'penyedia',
  bidang:            'bidang',
  opd:               'opd',
  rekening:          'rekening',
  ppk:               'ppk',
  pejabatPengadaan:  'pejabat_pengadaan',
  ecatalog:          'ecatalog',
};

var TABLE_MAP = window.TABLE_MAP;

// ── Mapping field: format lama (camelCase) → kolom Supabase (snake_case) ──
if (!window.FIELD_MAP) window.FIELD_MAP = {
  paket: {
    to:   r => ({ no_paket: r.noPaket, opd: r.opd, rup: r.rup, nama_paket: r.namaPaket, program: r.program, kegiatan: r.kegiatan, sub_kegiatan: r.subKegiatan, masa_kerja: r.masaKerja, durasi: r.durasi||null, tanggal_pesanan: r.tanggalPesanan||null, tanggal_selesai: r.tanggalSelesai||null, pagu_anggaran: r.paguAnggaran||null, kode_rekening: r.kodeRekening, bidang: r.bidang, kepala_bidang: r.kepalaBidang, nip: r.nip, tanggal_dpp: r.tanggalDPP||null, output: r.output, opd_id: r.opd_id || r.opdId || null }),
    from: r => ({ id: r.id, noPaket: r.no_paket, opd: r.opd, rup: r.rup, namaPaket: r.nama_paket, program: r.program, kegiatan: r.kegiatan, subKegiatan: r.sub_kegiatan, masaKerja: r.masa_kerja, durasi: r.durasi, tanggalPesanan: r.tanggal_pesanan, tanggalSelesai: r.tanggal_selesai, paguAnggaran: r.pagu_anggaran, kodeRekening: r.kode_rekening, bidang: r.bidang, kepalaBidang: r.kepala_bidang, nip: r.nip, tanggalDPP: r.tanggal_dpp, output: r.output, opd_id: r.opd_id, opdId: r.opd_id }),
  },
  rincian: {
    to:   r => ({ no: r.no, rup: r.rup, user_input: r.user, item_barang: r.itemBarang, vol: r.vol||null, satuan: r.satuan, harga_satuan: r.hargaSatuan||null, jumlah: r.jumlah||null, opd_id: r.opd_id || r.opdId || null }),
    from: r => ({ id: r.id, no: r.no, rup: r.rup, user: r.user_input, itemBarang: r.item_barang, vol: r.vol, satuan: r.satuan, hargaSatuan: r.harga_satuan, jumlah: r.jumlah, tanggalInput: r.tanggal_input, opd_id: r.opd_id, opdId: r.opd_id }),
  },
  harga: {
    to:   r => ({ rup: r.rup, hps: r.hps||null, nama_paket: r.namaPaket, nama_item: r.namaItem, nama_produk: r.namaProduk, nama_penyedia: r.namaPenyedia, link_katalog: r.linkKatalog, qty: r.qty||null, satuan: r.satuan, harga_tayang: r.hargaTayang||null, status_pajak: r.statusPajak, dpp: r.dpp||null, ppn: r.ppn||null, ongkir: r.ongkir||null, total_harga: r.totalHarga||null, pdn: r.pdn, umkm: r.umkm, lokasi: r.lokasi, status_katalog: r.statusKatalog, nego_final: r.negoFinal||null, opd_id: r.opd_id || r.opdId || null, parent_rincian_id: r.parentRincianId||null, pembanding_ke: r.pembandingKe||null }),
    from: r => ({ id: r.id, rup: r.rup, hps: r.hps, namaPaket: r.nama_paket, namaItem: r.nama_item, namaProduk: r.nama_produk, namaPenyedia: r.nama_penyedia, linkKatalog: r.link_katalog, qty: r.qty, satuan: r.satuan, hargaTayang: r.harga_tayang, statusPajak: r.status_pajak, dpp: r.dpp, ppn: r.ppn, ongkir: r.ongkir, totalHarga: r.total_harga, pdn: r.pdn, umkm: r.umkm, lokasi: r.lokasi, statusKatalog: r.status_katalog, negoFinal: r.nego_final, opd_id: r.opd_id, opdId: r.opd_id, parentRincianId: r.parent_rincian_id||null, pembandingKe: r.pembanding_ke||null }),
  },
  penyedia: {
    to:   r => ({ no: r.no, nama_penyedia: r.namaPenyedia, alamat: r.alamat, bentuk_usaha: r.bentukUsaha, status: r.status, tipe: r.tipe, link_toko: r.linkToko, opd_id: r.opd_id || r.opdId || null }),
    from: r => ({ id: r.id, no: r.no, namaPenyedia: r.nama_penyedia, alamat: r.alamat, bentukUsaha: r.bentuk_usaha, status: r.status, tipe: r.tipe, linkToko: r.link_toko, opd_id: r.opd_id, opdId: r.opd_id }),
  },
  bidang: {
    to:   r => ({ nama_bidang: r.namaBidang, kode_surat: r.kodeSurat, kepala_bidang: r.kepalaBidang, nip: r.nip, opd_id: r.opd_id || r.opdId || null }),
    from: r => ({ id: r.id, namaBidang: r.nama_bidang, kodeSurat: r.kode_surat, kepalaBidang: r.kepala_bidang, nip: r.nip, opd_id: r.opd_id, opdId: r.opd_id }),
  },
  opd: {
    to:   r => ({ nama_opd: r.namaOpd }),
    from: r => ({ id: r.id, nama: r.nama_opd, namaOpd: r.nama_opd, namaOPD: r.nama_opd }),
  },
  rekening: {
    to:   r => ({ kode_rekening: r.kodeRekening, link_ecatalog: r.linkKatalog || r.linkEcatalog, opd_id: r.opd_id || r.opdId || null }),
    from: r => ({ id: r.id, kodeRekening: r.kode_rekening, linkEcatalog: r.link_ecatalog, linkKatalog: r.link_ecatalog, opd_id: r.opd_id, opdId: r.opd_id }),
  },
  ppk: {
    to:   r => ({
      nama_ppk:    r.namaPPK  || r.nama,
      nip:         r.nip,
      jabatan:     r.jabatan,
      scan_ttd:    r.scanTTD  || r.ttd  || null,
      lebar_ttd:   r.lebarTTD || r.ttdSizeW || null,
      tinggi_ttd:  r.tinggiTTD|| r.ttdSizeH || null,
      cap_stempel: r.capStempel|| r.cap || null,
      lebar_cap:   r.lebarCap || r.capSizeW || null,
      tinggi_cap:  r.tinggiCap|| r.capSizeH || null,
      opd_id:      r.opd_id || r.opdId || null,
    }),
    from: r => ({
      id:        r.id,
      nama:      r.nama_ppk,
      namaPPK:   r.nama_ppk,
      nip:       r.nip,
      jabatan:   r.jabatan,
      ttd:       r.scan_ttd,
      cap:       r.cap_stempel,
      ttdSizeW:  r.lebar_ttd,
      ttdSizeH:  r.tinggi_ttd,
      capSizeW:  r.lebar_cap,
      capSizeH:  r.tinggi_cap,
      scanTTD:   r.scan_ttd,
      capStempel:r.cap_stempel,
      lebarTTD:  r.lebar_ttd,
      tinggiTTD: r.tinggi_ttd,
      lebarCap:  r.lebar_cap,
      tinggiCap: r.tinggi_cap,
      opd_id:    r.opd_id,
      opdId:     r.opd_id,
    }),
  },
  pejabatPengadaan: {
    // FIX: dashboard.js savePejabatPengadaan() mengirim { nama, nip, jabatan }
    // bukan { namaPejabat }, jadi harus fallback ke r.nama
    to:   r => ({ nama_pejabat: r.namaPejabat || r.nama, nip: r.nip, jabatan: r.jabatan, opd_id: r.opd_id || r.opdId || null }),
    from: r => ({ id: r.id, nama: r.nama_pejabat, namaPejabat: r.nama_pejabat, nip: r.nip, jabatan: r.jabatan, opd_id: r.opd_id, opdId: r.opd_id }),
  },
  ecatalog: {
    to:   r => ({ jenis_belanja: r.jenisBelanja || r.jenisBlanja, link_ecatalog: r.linkEcatalog, opd_id: r.opd_id || r.opdId || null }),
    from: r => ({ id: r.id, jenisBelanja: r.jenis_belanja, linkEcatalog: r.link_ecatalog, opd_id: r.opd_id, opdId: r.opd_id }),
  },
};

var FIELD_MAP = window.FIELD_MAP;

// ── State auth ───────────────────────────────────────────────
if (typeof _session === 'undefined')       var _session  = null;
if (typeof _userRole === 'undefined')      var _userRole = null;
if (typeof _realtimeSubs === 'undefined')  var _realtimeSubs = [];

// ── Request helper ───────────────────────────────────────────
async function sbFetch(path, method = 'GET', body = null, extra = {}) {
  const token = _session?.access_token;
  const headers = {
    'apikey':        SUPABASE_ANON_KEY,
    'Content-Type':  'application/json',
    ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
    ...extra,
  };
  if (method === 'POST' && path.startsWith('/rest/')) {
    headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
  } else if (method !== 'GET' && path.startsWith('/rest/')) {
    headers['Prefer'] = 'return=representation';
  }
  const res  = await fetch(SUPABASE_URL + path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text();
  const json = text ? (() => { try { return JSON.parse(text); } catch(_) { return {}; } })() : {};
  if (!res.ok) {
    const err = new Error(json.message || json.error_description || JSON.stringify(json));
    err.status = res.status;
    throw err;
  }
  return json;
}

// ── AUTH ─────────────────────────────────────────────────────
async function sbLogin(email, password) {
  const data = await sbFetch('/auth/v1/token?grant_type=password', 'POST', { email, password });
  _session = data;
  localStorage.setItem('sideva_session_v3', JSON.stringify(data));
  await _loadRole();
  return data;
}

async function sbRegister(email, password) {
  return sbFetch('/auth/v1/signup', 'POST', { email, password });
}

async function sbLogout() {
  try { console.log('[SBDB] sbLogout invoked'); } catch(_) {}

  // Sync gambar kop surat ke Supabase sebelum session dihapus
  try {
    const kopImg = localStorage.getItem('sideva_kop_surat_img');
    if (kopImg && _session?.access_token) {
      const cfgToSync = { ...(typeof appConfig !== 'undefined' ? appConfig : {}), _kopSuratImg: kopImg };
      console.log('[SBDB] syncing kop surat image before logout');
      await sbSaveConfig(cfgToSync);
    }
  } catch(_) {}

  // Panggil endpoint logout Supabase (tanpa credentials:include agar tidak CORS error)
  try {
    await sbFetch('/auth/v1/logout', 'POST', null, {
      'Authorization': 'Bearer ' + _session?.access_token
    });
    console.log('[SBDB] logout completed');
  } catch(_) {}

  // Bersihkan state lokal
  _session  = null;
  _userRole = null;
  localStorage.removeItem('sideva_session_v3');
  localStorage.removeItem('sideva_sb_session');
  localStorage.removeItem('sideva_role');
  localStorage.removeItem('sideva_current_opd_id');
  _stopRealtime();
  console.log('[SBDB] local session and storage cleared');
}
{
  try { console.log('[SBDB] sbLogout invoked'); } catch(_) {}
  // Sync gambar kop surat ke Supabase sebelum session dihapus,
  // agar tersedia kembali saat login ulang dari device mana pun.
  try {
    const kopImg = localStorage.getItem('sideva_kop_surat_img');
    if (kopImg && _session?.access_token) {
      const cfgToSync = { ...(typeof appConfig !== 'undefined' ? appConfig : {}), _kopSuratImg: kopImg };
      console.log('[SBDB] syncing kop surat image before logout');
      await sbSaveConfig(cfgToSync);
    }
  } catch(_) {}

  try {
    console.log('[SBDB] calling sbFetch /auth/v1/logout (JS API)');
    await sbFetch('/auth/v1/logout', 'POST', null, { 'Authorization': 'Bearer ' + _session?.access_token });
    console.log('[SBDB] sbFetch logout completed');
  } catch(_) {}
  // Call local proxy endpoint to avoid CORS blocking
  try {
<<<<<<< HEAD
    console.log('[SBDB] calling /api/logout proxy to clear server cookies');
    const res = await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    console.log('[SBDB] proxy logout response', { status: res.status, ok: res.ok });
  } catch(e) {
    console.warn('[SBDB] proxy logout failed:', e);
    // Fallback: attempt direct logout if proxy unavailable
    try {
      const headers = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
      if (_session?.access_token) headers['Authorization'] = 'Bearer ' + _session.access_token;
      console.log('[SBDB] fallback: calling Supabase logout directly');
      const res = await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, { method: 'POST', headers, credentials: 'include' });
      console.log('[SBDB] fallback logout response', { status: res.status, ok: res.ok });
    } catch(e2) {
      console.warn('[SBDB] fallback logout also failed:', e2);
    }
  }
=======
>>>>>>> 3c208f827e15fea87e6521916d33fbfee656d0c8

  _session = null;
  _userRole = null;
  localStorage.removeItem('sideva_session_v3');
  localStorage.removeItem('sideva_sb_session');
  localStorage.removeItem('sideva_role');
  localStorage.removeItem('sideva_current_opd_id');
  _stopRealtime();
  try { console.log('[SBDB] local session and storage cleared'); } catch(_) {}
}

async function sbRefreshToken() {
  if (!_session?.refresh_token) return false;
  try {
    const data = await sbFetch('/auth/v1/token?grant_type=refresh_token', 'POST', { refresh_token: _session.refresh_token });
    _session = data;
    localStorage.setItem('sideva_session_v3', JSON.stringify(data));
    return true;
  } catch(_) { return false; }
}

async function sbRestoreSession() {
  const saved = localStorage.getItem('sideva_session_v3');
  if (!saved) return false;
  try {
    _session = JSON.parse(saved);
    const ok = await sbRefreshToken();
    if (!ok) { _session = null; localStorage.removeItem('sideva_session_v3'); return false; }
    await _loadRole();
    return true;
  } catch(_) { return false; }
}

async function _loadRole() {
  try {
    const rows = await sbFetch(`/rest/v1/user_roles?user_id=eq.${_session.user.id}&select=role`, 'GET');
    _userRole = rows?.[0]?.role || 'viewer';
  } catch(_) { _userRole = 'viewer'; }
}

function getRole()       { return _userRole; }
function isSuperAdmin()  { return _userRole === 'super_admin'; }
function isAdmin()       { return _userRole === 'admin' || _userRole === 'super_admin'; }
function isOperator()    { return _userRole === 'admin' || _userRole === 'super_admin' || _userRole === 'operator'; }
function isLoggedIn()    { return !!_session; }
function getCurrentUser() { return _session?.user || null; }

// ── CRUD — dbGetAll ───────────────────────────────────────────
async function dbGetAll(store) {
  const tbl  = TABLE_MAP[store] || store;
  const fmap = FIELD_MAP[store];
  try {
    const rows = await sbFetch(`/rest/v1/${tbl}?select=*&order=id.asc`, 'GET');
    return fmap ? rows.map(fmap.from) : rows;
  } catch(err) {
    console.error(`dbGetAll(${store}) error:`, err);
    return [];
  }
}

// Tabel yang punya kolom created_by / updated_by
if (!window.AUDIT_TABLES) window.AUDIT_TABLES = new Set(['paket']);
var AUDIT_TABLES = window.AUDIT_TABLES;

// ── CRUD — dbPut ──────────────────────────────────────────────
async function dbPut(store, data) {
  const tbl  = TABLE_MAP[store] || store;
  const fmap = FIELD_MAP[store];
  const token = _session?.access_token;
  if (!token) throw new Error('Sesi habis. Silakan login ulang.');

  const payload = fmap ? fmap.to(data) : { ...data };
  if (data.opd_id && !payload.opd_id) payload.opd_id = data.opd_id;
  if (data.opdId && !payload.opd_id)  payload.opd_id = data.opdId;
  Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });

  const hasAudit = AUDIT_TABLES.has(store);
  let result;
  if (data.id) {
    if (hasAudit) payload.updated_by = _session.user.id;
    const rows = await sbFetch(`/rest/v1/${tbl}?id=eq.${data.id}`, 'PATCH', payload);
    result = fmap ? fmap.from(Array.isArray(rows) ? rows[0] : rows) : rows;
  } else {
    if (hasAudit) { payload.created_by = _session.user.id; payload.updated_by = _session.user.id; }
    const rows = await sbFetch(`/rest/v1/${tbl}`, 'POST', payload);
    const row  = Array.isArray(rows) ? rows[0] : rows;
    result = fmap ? fmap.from(row) : row;
  }

  if (typeof tgNotifPaket === 'function') {
    const jenis = data.id ? 'update' : 'baru';
    if (store === 'paket') {
      tgNotifPaket(data, jenis).catch(() => {});
    } else if (store === 'rincian') {
      tgNotifRincian(data, jenis).catch(() => {});
    }
  }

  return result;
}

// ── CRUD — dbDelete ───────────────────────────────────────────
async function dbDelete(store, id) {
  const tbl = TABLE_MAP[store] || store;
  if (!_session?.access_token) throw new Error('Sesi habis. Silakan login ulang.');
  await sbFetch(`/rest/v1/${tbl}?id=eq.${id}`, 'DELETE');
}

// ── CRUD — dbClear (hanya admin) ─────────────────────────────
async function dbClear(store) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa clear data');
  const tbl = TABLE_MAP[store] || store;
  await sbFetch(`/rest/v1/${tbl}?id=neq.0`, 'DELETE');
}

// ── CONFIG ───────────────────────────────────────────────────
async function sbGetConfig() {
  try {
    const rows = await sbFetch(`/rest/v1/app_config?id=eq.global&select=data`, 'GET');
    return rows?.[0]?.data || null;
  } catch(_) { return null; }
}

async function sbSaveConfig(cfg) {
  await sbFetch(`/rest/v1/app_config`, 'POST', { id: 'global', data: cfg, updated_at: new Date().toISOString() },
    { 'Prefer': 'resolution=merge-duplicates,return=minimal' });
}

// ── ROLE MANAGEMENT (admin only) ─────────────────────────────
async function sbGetAllUsers() {
  if (!isAdmin()) return [];
  return sbFetch(`/rest/v1/user_roles?select=*&order=created_at.asc`, 'GET');
}

// Mengembalikan user lengkap dengan email untuk Manajemen OPD.
// Coba view 'user_profiles' dulu → fallback ke user_roles saja.
// Field yang dijamin: user_id (UUID), id (alias), email, display_name, role, created_at
async function sbGetAllUsersWithEmail() {
  if (!isAdmin()) return [];

  // Coba view user_profiles (join auth.users + user_roles)
  // Buat di Supabase SQL Editor jika belum ada:
  //   CREATE OR REPLACE VIEW public.user_profiles AS
  //   SELECT au.id AS user_id, au.email,
  //          COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS display_name,
  //          ur.role, ur.created_at
  //   FROM auth.users au
  //   LEFT JOIN public.user_roles ur ON au.id = ur.user_id;
  //   GRANT SELECT ON public.user_profiles TO authenticated;
  try {
    const rows = await sbFetch(
      `/rest/v1/user_profiles?select=user_id,email,display_name,role,created_at&order=created_at.asc`,
      'GET'
    );
    if (Array.isArray(rows)) {
      return rows.map(r => ({
        ...r,
        id: r.user_id,
        email: r.email || r.display_name || (r.user_id?.slice(0,8) + '…'),
        display_name: r.display_name || r.email || null,
      }));
    }
  } catch(_) { /* view belum ada, lanjut ke fallback */ }

  // Fallback: user_roles saja (tanpa email)
  try {
    const rows = await sbFetch(
      `/rest/v1/user_roles?select=*&order=created_at.asc`,
      'GET'
    );
    return (rows || []).map(r => ({
      ...r,
      id: r.user_id,
      email: null,
      display_name: 'User ' + (r.user_id?.slice(0,8) || '-'),
    }));
  } catch(e) {
    console.error('sbGetAllUsersWithEmail error:', e);
    return [];
  }
}

async function sbSetUserRole(userId, role) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa mengatur role');
  if ((role === 'admin' || role === 'super_admin') && !isSuperAdmin())
    throw new Error('Hanya Super Admin yang bisa memberikan role Admin atau Super Admin');
  // Ambil role lama untuk audit trail
  let oldRole = '?';
  try {
    const existing = await sbFetch(`/rest/v1/user_roles?user_id=eq.${userId}&select=role,email`, 'GET');
    oldRole = existing?.[0]?.role || '?';
    const targetEmail = existing?.[0]?.email || null;
    const result = await sbFetch(`/rest/v1/user_roles?user_id=eq.${userId}`, 'PATCH', { role, updated_at: new Date().toISOString() });
    if (typeof logAudit === 'function') {
      logAudit('role_change', { old_role: oldRole, new_role: role }, userId, targetEmail);
    }
    return result;
  } catch(e) { throw e; }
}

// ── REALTIME — polling fallback ───────────────────────────────
function _startRealtime() {
  if (!_session) return;
  _startPolling();
}

if (typeof _pollTimer === 'undefined') var _pollTimer = null;
function _startPolling() {
  _stopPolling();
  _pollTimer = setInterval(async () => {
    if (!_session) return;
    // Cek apakah user sedang mengetik atau ada modal terbuka
    const _active = document.activeElement;
    const _isTyping = _active && (
      _active.tagName === 'INPUT' || _active.tagName === 'TEXTAREA'
    ) && !_active.closest('.modal, [class*="modal"]');
    const _modalOpen = !!document.querySelector(
      '.modal.active, [id*="modal"][style*="flex"], [id*="modal"][style*="block"]'
    );
    try {
      await loadAllData();
      // Jika user sedang mengetik atau modal terbuka, skip re-render
      if (_isTyping || _modalOpen) return;
      // Re-terapkan filter aktif agar nilai search/filter di DOM tetap terjaga
      if (typeof filterPaket    === 'function') filterPaket();
      else if (typeof renderAll === 'function') renderAll();
      if (typeof filterRincian  === 'function') filterRincian();
      if (typeof filterHarga    === 'function') filterHarga();
      if (typeof filterPenyedia === 'function') filterPenyedia();
      if (typeof renderDashboard=== 'function' && typeof currentPage !== 'undefined' && currentPage === 'dashboard') renderDashboard();
      if (typeof renderMaster   === 'function' && typeof currentPage !== 'undefined' && currentPage === 'master') renderMaster();
    } catch(_) {}
  }, 30000);
}

function _stopPolling() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

function _stopRealtime() {
  _realtimeSubs.forEach(s => { try { s.close(); } catch(_) {} });
  _realtimeSubs = [];
  _stopPolling();
}

// ── LOAD ALL DATA ke state ────────────────────────────────────
async function loadAllData() {
  if (!_session) return;
  try {
    const [paket, rincian, harga, penyedia, bidang, opd, rekening, ppk, pejabat, ecatalog] = await Promise.all([
      dbGetAll('paket'), dbGetAll('rincian'), dbGetAll('harga'), dbGetAll('penyedia'),
      dbGetAll('bidang'), dbGetAll('opd'), dbGetAll('rekening'), dbGetAll('ppk'),
      dbGetAll('pejabatPengadaan'), dbGetAll('ecatalog'),
    ]);

    if (typeof state !== 'undefined') {
      // Hanya update .data, jangan reset .filtered agar filter aktif tetap terjaga
      state.paket.data    = paket;
      state.rincian.data  = rincian;
      state.harga.data    = harga;
      state.penyedia.data = penyedia;
    }
    if (typeof masterState !== 'undefined') {
      masterState.bidang           = bidang;
      masterState.opd              = opd;
      masterState.rekening         = rekening;
      masterState.ppk              = ppk;
      masterState.pejabatPengadaan = pejabat;
      masterState.ecatalog         = ecatalog;
    }

    const cfg = await sbGetConfig();
    if (cfg) {
      const { _kopSuratImg, ...cfgData } = cfg;
      localStorage.setItem('sideva_config', JSON.stringify(cfgData));
      if (_kopSuratImg) {
        localStorage.setItem('sideva_kop_surat_img', _kopSuratImg);
      }
    }

    return true;
  } catch(err) {
    console.error('loadAllData error:', err);
    return false;
  }
}

// ── INIT ─────────────────────────────────────────────────────
if (!window._sbInitRegistered) {
  window._sbInitRegistered = true;
  window._sbReady = false;
  document.addEventListener('DOMContentLoaded', async () => {
    const ok = await sbRestoreSession();
    window._sbReady = true;

    if (ok) {
      // User sudah login — load data dan render app
      await loadAllData();
      _startPolling();
      if (typeof renderAll === 'function') renderAll();
      if (typeof updateBadges === 'function') updateBadges();
    } else {
      // Tidak ada sesi — sembunyikan app, tampilkan login
      const appEl = document.getElementById('app') ||
                    document.querySelector('.app-container') ||
                    document.querySelector('.sidebar') ||
                    document.querySelector('main');
      if (appEl) appEl.style.display = 'none';

      // Trigger event agar file lain bisa tampilkan login modal
      window.dispatchEvent(new CustomEvent('sideva:show-login'));
    }

    window.dispatchEvent(new CustomEvent('sb-ready', { detail: { loggedIn: ok, role: _userRole } }));
  });
}

// ── Fungsi: Tambah User Baru (oleh Admin) ───────────────────
// Membuat akun baru tanpa mengganti session admin yang sedang aktif
async function sbInviteUser(email, password, role, displayName) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa menambahkan user');

  // Step 1: Buat akun via signup — gunakan fetch langsung (anon key saja,
  //         tanpa JWT session admin) agar session admin tidak terganti
  const resp = await fetch(SUPABASE_URL + '/auth/v1/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: email,
      password: password,
      data: { full_name: displayName || email }
    })
  });

  let result;
  try { result = await resp.json(); } catch(_) { result = {}; }

  if (!resp.ok) {
    const msg = result?.msg || result?.message || result?.error_description || 'Gagal membuat akun';
    throw new Error(msg);
  }

  const newUserId = result?.user?.id || result?.id;
  if (!newUserId) throw new Error('Gagal mendapatkan ID user baru dari Supabase');

  // Step 2: Daftarkan role di tabel user_roles menggunakan session admin
  try {
    await sbFetch('/rest/v1/user_roles', 'POST', {
      user_id:      newUserId,
      email:        email,
      display_name: displayName || email,
      role:         role || 'viewer',
      created_at:   new Date().toISOString()
    }, { 'Prefer': 'resolution=ignore,return=minimal' });
    if (typeof logAudit === 'function') {
      logAudit('user_added', { role: role || 'viewer', display_name: displayName || '' }, newUserId, email);
    }
  } catch(e) {
    // User berhasil dibuat tapi role gagal — masih dianggap sukses sebagian
    console.warn('sbInviteUser: user dibuat tapi role gagal diset:', e.message);
  }

  return result;
}
