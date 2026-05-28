// ============================================================
//  SI-DEVA — Multi-OPD Database Layer v1.0
//  File: js/multi-opd-db.js
//
//  Extend supabase-db.js untuk mendukung multi-OPD
//  Pasang di index.html SETELAH supabase-db.js:
//    <script src="js/supabase-db.js"></script>
//    <script src="js/multi-opd-db.js"></script>
//    <script src="js/supabase-auth.js"></script>
// ============================================================

// ── State Multi-OPD ──────────────────────────────────────────
let _currentOpdId = null;        // OPD yang sedang aktif
let _userOpdList = [];           // Daftar OPD yang bisa diakses user
let _opdConfig = {};             // Config per OPD (branding, dll)

// ── Fungsi: Get Current OPD ──────────────────────────────────
function getCurrentOpdId() {
  return _currentOpdId;
}

function getCurrentOpdName() {
  if (!_currentOpdId) return 'Semua OPD';
  // Cek masterState dulu (sudah ter-map via FIELD_MAP: nama_opd → namaOpd)
  const opdFromState = (typeof masterState !== 'undefined') && masterState?.opd?.find(o => o.id === _currentOpdId);
  if (opdFromState) return opdFromState.namaOpd || opdFromState.nama || opdFromState.nama_opd || _currentOpdId;
  // Fallback ke _userOpdList (selalu tersedia setelah loadUserOpdAccess)
  const opdFromList = _userOpdList.find(o => o.id === _currentOpdId);
  if (opdFromList) return opdFromList.namaOpd || opdFromList.nama || _currentOpdId;
  return _currentOpdId;
}

function getUserOpdList() {
  return _userOpdList || [];
}

// ── Fungsi: Load User OPD Access ─────────────────────────────
async function loadUserOpdAccess() {
  if (!_session?.user?.id) return false;
  
  try {
    // Hanya Super Admin yang boleh melihat semua OPD.
    // Admin OPD tetap dibatasi oleh tabel user_opd_access.
    if (isSuperAdmin()) {
      const allOpds = await dbGetAll('opd');
      _userOpdList = allOpds.map(o => ({
        id: o.id,
        namaOpd: o.namaOpd || o.nama_opd,
        nama: o.namaOpd || o.nama_opd,
      }));
    } else {
      // Ambil OPD access dari tabel user_opd_access
      const rows = await sbFetch(
        `/rest/v1/user_opd_access?user_id=eq.${_session.user.id}&select=opd_id,opd(id,nama_opd)`,
        'GET'
      );
      _userOpdList = rows?.map(r => ({
        id: r.opd_id,
        namaOpd: r.opd?.nama_opd || r.opd_id,
        nama: r.opd?.nama_opd || r.opd_id,
      })) || [];
    }

    // Set OPD pertama sebagai default jika belum ada
    if (_userOpdList.length > 0 && !_currentOpdId) {
      const savedOpdId = localStorage.getItem('sideva_current_opd_id');
      if (savedOpdId && _userOpdList.find(o => o.id === savedOpdId)) {
        _currentOpdId = savedOpdId;
      } else {
        _currentOpdId = _userOpdList[0].id;
        localStorage.setItem('sideva_current_opd_id', _currentOpdId);
      }
    }

    return true;
  } catch(err) {
    console.error('loadUserOpdAccess error:', err);
    return false;
  }
}

// ── Fungsi: Set Current OPD ──────────────────────────────────
async function setCurrentOpd(opdId) {
  // Validasi bahwa user punya akses ke OPD ini
  if (!isSuperAdmin() && !_userOpdList.find(o => o.id === opdId)) {
    throw new Error('Anda tidak punya akses ke OPD ini');
  }

  _currentOpdId = opdId;
  localStorage.setItem('sideva_current_opd_id', opdId);

  // Load config untuk OPD ini
  await loadOpdConfig(opdId);

  // Reload data dengan filter OPD baru
  await loadAllDataFiltered();

  // Emit event opd-changed (langsung di sini, bukan lewat patch di bawah)
  _emitOpdChange();

  return true;
}

// ── Fungsi: Load OPD Config ──────────────────────────────────
async function loadOpdConfig(opdId) {
  try {
    const rows = await sbFetch(
      `/rest/v1/opd_config?opd_id=eq.${opdId}&select=data`,
      'GET'
    );
    const cfg = rows?.[0]?.data || null;
    if (cfg) {
      _opdConfig[opdId] = cfg;
      // Simpan ke localStorage agar bisa diakses tanpa async
      localStorage.setItem(`sideva_opd_config_${opdId}`, JSON.stringify(cfg));
    }
  } catch(err) {
    console.warn('loadOpdConfig error:', err);
  }
}

// ── Fungsi: Save OPD Config ──────────────────────────────────
async function saveOpdConfig(opdId, config) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa mengubah config OPD');

  try {
    await sbFetch(
      `/rest/v1/opd_config`,
      'POST',
      {
        opd_id: opdId,
        data: config,
        updated_at: new Date().toISOString(),
      },
      { 'Prefer': 'resolution=merge-duplicates,return=minimal' }
    );
    _opdConfig[opdId] = config;
    localStorage.setItem(`sideva_opd_config_${opdId}`, JSON.stringify(config));
    return true;
  } catch(err) {
    console.error('saveOpdConfig error:', err);
    throw err;
  }
}

// ── Override: dbGetAll dengan filter OPD ─────────────────────
if (!window._multiOpdOrigDbGetAll) window._multiOpdOrigDbGetAll = window.dbGetAll;
const _multiOpdOrigDbGetAll = window._multiOpdOrigDbGetAll;
window.dbGetAll = async function(store) {
  const tbl  = TABLE_MAP[store] || store;
  const fmap = FIELD_MAP[store];

  // Tabel yang perlu filter OPD
  const opdFilteredTables = [
    'paket',
    'rincian',
    'harga',
    'penyedia',
    'bidang',
    'rekening',
    'ppk',
    'pejabatPengadaan',
    'ecatalog',
  ];

  try {
    let query = `/rest/v1/${tbl}?select=*&order=id.asc`;

    // Tambahkan filter OPD jika diperlukan dan OPD sudah dipilih
    if (opdFilteredTables.includes(store) && _currentOpdId) {
      query += `&opd_id=eq.${_currentOpdId}`;
    }

    const rows = await sbFetch(query, 'GET');
    return fmap ? rows.map(fmap.from) : rows;
  } catch(err) {
    console.error(`dbGetAll(${store}) error:`, err);
    return [];
  }
};

// ── Fungsi: Load All Data dengan filter OPD ──────────────────
async function loadAllDataFiltered() {
  if (!_session) return;
  try {
    const [paket, rincian, harga, penyedia, bidang, opd, rekening, ppk, pejabat, ecatalog] = await Promise.all([
      dbGetAll('paket'), dbGetAll('rincian'), dbGetAll('harga'), dbGetAll('penyedia'),
      dbGetAll('bidang'), dbGetAll('opd'), dbGetAll('rekening'), dbGetAll('ppk'),
      dbGetAll('pejabatPengadaan'), dbGetAll('ecatalog'),
    ]);

    // Update state
    if (typeof state !== 'undefined') {
      state.paket.data    = paket;    state.paket.filtered    = [...paket];
      state.rincian.data  = rincian;  state.rincian.filtered  = [...rincian];
      state.harga.data    = harga;    state.harga.filtered    = [...harga];
      state.penyedia.data = penyedia; state.penyedia.filtered = [...penyedia];
    }
    if (typeof masterState !== 'undefined') {
      masterState.bidang           = bidang;
      masterState.opd              = opd;
      masterState.rekening         = rekening;
      masterState.ppk              = ppk;
      masterState.pejabatPengadaan = pejabat;
      masterState.ecatalog         = ecatalog;
    }

    return true;
  } catch(err) {
    console.error('loadAllDataFiltered error:', err);
    return false;
  }
}

// ── Override: dbPut untuk inject opd_id ──────────────────────
if (!window._multiOpdOrigDbPut) window._multiOpdOrigDbPut = window.dbPut;
const _multiOpdOrigDbPut = window._multiOpdOrigDbPut;
window.dbPut = async function(store, data) {
  const row = { ...data };

  // Inject opd_id untuk tabel yang memerlukan
  const opdFilteredTables = [
    'paket',
    'rincian',
    'harga',
    'penyedia',
    'bidang',
    'rekening',
    'ppk',
    'pejabatPengadaan',
    'ecatalog',
  ];
  
  if (opdFilteredTables.includes(store) && _currentOpdId) {
    row.opd_id = _currentOpdId;
    row.opdId = _currentOpdId;
  }

  // Panggil original dbPut
  const result = await _multiOpdOrigDbPut.call(this, store, row);

  // Jika yang di-save adalah data OPD, reload daftar OPD agar nama tampil
  if (store === 'opd') {
    try {
      const allOpds = await _multiOpdOrigDbGetAll.call(this, 'opd');
      if (typeof masterState !== 'undefined') masterState.opd = allOpds;
      // Refresh _userOpdList jika admin
      if (isSuperAdmin()) {
        _userOpdList = allOpds.map(o => ({
          id: o.id,
          namaOpd: o.namaOpd || o.nama_opd || o.nama,
          nama: o.namaOpd || o.nama_opd || o.nama,
        }));
      }
      _emitOpdChange();
    } catch(e) { console.warn('Refresh OPD list gagal:', e); }
  }

  return result;
};

// ── Fungsi: Grant User OPD Access ────────────────────────────
async function grantUserOpdAccess(userId, opdId) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa grant akses OPD');

  try {
    await sbFetch(
      `/rest/v1/user_opd_access`,
      'POST',
      {
        user_id: userId,
        opd_id: opdId,
        created_at: new Date().toISOString(),
      },
      { 'Prefer': 'resolution=ignore,return=minimal' }
    );
    return true;
  } catch(err) {
    console.error('grantUserOpdAccess error:', err);
    throw err;
  }
}

// ── Fungsi: Revoke User OPD Access ───────────────────────────
async function revokeUserOpdAccess(userId, opdId) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa revoke akses OPD');

  try {
    await sbFetch(
      `/rest/v1/user_opd_access?user_id=eq.${userId}&opd_id=eq.${opdId}`,
      'DELETE',
      null,
      { 'Prefer': 'count=none' }
    );
    return true;
  } catch(err) {
    console.error('revokeUserOpdAccess error:', err);
    throw err;
  }
}

// ── Fungsi: Get User OPD Access List ─────────────────────────
async function getUserOpdAccessList(userId) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa lihat akses user');

  try {
    const rows = await sbFetch(
      `/rest/v1/user_opd_access?user_id=eq.${userId}&select=opd_id,opd(id,nama_opd)`,
      'GET'
    );
    return rows?.map(r => ({
      id: r.opd_id,
      namaOpd: r.opd?.nama_opd || r.opd_id,
    })) || [];
  } catch(err) {
    console.error('getUserOpdAccessList error:', err);
    return [];
  }
}

// ── Override: loadAllData untuk include OPD loading ──────────
if (!window._multiOpdOrigLoadAllData) window._multiOpdOrigLoadAllData = window.loadAllData;
const _multiOpdOrigLoadAllData = window._multiOpdOrigLoadAllData;
window.loadAllData = async function() {
  // Load user OPD access terlebih dahulu
  await loadUserOpdAccess();
  
  // Kemudian load data dengan filter OPD
  return loadAllDataFiltered();
};

// ── Event: Emit saat OPD berubah ─────────────────────────────
function _emitOpdChange() {
  window.dispatchEvent(new CustomEvent('opd-changed', {
    detail: {
      opdId: _currentOpdId,
      opdName: getCurrentOpdName(),
      opdList: _userOpdList,
    }
  }));
}

// ── Init: Load OPD saat session ready ────────────────────────
window.addEventListener('sb-ready', async (e) => {
  if (e.detail.loggedIn) {
    await loadUserOpdAccess();
    _emitOpdChange();
  }
});

console.log('✅ Multi-OPD layer loaded');
