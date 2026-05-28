// ============================================================
//  SI-DEVA — Supabase Auth Layer v2.0 (FIXED GLOBAL)
// ============================================================
'use strict';

// 1. Definisikan Global Object
window.SBAuth = {
    isAdmin: () => false,
    getRole: () => 'viewer',
    isLoggedIn: () => false
};

// 2. Fungsi Logout Global — FIXED
window.doCloudLogout = async function() {

    // STEP 1: Panggil sbLogout() dari supabase-db.js
    if (typeof sbLogout === 'function') {
        try {
            await sbLogout();
        } catch(e) {
            console.warn('sbLogout error:', e);
        }
    }

    // STEP 2: Logout via REST API langsung (backup)
    const token = (typeof _session !== 'undefined' && _session?.access_token)
        ? _session.access_token
        : null;

    if (token && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        try {
            await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
        } catch(e) {
            console.warn('REST logout error:', e);
        }
    }

    // STEP 3: Bersihkan localStorage
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
                key.startsWith('sb-')       ||
                key.startsWith('supabase')  ||
                key === 'sideva_session_v3' ||
                key === 'sideva_sb_session' ||
                key === 'sideva_role'       || // ← TAMBAHKAN BARIS INI
                key === 'sideva_current_opd_id' || // ← TAMBAHKAN BARIS INI
                key.includes('auth')        ||
                key.includes('token')       ||
                key.includes('session')
            ) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch(e) {}

    // STEP 4: Bersihkan sessionStorage
    try { sessionStorage.clear(); } catch(e) {}

    // STEP 5: Hapus cookie
    try {
        document.cookie.split(';').forEach(c => {
            const name = c.trim().split('=')[0];
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        });
    } catch(e) {}

    // STEP 6: Reset SBAuth state
    window.SBAuth = {
        isAdmin: () => false,
        getRole: () => 'viewer',
        isLoggedIn: () => false
    };

    // STEP 7: Reset variable memory
    try { if (typeof _session  !== 'undefined') _session  = null; } catch(e) {}
    try { if (typeof _userRole !== 'undefined') _userRole = null; } catch(e) {}

    // STEP 8: Hard redirect
    setTimeout(() => window.location.replace('index.html'), 150);
};
