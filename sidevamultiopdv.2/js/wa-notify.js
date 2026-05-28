// ============================================================
//  SI-DEVA — Notifikasi WhatsApp v1.0.0
//  File: js/wa-notify.js
//
//  Menggunakan CallMeBot API (GRATIS, tanpa backend)
//  Daftar API key: https://www.callmebot.com/blog/free-api-whatsapp-messages/
//
//  Pasang di index.html SETELAH dashboard.js:
//    <script src="js/wa-notify.js"></script>
//
//  CARA DAFTAR CALLMEBOT (sekali saja):
//  1. Simpan nomor +34 644 59 39 99 di kontak HP
//  2. Kirim pesan: "I allow callmebot to send me messages"
//  3. Tunggu balasan berisi API key (1-2 menit)
//  4. Masukkan nomor WA & API key di Pengaturan Instansi
// ============================================================

const WA_CFG_KEY = 'sideva_wa_config';

// ── Load/Save konfigurasi WA ──────────────────────────────────
function waLoadConfig() {
  try { return JSON.parse(localStorage.getItem(WA_CFG_KEY) || '{}'); }
  catch(_) { return {}; }
}
function waSaveConfig(cfg) {
  localStorage.setItem(WA_CFG_KEY, JSON.stringify(cfg));
}
function waIsEnabled() {
  const c = waLoadConfig();
  return !!(c.enabled && c.phone && c.apikey);
}

// ── Kirim pesan WA via CallMeBot ─────────────────────────────
async function waSend(text) {
  const c = waLoadConfig();
  if (!c.enabled || !c.phone || !c.apikey) return false;
  try {
    const phone   = c.phone.replace(/\D/g,'').replace(/^0/,'62');
    const encoded = encodeURIComponent(text);
    const url     = `https://api.callmebot.com/whatsapp.php?phone=${phone}&apikey=${c.apikey}&text=${encoded}`;
    const res     = await fetch(url, { mode:'no-cors' });
    return true;
  } catch(e) {
    console.warn('[WA Notif] Gagal kirim:', e.message);
    return false;
  }
}

// ── Template pesan ───────────────────────────────────────────
function _waHeader() {
  const cfg = (typeof appConfig !== 'undefined' ? appConfig : {});
  return `🏛️ *SI-DEVA — ${cfg.singkatan||cfg.namaInstansi||'Instansi'}*\n${new Date().toLocaleString('id-ID')}\n${'─'.repeat(30)}`;
}

async function waNotifPaketBaru(paket) {
  if (!waIsEnabled()) return;
  const msg = `${_waHeader()}
📦 *PAKET BARU DITAMBAHKAN*

• No RUP  : ${paket.rup||'-'}
• Paket   : ${paket.namaPaket||'-'}
• Bidang  : ${paket.bidang||'-'}
• Pagu    : Rp ${Number(paket.paguAnggaran||0).toLocaleString('id-ID')}
• Tgl Pesanan : ${paket.tanggalPesanan||'-'}

_Ditambahkan via SI-DEVA v1.0.0_`;
  await waSend(msg);
}

async function waNotifPaketUpdate(paket) {
  if (!waIsEnabled()) return;
  const msg = `${_waHeader()}
✏️ *DATA PAKET DIPERBARUI*

• No RUP  : ${paket.rup||'-'}
• Paket   : ${paket.namaPaket||'-'}
• Bidang  : ${paket.bidang||'-'}
• Pagu    : Rp ${Number(paket.paguAnggaran||0).toLocaleString('id-ID')}

_Diperbarui via SI-DEVA v1.0.0_`;
  await waSend(msg);
}

async function waNotifRincianBaru(rincian) {
  if (!waIsEnabled()) return;
  const msg = `${_waHeader()}
🧾 *RINCIAN BELANJA DITAMBAHKAN*

• No RUP  : ${rincian.rup||'-'}
• Item    : ${rincian.itemBarang||'-'}
• Vol     : ${rincian.vol||'-'} ${rincian.satuan||''}
• Harga   : Rp ${Number(rincian.hargaSatuan||0).toLocaleString('id-ID')}
• Jumlah  : Rp ${Number(rincian.jumlah||0).toLocaleString('id-ID')}

_Ditambahkan via SI-DEVA v1.0.0_`;
  await waSend(msg);
}

async function waNotifHargaBaru(harga) {
  if (!waIsEnabled()) return;
  const msg = `${_waHeader()}
🏷️ *SURVEY HARGA DITAMBAHKAN*

• No RUP    : ${harga.rup||'-'}
• Item      : ${harga.namaItem||'-'}
• Produk    : ${harga.namaProduk||'-'}
• Penyedia  : ${harga.namaPenyedia||'-'}
• Harga     : Rp ${Number(harga.hargaTayang||0).toLocaleString('id-ID')}
• Total     : Rp ${Number(harga.totalHarga||0).toLocaleString('id-ID')}
• Status    : ${harga.statusKatalog||'-'}

_Ditambahkan via SI-DEVA v1.0.0_`;
  await waSend(msg);
}

async function waNotifDeadline(paket, hariSisa) {
  if (!waIsEnabled()) return;
  const emo  = hariSisa < 0 ? '🚨' : hariSisa <= 2 ? '🔴' : '⏰';
  const info = hariSisa < 0
    ? `*LEWAT ${Math.abs(hariSisa)} HARI!*`
    : hariSisa === 0 ? '*JATUH TEMPO HARI INI!*' : `Sisa *${hariSisa} hari*`;
  const msg = `${_waHeader()}
${emo} *PERINGATAN DEADLINE PAKET*

• No RUP   : ${paket.rup||'-'}
• Paket    : ${paket.namaPaket||'-'}
• Bidang   : ${paket.bidang||'-'}
• Tgl Selesai : ${paket.tanggalSelesai||'-'}
• Status   : ${info}

_Notifikasi otomatis SI-DEVA v1.0.0_`;
  await waSend(msg);
}

// ── Cek & kirim notif deadline semua paket ───────────────────
async function waCheckDeadlines() {
  if (!waIsEnabled()) return;
  if (!state?.paket?.data?.length) return;
  const now = new Date(); now.setHours(0,0,0,0);
  const cfg = waLoadConfig();
  const lastCheck = cfg._lastDeadlineCheck
    ? new Date(cfg._lastDeadlineCheck) : new Date(0);
  const today = new Date().toDateString();

  // Kirim maks 1x per hari
  if (lastCheck.toDateString() === today) return;

  let sent = 0;
  for (const p of state.paket.data) {
    if (!p.tanggalSelesai) continue;
    const sel  = new Date(p.tanggalSelesai); sel.setHours(0,0,0,0);
    const diff = Math.ceil((sel - now) / 86400000);
    // Notif: lewat deadline ATAU sisa ≤ 7 hari
    if (diff < 0 || diff <= 7) {
      await waNotifDeadline(p, diff);
      sent++;
      if (sent >= 5) break; // Maks 5 notif sekaligus
    }
  }

  cfg._lastDeadlineCheck = new Date().toISOString();
  waSaveConfig(cfg);
}

// ── Hook ke dbPut untuk notif otomatis ───────────────────────
// Ditunda sampai sb-ready agar dbPut sudah pasti terdefinisi
function _waHookDbPut() {
  const _origDbPut = window.dbPut;
  if (typeof _origDbPut !== 'function') return;
  window.dbPut = async function(store, data) {
    let result;
    try {
      result = await _origDbPut.apply(this, arguments);
    } catch(err) {
      throw err;
    }
    const isNew = !data.id;
    try {
      const cfg = waLoadConfig();
      if (!cfg.enabled || !cfg.phone || !cfg.apikey) return result;
      if (store === 'paket'   && cfg.wa_notif_paket   !== false) isNew ? waNotifPaketBaru(result||data) : waNotifPaketUpdate(result||data);
      if (store === 'rincian' && cfg.wa_notif_rincian !== false && isNew) waNotifRincianBaru(result||data);
      if (store === 'harga'   && cfg.wa_notif_harga   !== false && isNew) waNotifHargaBaru(result||data);
    } catch(_) {}
    return result;
  };
}

// ── Isi form WA dari config tersimpan ────────────────────────
function waFillForm() {
  const cfg = waLoadConfig();
  const el  = id => document.getElementById(id);
  if (el('wa-phone'))          el('wa-phone').value            = cfg.phone   || '';
  if (el('wa-apikey'))         el('wa-apikey').value           = cfg.apikey  || '';
  if (el('wa-enabled'))        el('wa-enabled').checked        = cfg.enabled || false;
  if (el('wa-notif-paket'))    el('wa-notif-paket').checked    = cfg.wa_notif_paket    !== false;
  if (el('wa-notif-rincian'))  el('wa-notif-rincian').checked  = cfg.wa_notif_rincian  !== false;
  if (el('wa-notif-harga'))    el('wa-notif-harga').checked    = cfg.wa_notif_harga    !== false;
  if (el('wa-notif-deadline')) el('wa-notif-deadline').checked = cfg.wa_notif_deadline !== false;
  _waUpdateToggleUI(cfg.enabled || false);
}

function _waUpdateToggleUI(aktif) {
  const track = document.getElementById('wa-toggle-track');
  const thumb = document.getElementById('wa-toggle-thumb');
  const label = document.getElementById('wa-aktif-label');
  if (track) track.style.background = aktif ? '#25d366' : 'var(--border2)';
  if (thumb) thumb.style.left       = aktif ? '23px'    : '3px';
  if (label) label.innerHTML = aktif
    ? 'Notifikasi WhatsApp <span style="color:#25d366;">Aktif ✓</span>'
    : 'Notifikasi WhatsApp <span style="color:var(--red);">Nonaktif</span>';
}

// ── Panel Pengaturan WA (inject ke halaman Pengaturan) ───────
function _injectWaSettings() {
  const existing = document.getElementById('wa-settings-panel');
  if (existing) { waFillForm(); return; }
  // Cari anchor — section pengaturan instansi atau card terakhir di page-pengaturan
  const page = document.getElementById('page-pengaturan');
  if (!page) return;

  const cfg = waLoadConfig();
  const panel = document.createElement('div');
  panel.id = 'wa-settings-panel';
  panel.className = 'card';
  panel.style.cssText = 'margin-top:20px;';
  panel.innerHTML = `
    <div class="card-header">
      <div class="card-title">💬 Notifikasi WhatsApp</div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
        <input type="checkbox" id="wa-enabled" ${cfg.enabled?'checked':''}
          onchange="waSaveEnabled(this.checked)"
          style="width:16px;height:16px;cursor:pointer;">
        Aktifkan
      </label>
    </div>
    <div style="padding:0 20px 20px;">

      <!-- Panduan -->
      <div style="background:rgba(37,211,102,0.08);border:1px solid rgba(37,211,102,0.25);
                  border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:12px;line-height:1.7;">
        <strong>📱 Cara Daftar CallMeBot (sekali saja, GRATIS):</strong><br>
        1. Simpan nomor <strong>+34 644 59 39 99</strong> di kontak HP Anda<br>
        2. Kirim pesan WA: <code style="background:rgba(0,0,0,.1);padding:1px 5px;border-radius:3px;">I allow callmebot to send me messages</code><br>
        3. Tunggu balasan berisi <strong>API Key</strong> (1–2 menit)<br>
        4. Masukkan nomor &amp; API key di bawah, lalu klik Simpan &amp; Test
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div>
          <label style="display:block;font-size:12px;color:var(--text3);margin-bottom:5px;font-weight:600;">
            Nomor WhatsApp (format: 628xxxxxxxx)
          </label>
          <input type="text" id="wa-phone" value="${cfg.phone||''}"
            placeholder="628123456789"
            style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:6px;
                   background:var(--surface2);color:var(--text);font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="display:block;font-size:12px;color:var(--text3);margin-bottom:5px;font-weight:600;">
            API Key CallMeBot
          </label>
          <input type="text" id="wa-apikey" value="${cfg.apikey||''}"
            placeholder="1234567"
            style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:6px;
                   background:var(--surface2);color:var(--text);font-size:13px;box-sizing:border-box;">
        </div>
      </div>

      <!-- Pilihan notifikasi -->
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;color:var(--text3);font-weight:600;margin-bottom:8px;">Kirim notif untuk:</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          ${[
            ['wa-notif-paket',   'wa_notif_paket',   '📦 Paket baru/diperbarui'],
            ['wa-notif-rincian', 'wa_notif_rincian', '🧾 Rincian belanja baru'],
            ['wa-notif-harga',   'wa_notif_harga',   '🏷️ Survey harga baru'],
            ['wa-notif-deadline','wa_notif_deadline', '⏰ Peringatan deadline'],
          ].map(([id,key,label]) => `
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">
              <input type="checkbox" id="${id}" ${cfg[key]!==false?'checked':''}
                style="width:14px;height:14px;cursor:pointer;">
              ${label}
            </label>`).join('')}
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="waSaveSettings()">💾 Simpan</button>
        <button class="btn btn-secondary btn-sm" onclick="waTestSend()">📨 Test Kirim WA</button>
      </div>
      <div id="wa-settings-msg" style="display:none;margin-top:10px;font-size:12px;
           border-radius:6px;padding:8px 12px;border:1px solid;"></div>
    </div>`;
  page.appendChild(panel);
}

function waSaveEnabled(val) {
  const c = waLoadConfig();
  c.enabled = val;
  waSaveConfig(c);
  _waUpdateToggleUI(val);
}

function waSaveSettings() {
  const phone  = document.getElementById('wa-phone')?.value.trim();
  const apikey = document.getElementById('wa-apikey')?.value.trim();
  if (!phone || !apikey) {
    _waMsg('Nomor WA dan API key wajib diisi.', 'error'); return;
  }
  const cfg = {
    enabled:         document.getElementById('wa-enabled')?.checked || false,
    phone, apikey,
    wa_notif_paket:   document.getElementById('wa-notif-paket')?.checked   !== false,
    wa_notif_rincian: document.getElementById('wa-notif-rincian')?.checked !== false,
    wa_notif_harga:   document.getElementById('wa-notif-harga')?.checked   !== false,
    wa_notif_deadline:document.getElementById('wa-notif-deadline')?.checked!== false,
  };
  waSaveConfig(cfg);
  _waMsg('✅ Pengaturan WA berhasil disimpan!', 'success');
  if (typeof toast === 'function') toast('Pengaturan WA disimpan', 'success');
}

async function waTestSend() {
  const phone  = document.getElementById('wa-phone')?.value.trim();
  const apikey = document.getElementById('wa-apikey')?.value.trim();
  if (!phone || !apikey) {
    _waMsg('Isi nomor WA dan API key dulu, lalu Simpan.', 'error'); return;
  }
  waSaveSettings();
  _waMsg('⏳ Mengirim pesan test…', 'info');
  const cfg  = waLoadConfig();
  const cfgOld = { ...cfg };
  cfg.enabled = true; waSaveConfig(cfg);

  const ok = await waSend(`${_waHeader()}\n✅ *TEST BERHASIL!*\n\nNotifikasi SI-DEVA WhatsApp aktif.\nSemua perubahan data akan dikirim ke nomor ini.\n\n_SI-DEVA v1.0.0 — ${new Date().toLocaleString('id-ID')}_`);
  waSaveConfig(cfgOld);

  _waMsg(ok
    ? '✅ Pesan test terkirim! Cek WhatsApp Anda.'
    : '⚠️ Terkirim (no-cors, tidak bisa verifikasi). Cek WA Anda dalam 1 menit.', 'success');
}

function _waMsg(msg, type) {
  const el = document.getElementById('wa-settings-msg');
  if (!el) return;
  const p = {
    success:'color:#16a34a;border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.08)',
    error:  'color:#dc2626;border-color:rgba(220,38,38,.3);background:rgba(220,38,38,.08)',
    info:   'color:#C9A84C;border-color:rgba(201,168,76,.3);background:rgba(201,168,76,.08)',
  };
  el.style.cssText = `display:block;font-size:12px;border-radius:6px;padding:8px 12px;border:1px solid;${p[type]||p.info}`;
  el.textContent = msg;
  if (type !== 'error') setTimeout(() => el.style.display='none', 5000);
}

// ── Listen navigation: inject / isi form saat buka Pengaturan ─
window.addEventListener('sideva:page-changed', (e) => {
  if (e?.detail?.page !== 'pengaturan') return;
  setTimeout(() => _injectWaSettings(), 350);
});

// ── Init: hook dbPut + cek deadline saat app siap ────────────
window.addEventListener('sb-ready', function(e) {
  _waHookDbPut(); // pasang hook dbPut setelah supabase-db.js siap
  if (e.detail?.loggedIn) setTimeout(waCheckDeadlines, 3000);
});
