-- ============================================================
-- SI-DEVA — RLS Recursion Fix
-- Jalankan di Supabase SQL Editor jika REST user_roles error:
-- "infinite recursion detected in policy for relation user_roles"
-- ============================================================

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

DROP POLICY IF EXISTS "anyone_read_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_manage_user_roles" ON public.user_roles;

CREATE POLICY "anyone_read_user_roles"
ON public.user_roles
FOR SELECT
USING (true);

CREATE POLICY "admin_manage_user_roles"
ON public.user_roles
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_view_all_user_opd_access" ON public.user_opd_access;
DROP POLICY IF EXISTS "admin_manage_user_opd_access" ON public.user_opd_access;
DROP POLICY IF EXISTS "admin_manage_opd_config" ON public.opd_config;

CREATE POLICY "admin_view_all_user_opd_access"
ON public.user_opd_access
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_manage_user_opd_access"
ON public.user_opd_access
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin_manage_opd_config"
ON public.opd_config
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_view_all_paket" ON public.paket;
DROP POLICY IF EXISTS "admin_write_all_paket" ON public.paket;
DROP POLICY IF EXISTS "admin_view_all_rincian" ON public.rincian;
DROP POLICY IF EXISTS "admin_write_all_rincian" ON public.rincian;
DROP POLICY IF EXISTS "admin_view_all_harga" ON public.harga;
DROP POLICY IF EXISTS "admin_write_all_harga" ON public.harga;

CREATE POLICY "admin_view_all_paket"
ON public.paket
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_write_all_paket"
ON public.paket
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin_view_all_rincian"
ON public.rincian
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_write_all_rincian"
ON public.rincian
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin_view_all_harga"
ON public.harga
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_write_all_harga"
ON public.harga
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Cek admin user setelah fix:
-- SELECT user_id, email, display_name, role FROM public.user_roles WHERE role = 'admin';
