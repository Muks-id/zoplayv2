-- Menyimpan pilihan avatar profil user (SVG data URI / URL / data URL foto sendiri).
alter table public.profiles
  add column if not exists avatar_url text;

notify pgrst, 'reload schema';
