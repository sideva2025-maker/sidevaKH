-- ============================================================
-- SI-DEVA — Migrasi: Tambah Tabel modules & actions
-- Jalankan SATU KALI di Supabase SQL Editor
-- ============================================================

-- 1. Tabel Modul
CREATE TABLE IF NOT EXISTS modules (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. Tabel Aksi
CREATE TABLE IF NOT EXISTS actions (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 3. RLS (Row Level Security)
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- Siapapun bisa baca (untuk datalist di form permissions)
CREATE POLICY "anyone_read_modules" ON modules FOR SELECT USING (true);
CREATE POLICY "anyone_read_actions" ON actions FOR SELECT USING (true);

-- Hanya admin yang bisa insert/update/delete
CREATE POLICY "admin_manage_modules" ON modules
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin_manage_actions" ON actions
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 4. Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_modules_name ON modules(name);
CREATE INDEX IF NOT EXISTS idx_actions_name ON actions(name);

-- 5. Data awal: modul-modul umum SI-DEVA
INSERT INTO modules (name, description) VALUES
  ('paket',       'Manajemen Paket Pengadaan'),
  ('rincian',     'Rincian Item Pengadaan'),
  ('harga',       'Manajemen Harga & HPS'),
  ('penyedia',    'Data Penyedia / Vendor'),
  ('laporan',     'Laporan & Rekap'),
  ('dashboard',   'Dashboard & Statistik'),
  ('master',      'Data Master (Bidang, PPK, dll)'),
  ('user',        'Manajemen User & Akses'),
  ('opd',         'Manajemen OPD'),
  ('pengaturan',  'Pengaturan Aplikasi')
ON CONFLICT (name) DO NOTHING;

-- 6. Data awal: aksi-aksi standar CRUD
INSERT INTO actions (name, description) VALUES
  ('create',  'Tambah data baru'),
  ('read',    'Lihat / baca data'),
  ('update',  'Ubah / edit data'),
  ('delete',  'Hapus data'),
  ('export',  'Ekspor data ke file'),
  ('import',  'Import data dari file'),
  ('approve', 'Menyetujui / verifikasi data'),
  ('print',   'Cetak dokumen')
ON CONFLICT (name) DO NOTHING;
