// ============================================================
//  SI-DEVA — Patch kopSurat() + Logo Instansi di Semua Dokumen
//  File: js/kopsurat-logo-patch.js
//
//  Pasang di index.html SETELAH dashboard.js & logo-kop-upload.js:
//    <script src="js/kopsurat-logo-patch.js"></script>
//
//  Override fungsi kopSurat() agar:
//  - Logo instansi muncul di KIRI kop surat (fallback teks)
//  - Kop surat foto tetap dipakai bila ada (prioritas utama)
//  - Fallback teks otomatis tampil logo jika foto kop tidak ada
// ============================================================

window.kopSurat = function() {
  const cfg      = (typeof getActiveDocConfig === 'function')
    ? getActiveDocConfig()
    : ((typeof appConfig !== 'undefined' ? appConfig : null) || {});
  const namaPem  = ('PEMERINTAH ' + (cfg.kabupaten || '')).toUpperCase();
  const namaInst = (cfg.namaInstansi || '').toUpperCase();
  const kabShort = (cfg.kabupaten || '').replace('Kabupaten ','').replace('Kota ','').toUpperCase();
  const singkat  = (cfg.singkatan  || '').toUpperCase();
  const altKop   = 'Kop Surat ' + (cfg.singkatan || '') + ' ' + (cfg.kabupaten || '');

  // Prioritas 1: foto kop surat yang diupload
  const uploadedKop = localStorage.getItem('sideva_kop_surat_img') || '';
  // Logo instansi untuk fallback teks
  const logoSrc     = localStorage.getItem('sideva_logo_instansi') || '';

  // Jika ada foto kop → tampilkan foto, logo tidak diperlukan
  if (uploadedKop) {
    return `<div style="margin-bottom:14px;">
      <img src="${uploadedKop}" alt="${altKop}"
        style="width:100%;display:block;"
        onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='block';">
      ${_kopFallbackHTML(cfg, logoSrc, namaPem, namaInst, kabShort, singkat, 'none')}
    </div>`;
  }

  // Jika tidak ada foto kop → langsung tampilkan fallback teks + logo
  return `<div style="margin-bottom:14px;">
    ${_kopFallbackHTML(cfg, logoSrc, namaPem, namaInst, kabShort, singkat, 'block')}
  </div>`;
};

function _kopFallbackHTML(cfg, logoSrc, namaPem, namaInst, kabShort, singkat, display) {
  // Sisi kiri: logo instansi jika ada, fallback SVG Garuda
  const leftCell = logoSrc
    ? `<img src="${logoSrc}" alt="Logo Instansi"
         style="width:64px;height:64px;object-fit:contain;display:block;margin:0 auto;">`
    : `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
         <circle cx="32" cy="32" r="30" fill="none" stroke="#000" stroke-width="1.5"/>
         <circle cx="32" cy="32" r="25" fill="none" stroke="#000" stroke-width="0.5"/>
         <polygon points="32,14 34.4,24.6 44.8,22.6 37.6,30.2 44.8,37.8 34.4,35.8 32,46.4 29.6,35.8 19.2,37.8 26.4,30.2 19.2,22.6 29.6,24.6"
           fill="none" stroke="#000" stroke-width="1.2"/>
         <text x="32" y="56" text-anchor="middle" font-family="serif" font-size="5.5" font-weight="bold" fill="#000">GARUDA PANCASILA</text>
       </svg>`;

  // Sisi kanan: logo instansi jika ada, fallback SVG singkatan
  const rightCell = logoSrc
    ? `<img src="${logoSrc}" alt="Logo Instansi"
         style="width:64px;height:64px;object-fit:contain;display:block;margin:0 auto;opacity:0.85;">`
    : `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
         <circle cx="32" cy="32" r="30" fill="none" stroke="#000" stroke-width="1.5"/>
         <circle cx="32" cy="32" r="25" fill="none" stroke="#000" stroke-width="0.5"/>
         <text x="32" y="26" text-anchor="middle" font-family="serif" font-size="7" font-weight="bold" fill="#000">${singkat}</text>
         <text x="32" y="40" text-anchor="middle" font-family="serif" font-size="5.5" fill="#000">${kabShort}</text>
       </svg>`;

  return `
    <div style="display:${display};width:100%;font-family:'Times New Roman',Times,serif;color:#000;
                padding-bottom:8px;border-bottom:3px double #000;margin-bottom:2px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:76px;text-align:center;vertical-align:middle;border:none;padding-right:8px;">
            ${leftCell}
          </td>
          <td style="text-align:center;vertical-align:middle;border:none;padding:4px 6px;">
            ${namaPem ? `<div style="font-size:9pt;font-weight:bold;color:#000;text-transform:uppercase;letter-spacing:0.3px;">${namaPem}</div>` : ''}
            ${namaInst ? `<div style="font-size:13pt;font-weight:bold;color:#000;text-transform:uppercase;line-height:1.25;letter-spacing:0.2px;">${namaInst}</div>` : ''}
            ${cfg.alamat ? `<div style="font-size:8pt;color:#000;margin-top:4px;line-height:1.5;">${cfg.alamat}</div>` : ''}
            ${(cfg.telepon || cfg.website) ? `<div style="font-size:8pt;color:#000;">${cfg.telepon ? 'Telepon ' + cfg.telepon : ''}${cfg.telepon && cfg.website ? ' &nbsp;&nbsp; ' : ''}${cfg.website ? 'Website: ' + cfg.website : ''}</div>` : ''}
          </td>
          <td style="width:76px;text-align:center;vertical-align:middle;border:none;padding-left:8px;">
            ${rightCell}
          </td>
        </tr>
      </table>
    </div>`;
}
