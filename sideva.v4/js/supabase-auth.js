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
        // 1. Sign out dari Supabase (scope: global = hapus semua sesi)
        if (window.supabase) {
            await window.supabase.auth.signOut({ scope: 'global' });
        }
    } catch (e) {
        console.warn('Supabase signOut error:', e);
    } finally {
        // 2. Hapus semua key localStorage yang berkaitan dengan sesi
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
                key.startsWith('sb-') ||          // Supabase internal keys
                key.startsWith('supabase') ||      // Supabase legacy keys
                key === 'sideva_sb_session' ||     // Key custom Anda
                key.includes('auth') ||            // Semua key auth
                key.includes('token') ||           // Semua key token
                key.includes('session')            // Semua key session
            ) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // 3. Bersihkan sessionStorage juga
        sessionStorage.clear();

        // 4. Reset state SBAuth
        if (window.SBAuth) {
            window.SBAuth.isAdmin = () => false;
            window.SBAuth.getRole = () => 'viewer';
            window.SBAuth.isLoggedIn = () => false;
        }

        // 5. Redirect ke halaman login
        window.location.replace('index.html');
    }
};
