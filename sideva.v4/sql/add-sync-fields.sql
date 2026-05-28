-- ============================================================
-- MIGRATION: Tambah kolom parentRincianId dan pembandingKe
-- pada tabel harga di Supabase
--
-- Jalankan di Supabase SQL Editor:
--   https://supabase.com/dashboard → SQL Editor → New Query
--
-- AMAN untuk dijalankan berkali-kali (IF NOT EXISTS).
-- Data yang sudah ada TIDAK akan terhapus.
-- ============================================================

-- Kolom relasi ke tabel rincian
ALTER TABLE harga
  ADD COLUMN IF NOT EXISTS parent_rincian_id TEXT DEFAULT NULL;

-- Kolom urutan pembanding (1, 2, atau 3)
ALTER TABLE harga
  ADD COLUMN IF NOT EXISTS pembanding_ke INTEGER DEFAULT NULL;

-- Index untuk mempercepat query relasi
CREATE INDEX IF NOT EXISTS idx_harga_parent_rincian_id
  ON harga (parent_rincian_id);

-- Komentar kolom (opsional, dokumentasi)
COMMENT ON COLUMN harga.parent_rincian_id IS 'ID record di tabel rincian yang menjadi induk baris ini (untuk sinkronisasi otomatis)';
COMMENT ON COLUMN harga.pembanding_ke IS 'Urutan pembanding: 1, 2, atau 3 (NULL jika bukan hasil sinkronisasi otomatis)';
