-- Profil pemain: XP untuk sistem tier title + riwayat download per user.
create table if not exists public.profiles (
  user_id text primary key,
  username text,
  xp integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create table if not exists public.download_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  game_slug text not null,
  platform text,
  server_name text,
  created_at timestamptz not null default now()
);

create index if not exists download_history_user_idx on public.download_history (user_id, created_at desc);

alter table public.download_history enable row level security;
-- Hanya service_role (server) yang boleh baca/tulis tabel ini.

notify pgrst, 'reload schema';
