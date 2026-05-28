-- ============================================================
-- FIX: RLS Policy untuk tabel app_config
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Aktifkan RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Semua user yang login boleh baca config
CREATE POLICY "app_config_select" ON app_config
  FOR SELECT TO authenticated USING (true);

-- Semua user yang login boleh insert/update config
CREATE POLICY "app_config_insert" ON app_config
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "app_config_update" ON app_config
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
