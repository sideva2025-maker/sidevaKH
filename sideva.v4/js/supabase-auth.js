// ============================================================
//  SI-DEVA — Supabase Auth Layer v2.0
//  File: js/supabase-auth.js
// ============================================================
'use strict';

(function(global){
  const URL = global.SUPABASE_URL || window.SUPABASE_URL;
  const KEY = global.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;

  if(!URL || !KEY){
    console.error('[SBAuth] SUPABASE_URL / ANON_KEY belum di-set');
  }

  // State internal
  let _session = null;
  let _user = null;
  let _role = 'viewer';
  let _ready = false;
  const _listeners = new Set();

  // Helper Logout yang akan kita ekspor
  async function logout() {
    try {
      // Panggil fungsi logout dari SDK supabase jika tersedia
      if (global.supabase) {
        await global.supabase.auth.signOut();
      }
      localStorage.removeItem(lsKey);
      _session = null;
      _user = null;
      window.location.href = 'index.html';
    } catch (e) {
      console.error('Logout error:', e);
      window.location.href = 'index.html';
    }
  }

  // ... (biarkan bagian kode lainnya tetap sama)

  const SBAuth = {
    login, logout, restoreSession, inviteUser,
    updatePassword, updateProfile,
    onAuthChange,
    getSession, getUser, getRole, isLoggedIn, isAdmin, isReady
  };

  global.SBAuth = SBAuth;
  global.sbLogin = login;
  global.sbLogout = logout;
  
  // PERBAIKAN: Menambahkan alias agar onclick="doCloudLogout()" di HTML berfungsi
  global.doCloudLogout = logout; 
  
  global.sbRestoreSession = restoreSession;
  global.sbInviteUser = inviteUser;
  global.isAdmin = isAdmin;

  // ... (sisa kode lainnya)
})(window);
