-- ============================================================
-- SI-DEVA — Full Database Setup for Supabase
-- ============================================================

-- 1. Tabel Dasar (Base Tables)
CREATE TABLE IF NOT EXISTS opd (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_opd text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paket (
  id bigserial PRIMARY KEY,
  no_paket text,
  opd text,
  rup text,
  nama_paket text,
  program text,
  kegiatan text,
  sub_kegiatan text,
  masa_kerja text,
  durasi text,
  tanggal_pesanan date,
  tanggal_selesai date,
  pagu_anggaran numeric,
  kode_rekening text,
  bidang text,
  kepala_bidang text,
  nip text,
  tanggal_dpp date,
  output text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rincian (
  id bigserial PRIMARY KEY,
  no text,
  rup text,
  user_input text,
  item_barang text,
  vol numeric,
  satuan text,
  harga_satuan numeric,
  jumlah numeric,
  tanggal_input timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS harga (
  id bigserial PRIMARY KEY,
  rup text,
  hps numeric,
  nama_paket text,
  nama_item text,
  nama_produk text,
  nama_penyedia text,
  link_katalog text,
  qty numeric,
  satuan text,
  harga_tayang numeric,
  status_pajak text,
  dpp numeric,
  ppn numeric,
  ongkir numeric,
  total_harga numeric,
  pdn text,
  umkm text,
  lokasi text,
  status_katalog text,
  nego_final numeric
);

CREATE TABLE IF NOT EXISTS penyedia (
  id bigserial PRIMARY KEY,
  no text,
  nama_penyedia text,
  alamat text,
  bentuk_usaha text,
  status text,
  tipe text,
  link_toko text
);

CREATE TABLE IF NOT EXISTS bidang (
  id bigserial PRIMARY KEY,
  nama_bidang text,
  kode_surat text,
  kepala_bidang text,
  nip text
);

CREATE TABLE IF NOT EXISTS rekening (
  id bigserial PRIMARY KEY,
  kode_rekening text,
  link_ecatalog text
);

CREATE TABLE IF NOT EXISTS ppk (
  id bigserial PRIMARY KEY,
  nama_ppk text,
  nip text,
  jabatan text,
  scan_ttd text,
  lebar_ttd numeric,
  tinggi_ttd numeric,
  cap_stempel text,
  lebar_cap numeric,
  tinggi_cap numeric
);

CREATE TABLE IF NOT EXISTS pejabat_pengadaan (
  id bigserial PRIMARY KEY,
  nama_pejabat text,
  nip text,
  jabatan text
);

CREATE TABLE IF NOT EXISTS ecatalog (
  id bigserial PRIMARY KEY,
  jenis_belanja text,
  link_ecatalog text
);

CREATE TABLE IF NOT EXISTS user_roles (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  email text,
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_config (
  id text PRIMARY KEY,
  data jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- 2. Setup Multi-OPD (dari multi-opd-migration.sql)
ALTER TABLE paket ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;
ALTER TABLE rincian ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;
ALTER TABLE harga ADD COLUMN IF NOT EXISTS opd_id uuid REFERENCES opd(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS user_opd_access (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opd_id uuid NOT NULL REFERENCES opd(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, opd_id)
);

CREATE TABLE IF NOT EXISTS opd_config (
  id bigserial PRIMARY KEY,
  opd_id uuid NOT NULL UNIQUE REFERENCES opd(id) ON DELETE CASCADE,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE user_opd_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE opd_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE paket ENABLE ROW LEVEL SECURITY;
ALTER TABLE rincian ENABLE ROW LEVEL SECURITY;
ALTER TABLE harga ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Policies
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

DROP POLICY IF EXISTS "anyone_read_user_roles" ON user_roles;
DROP POLICY IF EXISTS "admin_manage_user_roles" ON user_roles;
DROP POLICY IF EXISTS "admin_view_all_user_opd_access" ON user_opd_access;
DROP POLICY IF EXISTS "user_view_own_opd_access" ON user_opd_access;
DROP POLICY IF EXISTS "admin_manage_user_opd_access" ON user_opd_access;
DROP POLICY IF EXISTS "anyone_read_opd_config" ON opd_config;
DROP POLICY IF EXISTS "admin_manage_opd_config" ON opd_config;
DROP POLICY IF EXISTS "admin_view_all_paket" ON paket;
DROP POLICY IF EXISTS "user_view_own_opd_paket" ON paket;
DROP POLICY IF EXISTS "admin_write_all_paket" ON paket;
DROP POLICY IF EXISTS "user_insert_own_opd_paket" ON paket;
DROP POLICY IF EXISTS "user_update_own_opd_paket" ON paket;
DROP POLICY IF EXISTS "user_delete_own_opd_paket" ON paket;
DROP POLICY IF EXISTS "admin_view_all_rincian" ON rincian;
DROP POLICY IF EXISTS "user_view_own_opd_rincian" ON rincian;
DROP POLICY IF EXISTS "admin_write_all_rincian" ON rincian;
DROP POLICY IF EXISTS "user_insert_own_opd_rincian" ON rincian;
DROP POLICY IF EXISTS "user_update_own_opd_rincian" ON rincian;
DROP POLICY IF EXISTS "user_delete_own_opd_rincian" ON rincian;
DROP POLICY IF EXISTS "admin_view_all_harga" ON harga;
DROP POLICY IF EXISTS "user_view_own_opd_harga" ON harga;
DROP POLICY IF EXISTS "admin_write_all_harga" ON harga;
DROP POLICY IF EXISTS "user_insert_own_opd_harga" ON harga;
DROP POLICY IF EXISTS "user_update_own_opd_harga" ON harga;
DROP POLICY IF EXISTS "user_delete_own_opd_harga" ON harga;

-- user_roles
CREATE POLICY "anyone_read_user_roles" ON user_roles FOR SELECT USING (true);
CREATE POLICY "admin_manage_user_roles" ON user_roles FOR ALL USING (
  public.is_admin(auth.uid())
) WITH CHECK (
  public.is_admin(auth.uid())
);

-- user_opd_access
CREATE POLICY "admin_view_all_user_opd_access" ON user_opd_access FOR SELECT USING (
  public.is_admin(auth.uid())
);
CREATE POLICY "user_view_own_opd_access" ON user_opd_access FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_manage_user_opd_access" ON user_opd_access FOR ALL USING (
  public.is_admin(auth.uid())
) WITH CHECK (
  public.is_admin(auth.uid())
);

-- opd_config
CREATE POLICY "anyone_read_opd_config" ON opd_config FOR SELECT USING (true);
CREATE POLICY "admin_manage_opd_config" ON opd_config FOR ALL USING (
  public.is_admin(auth.uid())
) WITH CHECK (
  public.is_admin(auth.uid())
);

-- paket
CREATE POLICY "admin_view_all_paket" ON paket FOR SELECT USING (
  public.is_admin(auth.uid())
);
CREATE POLICY "user_view_own_opd_paket" ON paket FOR SELECT USING (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);
CREATE POLICY "admin_write_all_paket" ON paket FOR ALL USING (
  public.is_admin(auth.uid())
) WITH CHECK (
  public.is_admin(auth.uid())
);
CREATE POLICY "user_insert_own_opd_paket" ON paket FOR INSERT WITH CHECK (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);
CREATE POLICY "user_update_own_opd_paket" ON paket FOR UPDATE USING (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
) WITH CHECK (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);
CREATE POLICY "user_delete_own_opd_paket" ON paket FOR DELETE USING (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);

-- rincian
CREATE POLICY "admin_view_all_rincian" ON rincian FOR SELECT USING (
  public.is_admin(auth.uid())
);
CREATE POLICY "user_view_own_opd_rincian" ON rincian FOR SELECT USING (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);
CREATE POLICY "admin_write_all_rincian" ON rincian FOR ALL USING (
  public.is_admin(auth.uid())
) WITH CHECK (
  public.is_admin(auth.uid())
);
CREATE POLICY "user_insert_own_opd_rincian" ON rincian FOR INSERT WITH CHECK (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);
CREATE POLICY "user_update_own_opd_rincian" ON rincian FOR UPDATE USING (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
) WITH CHECK (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);
CREATE POLICY "user_delete_own_opd_rincian" ON rincian FOR DELETE USING (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);

-- harga
CREATE POLICY "admin_view_all_harga" ON harga FOR SELECT USING (
  public.is_admin(auth.uid())
);
CREATE POLICY "user_view_own_opd_harga" ON harga FOR SELECT USING (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);
CREATE POLICY "admin_write_all_harga" ON harga FOR ALL USING (
  public.is_admin(auth.uid())
) WITH CHECK (
  public.is_admin(auth.uid())
);
CREATE POLICY "user_insert_own_opd_harga" ON harga FOR INSERT WITH CHECK (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);
CREATE POLICY "user_update_own_opd_harga" ON harga FOR UPDATE USING (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
) WITH CHECK (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);
CREATE POLICY "user_delete_own_opd_harga" ON harga FOR DELETE USING (
  opd_id IN (SELECT opd_id FROM user_opd_access WHERE user_id = auth.uid())
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_user_opd_access_user_id ON user_opd_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_opd_access_opd_id ON user_opd_access(opd_id);
CREATE INDEX IF NOT EXISTS idx_paket_opd_id ON paket(opd_id);
CREATE INDEX IF NOT EXISTS idx_rincian_opd_id ON rincian(opd_id);
CREATE INDEX IF NOT EXISTS idx_harga_opd_id ON harga(opd_id);
