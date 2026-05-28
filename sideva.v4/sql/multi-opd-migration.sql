-- ============================================================
--  SI-DEVA — Multi-OPD Database Migration v1.0
--  File: sql/multi-opd-migration.sql
--
--  Jalankan script ini di Supabase SQL Editor untuk setup
--  database multi-OPD. Lakukan SEKALI saja.
-- ============================================================

-- 1. Tambah kolom opd_id ke tabel transaksional
ALTER TABLE paket ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;
ALTER TABLE rincian ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;
ALTER TABLE harga ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;

-- 2. Buat tabel user_opd_access untuk mapping user ke OPD
CREATE TABLE IF NOT EXISTS user_opd_access (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opd_id uuid NOT NULL REFERENCES opd(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, opd_id)
);

-- 3. Buat tabel opd_config untuk menyimpan config per OPD
CREATE TABLE IF NOT EXISTS opd_config (
  id bigserial PRIMARY KEY,
  opd_id uuid NOT NULL UNIQUE REFERENCES opd(id) ON DELETE CASCADE,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Enable RLS (Row Level Security) pada tabel user_opd_access
ALTER TABLE user_opd_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = uid
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "admin_view_all_user_opd_access" ON user_opd_access;
DROP POLICY IF EXISTS "user_view_own_opd_access" ON user_opd_access;
DROP POLICY IF EXISTS "admin_manage_user_opd_access" ON user_opd_access;

-- 5. RLS Policy: Admin bisa lihat semua user_opd_access
CREATE POLICY "admin_view_all_user_opd_access" ON user_opd_access
  FOR SELECT USING (
    public.is_admin(auth.uid())
  );

-- 6. RLS Policy: User bisa lihat akses OPD mereka sendiri
CREATE POLICY "user_view_own_opd_access" ON user_opd_access
  FOR SELECT USING (user_id = auth.uid());

-- 7. RLS Policy: Admin bisa insert/update/delete user_opd_access
CREATE POLICY "admin_manage_user_opd_access" ON user_opd_access
  FOR ALL USING (
    public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
  );

-- 8. Enable RLS pada tabel opd_config
ALTER TABLE opd_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_opd_config" ON opd_config;
DROP POLICY IF EXISTS "admin_update_opd_config" ON opd_config;
DROP POLICY IF EXISTS "admin_insert_opd_config" ON opd_config;
DROP POLICY IF EXISTS "admin_manage_opd_config" ON opd_config;

-- 9. RLS Policy: Semua orang bisa baca opd_config
CREATE POLICY "anyone_read_opd_config" ON opd_config
  FOR SELECT USING (true);

-- 10. RLS Policy: Hanya admin bisa update opd_config
CREATE POLICY "admin_update_opd_config" ON opd_config
  FOR UPDATE USING (
    public.is_admin(auth.uid())
  );

-- 11. RLS Policy: Hanya admin bisa insert opd_config
CREATE POLICY "admin_insert_opd_config" ON opd_config
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid())
  );

-- 12. Buat index untuk performa query
CREATE INDEX IF NOT EXISTS idx_user_opd_access_user_id ON user_opd_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_opd_access_opd_id ON user_opd_access(opd_id);
CREATE INDEX IF NOT EXISTS idx_paket_opd_id ON paket(opd_id);
CREATE INDEX IF NOT EXISTS idx_rincian_opd_id ON rincian(opd_id);
CREATE INDEX IF NOT EXISTS idx_harga_opd_id ON harga(opd_id);

-- 13. Update RLS pada tabel paket untuk filter per OPD
ALTER TABLE paket ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_view_all_paket" ON paket;
DROP POLICY IF EXISTS "user_view_own_opd_paket" ON paket;
DROP POLICY IF EXISTS "admin_write_all_paket" ON paket;
DROP POLICY IF EXISTS "user_insert_own_opd_paket" ON paket;
DROP POLICY IF EXISTS "user_update_own_opd_paket" ON paket;
DROP POLICY IF EXISTS "user_delete_own_opd_paket" ON paket;

-- RLS Policy: Admin bisa lihat semua paket
CREATE POLICY "admin_view_all_paket" ON paket
  FOR SELECT USING (
    public.is_admin(auth.uid())
  );

-- RLS Policy: Operator/Viewer hanya lihat paket OPD mereka
CREATE POLICY "user_view_own_opd_paket" ON paket
  FOR SELECT USING (
    opd_id IN (
      SELECT opd_id FROM user_opd_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_write_all_paket" ON paket
  FOR ALL USING (
    public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
  );

CREATE POLICY "user_insert_own_opd_paket" ON paket
  FOR INSERT WITH CHECK (
    opd_id IN (
      SELECT opd_id FROM user_opd_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "user_update_own_opd_paket" ON paket
  FOR UPDATE USING (
    opd_id IN (
      SELECT opd_id FROM user_opd_access
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    opd_id IN (
      SELECT opd_id FROM user_opd_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "user_delete_own_opd_paket" ON paket
  FOR DELETE USING (
    opd_id IN (
      SELECT opd_id FROM user_opd_access
      WHERE user_id = auth.uid()
    )
  );

-- 14. Update RLS pada tabel rincian
ALTER TABLE rincian ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_view_all_rincian" ON rincian;
DROP POLICY IF EXISTS "user_view_own_opd_rincian" ON rincian;
DROP POLICY IF EXISTS "admin_write_all_rincian" ON rincian;
DROP POLICY IF EXISTS "user_insert_own_opd_rincian" ON rincian;
DROP POLICY IF EXISTS "user_update_own_opd_rincian" ON rincian;
DROP POLICY IF EXISTS "user_delete_own_opd_rincian" ON rincian;

CREATE POLICY "admin_view_all_rincian" ON rincian
  FOR SELECT USING (
    public.is_admin(auth.uid())
  );

CREATE POLICY "user_view_own_opd_rincian" ON rincian
  FOR SELECT USING (
    opd_id IN (
      SELECT opd_id FROM user_opd_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_write_all_rincian" ON rincian
  FOR ALL USING (
    public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
  );

CREATE POLICY "user_insert_own_opd_rincian" ON rincian
  FOR INSERT WITH CHECK (opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid()));

CREATE POLICY "user_update_own_opd_rincian" ON rincian
  FOR UPDATE USING (opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid()))
  WITH CHECK (opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid()));

CREATE POLICY "user_delete_own_opd_rincian" ON rincian
  FOR DELETE USING (opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid()));

-- 15. Update RLS pada tabel harga
ALTER TABLE harga ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_view_all_harga" ON harga;
DROP POLICY IF EXISTS "user_view_own_opd_harga" ON harga;
DROP POLICY IF EXISTS "admin_write_all_harga" ON harga;
DROP POLICY IF EXISTS "user_insert_own_opd_harga" ON harga;
DROP POLICY IF EXISTS "user_update_own_opd_harga" ON harga;
DROP POLICY IF EXISTS "user_delete_own_opd_harga" ON harga;

CREATE POLICY "admin_view_all_harga" ON harga
  FOR SELECT USING (
    public.is_admin(auth.uid())
  );

CREATE POLICY "user_view_own_opd_harga" ON harga
  FOR SELECT USING (
    opd_id IN (
      SELECT opd_id FROM user_opd_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "admin_write_all_harga" ON harga
  FOR ALL USING (
    public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
  );

CREATE POLICY "user_insert_own_opd_harga" ON harga
  FOR INSERT WITH CHECK (opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid()));

CREATE POLICY "user_update_own_opd_harga" ON harga
  FOR UPDATE USING (opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid()))
  WITH CHECK (opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid()));

CREATE POLICY "user_delete_own_opd_harga" ON harga
  FOR DELETE USING (opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid()));

-- 16. Grant admin user akses ke semua OPD (opsional, jalankan sesuai kebutuhan)
-- INSERT INTO user_opd_access (user_id, opd_id)
-- SELECT DISTINCT ur.user_id, o.id
-- FROM user_roles ur, opd o
-- WHERE ur.role = 'admin'
-- ON CONFLICT DO NOTHING;

-- ============================================================
-- 17. Tambah kolom email & display_name ke user_roles
--     (dibutuhkan sbGetAllUsersWithEmail sebagai fallback)
-- ============================================================
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS email        text;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS display_name text;

-- 18. Buat view app_users sebagai cara utama ambil daftar user + email
--     Menggabungkan auth.users (email) + user_roles (role, display_name)
--     Hanya bisa dibuat jika menggunakan Supabase dengan akses ke auth schema.
CREATE OR REPLACE VIEW public.app_users AS
  SELECT
    au.id          AS user_id,
    au.email       AS email,
    ur.role        AS role,
    ur.display_name AS display_name,
    ur.created_at  AS created_at
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id;

-- Grant akses view ke authenticated role
GRANT SELECT ON public.app_users TO authenticated;

-- RLS tidak berlaku pada VIEW; akses dikontrol oleh policy tabel asalnya.
-- Admin sudah bisa baca user_roles, sehingga view ini aman untuk admin.

-- ============================================================
-- Selesai! Database siap untuk multi-OPD
-- ============================================================
