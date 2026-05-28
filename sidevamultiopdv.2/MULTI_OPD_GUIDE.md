# Panduan Implementasi Multi-OPD pada SI-DEVA v2.0

## 📋 Daftar Isi
1. [Pengenalan](#pengenalan)
2. [Fitur Utama](#fitur-utama)
3. [Instalasi](#instalasi)
4. [Konfigurasi Database](#konfigurasi-database)
5. [Penggunaan](#penggunaan)
6. [Manajemen Admin](#manajemen-admin)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Pengenalan

**Multi-OPD** adalah fitur yang memungkinkan aplikasi SI-DEVA diakses oleh lebih dari satu Organisasi Perangkat Daerah (OPD) dengan data yang terpisah dan terisolasi per OPD.

### Manfaat
- ✅ Satu aplikasi untuk multiple OPD
- ✅ Data terisolasi per OPD
- ✅ User dapat mengakses multiple OPD
- ✅ Admin dapat mengelola akses user per OPD
- ✅ Konfigurasi branding per OPD
- ✅ Audit trail per OPD

---

## ✨ Fitur Utama

### 1. **OPD Selector di Topbar**
- Dropdown untuk switch antar OPD
- Hanya menampilkan OPD yang user punya akses
- Real-time data filtering

### 2. **User-OPD Mapping**
- Setiap user dapat diassign ke multiple OPD
- Admin dapat manage akses per user
- Role-based access control (Admin, Operator, Viewer)

### 3. **Data Isolation**
- Paket, Rincian, Harga di-filter per OPD
- Master data (Bidang, Rekening, PPK) tetap global
- Config branding per OPD

### 4. **Admin Panel**
- Kelola daftar OPD
- Assign user ke OPD
- View user access per OPD
- Edit config per OPD

---

## 🚀 Instalasi

### Step 1: Copy File JavaScript
Copy 3 file baru ke folder `js/`:
```
js/multi-opd-db.js      # Core data layer
js/multi-opd-ui.js      # UI components
js/multi-opd-admin.js   # Admin management
```

### Step 2: Update index.html
Tambahkan script di `index.html` dengan urutan yang benar:

```html
<!-- Existing scripts -->
<script src="js/supabase-db.js"></script>
<script src="js/supabase-auth.js"></script>

<!-- NEW: Multi-OPD scripts (HARUS setelah supabase-auth.js) -->
<script src="js/multi-opd-db.js"></script>
<script src="js/multi-opd-ui.js"></script>
<script src="js/multi-opd-admin.js"></script>

<!-- Existing scripts -->
<script src="js/dashboard.js"></script>
<script src="js/pengajuan.js"></script>
<!-- ... other scripts ... -->
```

### Step 3: Jalankan SQL Migration
1. Buka Supabase Dashboard → SQL Editor
2. Copy-paste isi file `sql/multi-opd-migration.sql`
3. Jalankan query

---

## 🗄️ Konfigurasi Database

### Tabel Baru yang Dibuat

#### `user_opd_access`
Mapping antara user dan OPD yang bisa diakses:
```sql
- id (PK)
- user_id (FK → auth.users)
- opd_id (FK → opd)
- created_at
- updated_at
```

#### `opd_config`
Konfigurasi per OPD (branding, dll):
```sql
- id (PK)
- opd_id (FK → opd) UNIQUE
- data (JSONB)
- created_at
- updated_at
```

### Kolom Baru pada Tabel Existing

#### `paket`, `rincian`, `harga`
Tambah kolom:
```sql
- opd_id (FK → opd)
```

### Row Level Security (RLS)
Semua tabel sudah dikonfigurasi dengan RLS policies:
- Admin: Akses semua data
- Operator/Viewer: Hanya data OPD mereka

---

## 📖 Penggunaan

### Untuk End User

#### 1. Login
```javascript
// User login seperti biasa
await sbLogin(email, password);
```

#### 2. Switch OPD
Gunakan dropdown di topbar untuk switch antar OPD:
```
🏢 OPD: [Dropdown dengan daftar OPD]
```

#### 3. Data Otomatis Ter-filter
Semua data (Paket, Rincian, Harga) otomatis ter-filter sesuai OPD yang dipilih.

### Untuk Developer

#### Get Current OPD
```javascript
const opdId = getCurrentOpdId();
const opdName = getCurrentOpdName();
const opdList = getUserOpdList();
```

#### Set Current OPD
```javascript
await setCurrentOpd(opdId);
// Event 'opd-changed' akan di-dispatch
```

#### Listen to OPD Changes
```javascript
window.addEventListener('opd-changed', (e) => {
  console.log('OPD berubah ke:', e.detail.opdName);
  // Reload UI jika perlu
});
```

#### Save Data dengan OPD
```javascript
// opd_id otomatis di-inject
await dbPut('paket', {
  noPaket: '001',
  namaPaket: 'Paket A',
  // ... field lainnya
  // opd_id akan di-set otomatis ke getCurrentOpdId()
});
```

---

## 👨‍💼 Manajemen Admin

### Akses Admin Panel
1. Login sebagai Admin
2. Buka halaman **Manajemen OPD** (bisa ditambahkan ke sidebar)
3. Atau akses langsung: `#page-opd-management`

### Tugas Admin

#### 1. Tambah OPD Baru
```
Admin Panel → Tambah OPD → Isi nama OPD → Simpan
```

#### 2. Kelola Akses User
```
Admin Panel → User OPD Access → Pilih user → Pilih OPD → Simpan
```

#### 3. Edit Config OPD
```
Admin Panel → Klik "Config" pada OPD → Edit branding/setting
```

#### 4. View Users per OPD
```
Admin Panel → Klik "Users" pada OPD → Lihat daftar user
```

### API Admin Functions

```javascript
// Grant user access ke OPD
await grantUserOpdAccess(userId, opdId);

// Revoke user access dari OPD
await revokeUserOpdAccess(userId, opdId);

// Get user's OPD access list
const opdList = await getUserOpdAccessList(userId);

// Save OPD config
await saveOpdConfig(opdId, {
  namaInstansi: 'Dinas Kesehatan',
  singkatan: 'Dinkes',
  // ... config lainnya
});

// Load OPD config
await loadOpdConfig(opdId);
```

---

## 🔧 Troubleshooting

### Problem: Dropdown OPD tidak muncul
**Solusi:**
1. Pastikan user sudah login
2. Pastikan user punya akses ke minimal 1 OPD
3. Check browser console untuk error
4. Refresh halaman

### Problem: Data tidak ter-filter per OPD
**Solusi:**
1. Pastikan SQL migration sudah dijalankan
2. Check RLS policies di Supabase
3. Pastikan kolom `opd_id` sudah ada di tabel
4. Reload data: `await loadAllDataFiltered()`

### Problem: User tidak bisa switch OPD
**Solusi:**
1. Pastikan user punya akses ke OPD target (check `user_opd_access` table)
2. Pastikan OPD sudah ada di master data `opd`
3. Check browser console untuk error message

### Problem: Admin panel tidak muncul
**Solusi:**
1. Pastikan user adalah Admin (role = 'admin')
2. Pastikan file `multi-opd-admin.js` sudah di-load
3. Tambahkan halaman ke sidebar jika belum ada

### Problem: Config OPD tidak tersimpan
**Solusi:**
1. Pastikan user adalah Admin
2. Check Supabase RLS policies pada tabel `opd_config`
3. Lihat error di browser console

---

## 📝 Contoh Implementasi

### Tambah Halaman OPD Management ke Sidebar

Edit file yang menampilkan sidebar dan tambahkan:

```html
<button class="nav-item" onclick="showPage('opd-management')">
  🏢 Manajemen OPD
</button>
```

Kemudian tambahkan halaman di HTML:

```html
<div id="page-opd-management" class="page hidden"></div>
```

### Customize OPD Selector

Edit `multi-opd-ui.js` untuk customize tampilan:

```javascript
// Ubah label
label.textContent = '🏢 Pilih OPD:';

// Ubah styling
select.style.minWidth = '200px';
```

### Filter Data Manual

Jika perlu filter manual di luar sistem:

```javascript
// Get data hanya untuk OPD tertentu
const paketPerOpd = state.paket.data.filter(p => p.opd_id === opdId);
```

---

## 🔐 Security Notes

1. **RLS Policies**: Semua tabel sudah punya RLS policies
2. **Admin Access**: Admin otomatis dapat akses semua OPD
3. **User Isolation**: User non-admin hanya bisa lihat data OPD mereka
4. **Audit Trail**: Semua perubahan tercatat di `created_by` dan `updated_by`

---

## 📞 Support

Untuk pertanyaan atau issue, hubungi tim development.

---

## 📅 Changelog

### v1.0 (Initial Release)
- ✅ Multi-OPD data isolation
- ✅ User-OPD mapping
- ✅ OPD selector UI
- ✅ Admin management panel
- ✅ RLS policies
- ✅ Config per OPD

---

**Last Updated**: 2024
**Version**: 1.0
