// ============================================================
//  SI-DEVA — Supabase Auth Layer v2.0 (FIXED GLOBAL)
// ============================================================
'use strict';

// 1. Definisikan Global Object agar file lain bisa langsung mengakses SBAuth
window.SBAuth = {
    isAdmin: () => false, // Default sebelum inisialisasi
    getRole: () => 'viewer',
    isLoggedIn: () => false
};

// 2. Fungsi Logout Global
window.doCloudLogout = async function() {
    try {
        if (window.supabase) await window.supabase.auth.signOut();
        localStorage.removeItem('sideva_sb_session');
        window.location.href = 'index.html';
    } catch (e) {
        window.location.href = 'index.html';
    }
};

(function(global){
  // ... (kode inisialisasi asli Anda tetap di sini)
  
  // Pastikan di bagian akhir, kita mengupdate window.SBAuth dengan yang asli
  const realSBAuth = {
    // ... semua fungsi login, logout, getRole, dll ...
    isAdmin: () => _role === 'admin',
    getRole: () => _role,
    // ...
  };
  
  global.SBAuth = realSBAuth;
  // ...
})(window);
