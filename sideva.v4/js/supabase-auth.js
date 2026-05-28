// ============================================================
//  SI-DEVA — Supabase Auth Layer v2.0 (FIXED FINAL)
// ============================================================
'use strict';

// 1. Definisikan Global Object
window.SBAuth = {
    isAdmin: () => false,
    getRole: () => 'viewer',
    isLoggedIn: () => false
};

// 2. Fungsi Logout Global — FINAL FIX (skip REST, langsung clear)
window.doCloudLogout = async function() {

    // STEP 1: Panggil sbLogout() dari supabase-db.js
    if (typeof sbLogout === 'function') {
        try {
            await sbLogout();
        } catch(e) {
            console.warn('sbLogout error:', e);
        }
    }

    // STEP 2: Bersihkan SEMUA localStorage
    try { localStorage.clear(); } catch(e) {}

    // STEP 3: Bersihkan sessionStorage
    try { sessionStorage.clear(); } catch(e) {}

    // STEP 4: Hapus cookie
    try {
        document.cookie.split(';').forEach(c => {
            const name = c.trim().split('=')[0];
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        });
    } catch(e) {}

    // STEP 5: Reset SBAuth state
    window.SBAuth = {
        isAdmin: () => false,
        getRole: () => 'viewer',
        isLoggedIn: () => false
    };

    // STEP 6: Reset variable memory
    try { _session  = null; } catch(e) {}
    try { _userRole = null; } catch(e) {}

    // STEP 7: Hard redirect
    window.location.href = 'index.html';
};
