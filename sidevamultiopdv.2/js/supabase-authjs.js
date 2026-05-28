// ============================================================
//  SI-DEVA — Auth UI & Role Management v3.2
//  File: js/supabase-auth.js
// ============================================================

(function(){
  // ---- CSS ----
  if(!document.getElementById('sideva-auth-style')){
    const s = document.createElement('style');
    s.id = 'sideva-auth-style';
    s.textContent = `
      .hidden { display:none !important; }
      .admin-only { display:none !important; }
      button.admin-only.sideva-admin-show,
      .nav-item.admin-only.sideva-admin-show { display:flex !important; width:100%; }
      div.admin-only.sideva-admin-show,
      .nav-section-label.admin-only.sideva-admin-show { display:block !important; }
      .sidebar-logout{width:100%;margin-bottom:8px;justify-content:flex-start;border:1px solid rgba(248,113,113,.22);color:#fca5a5;background:rgba(248,113,113,.08);}
      .sidebar-logout:hover{border-color:rgba(248,113,113,.45);background:rgba(248,113,113,.14);}
      #auth-overlay{position:fixed;inset:0;z-index:9999;background:var(--bg,#0f0f0f);display:flex;align-items:center;justify-content:center;font-family:'Plus Jakarta Sans',sans-serif;}
      #auth-box{background:var(--surface,#1a1a1a);border:1px solid var(--border,#2a2a2a);border-radius:16px;padding:40px 36px;width:380px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.5);}
      #auth-box h2{margin:0 0 6px;font-size:22px;font-weight:700;color:var(--gold,#c9a84c);}
      #auth-box p{margin:0 0 24px;font-size:13px;opacity:.5;color:var(--text,#fff);}
      .auth-input{width:100%;padding:10px 13px;margin-bottom:12px;border-radius:8px;border:1.5px solid var(--border,#333);background:var(--bg3,#111);color:var(--text,#fff);font-size:13px;box-sizing:border-box;transition:border-color .2s;}
      .auth-input:focus{outline:none;border-color:var(--gold,#c9a84c);}
      .auth-error{color:#f87171;font-size:12px;margin:-6px 0 10px;min-height:18px;}
      .auth-btn-row{display:flex;gap:8px;margin-top:4px;}
      .auth-btn{flex:1;padding:10px;border-radius:8px;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:opacity .2s;}
      .auth-btn:hover{opacity:.85;}
      .auth-btn-primary{background:linear-gradient(135deg,#c9a227,#f0cb5a);color:#1a1200;}
      .auth-btn-secondary{background:var(--bg3,#222);color:var(--text,#fff);border:1px solid var(--border,#333);}
      #auth-register-note{font-size:11px;opacity:.4;margin-top:14px;text-align:center;color:var(--text,#fff);}
      #role-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.4px;cursor:default;}
      .role-super_admin{background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3);}
      .role-admin{background:rgba(251,191,36,.15);color:#fbbf24;border:1px solid rgba(251,191,36,.3);}
      .role-operator{background:rgba(96,165,250,.15);color:#60a5fa;border:1px solid rgba(96,165,250,.3);}
      .role-viewer{background:rgba(148,163,184,.15);color:#94a3b8;border:1px solid rgba(148,163,184,.3);}
      #user-mgmt-panel table{width:100%;border-collapse:collapse;font-size:13px;}
      #user-mgmt-panel th,#user-mgmt-panel td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--border,#2a2a2a);}
      #user-mgmt-panel th{opacity:.5;font-weight:600;font-size:11px;text-transform:uppercase;}
      .role-select{background:var(--bg3,#111);color:var(--text,#fff);border:1px solid var(--border,#333);border-radius:6px;padding:4px 8px;font-size:12px;}
    `;
    document.head.appendChild(s);
  }

  // ---- Helpers ----
  function isAdminOrSuper(){
    const r = typeof getRole === 'function' ? getRole() : null;
    return r === 'admin' || r === 'super_admin';
  }

  // Patch isAdmin global sekali saja
  if(typeof window.isAdmin === 'function' && !window.isAdmin.__patched){
    const orig = window.isAdmin;
    const patched = function(){
      const r = typeof getRole === 'function' ? getRole() : null;
      return r === 'admin' || r === 'super_admin';
    };
    patched.__patched = true;
    window.isAdmin = patched;
  }
  if(typeof window.isSuperAdmin !== 'function'){
    window.isSuperAdmin = function(){ return typeof getRole === 'function' && getRole() === 'super_admin'; };
  }

  // ---- Overlay ----
  window.showAuthOverlay = function(){
    document.getElementById('auth-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.innerHTML = `
      <div id="auth-box">
        <h2>📋 SI-DEVA</h2>
        <p>Masuk untuk mengakses sistem</p>
        <input id="ai-email" class="auth-input" type="email" placeholder="Email" autocomplete="email">
        <input id="ai-password" class="auth-input" type="password" placeholder="Password" autocomplete="current-password">
        <div class="auth-error" id="ai-error"></div>
        <div class="auth-btn-row">
          <button class="auth-btn auth-btn-primary" onclick="doAuthLogin()">Masuk</button>
          <button class="auth-btn auth-btn-secondary" onclick="doAuthRegister()">Daftar</button>
        </div>
        <p id="auth-register-note">Akun baru harus disetujui admin untuk mendapat akses penuh.</p>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.auth-input').forEach(el=>{
      el.addEventListener('keydown', e=>{ if(e.key==='Enter') window.doAuthLogin(); });
    });
    setTimeout(()=>document.getElementById('ai-email')?.focus(),100);
  };

  window.hideAuthOverlay = function(){
    document.getElementById('auth-overlay')?.remove();
  };

  // ---- Login / Register ----
  window.doAuthLogin = async function(){
    const email = document.getElementById('ai-email')?.value.trim();
    const password = document.getElementById('ai-password')?.value;
    const errEl = document.getElementById('ai-error');
    if(!email || !password){ errEl.textContent = 'Email dan password wajib diisi.'; return; }
    errEl.textContent = 'Memuat...';
    try{
      await sbLogin(email,password);
      window.hideAuthOverlay();
      await loadAllData();
      if(typeof _startPolling === 'function') _startPolling();
      window.applyRoleUI();
      if(typeof renderAll === 'function') renderAll();
      if(typeof updateBadges === 'function') updateBadges();
      if(typeof populateDropdowns === 'function') populateDropdowns();
      if(typeof logAudit === 'function') logAudit('login',{method:'email',role:getRole()});
      if(typeof toast === 'function') toast(`☁ Selamat datang! Role: ${getRole()}`,'success');
    }catch(err){
      errEl.textContent = err.message.includes('Email not confirmed') ? 'Email belum dikonfirmasi. Cek inbox Anda.' : 'Login gagal: '+err.message;
    }
  };

  window.doAuthRegister = async function(){
    const email = document.getElementById('ai-email')?.value.trim();
    const password = document.getElementById('ai-password')?.value;
    const errEl = document.getElementById('ai-error');
    if(!email || !password){ errEl.textContent = 'Email dan password wajib diisi.'; return; }
    if(password.length < 6){ errEl.textContent = 'Password minimal 6 karakter.'; return; }
    errEl.textContent = 'Mendaftarkan...';
    try{
      await sbRegister(email,password);
      errEl.style.color = '#4ade80';
      errEl.textContent = '✅ Akun dibuat! Silakan login.';
    }catch(err){
      errEl.style.color = '#f87171';
      errEl.textContent = 'Gagal daftar: '+err.message;
    }
  };

  // ---- Role UI ----
  window.applyRoleUI = function(){
    const role = typeof getRole === 'function' ? getRole() : null;
    // badge
    document.getElementById('role-badge')?.remove();
    const badge = document.createElement('span');
    badge.id = 'role-badge';
    const labels = {super_admin:'🔱 Super Admin',admin:'👑 Admin',operator:'✏ Operator',viewer:'👁 Viewer'};
    badge.textContent = labels[role] || role || '';
    badge.className = `role-badge role-${role}`;
    document.querySelector('.sidebar-footer')?.prepend(badge);

    // write actions
    document.querySelectorAll('button[onclick*="openAddModal"], button[onclick*="editRecord"], button[onclick*="deleteRecord"], button[onclick*="savePaket"], button[onclick*="saveRincian"], button[onclick*="saveHarga"], button[onclick*="savePenyedia"], .btn-tambah, #btn-tambah')
      .forEach(btn=>{ btn.style.display = typeof isOperator==='function' && isOperator() ? '' : 'none'; });

    // master
    document.querySelectorAll('button[onclick*="saveBidang"], button[onclick*="saveOpd"], button[onclick*="saveRekening"], button[onclick*="savePPK"], button[onclick*="savePejabatPengadaan"], button[onclick*="saveEcatalog"]')
      .forEach(btn=>{ btn.style.display = isAdminOrSuper() ? '' : 'none'; });

    // admin only
    document.querySelectorAll('button[onclick*="importCSV"], button[onclick*="importJSON"], button[onclick*="resetDB"], button[onclick*="loadSampleData"], #page-import, .import-section')
      .forEach(el=>{ el.style.display = isAdminOrSuper() ? '' : 'none'; });

    document.querySelectorAll('.nav-item').forEach(btn=>{
      const oc = btn.getAttribute('onclick')||'';
      if(oc.includes("'import'") && !isAdminOrSuper()) btn.style.display='none';
    });

    const mgmt = document.getElementById('user-mgmt-panel');
    if(mgmt) mgmt.style.display = isAdminOrSuper() ? '' : 'none';

    document.querySelectorAll('.admin-only').forEach(el=>{
      if(isAdminOrSuper()){
        el.classList.add('sideva-admin-show','sideva-visible');
      }else{
        el.classList.remove('sideva-admin-show','sideva-visible');
      }
    });

    document.querySelectorAll('.sidebar-logout').forEach(el=>{
      el.style.display = typeof isLoggedIn==='function' && isLoggedIn() ? '' : 'none';
    });
  };

  // ---- User Mgmt ----
  window.renderUserMgmt = async function(){
    const panel = document.getElementById('user-mgmt-panel');
    if(!panel || !isAdminOrSuper()) return;
    panel.innerHTML = '<p style="opacity:.5;font-size:13px;">Memuat daftar user...</p>';
    try{
      const users = await sbGetAllUsers();
      if(!users.length){ panel.innerHTML = '<p style="opacity:.5;font-size:13px;">Belum ada user terdaftar.</p>'; return; }
      panel.innerHTML = `<table><thead><tr><th>Email</th><th>Role</th><th>Aksi</th></tr></thead><tbody>${
        users.map(u=>`<tr><td style="font-size:12px;">${u.email||'-'}</td><td><select class="role-select" onchange="changeUserRole('${u.user_id}',this.value)">${
          (typeof isSuperAdmin==='function' && isSuperAdmin() ? `<option value="super_admin" ${u.role==='super_admin'?'selected':''}>🔱 Super Admin</option>` : '')
        }<option value="admin" ${u.role==='admin'?'selected':''} ${!(typeof isSuperAdmin==='function' && isSuperAdmin())?'disabled':''}>👑 Admin</option><option value="operator" ${u.role==='operator'?'selected':''}>✏ Operator</option><option value="viewer" ${u.role==='viewer'?'selected':''}>👁 Viewer</option></select></td><td style="font-size:11px;opacity:.4;">${new Date(u.created_at).toLocaleDateString('id-ID')}</td></tr>`).join('')
      }</tbody></table>`;
    }catch(err){
      panel.innerHTML = `<p style="color:#f87171;font-size:13px;">Error: ${err.message}</p>`;
    }
  };

  window.changeUserRole = async function(userId,newRole){
    try{
      await sbSetUserRole(userId,newRole);
      if(typeof toast==='function') toast(`Role berhasil diubah ke ${newRole}`,'success');
    }catch(err){
      if(typeof toast==='function') toast('Gagal ubah role: '+err.message,'error');
      window.renderUserMgmt();
    }
  };

  // ---- Panel Auth di Backup ----
  window.injectAuthPanel = function(){
    const mount = document.getElementById('sync-panel-mount');
    if(!mount) return;
    const role = typeof getRole==='function' ? getRole() : null;
    const user = typeof getCurrentUser==='function' ? getCurrentUser() : null;
    if(! (typeof isLoggedIn==='function' && isLoggedIn())){
      mount.innerHTML = `<div style="text-align:center;padding:20px 0;"><p style="opacity:.5;font-size:13px;margin-bottom:12px;">Belum login ke cloud.</p><button class="btn btn-primary" onclick="showAuthOverlay()">🔐 Masuk ke Cloud</button></div>`;
      return;
    }
    const labels = {super_admin:'🔱 Super Admin',admin:'👑 Admin',operator:'✏ Operator',viewer:'👁 Viewer'};
    mount.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <span style="font-size:13px;font-weight:600;color:#4ade80;">☁ Cloud: Aktif</span>
        <span style="font-size:12px;opacity:.5;">${user?.email||''}</span>
       
