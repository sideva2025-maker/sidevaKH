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

    // STEP 1b: Jika ada session sync cloud terpisah, logout juga
    if (typeof syncLogout === 'function') {
        try {
            await syncLogout();
        } catch(e) {
            console.warn('syncLogout error:', e);
        }
    }

    // STEP 2: Logout via REST API langsung (backup)
    const token = (typeof _session !== 'undefined' && _session?.access_token)
        ? _session.access_token
        : null;

    // Always attempt server-side logout (use credentials include to clear HttpOnly cookies),
    // even if token is not available in JS memory.
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        try {
            const headers = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, {
                method: 'POST',
                headers,
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
        const cookieNames = document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
        const domains = [window.location.hostname, '.' + window.location.hostname];
        const paths = ['/', window.location.pathname, window.location.pathname.replace(/\/[^/]*$/, '/')];
        cookieNames.forEach(name => {
            domains.forEach(domain => {
                paths.forEach(path => {
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path};domain=${domain};`;
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path};`;
                });
            });
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

    // STEP 8: Hard redirect ke index file di folder saat ini agar logout valid dari halaman /pages/*.html
    setTimeout(() => window.location.replace(new URL('index.html', window.location.href).href), 150);
};
