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
// 2. Fungsi Logout Global — Fixed untuk REST API (tanpa window.supabase)
window.doCloudLogout = async function() {
    
    // Coba ambil token dari _session (variable dari IIFE auth)
    const token = (typeof _session !== 'undefined' && _session?.access_token)
        ? _session.access_token
        : null;

    // 1. Panggil Supabase logout REST endpoint langsung
    // (tidak pakai window.supabase karena tidak tersedia)
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

    // 2. Bersihkan semua localStorage
    try { localStorage.clear(); } catch(e) {}

    // 3. Bersihkan sessionStorage
    try { sessionStorage.clear(); } catch(e) {}

    // 4. Hapus semua cookie
    try {
        document.cookie.split(';').forEach(c => {
            const name = c.trim().split('=')[0];
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
        });
    } catch(e) {}

    // 5. Reset state SBAuth ke default
    window.SBAuth = {
        isAdmin: () => false,
        getRole: () => 'viewer',
        isLoggedIn: () => false
    };

    // 6. Hard redirect — tidak bisa kembali
    setTimeout(() => window.location.replace('index.html'), 150);
};
