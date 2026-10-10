-- 015_profiles_username_xp.sql
--
-- Perbaikan: tabel public.profiles dibuat di migration 001 tanpa kolom
-- `username` dan `xp`. Seluruh kode aplikasi (src/lib/server/profiles.ts)
-- menulis kedua kolom tersebut, sehingga setiap INSERT ke profiles gagal
-- dengan error PGRST204 ("Could not find the 'username' column").
--
-- Akibatnya tabel profiles tidak pernah terisi: XP user tidak tersimpan,
-- tier di halaman profil selalu jatuh ke nilai fallback "Rookie" dengan
-- progress 0%.
--
-- Migration ini menambahkan kedua kolom tersebut (idempotent) lalu
-- melakukan backfill XP dari riwayat download yang sudah tercatat.

-- 1. Tambah kolom jika belum ada.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill baris profil untuk user yang sudah punya riwayat download.
--    Satu baris per user_id, XP = jumlah download * XP_PER_DOWNLOAD (25).
INSERT INTO public.profiles (user_id, xp)
SELECT
  history.user_id,
  COUNT(*) * 25 AS xp
FROM public.download_history AS history
GROUP BY history.user_id
ON CONFLICT (user_id) DO UPDATE
  SET xp = GREATEST(public.profiles.xp, EXCLUDED.xp);

-- 3. Backfill XP untuk user yang belum punya profil sama sekali tetapi
--    tercatat di vip_subscriptions (bergabung agar tier tidak nol).
INSERT INTO public.profiles (user_id, xp)
SELECT vip.user_id, 0
FROM public.vip_subscriptions AS vip
ON CONFLICT (user_id) DO NOTHING;

-- 4. Jaga agar XP tidak pernah negatif.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_xp_non_negative;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_xp_non_negative CHECK (xp >= 0);

-- 5. Index untuk lookup berdasarkan user_id + xp (dipakai halaman profil).
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_xp
  ON public.profiles(user_id, xp);