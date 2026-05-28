# Langkah-Langkah Instalasi Multi-OPD

## 🎯 Quick Start (5 Menit)

### 1️⃣ Copy File JavaScript
Copy 3 file baru ke folder `js/`:
- `js/multi-opd-db.js`
- `js/multi-opd-ui.js`
- `js/multi-opd-admin.js`

### 2️⃣ Update Script Loading Order di index.html

**SEBELUM (existing):**
```html
<script src="js/supabase-db.js"></script>
<script src="js/supabase-auth.js"></script>
<script src="js/dashboard.js"></script>
<script src="js/pengajuan.js"></script>
<!-- ... other scripts ... -->
```

**SESUDAH (dengan multi-OPD):**
```html
<!-- Supabase & Auth (existing) -->
<script src="js/supabase-db.js"></script>
<script src="js/supabase-auth.js"></script>

<!-- ⭐ TAMBAH: Multi-OPD Scripts (URUTAN PENTING!) -->
<script src="js/multi-opd-db.js"></script>
<script src="js/multi-opd-ui.js"></script>
<script src="js/multi-opd-admin.js"></script>

<!-- Dashboard & lainnya (existing) -->
<script src="js/dashboard.js"></script>
<script src="js/pengajuan.js"></script>
<!-- ... other scripts ... -->
```

**⚠️ PENTING: Urutan script harus:**
1. `supabase-db.js`
2. `supabase-auth.js`
3. `multi-opd-db.js` ← BARU
4. `multi-opd-ui.js` ← BARU
5. `multi-opd-admin.js` ← BARU
6. `dashboard.js`
7. `pengajuan.js` dan lainnya

### 3️⃣ Setup Database di Supabase

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Buat query baru
3. Copy-paste seluruh isi file `sql/multi-opd-migration.sql`
4. Klik **Run** atau **Ctrl+Enter**
5. Tunggu sampai selesai (tidak ada error)

✅ **Selesai!** Database sudah siap untuk multi-OPD

---

## 🎨 Menu Admin (build utama)

Untuk aplikasi hasil build (`index.html` dari `_skeleton.html`), menu admin **sudah disertakan**:

- Manajemen OPD
- Akses User ke OPD
- Manajemen Akses
- Audit Log

Render halaman admin ditangani otomatis oleh:

- `js/multi-opd-admin.js`
- `js/user-management.js`
- `js/audit-log.js`
- `pages/opd-management.html` (fallback init)

### Menambah hook halaman baru (jangan patch `showPage`)

`showPage()` di `js/dashboard.js` mem-broadcast event global setiap navigasi.
Modul fitur harus **listen** event ini, bukan override `window.showPage`.

```javascript
window.addEventListener('sideva:page-changed', (e) => {
  const page = e.detail?.page;
  if (page === 'nama-halaman-kamu') {
    // render / init UI di sini
  }
});
```

> Catatan: `dashboard.html` adalah file legacy/standalone. Untuk production, gunakan alur `pages/` + `build.py` → `index.html`.

---

## ✅ Verifikasi Instalasi

### 1. Check Browser Console
Buka DevTools (F12), tab Console:
- Seharusnya ada pesan: `✅ Multi-OPD layer loaded`
- Seharusnya ada pesan: `✅ Multi-OPD UI loaded`
- Seharusnya ada pesan: `✅ Multi-OPD Admin loaded`

### 2. Login dan Cek Dropdown OPD
1. Login ke aplikasi
2. Lihat topbar (bagian atas halaman)
3. Seharusnya ada dropdown: `🏢 OPD: [Dropdown]`
4. Dropdown berisi daftar OPD yang user punya akses

### 3. Cek Admin Panel
1. Login sebagai Admin
2. Buka menu "Manajemen OPD" (jika sudah ditambahkan)
3. Seharusnya muncul:
   - Daftar OPD
   - Tabel User OPD Access
   - Tombol "Tambah OPD"

---

## 🔍 Troubleshooting

### ❌ Error: "Cannot read property 'opd_id' of undefined"
**Penyebab:** Kolom `opd_id` belum ada di database
**Solusi:** Jalankan SQL migration lagi

### ❌ Dropdown OPD tidak muncul
**Penyebab:** User belum punya akses ke OPD
**Solusi:** 
1. Login sebagai Admin
2. Buka Manajemen OPD
3. Assign user ke OPD

### ❌ RLS Policy Error di Console
**Penyebab:** RLS policies belum di-setup
**Solusi:** Jalankan SQL migration lagi

### ❌ Data masih menampilkan semua OPD
**Penyebab:** Filter OPD belum aktif
**Solusi:**
1. Refresh halaman
2. Pastikan `multi-opd-db.js` sudah ter-load
3. Check console untuk error

---

## 📊 Struktur Database Baru

```
user_opd_access
├── id (PK)
├── user_id (FK → auth.users)
├── opd_id (FK → opd)
├── created_at
└── updated_at

opd_config
├── id (PK)
├── opd_id (FK → opd) UNIQUE
├── data (JSONB)
├── created_at
└── updated_at

paket (modified)
├── ... existing columns ...
└── opd_id (FK → opd) ← BARU

rincian (modified)
├── ... existing columns ...
└── opd_id (FK → opd) ← BARU

harga (modified)
├── ... existing columns ...
└── opd_id (FK → opd) ← BARU
```

---

## 🚀 Testing Multi-OPD

### Scenario 1: Admin Access All OPD
1. Login sebagai Admin
2. Dropdown OPD menampilkan semua OPD
3. Bisa switch antar OPD
4. Data ter-filter per OPD

### Scenario 2: Operator Access Limited OPD
1. Login sebagai Operator
2. Dropdown OPD hanya menampilkan OPD yang di-assign
3. Bisa switch antar OPD yang di-assign
4. Data ter-filter per OPD
5. Tidak bisa lihat data OPD lain

### Scenario 3: Admin Manage User Access
1. Login sebagai Admin
2. Buka Manajemen OPD
3. Assign user ke OPD
4. User bisa login dan lihat OPD yang di-assign

---

## 📝 Checklist Implementasi

- [ ] Copy 3 file JS ke folder `js/`
- [ ] Update script loading order di `index.html`
- [ ] Jalankan SQL migration di Supabase
- [ ] Refresh browser dan login
- [ ] Cek dropdown OPD di topbar
- [ ] Login sebagai Admin dan cek Manajemen OPD
- [ ] Test switch OPD
- [ ] Test assign user ke OPD
- [ ] Test data filtering per OPD
- [ ] Baca dokumentasi lengkap di `MULTI_OPD_GUIDE.md`

---

## 🎓 Next Steps

1. **Baca dokumentasi lengkap**: `MULTI_OPD_GUIDE.md`
2. **Customize UI sesuai kebutuhan**: Edit `multi-opd-ui.js`
3. **Setup admin panel**: Tambah menu ke sidebar
4. **Test dengan multiple user**: Assign user ke OPD berbeda
5. **Monitor performance**: Check query performance di Supabase

---

## 💡 Tips

- **Backup database** sebelum jalankan SQL migration
- **Test di environment staging** sebelum production
- **Baca RLS policies** untuk memahami security model
- **Monitor Supabase logs** untuk troubleshooting

---

**Selamat! Multi-OPD sudah siap digunakan! 🎉**
