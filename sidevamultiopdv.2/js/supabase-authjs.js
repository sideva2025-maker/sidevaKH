// ============================================================
//  SI-DEVA — Auth UI & Role Management v3.1
//  File: js/supabase-auth.js
//
//  Pasang di index.html SETELAH supabase-db.js:
//    <script src="js/supabase-db.js"></script>
//    <script src="js/supabase-auth.js"></script>
// ============================================================

// ── Patch isAdmin agar super_admin dihitung admin ────────────
(function patchAdminHelpers(){
  // Tunggu getRole tersedia
  const wait = setInterval(()=>{
    if (typeof getRole === 'function' && typeof window.isAdmin === 'function') {
      clearInterval(wait);
      const origIsAdmin = window.isAdmin;
      window.isAdmin = function(){
        const r = getRole();
        return r === 'admin' || r === 'super_admin';
      };
      // Pastikan isSuperAdmin ada
      if (typeof window.isSuperAdmin !== 'function') {
        window.isSuperAdmin = function(){ return getRole() === 'super_admin'; };
      }
    }
  }, 50);
})();

// ── Inject CSS tambahan ──────────────────────────────────────
(function injectAuthStyle() {
  const s = document.createElement('style');
  s.id = 'sideva-auth-style';
  s.textContent = `
    .hidden { display: none !important; }

    /* ── Admin-only: SATU mekanisme — class based ── */
    .admin-only { display: none !important; }
    button.admin-only.sideva-admin-show,
    .nav-item.admin-only.sideva-admin-show { display: flex !important; width: 100%; }
    div.admin-only.sideva-admin-show,
    .nav-section-label.admin-only.sideva-admin-show { display: block !important; }

    .sidebar-logout {
      width: 100%;
      margin-bottom: 8px;
      justify-content: flex-start;
      border: 1px solid rgba(248,113,113,.22);
      color: #fca5a5;
      background: rgba(248,113,113,.08);
    }
    .sidebar-logout:hover {
      border-color: rgba(248,113,113,.45);
      background: rgba(248,113,113,.14);
    }
    #auth-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: var(--bg, #0f0f0f);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    #auth-box {
      background: var(--surface, #1a1a1a);
      border: 1px solid var(--border, #2a2a2a);
      border-radius: 16px;
      padding: 40px 36px;
      width: 380px;
      max-width: 95vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    #auth-box h2 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 700;
      color: var(--gold, #c9a84c);
    }
    #auth-box p { margin: 0 0 24px; font-size: 13px; opacity: .5; color: var(--text, #fff); }
    .auth-input {
      width: 100%; padding: 10px 13px; margin-bottom: 12px;
      border-radius: 8px; border: 1.5px solid var(--border, #333);
      background: var(--bg3, #111); color: var(--text, #fff);
      font-size: 13px; box-sizing: border-box;
      transition: border-color .2s;
    }
    .auth-input:focus { outline: none; border-color: var(--gold, #c9a84c); }
    .auth-error { color: #f87171; font-size: 12px; margin: -6px 0 10px; min-height: 18px; }
    .auth-btn-row { display: flex; gap: 8px; margin-top: 4px; }
    .auth-btn {
      flex: 1; padding: 10px; border-radius: 8px; border: none;
      font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: opacity .2s;
    }
    .auth-btn:hover { opacity: .85; }
    .auth-btn-primary { background: linear-gradient(135deg,#c9a227,#f0cb5a); color: #1a1200; }
    .auth-btn-secondary { background: var(--bg3,#222); color: var(--text,#fff); border: 1px solid var(--border,#333); }
    #auth-register-note { font-size: 11px; opacity:.4; margin-top:14px; text-align:center; color:var(--text,#fff); }

    #role-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 700; letter-spacing: .4px;
      cursor: default;
    }
    .role-super_admin { background: rgba(168,85,247,.15); color: #a855f7; border: 1px solid rgba(168,85,247,.3); }
    .role-admin    { background: rgba(251,191,36,.15); color: #fbbf24; border: 1px solid rgba(251,191,36,.3); }
    .role-operator { background: rgba(96,165,250,.15); color: #60a5fa; border: 1px solid rgba(96,165,250,.3); }
    .role-viewer   { background:
