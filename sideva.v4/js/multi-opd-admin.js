// ============================================================
//  SI-DEVA — Multi-OPD Admin Management v2.0
//  File: js/multi-opd-admin.js
//
//  PERUBAHAN v2.0 — Config OPD diperlengkap:
//  ✅ Modal Config OPD full-form (ganti prompt() lama)
//  ✅ Field baru: Kode OPD, Singkatan, Kepala OPD, NIP,
//     Jabatan, Alamat, Telepon, Email, Website, Keterangan,
//     Status Aktif — semua disimpan di opd_config.data (JSONB)
//  ✅ Nama OPD tetap di-update langsung di tabel opd
//  ✅ OPD card menampilkan kode & kepala OPD secara async
//  ✅ Indikator status Aktif/Nonaktif di card
// ============================================================

// ── Inject CSS untuk admin panel ─────────────────────────────
(function injectOpdAdminStyle() {
  const s = document.createElement('style');
  s.id = 'multi-opd-admin-style';
  s.textContent = `
    #page-opd-management { padding: 20px; }
    .opd-mgmt-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
    }
    .opd-mgmt-title { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .opd-mgmt-section { margin-bottom: 32px; }
    .opd-mgmt-section-title {
      font-size: 14px; font-weight: 700; color: var(--gold, #c9a84c);
      margin-bottom: 16px; display: flex; align-items: center; gap: 6px;
    }
    .opd-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .opd-card {
      background: var(--surface, #1a1a1a); border: 1px solid var(--border, #2a2a2a);
      border-radius: 12px; padding: 16px; transition: all 0.2s;
    }
    .opd-card:hover { border-color: var(--gold, #c9a84c); box-shadow: 0 4px 12px rgba(201,168,76,0.1); }
    .opd-card.opd-nonaktif { opacity: 0.55; border-style: dashed; }
    .opd-card-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; color: var(--text, #fff); }
    .opd-card-kode { font-size: 12px; color: var(--gold, #c9a84c); font-weight: 600; margin-bottom: 4px; }
    .opd-card-id { font-size: 11px; color: var(--text3, #888); font-family: monospace; margin-bottom: 6px; }
    .opd-card-meta { font-size: 11px; color: var(--text2, #aaa); margin-bottom: 10px; min-height: 14px; }
    .opd-card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .opd-card-actions button { font-size: 11px; padding: 4px 10px; }
    .opd-status-badge {
      display: inline-block; padding: 2px 8px; border-radius: 20px;
      font-size: 10px; font-weight: 700; margin-bottom: 8px;
    }
    .opd-status-aktif   { background: rgba(74,222,128,0.15); color: var(--green, #22c55e); }
    .opd-status-nonaktif { background: rgba(148,163,184,0.12); color: var(--text3, #888); }
    .user-opd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .user-opd-table thead th {
      background: var(--surface2, #222); padding: 10px; text-align: left;
      font-weight: 600; border-bottom: 2px solid var(--border, #2a2a2a);
      font-size: 11px; text-transform: uppercase; color: var(--text3, #888);
    }
    .user-opd-table tbody td { padding: 10px; border-bottom: 1px solid var(--border, #2a2a2a); }
    .user-opd-table tbody tr:hover { background: var(--surface2, #222); }
    .opd-badge-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .opd-badge-item {
      display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px;
      background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.3);
      border-radius: 6px; font-size: 11px; color: var(--gold, #c9a84c);
    }
    .opd-badge-item .remove-btn { cursor: pointer; margin-left: 2px; opacity: 0.6; transition: opacity 0.2s; }
    .opd-badge-item .remove-btn:hover { opacity: 1; }
    .empty-state { text-align: center; padding: 40px 20px; color: var(--text3, #888); }
    .empty-state-icon { font-size: 48px; margin-bottom: 12px; }

    /* ── Modal Config OPD ── */
    .opd-cfg-modal-overlay {
      position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.65);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .opd-cfg-modal {
      background: var(--surface, #1a1a1a); border: 1px solid var(--border, #2a2a2a);
      border-radius: 14px; padding: 0; width: 100%; max-width: 560px;
      max-height: 90vh; overflow-y: auto;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    }
    .opd-cfg-modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 16px; border-bottom: 1px solid var(--border, #2a2a2a);
      position: sticky; top: 0; background: var(--surface, #1a1a1a); z-index: 1;
    }
    .opd-cfg-modal-title { font-size: 16px; font-weight: 700; }
    .opd-cfg-modal-close {
      width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--border2, #333);
      background: var(--surface2, #222); color: var(--text2, #aaa); cursor: pointer;
      font-size: 14px; display: flex; align-items: center; justify-content: center;
    }
    .opd-cfg-modal-close:hover { background: var(--surface3, #2a2a2a); color: var(--text, #fff); }
    .opd-cfg-modal-body { padding: 20px 24px; }
    .opd-cfg-section-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
      color: var(--gold, #c9a84c); margin-bottom: 12px; margin-top: 20px;
      padding-bottom: 6px; border-bottom: 1px solid var(--border, #2a2a2a);
    }
    .opd-cfg-section-label:first-child { margin-top: 0; }
    .opd-cfg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 480px) { .opd-cfg-grid-2 { grid-template-columns: 1fr; } }
    .opd-cfg-field { margin-bottom: 12px; }
    .opd-cfg-label {
      display: block; font-size: 12px; font-weight: 600;
      color: var(--text2, #aaa); margin-bottom: 5px;
    }
    .opd-cfg-label .req { color: var(--red, #ef4444); }
    .opd-cfg-input, .opd-cfg-textarea, .opd-cfg-select {
      width: 100%; padding: 8px 11px; border-radius: 7px;
      border: 1px solid var(--border2, #333); background: var(--surface2, #222);
      color: var(--text, #fff); font-size: 13px; box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .opd-cfg-input:focus, .opd-cfg-textarea:focus, .opd-cfg-select:focus {
      outline: none; border-color: var(--primary, #3b82f6); background: var(--surface, #1a1a1a);
    }
    .opd-cfg-textarea { resize: vertical; min-height: 64px; }
    .opd-cfg-toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border2, #333);
      background: var(--surface2, #222);
    }
    .opd-cfg-toggle-label { font-size: 13px; font-weight: 600; }
    .opd-cfg-toggle-desc { font-size: 11px; color: var(--text3, #888); margin-top: 2px; }
    .opd-cfg-toggle {
      position: relative; width: 42px; height: 24px; cursor: pointer; flex-shrink: 0;
    }
    .opd-cfg-toggle input { opacity: 0; width: 0; height: 0; }
    .opd-cfg-toggle-slider {
      position: absolute; inset: 0; background: var(--border2, #333);
      border-radius: 24px; transition: background 0.2s;
    }
    .opd-cfg-toggle-slider:before {
      position: absolute; content: ''; height: 18px; width: 18px; left: 3px; top: 3px;
      background: #fff; border-radius: 50%; transition: transform 0.2s;
    }
    .opd-cfg-toggle input:checked + .opd-cfg-toggle-slider { background: var(--green, #22c55e); }
    .opd-cfg-toggle input:checked + .opd-cfg-toggle-slider:before { transform: translateX(18px); }
    .opd-cfg-modal-footer {
      display: flex; gap: 10px; padding: 16px 24px;
      border-top: 1px solid var(--border, #2a2a2a);
      position: sticky; bottom: 0; background: var(--surface, #1a1a1a);
    }
    .opd-cfg-note {
      font-size: 11px; color: var(--text3, #888); margin-top: 4px;
    }
  `;
  document.head.appendChild(s);
})();

// ── State ────────────────────────────────────────────────────
let _opdMgmtUsers   = [];
let _opdMgmtLoading = false;

// ── Render halaman OPD Management ────────────────────────────
async function renderOpdManagement() {
  const el = document.getElementById('page-opd-management');
  if (!el) return;

  // Tunggu sampai SBAuth siap (Safety Check)
 
  // ── Render halaman OPD Management ────────────────────────────
async function renderOpdManagement() {
  const el = document.getElementById('page-opd-management');
  if (!el) return;

  // Tunggu sampai SBAuth siap (Safety Check)
  const checkAccess = () => {
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) return 'login';
    if (typeof isAdmin === 'function' && !isAdmin()) return 'denied';
    return 'ok';
  };

  const status = checkAccess();
  if (status === 'login') {
    el.innerHTML = '<div class="empty-state">Silakan login terlebih dahulu</div>';
    return;
  }
  if (status === 'denied') {
    el.innerHTML = '<div class="empty-state">Akses ditolak - Hanya Admin</div>';
    return;
  }
  if (!isAdmin()) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚫</div><div>Akses ditolak - Hanya Admin</div></div>';
    return;
  }

  el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text3);">⏳ Memuat data OPD…</div>`;
  _opdMgmtLoading = true;

  try {
    const opdList = await dbGetAll('opd');
    _opdMgmtUsers = await sbGetAllUsersWithEmail();
    _opdMgmtLoading = false;
    _renderOpdMgmtContent(el, opdList);
  } catch(e) {
    _opdMgmtLoading = false;
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div>Gagal memuat data: ${e.message}</div></div>`;
  }
}

function _renderOpdMgmtContent(el, opdList) {
  el.innerHTML = `
    <div class="opd-mgmt-header">
      <div class="opd-mgmt-title">🏢 Manajemen OPD &amp; Akses</div>
      ${typeof isSuperAdmin === 'function' && isSuperAdmin() ? '<button class="btn btn-primary btn-sm" onclick="openAddOpdModal()">➕ Tambah OPD</button>' : '<span style="font-size:11px;color:var(--text3);padding:4px 10px;">Kontak Super Admin untuk tambah OPD</span>'}
    </div>

    <div class="opd-mgmt-section">
      <div class="opd-mgmt-section-title">📋 Daftar Organisasi Perangkat Daerah</div>
      <div class="opd-list" id="opd-list-container">
        ${opdList.length === 0
          ? '<div class="empty-state"><div class="empty-state-icon">📭</div><div>Belum ada OPD terdaftar</div></div>'
          : opdList.map(opd => `
            <div class="opd-card" id="opd-card-${opd.id}">
              <div id="opd-status-${opd.id}"></div>
              <div class="opd-card-name">${_esc(opd.namaOpd || opd.nama_opd || opd.id)}</div>
              <div class="opd-card-kode" id="opd-kode-${opd.id}"></div>
              <div class="opd-card-id">ID: ${opd.id}</div>
              <div class="opd-card-meta" id="opd-meta-${opd.id}">
                <span style="color:var(--text3);font-size:11px">Memuat info…</span>
              </div>
              <div class="opd-card-actions">
                <button class="btn btn-secondary btn-sm" onclick="editOpdConfig('${opd.id}')">⚙️ Config</button>
                <button class="btn btn-secondary btn-sm" onclick="viewOpdUsers('${opd.id}')">👥 Users</button>
              </div>
            </div>
          `).join('')
        }
      </div>
    </div>

    <div class="opd-mgmt-section">
      <div class="opd-mgmt-section-title">👥 Manajemen Akses User ke OPD</div>
      <div class="table-wrap">
        <table class="user-opd-table">
          <thead>
            <tr>
              <th style="width:30%;">User</th>
              <th style="width:50%;">Akses OPD</th>
              <th style="width:20%;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${_opdMgmtUsers.length === 0
              ? '<tr><td colspan="3"><div class="empty-state"><div class="empty-state-icon">👤</div><div>Belum ada user terdaftar</div></div></td></tr>'
              : _opdMgmtUsers.map(u => `
                <tr>
                  <td>
                    <div style="font-weight:600;font-size:13px;">${_esc(u.display_name || u.email?.split('@')[0] || u.user_id.slice(0,8))}</div>
                    <div style="font-size:11px;color:var(--text3);margin-top:2px;">${_esc(u.email || '—')}</div>
                  </td>
                  <td>
                    <div class="opd-badge-list" id="user-opd-list-${u.user_id}">
                      <span style="color:var(--text3);font-size:11px;">Loading…</span>
                    </div>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm btn-icon" onclick="manageUserOpdAccess('${u.user_id}','${_esc(u.email)}')">✏️</button>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Tambah OPD -->
    <div id="modal-add-opd" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
        <div style="font-size:16px;font-weight:700;margin-bottom:20px;">➕ Tambah OPD Baru</div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:12px;color:var(--text3);margin-bottom:5px;font-weight:600;">Nama OPD *</label>
          <input type="text" id="new-opd-name" placeholder="Nama Organisasi Perangkat Daerah" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface2);color:var(--text);font-size:13px;box-sizing:border-box;">
        </div>
        <div style="color:#ef4444;font-size:12px;margin-top:6px;display:none;" id="add-opd-err"></div>
        <div style="display:flex;gap:10px;margin-top:20px;">
          <button class="btn btn-primary" style="flex:1;" onclick="submitAddOpd()">✅ Buat OPD</button>
          <button class="btn btn-secondary" onclick="closeAddOpdModal()">Batal</button>
        </div>
      </div>
    </div>
  `;

  // Load OPD config per card secara async
  opdList.forEach(opd => {
    _loadOpdCardInfo(opd.id);
  });

  // Load OPD access badge per user secara async
  _opdMgmtUsers.forEach(u => {
    loadUserOpdAccessList(u.user_id).then(opdAccess => {
      const container = document.getElementById(`user-opd-list-${u.user_id}`);
      if (container) {
        if (opdAccess.length === 0) {
          container.innerHTML = '<span style="color:var(--text3);font-size:11px;">—</span>';
        } else {
          container.innerHTML = opdAccess.map(opd => `
            <div class="opd-badge-item">
              ${_esc(opd.namaOpd || opd.id)}
              <span class="remove-btn" onclick="revokeUserOpdAccessBtn('${u.user_id}','${opd.id}')">✕</span>
            </div>
          `).join('');
        }
      }
    });
  });
}

// ── Muat info config ke card OPD ─────────────────────────────
async function _loadOpdCardInfo(opdId) {
  try {
    const rows = await sbFetch(`/rest/v1/opd_config?opd_id=eq.${opdId}&select=data`, 'GET');
    const cfg  = rows?.[0]?.data || {};

    const metaEl   = document.getElementById(`opd-meta-${opdId}`);
    const kodeEl   = document.getElementById(`opd-kode-${opdId}`);
    const statusEl = document.getElementById(`opd-status-${opdId}`);
    const cardEl   = document.getElementById(`opd-card-${opdId}`);

    const aktif = cfg.aktif !== false; // default true jika belum diset

    if (statusEl) {
      statusEl.innerHTML = aktif
        ? '<span class="opd-status-badge opd-status-aktif">● Aktif</span>'
        : '<span class="opd-status-badge opd-status-nonaktif">● Nonaktif</span>';
    }
    if (cardEl && !aktif) cardEl.classList.add('opd-nonaktif');

    if (kodeEl) {
      kodeEl.textContent = cfg.kode_opd
        ? `[${cfg.kode_opd}]${cfg.singkatan ? ' · ' + cfg.singkatan : ''}`
        : cfg.singkatan || '';
    }

    if (metaEl) {
      const parts = [];
      if (cfg.kepala_opd) parts.push(`👤 ${cfg.kepala_opd}`);
      if (cfg.telepon)    parts.push(`📞 ${cfg.telepon}`);
      if (cfg.alamat)     parts.push(`📍 ${cfg.alamat.substring(0,40)}${cfg.alamat.length>40?'…':''}`);
      metaEl.innerHTML = parts.length
        ? parts.map(p => `<div>${_esc(p)}</div>`).join('')
        : '<span style="color:var(--text3);font-size:11px">Belum ada info. Klik ⚙️ Config untuk mengisi.</span>';
    }
  } catch(_) {
    const metaEl = document.getElementById(`opd-meta-${opdId}`);
    if (metaEl) metaEl.innerHTML = '';
  }
}

// ── Modal: Tambah OPD ─────────────────────────────────────────
function openAddOpdModal() {
  const m = document.getElementById('modal-add-opd');
  if (m) {
    m.style.display = 'flex';
    document.getElementById('new-opd-name').value = '';
    document.getElementById('add-opd-err').style.display = 'none';
    setTimeout(() => document.getElementById('new-opd-name').focus(), 100);
  }
}

function closeAddOpdModal() {
  const m = document.getElementById('modal-add-opd');
  if (m) m.style.display = 'none';
}

async function submitAddOpd() {
  const name  = document.getElementById('new-opd-name')?.value.trim();
  const errEl = document.getElementById('add-opd-err');
  if (!name) { errEl.textContent = 'Nama OPD wajib diisi'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';
  try {
    const newOpd = await dbPut('opd', { namaOpd: name });
    if (typeof logAudit === 'function') {
      logAudit('opd_added', { opd_name: name }, null, null, newOpd?.id || null);
    }
    toast('OPD berhasil ditambahkan', 'success');
    closeAddOpdModal();
    renderOpdManagement();
  } catch(e) {
    errEl.textContent = 'Gagal: ' + e.message;
    errEl.style.display = 'block';
  }
}

// ══════════════════════════════════════════════════════════════
//  ⚙️  CONFIG OPD — Modal lengkap (pengganti prompt() lama)
//
//  Field yang tersedia:
//  [IDENTITAS]
//  • Nama OPD        → disimpan langsung di tabel opd.nama_opd
//  • Kode OPD        → opd_config.data.kode_opd   (singkatan resmi, mis. "DINAS-PU")
//  • Singkatan       → opd_config.data.singkatan   (mis. "Dinas PU")
//
//  [PEJABAT]
//  • Kepala OPD      → opd_config.data.kepala_opd
//  • NIP Kepala      → opd_config.data.nip_kepala
//  • Jabatan Kepala  → opd_config.data.jabatan_kepala
//
//  [KONTAK]
//  • Alamat          → opd_config.data.alamat
//  • Telepon         → opd_config.data.telepon
//  • Email OPD       → opd_config.data.email_opd
//  • Website         → opd_config.data.website
//
//  [LAINNYA]
//  • Keterangan      → opd_config.data.keterangan
//  • Status Aktif    → opd_config.data.aktif  (boolean, default: true)
// ══════════════════════════════════════════════════════════════
async function editOpdConfig(opdId) {
  const opd = masterState?.opd?.find(o => o.id === opdId);
  if (!opd) { toast('Data OPD tidak ditemukan', 'error'); return; }

  // Tampilkan modal loading dahulu
  _showOpdConfigModal(opdId, opd, null);

  // Muat config existing dari DB
  try {
    const rows = await sbFetch(`/rest/v1/opd_config?opd_id=eq.${opdId}&select=data`, 'GET');
    const cfg  = rows?.[0]?.data || {};
    _populateOpdConfigForm(cfg);
  } catch(_) {
    _populateOpdConfigForm({});
  }
}

function _showOpdConfigModal(opdId, opd, cfg) {
  // Hapus modal lama jika ada
  document.getElementById('opd-cfg-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id    = 'opd-cfg-modal-overlay';
  overlay.className = 'opd-cfg-modal-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="opd-cfg-modal" onclick="event.stopPropagation()">
      <!-- Header -->
      <div class="opd-cfg-modal-header">
        <div class="opd-cfg-modal-title">⚙️ Config OPD</div>
        <button class="opd-cfg-modal-close" onclick="document.getElementById('opd-cfg-modal-overlay').remove()">✕</button>
      </div>

      <!-- Body -->
      <div class="opd-cfg-modal-body">

        <!-- IDENTITAS -->
        <div class="opd-cfg-section-label">📌 Identitas OPD</div>

        <div class="opd-cfg-field">
          <label class="opd-cfg-label">Nama OPD <span class="req">*</span></label>
          <input class="opd-cfg-input" id="ocfg-nama-opd"
            placeholder="Nama lengkap OPD"
            value="${_esc(opd.namaOpd || opd.nama_opd || '')}">
          <div class="opd-cfg-note">Disimpan langsung ke tabel OPD</div>
        </div>

        <div class="opd-cfg-grid-2">
          <div class="opd-cfg-field">
            <label class="opd-cfg-label">Kode OPD</label>
            <input class="opd-cfg-input" id="ocfg-kode-opd"
              placeholder="Mis: DINAS-PU" maxlength="30">
            <div class="opd-cfg-note">Kode unik untuk sistem</div>
          </div>
          <div class="opd-cfg-field">
            <label class="opd-cfg-label">Singkatan</label>
            <input class="opd-cfg-input" id="ocfg-singkatan"
              placeholder="Mis: Dinas PU" maxlength="50">
          </div>
        </div>

        <!-- PEJABAT -->
        <div class="opd-cfg-section-label">👤 Pejabat</div>

        <div class="opd-cfg-field">
          <label class="opd-cfg-label">Nama Kepala OPD</label>
          <input class="opd-cfg-input" id="ocfg-kepala-opd"
            placeholder="Nama lengkap dengan gelar">
        </div>

        <div class="opd-cfg-grid-2">
          <div class="opd-cfg-field">
            <label class="opd-cfg-label">NIP Kepala</label>
            <input class="opd-cfg-input" id="ocfg-nip-kepala"
              placeholder="19XXXXXX XXXXXX X XXX" maxlength="30">
          </div>
          <div class="opd-cfg-field">
            <label class="opd-cfg-label">Jabatan Kepala</label>
            <input class="opd-cfg-input" id="ocfg-jabatan-kepala"
              placeholder="Mis: Kepala Dinas">
          </div>
        </div>

        <!-- KONTAK -->
        <div class="opd-cfg-section-label">📞 Kontak</div>

        <div class="opd-cfg-field">
          <label class="opd-cfg-label">Alamat Kantor</label>
          <textarea class="opd-cfg-textarea" id="ocfg-alamat"
            placeholder="Jl. …"></textarea>
        </div>

        <div class="opd-cfg-grid-2">
          <div class="opd-cfg-field">
            <label class="opd-cfg-label">Telepon</label>
            <input class="opd-cfg-input" id="ocfg-telepon"
              placeholder="(0411) XXXXXX" maxlength="30">
          </div>
          <div class="opd-cfg-field">
            <label class="opd-cfg-label">Email OPD</label>
            <input class="opd-cfg-input" id="ocfg-email-opd"
              type="email" placeholder="opd@daerah.go.id">
          </div>
        </div>

        <div class="opd-cfg-field">
          <label class="opd-cfg-label">Website</label>
          <input class="opd-cfg-input" id="ocfg-website"
            placeholder="https://...">
        </div>

        <!-- LAINNYA -->
        <div class="opd-cfg-section-label">🔧 Lainnya</div>

        <div class="opd-cfg-field">
          <label class="opd-cfg-label">Keterangan / Catatan</label>
          <textarea class="opd-cfg-textarea" id="ocfg-keterangan"
            placeholder="Catatan internal tentang OPD ini"></textarea>
        </div>

        <div class="opd-cfg-field">
          <div class="opd-cfg-toggle-row">
            <div>
              <div class="opd-cfg-toggle-label">Status Aktif</div>
              <div class="opd-cfg-toggle-desc">OPD nonaktif tidak akan muncul di pilihan user biasa</div>
            </div>
            <label class="opd-cfg-toggle">
              <input type="checkbox" id="ocfg-aktif" checked>
              <span class="opd-cfg-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div id="ocfg-error" style="color:var(--red,#ef4444);font-size:12px;margin-top:4px;display:none;"></div>

      </div><!-- /body -->

      <!-- Footer -->
      <div class="opd-cfg-modal-footer">
        <button class="btn btn-primary" style="flex:1" id="ocfg-save-btn"
          onclick="_submitOpdConfig('${opdId}')">💾 Simpan Config</button>
        <button class="btn btn-secondary"
          onclick="document.getElementById('opd-cfg-modal-overlay').remove()">Batal</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function _populateOpdConfigForm(cfg) {
  const setVal = (id, val) => { const el=document.getElementById(id); if(el) el.value = val||''; };
  setVal('ocfg-kode-opd',       cfg.kode_opd       || '');
  setVal('ocfg-singkatan',      cfg.singkatan       || '');
  setVal('ocfg-kepala-opd',     cfg.kepala_opd      || '');
  setVal('ocfg-nip-kepala',     cfg.nip_kepala      || '');
  setVal('ocfg-jabatan-kepala', cfg.jabatan_kepala  || '');
  setVal('ocfg-alamat',         cfg.alamat          || '');
  setVal('ocfg-telepon',        cfg.telepon         || '');
  setVal('ocfg-email-opd',      cfg.email_opd       || '');
  setVal('ocfg-website',        cfg.website         || '');
  setVal('ocfg-keterangan',     cfg.keterangan      || '');
  const chk = document.getElementById('ocfg-aktif');
  if (chk) chk.checked = cfg.aktif !== false;
}

async function _submitOpdConfig(opdId) {
  const gv = id => document.getElementById(id)?.value?.trim() || '';
  const errEl  = document.getElementById('ocfg-error');
  const saveBtn= document.getElementById('ocfg-save-btn');

  const namaOpd = gv('ocfg-nama-opd');
  if (!namaOpd) {
    errEl.textContent = 'Nama OPD wajib diisi.';
    errEl.style.display = 'block';
    document.getElementById('ocfg-nama-opd').focus();
    return;
  }
  errEl.style.display = 'none';
  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Menyimpan…';

  try {
    // 1. Update nama OPD di tabel opd
    await dbPut('opd', { id: opdId, namaOpd });

    // 2. Simpan config ke opd_config (upsert via merge-duplicates)
    const cfg = {
      kode_opd:       gv('ocfg-kode-opd'),
      singkatan:      gv('ocfg-singkatan'),
      kepala_opd:     gv('ocfg-kepala-opd'),
      nip_kepala:     gv('ocfg-nip-kepala'),
      jabatan_kepala: gv('ocfg-jabatan-kepala'),
      alamat:         gv('ocfg-alamat'),
      telepon:        gv('ocfg-telepon'),
      email_opd:      gv('ocfg-email-opd'),
      website:        gv('ocfg-website'),
      keterangan:     gv('ocfg-keterangan'),
      aktif:          document.getElementById('ocfg-aktif')?.checked !== false,
      updated_at:     new Date().toISOString(),
    };
    await saveOpdConfig(opdId, cfg);

    if (typeof logAudit === 'function') {
      logAudit('opd_config', { opd_name: namaOpd }, null, null, opdId);
    }
    toast('Config OPD berhasil disimpan ✅', 'success');
    document.getElementById('opd-cfg-modal-overlay')?.remove();
    renderOpdManagement();

  } catch(e) {
    errEl.textContent = 'Gagal menyimpan: ' + e.message;
    errEl.style.display = 'block';
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Simpan Config';
  }
}

// ── Aksi: Lihat Users di OPD ─────────────────────────────────
async function viewOpdUsers(opdId) {
  const opd = masterState?.opd?.find(o => o.id === opdId);
  if (!opd) return;

  try {
    const rows  = await sbFetch(`/rest/v1/user_opd_access?opd_id=eq.${opdId}&select=user_id`, 'GET');
    const users = rows?.map(r => {
      const found = _opdMgmtUsers.find(u => u.user_id === r.user_id || u.id === r.user_id);
      return found?.email || found?.display_name || r.user_id;
    }) || [];
    const msg = users.length === 0
      ? `Belum ada user yang punya akses ke OPD ini.`
      : `User dengan akses ke OPD ini:\n\n${users.join('\n')}`;
    alert(`OPD: ${opd.namaOpd || opd.nama_opd}\n\n${msg}`);
  } catch(e) {
    toast('Gagal memuat data: ' + e.message, 'error');
  }
}

// ── Aksi: Manage User OPD Access ─────────────────────────────
async function manageUserOpdAccess(userId, email) {
  const opdList   = await dbGetAll('opd');
  const userAccess = await getUserOpdAccessList(userId);
  const userAccessIds = userAccess.map(o => o.id);

  let html = `<div style="font-size:13px;margin-bottom:16px;">Pilih OPD yang bisa diakses oleh:</div>`;
  html += `<div style="font-weight:600;margin-bottom:12px;color:var(--gold)">${_esc(email)}</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
  opdList.forEach(opd => {
    const isChecked = userAccessIds.includes(opd.id);
    html += `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px;border-radius:6px;transition:background 0.2s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
      <input type="checkbox" id="opd-check-${opd.id}" ${isChecked?'checked':''} style="cursor:pointer;">
      <span>${_esc(opd.namaOpd || opd.nama_opd || opd.id)}</span>
    </label>`;
  });
  html += `</div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
      <div style="font-size:16px;font-weight:700;margin-bottom:20px;">👥 Kelola Akses OPD</div>
      ${html}
      <div style="display:flex;gap:10px;margin-top:24px;">
        <button class="btn btn-primary" style="flex:1;" onclick="submitUserOpdAccess('${userId}','${_esc(email)}',this.parentElement.parentElement)">✅ Simpan</button>
        <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Batal</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function submitUserOpdAccess(userId, email, modalEl) {
  const opdList = await dbGetAll('opd');
  const selectedOpds = [];
  opdList.forEach(opd => {
    const checkbox = modalEl.querySelector(`#opd-check-${opd.id}`);
    if (checkbox?.checked) selectedOpds.push(opd.id);
  });

  try {
    await sbFetch(`/rest/v1/user_opd_access?user_id=eq.${userId}`, 'DELETE', null, {'Prefer':'count=none'});
    for (const opdId of selectedOpds) {
      await grantUserOpdAccess(userId, opdId);
      const _opdObj = masterState?.opd?.find(o => o.id === opdId);
      if (typeof logAudit === 'function') logAudit('opd_access_grant', { opd_name: _opdObj?.namaOpd || opdId }, userId, email, opdId);
    }
    toast(`Akses OPD untuk ${email} berhasil diperbarui`, 'success');
    modalEl.parentElement.remove();
    renderOpdManagement();
  } catch(e) {
    toast('Gagal: ' + e.message, 'error');
  }
}

// ── Revoke User OPD Access ────────────────────────────────────
async function revokeUserOpdAccessBtn(userId, opdId) {
  if (!confirm('Cabut akses user ke OPD ini?')) return;
  try {
    await revokeUserOpdAccess(userId, opdId);
    const _opdR = masterState?.opd?.find(o => o.id === opdId);
    if (typeof logAudit === 'function') logAudit('opd_access_revoke', { opd_name: _opdR?.namaOpd || opdId }, userId, null, opdId);
    toast('Akses berhasil dicabut', 'success');
    renderOpdManagement();
  } catch(e) { toast('Gagal: ' + e.message, 'error'); }
}

// ── Helper: Load user OPD access list ────────────────────────
async function loadUserOpdAccessList(userId) {
  try {
    const rows = await sbFetch(
      `/rest/v1/user_opd_access?user_id=eq.${userId}&select=opd_id,opd(id,nama_opd)`, 'GET'
    );
    return rows?.map(r => ({
      id: r.opd_id,
      namaOpd: r.opd?.nama_opd || r.opd_id,
    })) || [];
  } catch(err) { return []; }
}

// ── Fallback: sbGetAllUsersWithEmail ─────────────────────────
if (typeof sbGetAllUsersWithEmail === 'undefined') {
  window.sbGetAllUsersWithEmail = async function() {
    if (typeof sbGetAllUsers === 'function') {
      const users = await sbGetAllUsers();
      return users || [];
    }
    try {
      const rows = await sbFetch('/rest/v1/user_roles?select=user_id,email,role,created_at&order=created_at.asc', 'GET');
      return (rows || []).map(r => ({
        user_id: r.user_id, id: r.user_id,
        email: r.email || r.user_id,
        display_name: r.email || r.user_id,
        role: r.role, created_at: r.created_at,
      }));
    } catch(_) { return []; }
  };
}

// ── Render halaman Manajemen User ─────────────────────────────
async function renderManajemenUser() {
  const el = document.getElementById('um-content');
  if (!el) return;
  if (!isLoggedIn()) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><div>Silakan login terlebih dahulu</div></div>';
    return;
  }
  if (!isAdmin()) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚫</div><div>Akses ditolak - Hanya Admin</div></div>';
    return;
  }
  el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);">⏳ Memuat data user…</div>';
  try {
    const [users, opdList] = await Promise.all([sbGetAllUsersWithEmail(), dbGetAll('opd')]);
    if (!users.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👤</div><div>Belum ada user terdaftar</div></div>';
      return;
    }
    el.innerHTML = `
      <div class="opd-mgmt-header">
        <div class="opd-mgmt-title">👥 Manajemen Akses User per OPD</div>
        <button class="btn btn-ghost btn-sm" onclick="renderManajemenUser()">🔄 Refresh</button>
      </div>
      <div class="table-wrap">
        <table class="user-opd-table">
          <thead>
            <tr><th>#</th><th>Email / User</th><th>Role</th><th>Akses OPD</th><th>Ubah Role</th><th>Kelola OPD</th></tr>
          </thead>
          <tbody id="um-tbody">
            ${users.map((u, i) => {
              const roleOpts = ['admin','operator','viewer']
                .map(r => `<option value="${r}" ${u.role===r?'selected':''}>${r}</option>`).join('');
              return `
                <tr>
                  <td style="color:var(--text3);font-size:12px">${i+1}</td>
                  <td>
                    <div style="font-weight:600;font-size:13px">${_esc(u.email || u.display_name || u.user_id?.slice(0,8) || '-')}</div>
                    ${u.email ? `<div style="font-size:11px;color:var(--text3)">${_esc(u.user_id?.slice(0,12)||'')}</div>` : ''}
                  </td>
                  <td><span class="opd-badge-item" style="background:${u.role==='admin'?'rgba(251,146,60,0.15)':u.role==='operator'?'rgba(74,222,128,0.15)':'rgba(148,163,184,0.15)'};color:${u.role==='admin'?'var(--orange,#f97316)':u.role==='operator'?'var(--green,#22c55e)':'var(--text3)'}">${_esc(u.role||'-')}</span></td>
                  <td><div class="opd-badge-list" id="um-opd-${u.user_id}"><span style="color:var(--text3);font-size:11px">Loading…</span></div></td>
                  <td>
                    <div style="display:flex;gap:6px;align-items:center">
                      <select id="um-role-sel-${u.user_id}" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);font-size:12px">${roleOpts}</select>
                      <button class="btn btn-primary btn-sm" onclick="umChangeRole('${u.user_id}','um-role-sel-${u.user_id}')">Simpan</button>
                    </div>
                  </td>
                  <td><button class="btn btn-secondary btn-sm" onclick="manageUserOpdAccess('${u.user_id}','${_esc(u.email||u.user_id)}')">✏️ Atur OPD</button></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
    users.forEach(u => {
      loadUserOpdAccessList(u.user_id).then(opdAccess => {
        const c = document.getElementById(`um-opd-${u.user_id}`);
        if (!c) return;
        c.innerHTML = opdAccess.length
          ? opdAccess.map(o => `<div class="opd-badge-item">${_esc(o.namaOpd||o.id)}</div>`).join('')
          : '<span style="color:var(--text3);font-size:11px">—</span>';
      });
    });
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div>Gagal memuat: ${_esc(e.message)}</div></div>`;
  }
}

window.umChangeRole = async function(userId, selId) {
  const newRole = document.getElementById(selId)?.value;
  if (!newRole) return;
  try {
    if (typeof sbSetUserRole === 'function') {
      await sbSetUserRole(userId, newRole);
    } else {
      await sbFetch(`/rest/v1/user_roles?user_id=eq.${userId}`, 'PATCH', {role:newRole}, {'Prefer':'return=minimal'});
    }
    toast(`Role berhasil diubah ke "${newRole}"`, 'success');
    renderManajemenUser();
  } catch(e) { toast('Gagal ubah role: ' + e.message, 'error'); }
};

// ── Helpers ───────────────────────────────────────────────────
function _esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Listen navigation changes (avoid monkey-patching showPage) ──
window.addEventListener('sideva:page-changed', (e) => {
  const page = e?.detail?.page;
  if (page === 'opd-management') setTimeout(() => renderOpdManagement(), 60);
  if (page === 'manajemen-user') setTimeout(() => renderManajemenUser(), 60);
});

window.addEventListener('sb-ready', function () {
  const activePage = document.querySelector('.page.active');
  if (activePage?.id === 'page-opd-management') renderOpdManagement();
  if (activePage?.id === 'page-manajemen-user') renderManajemenUser();
});

console.log('✅ Multi-OPD Admin v2.0 loaded');
