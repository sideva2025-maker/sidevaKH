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

<<<<<<< HEAD
    // STEP 2: Logout via REST API langsung (backup)
    const token = (typeof _session !== 'undefined' && _session?.access_token)
        ? _session.access_token
        : null;

    // Call local proxy endpoint to avoid CORS blocking
    // Proxy at /api/logout will forward logout request to Supabase with credentials
    try {
        console.log('[SBAuth] calling /api/logout proxy endpoint');
        const res = await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        console.log('[SBAuth] proxy logout response', { status: res.status, ok: res.ok });
    } catch(e) {
        console.warn('[SBAuth] proxy logout error:', e);
        // Fallback: attempt direct logout to Supabase if proxy unavailable
        if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            try {
                console.log('[SBAuth] fallback: calling REST logout directly');
                const headers = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const res = await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, { method: 'POST', headers, credentials: 'include' });
                console.log('[SBAuth] fallback REST logout response', { status: res.status, ok: res.ok });
            } catch(e2) {
                console.warn('[SBAuth] fallback logout also failed:', e2);
            }
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
=======
    // STEP 3: Bersihkan sessionStorage
>>>>>>> 3c208f827e15fea87e6521916d33fbfee656d0c8
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
