// ============================================================
//  SI-DEVA — Manajemen User & Role v3.1
//  File: js/user-management.js
//
//  Pasang di index.html SETELAH supabase-db.js & dashboard.js:
//    <script src="js/user-management.js"></script>
//
//  Jalankan SQL berikut di Supabase SQL Editor (SEKALI saja):
//    ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS email text;
//    ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS display_name text;
//    ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
//    ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
//
//  [v3.1] BARU: Fitur Reset Password (kirim email reset + set password langsung)
// ============================================================

// ── Tambahan fungsi Supabase (extend supabase-db.js) ─────────
async function sbGetAllUsersWithEmail() {
  if (!isAdmin()) return [];
  try {
    const rows = await sbFetch(`/rest/v1/user_roles?select=*&order=created_at.asc`, 'GET');
    return rows || [];
  } catch(e) { return []; }
}

async function sbAddUserRole(email, role, displayName) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa menambah user');
  const payload = {
    user_id:      'pending_' + Date.now(),
    email:        email,
    display_name: displayName || '',
    role:         role,
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  };
  return sbFetch(`/rest/v1/user_roles`, 'POST', payload);
}

async function sbUpdateUserRole(id, role) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa mengatur role');
  return sbFetch(`/rest/v1/user_roles?id=eq.${id}`, 'PATCH', {
    role,
    updated_at: new Date().toISOString()
  });
}

async function sbRemoveUserRole(id) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa menghapus user');
  return sbFetch(`/rest/v1/user_roles?id=eq.${id}`, 'DELETE');
}

async function sbInviteUser(email, password, role, displayName) {
  if (!isAdmin()) throw new Error('Hanya admin yang bisa menambah user');
  const authData = await sbRegister(email, password);
  const userId   = authData?.user?.id || authData?.id || null;
  const payload = {
    user_id:      userId || ('pending_' + Date.now()),
    email:        email,
    display_name: displayName || '',
    role:         role,
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  };
  await sbFetch(`/rest/v1/user_roles`, 'POST', payload);
  return authData;
}

// ── Reset Password: kirim email via Supabase Auth ─────────────
async function sbSendResetPasswordEmail(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      'apikey':       SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.msg || 'Gagal mengirim email reset');
  }
  return true;
}

// ── Reset Password: set password langsung via Cloudflare Worker ──
async function sbAdminSetPassword(userId, newPassword) {
  const endpoint = window.SIDEVA_ADMIN_API_BASE
    ? window.SIDEVA_ADMIN_API_BASE.replace(/\/$/, '') + '/api/admin/set-password'
    : '/api/admin/set-password';
  const token = (typeof _session !== 'undefined' && _session?.access_token) ? _session.access_token : '';
  if (!token) throw new Error('Sesi habis. Login ulang sebagai Super Admin.');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ userId, password: newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Gagal mengatur password. Pastikan Worker dan secret Supabase sudah dikonfigurasi.');
  }
  return true;
}

// ── State lokal ───────────────────────────────────────────────
let _umUsers    = [];
let _umLoading  = false;
let _umResetTarget = { id: null, userId: null, email: '' };

// ── CSS Injector ──────────────────────────────────────────────
(function _injectUmStyles() {
  if (document.getElementById('um-styles')) return;
  const s = document.createElement('style');
  s.id = 'um-styles';
  s.textContent = `
    #page-manajemen-user .um-header {
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:20px; flex-wrap:wrap; gap:12px;
    }
    #page-manajemen-user .um-title {
      font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px;
    }
    .um-badge-role {
      display:inline-block; padding:2px 10px; border-radius:20px;
      font-size:11px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;
    }
    .um-badge-admin    { background:rgba(239,68,68,0.15);  color:#ef4444; border:1px solid rgba(239,68,68,0.3); }
    .um-badge-operator { background:rgba(201,168,76,0.15); color:#C9A84C; border:1px solid rgba(201,168,76,0.3); }
    .um-badge-viewer   { background:rgba(107,114,128,0.15);color:#9ca3af; border:1px solid rgba(107,114,128,0.3); }
    .um-badge-pending  { background:rgba(139,111,168,0.15);color:#8B6FA8; border:1px solid rgba(139,111,168,0.3); }
    #modal-add-user { display:none; position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,0.6); align-items:center; justify-content:center; }
    #modal-add-user.open { display:flex; }
    #modal-add-user .modal-box {
      background:var(--surface); border:1px solid var(--border); border-radius:12px;
      padding:28px; width:100%; max-width:420px; box-shadow:0 20px 60px rgba(0,0,0,0.4);
    }
    #modal-add-user .modal-title { font-size:16px; font-weight:700; margin-bottom:20px; }
    #modal-add-user .form-group { margin-bottom:14px; }
    #modal-add-user label { display:block; font-size:12px; color:var(--text3); margin-bottom:5px; font-weight:600; }
    #modal-add-user input, #modal-add-user select {
      width:100%; padding:9px 12px; border:1px solid var(--border);
      border-radius:6px; background:var(--surface2); color:var(--text);
      font-size:13px; box-sizing:border-box;
    }
    #modal-add-user input:focus, #modal-add-user select:focus {
      outline:none; border-color:var(--gold); box-shadow:0 0 0 2px rgba(201,168,76,0.15);
    }
    .um-err { color:#ef4444; font-size:12px; margin-top:6px; display:none; }
    .um-row-you { background:rgba(201,168,76,0.06) !important; }
    .um-avatar {
      width:32px; height:32px; border-radius:50%; background:var(--surface2);
      border:1px solid var(--border); display:inline-flex; align-items:center;
      justify-content:center; font-size:14px; font-weight:700; color:var(--text2);
      flex-shrink:0; text-transform:uppercase;
    }

    /* ── Modal Reset Password ── */
    #modal-reset-pw {
      display:none; position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,0.65); align-items:center; justify-content:center;
    }
    #modal-reset-pw.open { display:flex; }
    #modal-reset-pw .modal-box {
      background:var(--surface); border:1px solid var(--border); border-radius:12px;
      padding:28px; width:100%; max-width:440px; box-shadow:0 20px 60px rgba(0,0,0,0.5);
    }
    .um-reset-tabs {
      display:flex; gap:0; border:1px solid var(--border); border-radius:8px;
      overflow:hidden; margin-bottom:20px;
    }
    .um-reset-tab {
      flex:1; padding:9px 12px; border:none; background:var(--surface2);
      color:var(--text3); font-size:12px; font-weight:600; cursor:pointer;
      transition:background .15s, color .15s;
    }
    .um-reset-tab.active {
      background:var(--primary,#C9A84C); color:#fff;
    }
    .um-reset-panel { display:none; }
    .um-reset-panel.active { display:block; }
    .um-reset-info {
      background:var(--surface2); border:1px solid var(--border); border-radius:8px;
      padding:12px 14px; font-size:12px; color:var(--text2); margin-bottom:14px;
      line-height:1.6;
    }
    .um-reset-info strong { color:var(--text); }
    #modal-reset-pw input {
      width:100%; padding:9px 12px; border:1px solid var(--border);
      border-radius:6px; background:var(--surface2); color:var(--text);
      font-size:13px; box-sizing:border-box; margin-bottom:10px;
    }
    #modal-reset-pw input:focus {
      outline:none; border-color:var(--gold,#C9A84C);
      box-shadow:0 0 0 2px rgba(201,168,76,0.15);
    }
    .um-pw-strength {
      font-size:11px; margin-bottom:12px; min-height:16px;
    }
    .um-pw-strength.weak   { color:#ef4444; }
    .um-pw-strength.medium { color:#f59e0b; }
    .um-pw-strength.strong { color:#22c55e; }
    .um-service-key-note {
      background:rgba(251,191,36,0.08); border:1px solid rgba(251,191,36,0.25);
      border-radius:8px; padding:10px 13px; font-size:11px; color:var(--text2);
      margin-bottom:14px; line-height:1.6;
    }
    .um-service-key-note code {
      background:var(--surface2); border-radius:4px;
      padding:1px 5px; font-size:10.5px; color:var(--text);
    }
  `;
  document.head.appendChild(s);
})();

// ── Render halaman utama ──────────────────────────────────────
async function renderManajemenUser() {
  const el = document.getElementById('um-content');
  if (!el) return;

  if (!isLoggedIn()) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-title">Silakan login terlebih dahulu</div></div>';
    return;
  }
  if (!isAdmin()) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">🚫</div><div class="empty-title">Akses ditolak</div><div class="empty-sub">Hanya Admin yang bisa mengelola user</div></div>';
    return;
  }

  el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text3);">⏳ Memuat data user…</div>`;
  _umLoading = true;

  try {
    _umUsers = await sbGetAllUsersWithEmail();
    _umLoading = false;
    _renderUmTable(el);
  } catch(e) {
    _umLoading = false;
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Gagal memuat data</div><div class="empty-sub">${e.message}</div></div>`;
  }
}

function _renderUmTable(el) {
  const me = getCurrentUser();
  const myId = me?.id || '';

  el.innerHTML = `
    <!-- Header -->
    <div class="um-header">
      <div class="um-title">👥 Manajemen User &amp; Role
        <span style="font-size:12px;font-weight:400;color:var(--text3);margin-left:4px;">(${_umUsers.length} user)</span>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openAddUserModal()">➕ Tambah User</button>
    </div>

    <!-- Panduan Role -->
    <div class="card" style="margin-bottom:16px;padding:14px 18px;">
      <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center;">
        <span style="font-size:12px;color:var(--text3);font-weight:600;">Hak Akses:</span>
        <span><span class="um-badge-role um-badge-admin">Admin</span> <span style="font-size:12px;color:var(--text3);">— Akses penuh + kelola user</span></span>
        <span><span class="um-badge-role um-badge-operator">Operator</span> <span style="font-size:12px;color:var(--text3);">— Input &amp; edit data</span></span>
        <span><span class="um-badge-role um-badge-viewer">Viewer</span> <span style="font-size:12px;color:var(--text3);">— Hanya lihat data</span></span>
      </div>
    </div>

    <!-- Tabel User -->
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Bergabung</th>
              <th>Ubah Role</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${_umUsers.length === 0
              ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👤</div><div class="empty-title">Belum ada user terdaftar</div></div></td></tr>`
              : _umUsers.map((u, i) => {
                  const isMe     = u.user_id === myId;
                  const email    = u.email || '—';
                  const name     = u.display_name || email.split('@')[0] || u.user_id.slice(0,8);
                  const initial  = (name[0] || '?').toUpperCase();
                  const role     = u.role || 'viewer';
                  const isPending= u.user_id?.startsWith('pending_');
                  const joined   = u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '—';
                  return `<tr class="${isMe ? 'um-row-you' : ''}">
                    <td style="color:var(--text3);font-size:12px;">${i+1}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px;">
                        <div class="um-avatar">${initial}</div>
                        <div>
                          <div style="font-size:13px;font-weight:600;">${_esc(name)}${isMe ? ' <span style="font-size:10px;color:var(--gold);">● Anda</span>' : ''}</div>
                          <div style="font-size:11px;color:var(--text3);font-family:monospace;">${isPending ? '⏳ Belum login' : u.user_id.slice(0,12)+'…'}</div>
                        </div>
                      </div>
                    </td>
                    <td style="font-size:13px;">${_esc(email)}</td>
                    <td><span class="um-badge-role um-badge-${role}">${role}</span></td>
                    <td style="font-size:12px;color:var(--text3);">${joined}</td>
                    <td>
                      ${isMe ? '<span style="font-size:11px;color:var(--text3);">—</span>' : `
                      <select class="filter-select" style="font-size:12px;padding:4px 8px;"
                        onchange="umChangeRole(${u.id}, this.value, this)">
                        <option value="admin"    ${role==='admin'    ?'selected':''}>Admin</option>
                        <option value="operator" ${role==='operator' ?'selected':''}>Operator</option>
                        <option value="viewer"   ${role==='viewer'   ?'selected':''}>Viewer</option>
                      </select>`}
                    </td>
                    <td>
                      <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">
                        ${isMe ? '' : `
                        <button class="btn btn-sm"
                          style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);color:#6366f1;font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer;"
                          onclick="umOpenResetModal(${u.id},'${_esc(u.user_id)}','${_esc(email)}')"
                          title="Reset Password">🔑 Reset PW</button>
                        <button class="btn btn-danger btn-sm btn-icon" onclick="umDeleteUser(${u.id},'${_esc(email)}')" title="Hapus user">🗑️</button>
                        `}
                      </div>
                    </td>
                  </tr>`;
                }).join('')
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Tambah User -->
    <div id="modal-add-user">
      <div class="modal-box">
        <div class="modal-title">➕ Tambah User Baru</div>
        <div class="form-group">
          <label>Nama Lengkap</label>
          <input type="text" id="um-new-name" placeholder="Nama tampilan user">
        </div>
        <div class="form-group">
          <label>Email *</label>
          <input type="email" id="um-new-email" placeholder="user@instansi.go.id">
        </div>
        <div class="form-group">
          <label>Password *</label>
          <input type="password" id="um-new-pass" placeholder="Min. 8 karakter">
        </div>
        <div class="form-group">
          <label>Role</label>
          <select id="um-new-role">
            <option value="viewer">Viewer — Hanya lihat data</option>
            <option value="operator">Operator — Input &amp; edit data</option>
            <option value="admin" ${typeof isSuperAdmin === 'function' && !isSuperAdmin() ? 'disabled' : ''}>Admin — Akses penuh${typeof isSuperAdmin === 'function' && !isSuperAdmin() ? ' (butuh Super Admin)' : ''}</option>
            ${typeof isSuperAdmin === 'function' && isSuperAdmin() ? '<option value="super_admin">🔱 Super Admin — Kelola semua OPD &amp; admin</option>' : ''}
          </select>
        </div>
        <div class="um-err" id="um-add-err"></div>
        <div style="display:flex;gap:10px;margin-top:20px;">
          <button class="btn btn-primary" style="flex:1;" onclick="umSubmitAddUser()">✅ Buat Akun</button>
          <button class="btn btn-secondary" onclick="closeAddUserModal()">Batal</button>
        </div>
      </div>
    </div>

    <!-- Modal Reset Password -->
    <div id="modal-reset-pw">
      <div class="modal-box">
        <div class="modal-title" style="display:flex;align-items:center;gap:8px;">
          🔑 Reset Password
          <span id="um-reset-email-label" style="font-size:12px;font-weight:400;color:var(--text3);"></span>
        </div>

        <!-- Tabs -->
        <div class="um-reset-tabs">
          <button class="um-reset-tab active" id="um-rtab-email" onclick="umSwitchResetTab('email')">
            📧 Kirim Email Reset
          </button>
          <button class="um-reset-tab" id="um-rtab-manual" onclick="umSwitchResetTab('manual')">
            🔐 Set Password Langsung
          </button>
        </div>

        <!-- Panel: kirim email reset -->
        <div class="um-reset-panel active" id="um-rpanel-email">
          <div class="um-reset-info">
            Supabase akan mengirim <strong>email berisi tautan reset password</strong> ke alamat email user tersebut.<br>
            User mengklik tautan → masukkan password baru → selesai.
          </div>
          <div class="um-err" id="um-reset-email-err" style="margin-bottom:10px;"></div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-primary" style="flex:1;" id="um-btn-send-reset" onclick="umSubmitSendResetEmail()">
              📨 Kirim Email Reset
            </button>
            <button class="btn btn-secondary" onclick="umCloseResetModal()">Batal</button>
          </div>
        </div>

        <!-- Panel: set password langsung -->
        <div class="um-reset-panel" id="um-rpanel-manual">
          <div class="um-service-key-note">
            ⚠️ Fitur ini hanya bisa dipakai oleh <strong>Super Admin</strong>.<br>
            Password diubah lewat endpoint server SI-DEVA, sehingga Service Role Key tidak disimpan di browser.
          </div>
          <label style="display:block;font-size:12px;color:var(--text3);margin-bottom:5px;font-weight:600;">Password Baru *</label>
          <input type="password" id="um-new-pw-val" placeholder="Min. 8 karakter"
            oninput="umCheckPwStrength(this.value)">
          <div class="um-pw-strength" id="um-pw-strength-msg"></div>
          <label style="display:block;font-size:12px;color:var(--text3);margin-bottom:5px;font-weight:600;">Konfirmasi Password *</label>
          <input type="password" id="um-new-pw-confirm" placeholder="Ulangi password baru">
          <div class="um-err" id="um-reset-manual-err" style="margin-bottom:10px;margin-top:8px;"></div>
          <div style="display:flex;gap:10px;margin-top:4px;">
            <button class="btn btn-primary" style="flex:1;" id="um-btn-set-pw" onclick="umSubmitSetPassword()">
              🔐 Simpan Password Baru
            </button>
            <button class="btn btn-secondary" onclick="umCloseResetModal()">Batal</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Helpers ───────────────────────────────────────────────────
function _esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Aksi: ubah role ───────────────────────────────────────────
async function umChangeRole(id, newRole, selectEl) {
  if (!confirm(`Ubah role user ini menjadi "${newRole}"?`)) {
    const u = _umUsers.find(x => x.id === id);
    if (u && selectEl) selectEl.value = u.role;
    return;
  }
  try {
    await sbUpdateUserRole(id, newRole);
    const u = _umUsers.find(x => x.id === id);
    if (u) u.role = newRole;
    const row = selectEl?.closest('tr');
    if (row) {
      const badge = row.querySelector('.um-badge-role');
      if (badge) {
        badge.className = `um-badge-role um-badge-${newRole}`;
        badge.textContent = newRole;
      }
    }
    if (typeof toast === 'function') toast(`Role berhasil diubah ke ${newRole}`, 'success');
  } catch(e) {
    if (typeof toast === 'function') toast('Gagal: ' + e.message, 'error');
    const u = _umUsers.find(x => x.id === id);
    if (u && selectEl) selectEl.value = u.role;
  }
}

// ── Aksi: hapus user dari role ────────────────────────────────
async function umDeleteUser(id, email) {
  if (!confirm(`Hapus akses "${email}" dari sistem?\n\nAkun Supabase Auth tidak dihapus, hanya akses ke SI-DEVA yang dicabut.`)) return;
  try {
    await sbRemoveUserRole(id);
    _umUsers = _umUsers.filter(u => u.id !== id);
    const el = document.getElementById('um-content');
    if (el) _renderUmTable(el);
    if (typeof toast === 'function') toast(`Akses ${email} berhasil dicabut`, 'success');
  } catch(e) {
    if (typeof toast === 'function') toast('Gagal: ' + e.message, 'error');
  }
}

// ── Modal: tambah user ────────────────────────────────────────
function openAddUserModal() {
  const m = document.getElementById('modal-add-user');
  if (m) {
    m.classList.add('open');
    document.getElementById('um-new-name').value  = '';
    document.getElementById('um-new-email').value = '';
    document.getElementById('um-new-pass').value  = '';
    document.getElementById('um-new-role').value  = 'viewer';
    const errEl = document.getElementById('um-add-err');
    if (errEl) errEl.style.display = 'none';
  }
}

function closeAddUserModal() {
  const m = document.getElementById('modal-add-user');
  if (m) m.classList.remove('open');
}

async function umSubmitAddUser() {
  const name  = document.getElementById('um-new-name').value.trim();
  const email = document.getElementById('um-new-email').value.trim();
  const pass  = document.getElementById('um-new-pass').value;
  const role  = document.getElementById('um-new-role').value;
  const errEl = document.getElementById('um-add-err');

  if (!email || !pass) {
    errEl.textContent = 'Email dan password wajib diisi.';
    errEl.style.display = 'block';
    return;
  }
  if (pass.length < 8) {
    errEl.textContent = 'Password minimal 8 karakter.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.querySelector('#modal-add-user .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Memproses…'; }
  errEl.style.display = 'none';

  try {
    await sbInviteUser(email, pass, role, name);
    closeAddUserModal();
    if (typeof toast === 'function') toast(`✅ User ${email} berhasil ditambahkan sebagai ${role}`, 'success');
    if (typeof muLoad === 'function') {
      await muLoad();
    } else {
      await renderManajemenUser();
    }
  } catch(e) {
    errEl.textContent = 'Gagal: ' + (e.message || 'Terjadi kesalahan');
    errEl.style.display = 'block';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✅ Buat Akun'; }
  }
}

// ── Modal: reset password ─────────────────────────────────────
function umOpenResetModal(id, userId, email) {
  _umResetTarget = { id, userId, email };
  const m = document.getElementById('modal-reset-pw');
  if (!m) return;
  m.classList.add('open');

  const label = document.getElementById('um-reset-email-label');
  if (label) label.textContent = '— ' + email;

  // Reset state
  umSwitchResetTab('email');
  const errEmail  = document.getElementById('um-reset-email-err');
  const errManual = document.getElementById('um-reset-manual-err');
  const pwInput   = document.getElementById('um-new-pw-val');
  const pwConfirm = document.getElementById('um-new-pw-confirm');
  const strength  = document.getElementById('um-pw-strength-msg');
  if (errEmail)  { errEmail.textContent  = ''; errEmail.style.display  = 'none'; }
  if (errManual) { errManual.textContent = ''; errManual.style.display = 'none'; }
  if (pwInput)   pwInput.value   = '';
  if (pwConfirm) pwConfirm.value = '';
  if (strength)  { strength.textContent = ''; strength.className = 'um-pw-strength'; }
}

function umCloseResetModal() {
  const m = document.getElementById('modal-reset-pw');
  if (m) m.classList.remove('open');
}

function umSwitchResetTab(tab) {
  document.querySelectorAll('.um-reset-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.um-reset-panel').forEach(p => p.classList.remove('active'));
  const tabBtn = document.getElementById('um-rtab-' + tab);
  const panel  = document.getElementById('um-rpanel-' + tab);
  if (tabBtn) tabBtn.classList.add('active');
  if (panel)  panel.classList.add('active');
}

function umCheckPwStrength(val) {
  const el = document.getElementById('um-pw-strength-msg');
  if (!el) return;
  if (!val) { el.textContent = ''; el.className = 'um-pw-strength'; return; }
  const hasUpper  = /[A-Z]/.test(val);
  const hasLower  = /[a-z]/.test(val);
  const hasDigit  = /[0-9]/.test(val);
  const hasSpec   = /[^A-Za-z0-9]/.test(val);
  const score     = (val.length >= 12 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSpec ? 1 : 0);
  if (val.length < 8) {
    el.textContent = '⚠ Terlalu pendek (min. 8 karakter)';
    el.className   = 'um-pw-strength weak';
  } else if (score <= 2) {
    el.textContent = '⚠ Lemah — tambahkan angka & simbol';
    el.className   = 'um-pw-strength weak';
  } else if (score === 3) {
    el.textContent = '✔ Cukup';
    el.className   = 'um-pw-strength medium';
  } else {
    el.textContent = '✔ Kuat';
    el.className   = 'um-pw-strength strong';
  }
}

// Kirim email reset password
async function umSubmitSendResetEmail() {
  const { email } = _umResetTarget;
  if (!email || email === '—') {
    const err = document.getElementById('um-reset-email-err');
    if (err) { err.textContent = 'Email user tidak tersedia.'; err.style.display = 'block'; }
    return;
  }
  const btn = document.getElementById('um-btn-send-reset');
  const err = document.getElementById('um-reset-email-err');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mengirim…'; }
  if (err) err.style.display = 'none';
  try {
    await sbSendResetPasswordEmail(email);
    umCloseResetModal();
    if (typeof toast === 'function') toast(`📨 Email reset password berhasil dikirim ke ${email}`, 'success');
  } catch(e) {
    if (err) { err.textContent = 'Gagal: ' + e.message; err.style.display = 'block'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📨 Kirim Email Reset'; }
  }
}

// Set password langsung (membutuhkan service role key)
async function umSubmitSetPassword() {
  const { userId, email } = _umResetTarget;
  const newPw  = document.getElementById('um-new-pw-val')?.value || '';
  const confPw = document.getElementById('um-new-pw-confirm')?.value || '';
  const btn    = document.getElementById('um-btn-set-pw');
  const err    = document.getElementById('um-reset-manual-err');

  if (err) err.style.display = 'none';

  if (!newPw) {
    if (err) { err.textContent = 'Password baru wajib diisi.'; err.style.display = 'block'; }
    return;
  }
  if (newPw.length < 8) {
    if (err) { err.textContent = 'Password minimal 8 karakter.'; err.style.display = 'block'; }
    return;
  }
  if (newPw !== confPw) {
    if (err) { err.textContent = 'Konfirmasi password tidak cocok.'; err.style.display = 'block'; }
    return;
  }

  if (!userId || userId.startsWith('pending_')) {
    if (err) {
      err.textContent = 'User ini belum pernah login — tidak memiliki User ID Auth yang valid. Gunakan opsi "Kirim Email Reset".';
      err.style.display = 'block';
    }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan…'; }
  try {
    await sbAdminSetPassword(userId, newPw);
    umCloseResetModal();
    if (typeof toast === 'function') toast(`✅ Password ${email} berhasil diubah`, 'success');
  } catch(e) {
    if (err) { err.textContent = 'Gagal: ' + e.message; err.style.display = 'block'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔐 Simpan Password Baru'; }
  }
}

// ── Inject nav + page ke sidebar (auto saat DOM ready) ────────
function _injectNavManajemenUser() {
  if (document.getElementById('nav-manajemen-user')) return;
  if (!isAdmin()) return;

  const navItems = document.querySelectorAll('.nav-item');
  let anchor = null;
  navItems.forEach(n => {
    const oc = n.getAttribute('onclick') || '';
    if (oc.includes("'pengaturan'") || oc.includes("'backup'")) anchor = n;
  });
  if (!anchor) anchor = document.getElementById('nav-laporan');
  if (!anchor) {
    const allNav = document.querySelectorAll('.nav-item');
    if (allNav.length) anchor = allNav[allNav.length - 1];
  }

  const li = document.createElement('div');
  li.id        = 'nav-manajemen-user';
  li.className = 'nav-item';
  li.setAttribute('onclick', "showPage('manajemen-user')");
  li.innerHTML = '<span class="nav-icon">👥</span><span class="nav-label">Manajemen User</span>';

  if (anchor) anchor.before(li);

  if (!document.getElementById('page-manajemen-user')) {
    const p = document.createElement('div');
    p.id        = 'page-manajemen-user';
    p.className = 'page';
    p.innerHTML = '<div id="um-content"></div>';
    const anyPage = document.querySelector('.page');
    if (anyPage) anyPage.parentNode.appendChild(p);
  }
}

// ── Listen navigation changes (avoid monkey-patching showPage) ─
window.addEventListener('sideva:page-changed', (e) => {
  if (e?.detail?.page !== 'manajemen-user') return;
  const title = document.getElementById('topbar-title');
  if (title) title.textContent = 'Manajemen User & Role';
  const bc = document.getElementById('topbar-breadcrumb-cur');
  if (bc) bc.textContent = 'Manajemen User & Role';
  renderManajemenUser();
});

// ── Init: jalankan saat data siap ─────────────────────────────
window.addEventListener('sb-ready', function(e) {
  if (e.detail?.loggedIn) {
    setTimeout(_injectNavManajemenUser, 700);
  }
});

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    if (typeof isAdmin === 'function' && isAdmin()) {
      _injectNavManajemenUser();
    }
  }, 1500);
});
