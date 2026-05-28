-- ============================================================
-- MIGRASI: Hapus UNIQUE constraint rup + rebuild FK via opd_id
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Step 1: Hapus FK dulu (yang bergantung pada index unique rup)
ALTER TABLE rincian DROP CONSTRAINT IF EXISTS rincian_rup_fkey;
ALTER TABLE harga    DROP CONSTRAINT IF EXISTS harga_rup_fkey;

-- Step 2: Baru hapus UNIQUE constraint di paket
ALTER TABLE paket DROP CONSTRAINT IF EXISTS paket_rup_key;

-- Selesai — satu nomor RUP kini bisa dipakai lebih dari satu paket.
