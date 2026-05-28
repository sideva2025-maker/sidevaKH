# 📦 Multi-OPD Implementation Package

Paket ini berisi semua file yang diperlukan untuk menambahkan fitur **Multi-OPD** ke aplikasi SI-DEVA v2.0.

## 📁 Struktur File

```
SIDEVA_2 OPD/
├── js/
│   ├── multi-opd-db.js          ⭐ Core data layer (WAJIB)
│   ├── multi-opd-ui.js          ⭐ UI components (WAJIB)
│   ├── multi-opd-admin.js       ⭐ Admin management (WAJIB)
│   └── [existing files...]
├── sql/
│   └── multi-opd-migration.sql  ⭐ Database setup (WAJIB)
├── MULTI_OPD_GUIDE.md           📖 Dokumentasi lengkap
├── INSTALLATION_STEPS.md        🚀 Panduan instalasi
└── MULTI_OPD_README.md          📄 File ini
```

## 🚀 Quick Start

### 1. Copy File JavaScript
```bash
# Copy 3 file ke folder js/
cp js/multi-opd-db.js /path/to/project/js/
cp js/multi-opd-ui.js /path/to/project/js/
cp js/multi-opd-admin.js /path/to/project/js/
```

### 2. Update index.html
Tambahkan script dengan urutan yang benar:
```html
<script src="js/supabase-db.js"></script>
<script src="js/supabase-auth.js"></script>
<script src="js/multi-opd-db.js"></script>      <!-- BARU -->
<script src="js/multi-opd-ui.js"></script>      <!-- BARU -->
<script src="js/multi-opd-admin.js"></script>   <!-- BARU -->
<script src="js/dashboard.js"></script>
<!-- ... other scripts ... -->
```

### 3. Setup Database
Jalankan SQL migration di Supabase SQL Editor:
```sql
-- Copy-paste isi sql/multi-opd-migration.sql
```

✅ **Selesai!** Aplikasi siap untuk multi-OPD

---

## 📚 Dokumentasi

| File | Deskripsi |
|------|-----------|
| **INSTALLATION_STEPS.md** | Panduan instalasi step-by-step (5 menit) |
| **MULTI_OPD_GUIDE.md** | Dokumentasi lengkap (fitur, API, troubleshooting) |
| **js/multi-opd-db.js** | Core data layer - handle OPD filtering & data isolation |
| **js/multi-opd-ui.js** | UI components - OPD selector dropdown di topbar |
| **js/multi-opd-admin.js** | Admin panel - manage OPD & user access |
| **sql/multi-opd-migration.sql** | Database setup - create tables & RLS policies |

---

## ✨ Fitur Utama

✅ **OPD Selector** - Dropdown di topbar untuk switch antar OPD
✅ **Data Isolation** - Data ter-filter per OPD secara otomatis
✅ **User-OPD Mapping** - Assign user ke multiple OPD
✅ **Admin Panel** - Kelola OPD dan user access
✅ **RLS Security** - Row-level security untuk data protection
✅ **Config per OPD** - Branding & setting per OPD

---

## 🎯 Workflow

### Untuk End User
1. Login ke aplikasi
2. Lihat dropdown OPD di topbar
3. Switch antar OPD yang bisa diakses
4. Data otomatis ter-filter per OPD

### Untuk Admin
1. Login sebagai Admin
2. Buka "Manajemen OPD"
3. Tambah OPD baru (jika perlu)
4. Assign user ke OPD
5. Edit config per OPD

---

## 🔧 API Functions

```javascript
// Get current OPD
getCurrentOpdId()
getCurrentOpdName()
getUserOpdList()

// Set current OPD
await setCurrentOpd(opdId)

// Admin functions
await grantUserOpdAccess(userId, opdId)
await revokeUserOpdAccess(userId, opdId)
await getUserOpdAccessList(userId)
await saveOpdConfig(opdId, config)
await loadOpdConfig(opdId)

// Events
window.addEventListener('opd-changed', (e) => {
  console.log(e.detail.opdId, e.detail.opdName)
})
```

---

## 📊 Database Changes

### Tabel Baru
- `user_opd_access` - User to OPD mapping
- `opd_config` - Config per OPD

### Kolom Baru
- `paket.opd_id`
- `rincian.opd_id`
- `harga.opd_id`

### RLS Policies
- Admin: Akses semua data
- User: Hanya data OPD mereka

---

## ⚡ Performance

- **Query Optimization**: Index pada `opd_id` untuk fast filtering
- **Lazy Loading**: OPD config di-load on-demand
- **Caching**: OPD list di-cache di localStorage
- **Polling**: 30-second polling untuk real-time sync

---

## 🔐 Security

- ✅ RLS policies untuk data isolation
- ✅ Admin-only operations untuk manage OPD
- ✅ User can only access assigned OPD
- ✅ Audit trail (created_by, updated_by)

---

## 🐛 Troubleshooting

### Dropdown OPD tidak muncul
→ Pastikan user sudah login dan punya akses ke OPD

### Data tidak ter-filter
→ Jalankan SQL migration dan refresh halaman

### RLS Policy Error
→ Check Supabase logs dan jalankan migration lagi

**Lihat MULTI_OPD_GUIDE.md untuk troubleshooting lengkap**

---

## 📞 Support

Untuk pertanyaan atau issue:
1. Baca dokumentasi di MULTI_OPD_GUIDE.md
2. Check browser console untuk error message
3. Lihat Supabase logs untuk database error

---

## 📋 Checklist

- [ ] Copy 3 file JS
- [ ] Update index.html
- [ ] Jalankan SQL migration
- [ ] Refresh browser
- [ ] Test dropdown OPD
- [ ] Test admin panel
- [ ] Test data filtering
- [ ] Read MULTI_OPD_GUIDE.md

---

## 🎉 Selesai!

Multi-OPD sudah siap digunakan. Silakan baca **INSTALLATION_STEPS.md** untuk panduan detail.

**Version**: 1.0
**Last Updated**: 2024
