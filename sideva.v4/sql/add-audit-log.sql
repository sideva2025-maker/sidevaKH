-- ============================================================
--  SI-DEVA — Audit Log Setup
--  File: sql/add-audit-log.sql
--
--  Jalankan di Supabase SQL Editor SEKALI saja.
--  Prasyarat: multi-opd-migration.sql & add-super-admin.sql
--             sudah dijalankan sebelumnya.
-- ============================================================

-- 1. Buat tabel audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          bigserial PRIMARY KEY,
  action      text        NOT NULL,
  actor_id    uuid,
  actor_email text,
  target_id   uuid,
  target_email text,
  detail      jsonb       DEFAULT '{}'::jsonb,
  opd_id      uuid        REFERENCES public.opd(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- 2. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id   ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action      ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_opd_id      ON public.audit_log(opd_id);

-- 3. Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Admin & Super Admin bisa baca semua log
DROP POLICY IF EXISTS "admin_read_audit_log" ON public.audit_log;
CREATE POLICY "admin_read_audit_log" ON public.audit_log
  FOR SELECT USING (public.is_admin(auth.uid()));

-- 5. Policy: User terautentikasi bisa insert log mereka sendiri
DROP POLICY IF EXISTS "authenticated_insert_audit_log" ON public.audit_log;
CREATE POLICY "authenticated_insert_audit_log" ON public.audit_log
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (actor_id = auth.uid() OR actor_id IS NULL)
  );

-- 6. Tidak ada yang boleh update atau delete log (immutable)
-- (Tidak perlu policy — default DENY tanpa policy)

-- ============================================================
-- Aksi yang dicatat (nilai kolom 'action'):
--   login           — user berhasil login
--   logout          — user logout
--   role_change     — perubahan role user
--   user_added      — user baru ditambahkan
--   user_removed    — akses user dicabut
--   opd_added       — OPD baru ditambahkan
--   opd_deleted     — OPD dihapus
--   opd_config      — konfigurasi OPD diubah
--   opd_access_grant  — user diberi akses OPD
--   opd_access_revoke — akses OPD dicabut dari user
-- ============================================================
