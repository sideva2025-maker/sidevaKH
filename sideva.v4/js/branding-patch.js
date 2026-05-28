// ============================================================
//  SI-DEVA — Branding Patch v1.0.0
//  File: js/branding-patch.js
//
//  Pasang di index.html SETELAH dashboard.js:
//    <script src="js/branding-patch.js"></script>
// ============================================================

(function _applyBranding() {

  // ── CSS ────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* Nama instansi di bawah SI-DEVA sidebar */
    #sidebar-instansi-name {
      font-size: 10px;
      color: var(--text3, #786850);
      text-align: center;
      padding: 0 12px 10px;
      line-height: 1.4;
      letter-spacing: 0.2px;
      border-bottom: 1px solid var(--border, rgba(201,168,76,0.15));
      margin-bottom: 6px;
      word-break: break-word;
    }

    /* Kepanjangan SI-DEVA di dashboard hero */
    #sideva-fullname-hero {
      font-size: 13px;
      color: var(--text3, #786850);
      font-style: italic;
      margin-top: 4px;
      margin-bottom: 10px;
      letter-spacing: 0.3px;
    }

    /* Copyright footer */
    #sideva-copyright-bar {
      text-align: center;
      font-size: 10.5px;
      color: var(--text3, #786850);
      padding: 10px 14px 14px;
      border-top: 1px solid var(--border, rgba(201,168,76,0.12));
      margin-top: auto;
      line-height: 1.6;
      letter-spacing: 0.2px;
    }
    #sideva-copyright-bar strong {
      color: var(--gold, #C9A84C);
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);

  // ── Injeksi utama (setelah DOM siap) ──────────────────────
  function _inject() {

    // 1. Nama instansi di bawah brand SI-DEVA di sidebar
    if (!document.getElementById('sidebar-instansi-name')) {
      const brandEl = document.getElementById('brand-instansi');
      if (brandEl) {
        const nameDiv = document.createElement('div');
        nameDiv.id = 'sidebar-instansi-name';
        // Ambil nama instansi dari appConfig jika ada
        const cfg = (() => {
          try { return JSON.parse(localStorage.getItem('sideva_config') || '{}'); } catch(_) { return {}; }
        })();
        const namaInstansi = cfg.namaInstansi || cfg.singkatan
          ? (cfg.namaInstansi || '') + (cfg.kabupaten ? '\n' + cfg.kabupaten : '')
          : '';
        nameDiv.textContent = namaInstansi || 'Instansi Pemerintah';
        brandEl.after(nameDiv);
      }
    }

    // 2. Copyright bar di bagian bawah sidebar
    const sidebar = document.querySelector('.sidebar, #sidebar, nav.nav, .nav-sidebar');
    if (sidebar && !document.getElementById('sideva-copyright-bar')) {
      const copy = document.createElement('div');
      copy.id = 'sideva-copyright-bar';
      copy.innerHTML = `
        <strong>SI-DEVA</strong> v1.0.0<br>
        Created by<br>
        <strong>Alam Satria, S.Kep., Ners., M.A.P</strong><br>
        <span style="font-size:10px;">© 2026 All rights reserved</span>
      `;
      sidebar.appendChild(copy);
    }

    // 3. Kepanjangan SI-DEVA di dashboard hero (subtitle)
    if (!document.getElementById('sideva-fullname-hero')) {
      const heroSub = document.getElementById('hero-subtitle');
      if (heroSub) {
        const fullname = document.createElement('div');
        fullname.id = 'sideva-fullname-hero';
        fullname.textContent = 'Sistem Informasi Digital Evaluasi Verifikasi Administrasi E-Purchasing';
        heroSub.before(fullname);
      }
    }

    // 4. Update footer instansi dengan versi baru
    const footerEl = document.getElementById('footer-instansi');
    if (footerEl) {
      const cfg = (() => {
        try { return JSON.parse(localStorage.getItem('sideva_config') || '{}'); } catch(_) { return {}; }
      })();
      const s   = cfg.singkatan || '';
      const kab = cfg.kabupaten || '';
      const label = s ? s + (kab ? ' ' + kab : '') : 'Instansi Pemerintah';
      footerEl.textContent = `SI-DEVA v1.0.0 · ${label} · © 2026 Alam Satria, S.Kep., Ners., M.A.P`;
    }
  }

  // ── Jalankan saat DOM siap ─────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _inject);
  } else {
    _inject();
  }

  // ── Re-inject setelah data Supabase siap (nama instansi terisi) ──
  window.addEventListener('sb-ready', function() {
    setTimeout(function() {
      // Update nama instansi di sidebar
      const nameDiv = document.getElementById('sidebar-instansi-name');
      if (nameDiv) {
        const cfg = (() => {
          try { return JSON.parse(localStorage.getItem('sideva_config') || '{}'); } catch(_) { return {}; }
        })();
        const text = cfg.namaInstansi
          ? cfg.namaInstansi + (cfg.kabupaten ? '\n' + cfg.kabupaten : '')
          : (cfg.singkatan || 'Instansi Pemerintah');
        nameDiv.textContent = text;
      }

      // Update footer
      const footerEl = document.getElementById('footer-instansi');
      if (footerEl) {
        const cfg = (() => {
          try { return JSON.parse(localStorage.getItem('sideva_config') || '{}'); } catch(_) { return {}; }
        })();
        const s   = cfg.singkatan || '';
        const kab = cfg.kabupaten || '';
        const label = s ? s + (kab ? ' ' + kab : '') : 'Instansi Pemerintah';
        footerEl.textContent = `SI-DEVA v1.0.0 · ${label} · © 2026 Alam Satria, S.Kep., Ners., M.A.P`;
      }

      // Pastikan semua sudah ter-inject
      _inject();
    }, 800);
  });

  // ── Patch applyAppConfig agar nama instansi ikut update ───
  const _origApply = window.applyAppConfig;
  window.applyAppConfig = function() {
    if (typeof _origApply === 'function') _origApply.apply(this, arguments);
    // Sinkron nama di sidebar
    const nameDiv = document.getElementById('sidebar-instansi-name');
    if (nameDiv) {
      const cfg = (() => {
        try { return JSON.parse(localStorage.getItem('sideva_config') || '{}'); } catch(_) { return {}; }
      })();
      nameDiv.textContent = cfg.namaInstansi
        ? cfg.namaInstansi + (cfg.kabupaten ? '\n' + cfg.kabupaten : '')
        : (cfg.singkatan || 'Instansi Pemerintah');
    }
  };

})();
