-- ============================================================
--  SI-DEVA — Isolasi Data Master per OPD
--  Jalankan di Supabase SQL Editor setelah multi-opd-migration.sql.
-- ============================================================

-- 1. Tambah kolom opd_id ke tabel master.
ALTER TABLE penyedia ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;
ALTER TABLE bidang ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;
ALTER TABLE rekening ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;
ALTER TABLE ppk ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;
ALTER TABLE pejabat_pengadaan ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;
ALTER TABLE ecatalog ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_penyedia_opd_id ON penyedia(opd_id);
CREATE INDEX IF NOT EXISTS idx_bidang_opd_id ON bidang(opd_id);
CREATE INDEX IF NOT EXISTS idx_rekening_opd_id ON rekening(opd_id);
CREATE INDEX IF NOT EXISTS idx_ppk_opd_id ON ppk(opd_id);
CREATE INDEX IF NOT EXISTS idx_pejabat_pengadaan_opd_id ON pejabat_pengadaan(opd_id);
CREATE INDEX IF NOT EXISTS idx_ecatalog_opd_id ON ecatalog(opd_id);

-- 2. Data master lama yang belum punya opd_id dianggap milik BAPPERIDA.
--    Jika nama OPD berbeda di database, ubah bagian ILIKE sesuai nama OPD.
WITH bapperida AS (
  SELECT id
  FROM opd
  WHERE nama_opd ILIKE '%Badan Perencanaan Pembangunan Riset dan Inovasi Daerah%'
     OR nama_opd ILIKE '%BAPPERIDA%'
  ORDER BY id
  LIMIT 1
)
UPDATE penyedia SET opd_id = (SELECT id FROM bapperida)
WHERE opd_id IS NULL AND EXISTS (SELECT 1 FROM bapperida);

WITH bapperida AS (
  SELECT id
  FROM opd
  WHERE nama_opd ILIKE '%Badan Perencanaan Pembangunan Riset dan Inovasi Daerah%'
     OR nama_opd ILIKE '%BAPPERIDA%'
  ORDER BY id
  LIMIT 1
)
UPDATE bidang SET opd_id = (SELECT id FROM bapperida)
WHERE opd_id IS NULL AND EXISTS (SELECT 1 FROM bapperida);

WITH bapperida AS (
  SELECT id
  FROM opd
  WHERE nama_opd ILIKE '%Badan Perencanaan Pembangunan Riset dan Inovasi Daerah%'
     OR nama_opd ILIKE '%BAPPERIDA%'
  ORDER BY id
  LIMIT 1
)
UPDATE rekening SET opd_id = (SELECT id FROM bapperida)
WHERE opd_id IS NULL AND EXISTS (SELECT 1 FROM bapperida);

WITH bapperida AS (
  SELECT id
  FROM opd
  WHERE nama_opd ILIKE '%Badan Perencanaan Pembangunan Riset dan Inovasi Daerah%'
     OR nama_opd ILIKE '%BAPPERIDA%'
  ORDER BY id
  LIMIT 1
)
UPDATE ppk SET opd_id = (SELECT id FROM bapperida)
WHERE opd_id IS NULL AND EXISTS (SELECT 1 FROM bapperida);

WITH bapperida AS (
  SELECT id
  FROM opd
  WHERE nama_opd ILIKE '%Badan Perencanaan Pembangunan Riset dan Inovasi Daerah%'
     OR nama_opd ILIKE '%BAPPERIDA%'
  ORDER BY id
  LIMIT 1
)
UPDATE pejabat_pengadaan SET opd_id = (SELECT id FROM bapperida)
WHERE opd_id IS NULL AND EXISTS (SELECT 1 FROM bapperida);

WITH bapperida AS (
  SELECT id
  FROM opd
  WHERE nama_opd ILIKE '%Badan Perencanaan Pembangunan Riset dan Inovasi Daerah%'
     OR nama_opd ILIKE '%BAPPERIDA%'
  ORDER BY id
  LIMIT 1
)
UPDATE ecatalog SET opd_id = (SELECT id FROM bapperida)
WHERE opd_id IS NULL AND EXISTS (SELECT 1 FROM bapperida);

-- 3. Helper role: super_admin saja yang akses semua OPD.
CREATE OR REPLACE FUNCTION is_sideva_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_sideva_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION is_sideva_writer()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'operator', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION has_opd_access(p_opd_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    is_sideva_super_admin()
    OR EXISTS (
      SELECT 1
      FROM user_opd_access
      WHERE user_id = auth.uid()
        AND opd_id = p_opd_id
    );
$$;

GRANT EXECUTE ON FUNCTION is_sideva_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_sideva_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_sideva_writer() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION has_opd_access(uuid) TO anon, authenticated;

-- 4. Policy master per OPD.
DROP POLICY IF EXISTS "penyedia_select" ON penyedia;
DROP POLICY IF EXISTS "penyedia_write" ON penyedia;
CREATE POLICY "penyedia_select" ON penyedia
  FOR SELECT USING (has_opd_access(opd_id));
CREATE POLICY "penyedia_write" ON penyedia
  FOR ALL USING (has_opd_access(opd_id) AND is_sideva_writer())
  WITH CHECK (has_opd_access(opd_id) AND is_sideva_writer());

DROP POLICY IF EXISTS "bidang_select" ON bidang;
DROP POLICY IF EXISTS "bidang_write" ON bidang;
CREATE POLICY "bidang_select" ON bidang
  FOR SELECT USING (has_opd_access(opd_id));
CREATE POLICY "bidang_write" ON bidang
  FOR ALL USING (has_opd_access(opd_id) AND is_sideva_writer())
  WITH CHECK (has_opd_access(opd_id) AND is_sideva_writer());

DROP POLICY IF EXISTS "rekening_select" ON rekening;
DROP POLICY IF EXISTS "rekening_write" ON rekening;
CREATE POLICY "rekening_select" ON rekening
  FOR SELECT USING (has_opd_access(opd_id));
CREATE POLICY "rekening_write" ON rekening
  FOR ALL USING (has_opd_access(opd_id) AND is_sideva_writer())
  WITH CHECK (has_opd_access(opd_id) AND is_sideva_writer());

DROP POLICY IF EXISTS "ppk_select" ON ppk;
DROP POLICY IF EXISTS "ppk_write" ON ppk;
CREATE POLICY "ppk_select" ON ppk
  FOR SELECT USING (has_opd_access(opd_id));
CREATE POLICY "ppk_write" ON ppk
  FOR ALL USING (has_opd_access(opd_id) AND is_sideva_writer())
  WITH CHECK (has_opd_access(opd_id) AND is_sideva_writer());

DROP POLICY IF EXISTS "pejabat_select" ON pejabat_pengadaan;
DROP POLICY IF EXISTS "pejabat_write" ON pejabat_pengadaan;
CREATE POLICY "pejabat_select" ON pejabat_pengadaan
  FOR SELECT USING (has_opd_access(opd_id));
CREATE POLICY "pejabat_write" ON pejabat_pengadaan
  FOR ALL USING (has_opd_access(opd_id) AND is_sideva_writer())
  WITH CHECK (has_opd_access(opd_id) AND is_sideva_writer());

DROP POLICY IF EXISTS "ecatalog_select" ON ecatalog;
DROP POLICY IF EXISTS "ecatalog_write" ON ecatalog;
CREATE POLICY "ecatalog_select" ON ecatalog
  FOR SELECT USING (has_opd_access(opd_id));
CREATE POLICY "ecatalog_write" ON ecatalog
  FOR ALL USING (has_opd_access(opd_id) AND is_sideva_writer())
  WITH CHECK (has_opd_access(opd_id) AND is_sideva_writer());
