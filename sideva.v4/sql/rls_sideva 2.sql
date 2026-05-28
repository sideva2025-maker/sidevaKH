-- ============================================================
--  SI-DEVA — Row Level Security (RLS) Supabase
--  File: rls_sideva.sql
--
--  CARA PAKAI:
--  1. Buka Supabase Dashboard → SQL Editor
--  2. Paste seluruh isi file ini
--  3. Klik RUN
--  4. Jalankan SEKALI saja (sudah aman dijalankan ulang)
-- ============================================================


-- ============================================================
--  BAGIAN 1: HELPER FUNCTIONS
--  Fungsi-fungsi ini dipakai oleh semua policy di bawah
-- ============================================================

-- Cek apakah user saat ini adalah admin
CREATE OR REPLACE FUNCTION is_sideva_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Cek apakah user punya akses ke OPD tertentu
-- (admin otomatis punya akses ke semua OPD)
CREATE OR REPLACE FUNCTION has_opd_access(p_opd_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admin: akses semua
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
    OR
    -- Non-admin: hanya OPD yang di-assign
    EXISTS (
      SELECT 1 FROM user_opd_access
      WHERE user_id = auth.uid()
        AND opd_id = p_opd_id
    );
$$;

-- Cek apakah user bisa write (role admin atau operator)
CREATE OR REPLACE FUNCTION is_sideva_writer()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'operator')
  );
$$;


-- ============================================================
--  BAGIAN 2: AKTIFKAN RLS PADA SEMUA TABEL
-- ============================================================

ALTER TABLE paket             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rincian           ENABLE ROW LEVEL SECURITY;
ALTER TABLE harga             ENABLE ROW LEVEL SECURITY;
ALTER TABLE penyedia          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidang            ENABLE ROW LEVEL SECURITY;
ALTER TABLE opd               ENABLE ROW LEVEL SECURITY;
ALTER TABLE rekening          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppk               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pejabat_pengadaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecatalog          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_opd_access   ENABLE ROW LEVEL SECURITY;

-- Aktifkan juga jika tabel ini ada
DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'opd_config') THEN
    EXECUTE 'ALTER TABLE opd_config ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;


-- ============================================================
--  BAGIAN 3: POLICIES — PAKET
--  Filter: hanya data milik OPD yang bisa diakses user
-- ============================================================

DROP POLICY IF EXISTS "paket_select"  ON paket;
DROP POLICY IF EXISTS "paket_insert"  ON paket;
DROP POLICY IF EXISTS "paket_update"  ON paket;
DROP POLICY IF EXISTS "paket_delete"  ON paket;

-- SELECT: user hanya bisa lihat paket OPD-nya
CREATE POLICY "paket_select" ON paket
  FOR SELECT USING (
    opd_id IS NULL OR has_opd_access(opd_id)
  );

-- INSERT: hanya operator/admin, dan hanya ke OPD yang punya akses
CREATE POLICY "paket_insert" ON paket
  FOR INSERT WITH CHECK (
    has_opd_access(opd_id)
    AND is_sideva_writer()
  );

-- UPDATE: hanya operator/admin, hanya OPD sendiri
CREATE POLICY "paket_update" ON paket
  FOR UPDATE USING (
    has_opd_access(opd_id)
    AND is_sideva_writer()
  );

-- DELETE: hanya operator/admin, hanya OPD sendiri
CREATE POLICY "paket_delete" ON paket
  FOR DELETE USING (
    has_opd_access(opd_id)
    AND is_sideva_writer()
  );


-- ============================================================
--  BAGIAN 4: POLICIES — RINCIAN
-- ============================================================

DROP POLICY IF EXISTS "rincian_select" ON rincian;
DROP POLICY IF EXISTS "rincian_insert" ON rincian;
DROP POLICY IF EXISTS "rincian_update" ON rincian;
DROP POLICY IF EXISTS "rincian_delete" ON rincian;

CREATE POLICY "rincian_select" ON rincian
  FOR SELECT USING (
    opd_id IS NULL OR has_opd_access(opd_id)
  );

CREATE POLICY "rincian_insert" ON rincian
  FOR INSERT WITH CHECK (
    has_opd_access(opd_id) AND is_sideva_writer()
  );

CREATE POLICY "rincian_update" ON rincian
  FOR UPDATE USING (
    has_opd_access(opd_id) AND is_sideva_writer()
  );

CREATE POLICY "rincian_delete" ON rincian
  FOR DELETE USING (
    has_opd_access(opd_id) AND is_sideva_writer()
  );


-- ============================================================
--  BAGIAN 5: POLICIES — HARGA (Survey Harga)
-- ============================================================

DROP POLICY IF EXISTS "harga_select" ON harga;
DROP POLICY IF EXISTS "harga_insert" ON harga;
DROP POLICY IF EXISTS "harga_update" ON harga;
DROP POLICY IF EXISTS "harga_delete" ON harga;

CREATE POLICY "harga_select" ON harga
  FOR SELECT USING (
    opd_id IS NULL OR has_opd_access(opd_id)
  );

CREATE POLICY "harga_insert" ON harga
  FOR INSERT WITH CHECK (
    has_opd_access(opd_id) AND is_sideva_writer()
  );

CREATE POLICY "harga_update" ON harga
  FOR UPDATE USING (
    has_opd_access(opd_id) AND is_sideva_writer()
  );

CREATE POLICY "harga_delete" ON harga
  FOR DELETE USING (
    has_opd_access(opd_id) AND is_sideva_writer()
  );


-- ============================================================
--  BAGIAN 6: POLICIES — DATA MASTER BERSAMA
--  (penyedia, bidang, opd, rekening, ppk, pejabat, ecatalog)
--  Semua user login bisa READ, hanya admin yang bisa WRITE
-- ============================================================

-- PENYEDIA
DROP POLICY IF EXISTS "penyedia_select" ON penyedia;
DROP POLICY IF EXISTS "penyedia_write"  ON penyedia;

CREATE POLICY "penyedia_select" ON penyedia
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "penyedia_write" ON penyedia
  FOR ALL USING (is_sideva_writer())
  WITH CHECK (is_sideva_writer());

-- BIDANG
DROP POLICY IF EXISTS "bidang_select" ON bidang;
DROP POLICY IF EXISTS "bidang_write"  ON bidang;

CREATE POLICY "bidang_select" ON bidang
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "bidang_write" ON bidang
  FOR ALL USING (is_sideva_admin())
  WITH CHECK (is_sideva_admin());

-- OPD
DROP POLICY IF EXISTS "opd_select" ON opd;
DROP POLICY IF EXISTS "opd_write"  ON opd;

CREATE POLICY "opd_select" ON opd
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "opd_write" ON opd
  FOR ALL USING (is_sideva_admin())
  WITH CHECK (is_sideva_admin());

-- REKENING
DROP POLICY IF EXISTS "rekening_select" ON rekening;
DROP POLICY IF EXISTS "rekening_write"  ON rekening;

CREATE POLICY "rekening_select" ON rekening
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "rekening_write" ON rekening
  FOR ALL USING (is_sideva_admin())
  WITH CHECK (is_sideva_admin());

-- PPK
DROP POLICY IF EXISTS "ppk_select" ON ppk;
DROP POLICY IF EXISTS "ppk_write"  ON ppk;

CREATE POLICY "ppk_select" ON ppk
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ppk_write" ON ppk
  FOR ALL USING (is_sideva_admin())
  WITH CHECK (is_sideva_admin());

-- PEJABAT PENGADAAN
DROP POLICY IF EXISTS "pejabat_select" ON pejabat_pengadaan;
DROP POLICY IF EXISTS "pejabat_write"  ON pejabat_pengadaan;

CREATE POLICY "pejabat_select" ON pejabat_pengadaan
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "pejabat_write" ON pejabat_pengadaan
  FOR ALL USING (is_sideva_admin())
  WITH CHECK (is_sideva_admin());

-- ECATALOG
DROP POLICY IF EXISTS "ecatalog_select" ON ecatalog;
DROP POLICY IF EXISTS "ecatalog_write"  ON ecatalog;

CREATE POLICY "ecatalog_select" ON ecatalog
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ecatalog_write" ON ecatalog
  FOR ALL USING (is_sideva_admin())
  WITH CHECK (is_sideva_admin());


-- ============================================================
--  BAGIAN 7: POLICIES — USER_ROLES
--  User hanya bisa lihat role sendiri, admin lihat semua
-- ============================================================

DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;

-- SELECT: lihat role sendiri, atau admin lihat semua
CREATE POLICY "user_roles_select" ON user_roles
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_sideva_admin()
  );

-- INSERT/UPDATE/DELETE: hanya admin
CREATE POLICY "user_roles_insert" ON user_roles
  FOR INSERT WITH CHECK (is_sideva_admin());

CREATE POLICY "user_roles_update" ON user_roles
  FOR UPDATE USING (is_sideva_admin());

CREATE POLICY "user_roles_delete" ON user_roles
  FOR DELETE USING (is_sideva_admin());


-- ============================================================
--  BAGIAN 8: POLICIES — USER_OPD_ACCESS
--  Hanya admin yang bisa kelola assignment OPD
-- ============================================================

DROP POLICY IF EXISTS "user_opd_access_select" ON user_opd_access;
DROP POLICY IF EXISTS "user_opd_access_write"  ON user_opd_access;

-- SELECT: user lihat akses sendiri, admin lihat semua
CREATE POLICY "user_opd_access_select" ON user_opd_access
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_sideva_admin()
  );

-- WRITE: hanya admin
CREATE POLICY "user_opd_access_write" ON user_opd_access
  FOR ALL USING (is_sideva_admin())
  WITH CHECK (is_sideva_admin());


-- ============================================================
--  BAGIAN 9: OPD_CONFIG (jika tabel ini ada)
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'opd_config') THEN

    EXECUTE 'DROP POLICY IF EXISTS "opd_config_select" ON opd_config';
    EXECUTE 'DROP POLICY IF EXISTS "opd_config_write"  ON opd_config';

    EXECUTE $pol$
      CREATE POLICY "opd_config_select" ON opd_config
        FOR SELECT USING (
          has_opd_access(opd_id)
        )
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "opd_config_write" ON opd_config
        FOR ALL USING (is_sideva_admin())
        WITH CHECK (is_sideva_admin())
    $pol$;

  END IF;
END $$;


-- ============================================================
--  BAGIAN 10: GRANT AKSES UNTUK ANON & AUTHENTICATED
--  (diperlukan agar Supabase REST API bisa diakses)
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON paket             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rincian           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON harga             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON penyedia          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bidang            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON opd               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rekening          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ppk               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pejabat_pengadaan TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ecatalog          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_roles        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_opd_access   TO authenticated;

-- Izinkan memanggil helper functions
GRANT EXECUTE ON FUNCTION is_sideva_admin()          TO authenticated;
GRANT EXECUTE ON FUNCTION is_sideva_writer()         TO authenticated;
GRANT EXECUTE ON FUNCTION has_opd_access(uuid)       TO authenticated;


-- ============================================================
--  SELESAI
--  Verifikasi: jalankan query ini untuk cek status RLS
--  SELECT tablename, rowsecurity FROM pg_tables
--  WHERE schemaname = 'public'
--  ORDER BY tablename;
-- ============================================================
