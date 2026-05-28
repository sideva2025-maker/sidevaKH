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
    try { console.log('[SBAuth] doCloudLogout invoked'); } catch(_) {}

    // STEP 1: Panggil sbLogout() dari supabase-db.js
    if (typeof sbLogout === 'function') {
        try {
            console.log('[SBAuth] calling sbLogout()');
            await sbLogout();
            console.log('[SBAuth] sbLogout() completed');
        } catch(e) {
            console.warn('sbLogout error:', e);
        }
    }

    // STEP 1b: Jika ada session sync cloud terpisah, logout juga
    if (typeof syncLogout === 'function') {
        try {
            console.log('[SBAuth] calling syncLogout()');
            await syncLogout();
            console.log('[SBAuth] syncLogout() completed');
        } catch(e) {
            console.warn('syncLogout error:', e);
        }
    }

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
    try { console.log('[SBAuth] cleared JS session and role variables'); } catch(_) {}

    // STEP 8: Hard redirect ke index file di folder saat ini agar logout valid dari halaman /pages/*.html
    try { console.log('[SBAuth] redirecting to index.html in current folder'); } catch(_) {}
    setTimeout(() => window.location.replace(new URL('index.html', window.location.href).href), 150);
};
