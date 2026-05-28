# SI-DEVA — Struktur Proyek

```
SIDEVA/
├── index.html          ← File utama (hasil build, buka langsung di browser)
├── _skeleton.html      ← Template kerangka (jangan ubah manual)
├── build.py            ← Script perakit: gabungkan pages/ → index.html
│
├── pages/              ← SOURCE OF TRUTH — edit di sini
│   ├── dashboard.html
│   ├── paket.html
│   ├── rincian.html
│   ├── harga.html
│   ├── penyedia.html
│   ├── ecatalog.html
│   ├── master.html
│   ├── import.html
│   ├── backup.html
│   ├── evat.html
│   ├── evhp.html
│   ├── formspek.html
│   ├── formdpp.html
│   ├── nodis.html
│   ├── riviu.html
│   ├── penetapan.html
│   ├── idkb.html
│   ├── sppbj.html
│   ├── bahpe.html
│   └── pengaturan.html
│
├── css/
│   └── style.css
├── js/                 ← modul fitur (supabase, multi-opd, export, audit, dll.)
├── style.css           ← stylesheet utama
└── assets/
```

## Cara Kerja

- **Buka `index.html`** langsung di browser — tidak perlu server.
- **Edit konten halaman** → ubah file di `pages/nama-halaman.html`.
- **Setelah edit** → jalankan `python build.py` agar perubahan masuk ke `index.html`.
- **Mode watch** → `python build.py --watch` (auto-rebuild saat file berubah).

## Aturan Edit

| Yang diubah | File target |
|---|---|
| Tampilan/gaya | `style.css` |
| Logika inti & navigasi | `js/dashboard.js`, `js/pengajuan.js` |
| Modul fitur | `js/<nama-modul>.js` (daftar di `_skeleton.html`) |
| Konten halaman tertentu | `pages/<nama>.html` |
| Layout sidebar/topbar/modal | `_skeleton.html` |

Setelah edit `pages/` atau `_skeleton.html`, wajib jalankan `python build.py`.

## Navigasi antar modul

- Routing halaman: `showPage(name)` di `js/dashboard.js`.
- Setiap pindah halaman, app mengirim event: `sideva:page-changed` (`detail.page`).
- Modul fitur (export, audit log, multi-OPD, dll.) **wajib listen event ini**.
- Jangan override `window.showPage` (rawan konflik urutan script).
