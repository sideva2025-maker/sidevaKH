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
    // Ini yang reset _session, _userRole, dan hapus sideva_session_v3
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

    // STEP 3: Bersihkan localStorage (pastikan sideva_session_v3 terhapus)
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
                key.startsWith('sb-')           ||
                key.startsWith('supabase')       ||
                key === 'sideva_session_v3'      ||
                key === 'sideva_sb_session'      ||
                key.includes('auth')             ||
                key.includes('token')            ||
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
            const name
