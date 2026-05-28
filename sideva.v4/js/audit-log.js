// ============================================================
//  SI-DEVA — Audit Log v1.0
//  File: js/audit-log.js
//
//  Pasang di index.html SETELAH supabase-db.js & supabase-auth.js:
//    <script src="js/audit-log.js"></script>
//
//  Fungsi publik:
//    logAudit(action, detail, targetId, targetEmail, opdId)
//    renderAuditLog()   — dipanggil otomatis saat showPage('audit-log')
// ============================================================

// ── CSS ───────────────────────────────────────────────────────
(function _injectAuditCss() {
  if (document.getElementById('audit-log-style')) return;
  const s = document.createElement('style');
  s.id = 'audit-log-style';
  s.textContent = `
    #al-wrap { padding: 0; }
    .al-toolbar {
      display: flex; align-items: center; gap: 10px;
      flex-wrap: wrap; margin-bottom: 18px;
    }
    .al-toolbar input, .al-toolbar select {
      padding: 7px 12px; border-radius: 8px;
      border: 1px solid var(--border2, #333);
      background: var(--surface2, #111);
      color: var(--text, #fff); font-size: 12px;
    }
    .al-toolbar input { flex: 1; min-width: 180px; }
    .al-count {
      font-size: 12px; color: var(--text3, #888);
      margin-left: auto; white-space: nowrap;
    }
    .al-table-wrap { overflow-x: auto; }
    .al-table {
      width: 100%; border-collapse: collapse;
      font-size: 12px; min-width: 680px;
    }
    .al-table th {
      text-align: left; padding: 8px 12px;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .5px;
      color: var(--text3, #888);
      border-bottom: 1px solid var(--border2, #333);
      white-space: nowrap;
    }
    .al-table td {
      padding: 9px 12px;
      border-bottom: 1px solid var(--border, #222);
      vertical-align: middle;
    }
    .al-table tr:last-child td { border-bottom: none; }
    .al-table tr:hover td { background: var(--surface2, rgba(255,255,255,.03)); }
    .al-action-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px; border-radius: 20px;
      font-size: 10px; font-weight: 700;
      letter-spacing: .3px; white-space: nowrap;
    }
    .al-badge-login         { background:rgba(74,222,128,.12); color:#4ade80; border:1px solid rgba(74,222,128,.25); }
    .al-badge-logout        { background:rgba(148,163,184,.12); color:#94a3b8; border:1px solid rgba(148,163,184,.25); }
    .al-badge-role_change   { background:rgba(251,191,36,.12); color:#fbbf24; border:1px solid rgba(251,191,36,.25); }
    .al-badge-user_added    { background:rgba(96,165,250,.12); color:#60a5fa; border:1px solid rgba(96,165,250,.25); }
    .al-badge-user_removed  { background:rgba(248,113,113,.12); color:#f87171; border:1px solid rgba(248,113,113,.25); }
    .al-badge-opd_added     { background:rgba(168,85,247,.12); color:#a855f7; border:1px solid rgba(168,85,247,.25); }
    .al-badge-opd_deleted   { background:rgba(248,113,113,.12); color:#f87171; border:1px solid rgba(248,113,113,.25); }
    .al-badge-opd_config    { background:rgba(251,146,60,.12); color:#fb923c; border:1px solid rgba(251,146,60,.25); }
    .al-badge-opd_access_grant   { background:rgba(34,211,238,.12); color:#22d3ee; border:1px solid rgba(34,211,238,.25); }
    .al-badge-opd_access_revoke  { background:rgba(248,113,113,.12); color:#f87171; border:1px solid rgba(248,113,113,.25); }
    .al-empty {
      text-align: center; padding: 48px 20px;
      color: var(--text3, #888); font-size: 13px;
    }
    .al-empty-icon { font-size: 32px; margin-bottom: 8px; }
    .al-detail { font-size: 11px; color: var(--text3, #888); margin-top: 2px; }
    .al-actor  { font-weight: 600; font-size: 12px; }
    .al-load-more {
      width: 100%; margin-top: 14px;
      padding: 9px; border-radius: 8px;
      background: var(--surface2, #111);
      border: 1px solid var(--border2, #333);
      color: var(--text2, #ccc); font-size: 12px;
      cursor: pointer; text-align: center;
    }
    .al-load-more:hover { border-color: var(--gold, #c9a84c); }
    .al-export-btn {
      padding: 7px 14px; border-radius: 8px; font-size: 12px;
      background: var(--surface2, #111);
      border: 1px solid var(--border2, #333);
      color: var(--text2, #ccc); cursor: pointer;
    }
    .al-export-btn:hover { border-color: var(--gold, #c9a84c); }
  `;
  document.head.appendChild(s);
})();

// ── Core: Simpan log ke Supabase ─────────────────────────────
async function logAudit(action, detail = {}, targetId = null, targetEmail = null, opdId = null) {
  try {
    if (!isLoggedIn()) return;
    const actor = getCurrentUser();
    await sbFetch('/rest/v1/audit_log', 'POST', {
      action,
      actor_id:     actor?.id    || null,
      actor_email:  actor?.email || null,
      target_id:    targetId,
      target_email: targetEmail,
      detail:       detail,
      opd_id:       opdId || null,
      created_at:   new Date().toISOString()
    }, { 'Prefer': 'return=minimal' });
  } catch(_) {
    // Audit log TIDAK boleh menghentikan operasi utama
  }
}

// ── Render UI ─────────────────────────────────────────────────
var _alPage      = 0;
var _alPageSize  = 50;
var _alTotal     = 0;
var _alSearchQ   = '';
var _alActionF   = '';
var _alLogs      = [];

async function renderAuditLog() {
  const wrap = document.getElementById('page-audit-log');
  if (!wrap) return;

  if (!isAdmin()) {
    wrap.innerHTML = '<div class="al-empty"><div class="al-empty-icon">🔒</div>Hanya Admin yang bisa melihat audit log.</div>';
    return;
  }

  wrap.innerHTML = '<div id="al-wrap"><div style="opacity:.5;font-size:13px;padding:20px;">Memuat audit log…</div></div>';
  _alPage = 0;
  await _fetchAndRenderAuditLog(true);
}

async function _fetchAndRenderAuditLog(reset = false) {
  if (reset) { _alPage = 0; _alLogs = []; }

  const offset = _alPage * _alPageSize;
  let url = `/rest/v1/audit_log?select=*&order=created_at.desc&limit=${_alPageSize}&offset=${offset}`;
  if (_alActionF) url += `&action=eq.${encodeURIComponent(_alActionF)}`;

  try {
    const rows = await sbFetch(url, 'GET', null, { 'Prefer': 'count=exact' }) || [];
    if (reset) _alLogs = rows; else _alLogs = [..._alLogs, ...rows];

    const filtered = _alSearchQ
      ? _alLogs.filter(r =>
          (r.actor_email || '').toLowerCase().includes(_alSearchQ) ||
          (r.target_email || '').toLowerCase().includes(_alSearchQ) ||
          (r.action || '').toLowerCase().includes(_alSearchQ) ||
          JSON.stringify(r.detail || {}).toLowerCase().includes(_alSearchQ)
        )
      : _alLogs;

    _renderAuditTable(filtered, rows.length >= _alPageSize);
  } catch(e) {
    const wrap = document.getElementById('al-wrap');
    if (wrap) wrap.innerHTML = `<div class="al-empty" style="color:#f87171;">❌ Gagal memuat: ${_alEsc(e.message)}</div>`;
  }
}

function _renderAuditTable(logs, hasMore) {
  const container = document.getElementById('al-wrap');
  if (!container) return;

  const actionLabels = {
    login:              '🔐 Login',
    logout:             '🚪 Logout',
    role_change:        '🔄 Ubah Role',
    user_added:         '➕ Tambah User',
    user_removed:       '❌ Hapus User',
    opd_added:          '🏢 Tambah OPD',
    opd_deleted:        '🗑️ Hapus OPD',
    opd_config:         '⚙️ Edit Config OPD',
    opd_access_grant:   '🔓 Beri Akses OPD',
    opd_access_revoke:  '🔒 Cabut Akses OPD',
  };

  const actionOptions = Object.entries(actionLabels).map(([v, l]) =>
    `<option value="${v}" ${_alActionF === v ? 'selected' : ''}>${l}</option>`
  ).join('');

  container.innerHTML = `
    <div class="al-toolbar">
      <input type="text" placeholder="🔍 Cari email, aksi, detail…"
        value="${_alEsc(_alSearchQ)}"
        oninput="_alOnSearch(this.value)">
      <select onchange="_alOnFilter(this.value)">
        <option value="">Semua Aksi</option>
        ${actionOptions}
      </select>
      <button class="al-export-btn" onclick="_alExportCsv()">⬇ Export CSV</button>
      <div class="al-count">${logs.length.toLocaleString('id')} log ditampilkan</div>
    </div>
    <div class="al-table-wrap">
      <table class="al-table">
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Aksi</th>
            <th>Pelaku</th>
            <th>Target / Detail</th>
          </tr>
        </thead>
        <tbody id="al-tbody">
          ${logs.length === 0
            ? `<tr><td colspan="4"><div class="al-empty"><div class="al-empty-icon">📋</div>Belum ada log yang tercatat.</div></td></tr>`
            : logs.map(r => _renderAuditRow(r, actionLabels)).join('')
          }
        </tbody>
      </table>
    </div>
    ${hasMore && !_alSearchQ
      ? `<button class="al-load-more" onclick="_alLoadMore()">⬇ Muat lebih banyak…</button>`
      : ''}
  `;
}

function _renderAuditRow(r, actionLabels) {
  const dt  = new Date(r.created_at);
  const tgl = dt.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
  const jam = dt.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const actionKey = (r.action || '').toLowerCase().replace(/\s/g,'_');
  const actionLabel = actionLabels[r.action] || r.action || '—';

  const detail = r.detail || {};
  let detailStr = '';
  if (r.action === 'role_change') {
    detailStr = `${_alEsc(detail.old_role || '?')} → <strong>${_alEsc(detail.new_role || '?')}</strong>`;
  } else if (r.action === 'login') {
    detailStr = detail.method ? `via ${_alEsc(detail.method)}` : '';
  } else if (r.action === 'opd_added') {
    detailStr = `OPD: <strong>${_alEsc(detail.opd_name || '?')}</strong>`;
  } else if (r.action === 'opd_access_grant' || r.action === 'opd_access_revoke') {
    detailStr = `OPD: <strong>${_alEsc(detail.opd_name || '?')}</strong>`;
  } else if (r.action === 'user_added') {
    detailStr = `Role: <strong>${_alEsc(detail.role || '?')}</strong>`;
  } else if (r.action === 'opd_config') {
    detailStr = `OPD: <strong>${_alEsc(detail.opd_name || '?')}</strong>`;
  } else {
    const keys = Object.keys(detail).filter(k => k !== 'timestamp');
    if (keys.length) detailStr = keys.map(k => `${k}: ${_alEsc(String(detail[k] || ''))}`).join(' · ');
  }

  const targetLine = r.target_email
    ? `<div style="font-size:11px;color:var(--text2);margin-top:2px;">👤 ${_alEsc(r.target_email)}</div>`
    : '';

  return `
    <tr>
      <td style="white-space:nowrap;color:var(--text3);font-size:11px;">
        <div>${tgl}</div><div style="font-family:monospace;">${jam}</div>
      </td>
      <td style="white-space:nowrap;">
        <span class="al-action-badge al-badge-${actionKey}">${actionLabel}</span>
      </td>
      <td>
        <div class="al-actor">${_alEsc(r.actor_email || '—')}</div>
      </td>
      <td>
        <div>${detailStr || '—'}</div>
        ${targetLine}
      </td>
    </tr>
  `;
}

function _alOnSearch(q) {
  _alSearchQ = q.toLowerCase().trim();
  const filtered = _alSearchQ
    ? _alLogs.filter(r =>
        (r.actor_email || '').toLowerCase().includes(_alSearchQ) ||
        (r.target_email || '').toLowerCase().includes(_alSearchQ) ||
        (r.action || '').toLowerCase().includes(_alSearchQ) ||
        JSON.stringify(r.detail || {}).toLowerCase().includes(_alSearchQ)
      )
    : _alLogs;
  _renderAuditTable(filtered, false);
}

function _alOnFilter(val) {
  _alActionF = val;
  _fetchAndRenderAuditLog(true);
}

async function _alLoadMore() {
  _alPage++;
  await _fetchAndRenderAuditLog(false);
}

function _alEsc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _alExportCsv() {
  if (!_alLogs.length) { if (typeof toast === 'function') toast('Tidak ada data untuk diekspor', 'info'); return; }
  const header = ['Waktu','Aksi','Pelaku','Target','Detail'];
  const rows = _alLogs.map(r => [
    new Date(r.created_at).toLocaleString('id-ID'),
    r.action,
    r.actor_email || '',
    r.target_email || '',
    JSON.stringify(r.detail || {})
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `sideva_audit_log_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  if (typeof toast === 'function') toast('Export CSV selesai', 'success');
}

// ── Nav: inject menu ke sidebar ───────────────────────────────
function _injectAuditNavAndPage() {
  if (document.getElementById('nav-audit-log')) return;
  if (!isAdmin()) return;

  // Tambahkan menu setelah "Manajemen Akses"
  const anchor = document.getElementById('nav-manajemen-akses')
    || document.querySelector('.nav-item.admin-only:last-of-type');
  if (!anchor) return;

  const btn = document.createElement('button');
  btn.id        = 'nav-audit-log';
  btn.className = 'nav-item admin-only sideva-admin-show';
  btn.setAttribute('onclick', "showPage('audit-log')");
  btn.title     = 'Riwayat aktivitas sistem';
  btn.innerHTML = '<span class="icon">📋</span><span class="nav-label">Audit Log</span>';
  anchor.after(btn);

  // Tambahkan halaman jika belum ada
  if (!document.getElementById('page-audit-log')) {
    const pg = document.createElement('div');
    pg.id        = 'page-audit-log';
    pg.className = 'page';
    const anyPage = document.querySelector('.page');
    if (anyPage) anyPage.parentNode.appendChild(pg);
  }
}

// ── Listen navigation changes (avoid monkey-patching showPage) ──
window.addEventListener('sideva:page-changed', (e) => {
  if (e?.detail?.page !== 'audit-log') return;
  const title = document.getElementById('topbar-title');
  if (title) title.textContent = 'Audit Log';
  const bc = document.getElementById('topbar-breadcrumb-cur');
  if (bc) bc.textContent = 'Audit Log';
  renderAuditLog();
});

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('sb-ready', function(e) {
  if (e.detail?.loggedIn) {
    setTimeout(_injectAuditNavAndPage, 800);
  }
});
