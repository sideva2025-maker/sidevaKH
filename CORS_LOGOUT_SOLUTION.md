# Solusi CORS Logout: Cloudflare Worker Proxy

Masalah: Browser memblokir logout karena CORS (cross-origin request ke Supabase).

Solusi: Deploy Cloudflare Worker yang menjadi proxy `/api/logout` (same-origin), sehingga browser tidak memblokir.

## Langkah-langkah Deployment

### 1. Buka Cloudflare Dashboard
- Masuk ke https://dash.cloudflare.com/
- Pilih domain Anda (sideva.sideva-2025.workers.dev atau domain lainnya)

### 2. Buat Worker Baru
- Di sidebar, klik **Workers & Pages** → **Workers**
- Klik tombol **Create** → **Create Worker**
- Beri nama, misal: `logout-proxy` atau `sideva-logout`
- Klik tombol **Create**

### 3. Copy Kode
- Buka file `CLOUDFLARE_WORKER_LOGOUT_PROXY.js` di editor Anda
- Copy seluruh isi file tersebut
- Di Cloudflare Worker editor, ganti seluruh isi dengan kode yang Anda copy

### 4. Sesuaikan Konfigurasi (Jika Diperlukan)
Di bagian atas kode, cek apakah nilai sudah benar:
```javascript
const SUPABASE_URL = 'https://jdzkallojiavqquksrbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

- **SUPABASE_URL**: URL Supabase project Anda (biasanya sudah benar)
- **SUPABASE_ANON_KEY**: Anon key dari Supabase (biasanya sudah benar)

Jika Anda tidak yakin, cek di Supabase Settings → API.

### 5. Deploy Worker
- Klik tombol **Deploy** (pojok kanan atas atau tombol blue)
- Tunggu hingga menunjukkan "Successfully published"

### 6. Tambahkan Route (Penting!)
- Setelah deploy, Anda akan melihat tab **Settings**
- Di bagian **Triggers**, klik **Add route** atau **Routes**
- Tambahkan route baru:
  ```
  Pattern: /api/logout*
  Worker: logout-proxy (atau nama yang Anda buat)
  Zone: [pilih domain Anda]
  ```
- Klik **Save**

### 7. Test Logout
- Reload https://sideva.sideva-2025.workers.dev/
- Login jika perlu
- Klik tombol **Logout**
- Buka Developer Tools → Console untuk lihat pesan `[SBAuth]` dan `[SBDB]`
- Harus ada request POST ke `/api/logout` (bukan error CORS)
- Seharusnya redirect ke index.html

## Jika Masih Ada Error

### Error: "Cannot find module..." atau "Worker not deployed"
- Pastikan Worker sudah berhasil di-**Deploy**
- Pastikan route `/api/logout*` sudah ditambahkan dan **Saved**

### Error CORS masih muncul
- Buka Developer Tools → Network
- Klik logout dan lihat apakah ada request ke `/api/logout`
- Jika ada request ke `/api/logout` tapi gagal, buka Worker editor dan cek **Real-time logs** (tab Monitoring)

### Error di Console: "await is only valid in async functions"
- Hard refresh halaman: **Ctrl+Shift+R** (Windows) atau **Cmd+Shift+R** (Mac)
- Jika masih error, periksa bahwa file JS sudah benar (tidak ada syntax error)

## Debugging

Jika Anda ingin melihat log lebih detail:
- Di Cloudflare Worker editor → tab **Monitoring** → **Real-time logs**
- Lakukan logout, log akan muncul di sana

Contoh log yang diharapkan:
```
[Worker] Forwarding logout to Supabase {
  url: "https://jdzkallojiavqquksrbc.supabase.co/auth/v1/logout?scope=global",
  ...
}
[Worker] Supabase logout response: {
  status: 204,
  statusText: "No Content",
  setCookie: "sb-access-token=; Path=/; Max-Age=0..."
}
```

## Alternatif: Tanpa Cloudflare Worker

Jika Anda tidak bisa deploy Worker:

1. **Ubah Supabase CORS** (jika Anda memiliki akses admin):
   - Login ke Supabase Dashboard
   - Project → Settings → API → CORS Allowed Origins
   - Tambahkan: `https://sideva.sideva-2025.workers.dev`
   - Simpan

2. **Gunakan proxy lain** (misal: backend Anda sendiri jika ada)

Tapi **solusi Cloudflare Worker adalah yang paling cepat dan aman** karena proxy berjalan di edge (lebih dekat ke user).
