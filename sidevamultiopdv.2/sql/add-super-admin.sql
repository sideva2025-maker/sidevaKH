-- ============================================================
--  SI-DEVA — Tambah Role Super Admin
--  File: sql/add-super-admin.sql
--
--  Jalankan di Supabase SQL Editor SEKALI saja.
--  Prasyarat: multi-opd-migration.sql sudah dijalankan sebelumnya.
-- ============================================================

-- 1. Update fungsi is_admin() agar Super Admin juga dianggap admin
--    (backward compatible — semua RLS policy yang pakai is_admin() otomatis ikut)
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
      AND role IN ('admin', 'super_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;

-- 2. Tambah fungsi is_super_admin() — eksklusif untuk Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = uid
      AND role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO anon, authenticated;

-- 3. Batasi: hanya super_admin yang bisa mengubah role ke 'admin' atau 'super_admin'
--    via RLS pada tabel user_roles
DROP POLICY IF EXISTS "only_super_admin_set_admin_role" ON user_roles;

CREATE POLICY "only_super_admin_set_admin_role" ON user_roles
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (
    CASE
      WHEN role IN ('admin', 'super_admin')
        THEN public.is_super_admin(auth.uid())
      ELSE public.is_admin(auth.uid())
    END
  );

-- 4. Tambahkan konstrain valid role di tabel user_roles
--    (opsional tapi disarankan untuk mencegah nilai role yang tidak valid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_roles_role_check'
      AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT user_roles_role_check
      CHECK (role IN ('super_admin', 'admin', 'operator', 'viewer'));
  ELSE
    -- Update constraint yang sudah ada
    ALTER TABLE user_roles DROP CONSTRAINT user_roles_role_check;
    ALTER TABLE user_roles
      ADD CONSTRAINT user_roles_role_check
      CHECK (role IN ('super_admin', 'admin', 'operator', 'viewer'));
  END IF;
END $$;

-- 5. Cara set role Super Admin pertama kali:
--    Ganti 'email@domain.com' dengan email user yang ingin dijadikan Super Admin
-- UPDATE user_roles SET role = 'super_admin' WHERE email = 'email@domain.com';

-- ============================================================
-- Selesai! Role super_admin sudah aktif.
--
-- Perubahan setelah script ini:
--   - super_admin  → punya semua hak admin + bisa assign role admin
--                    bisa tambah / hapus OPD
--   - admin        → akses semua data, kelola user (viewer/operator saja)
--                    tidak bisa tambah OPD baru
--   - operator     → input & edit data di OPD yang diassign
--   - viewer       → hanya baca data di OPD yang diassign
-- ============================================================
