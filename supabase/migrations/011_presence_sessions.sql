-- Pengunjung online: satu sesi per cookie browser, dihitung "online" bila aktif dalam jendela waktu.
create table if not exists public.presence_sessions (
  session_id text primary key,
  last_seen timestamptz not null default now()
);

alter table public.presence_sessions enable row level security;
-- Tidak ada policy: hanya service_role (server) yang bisa baca/tulis tabel ini.

create index if not exists presence_sessions_last_seen_idx on public.presence_sessions (last_seen);

notify pgrst, 'reload schema';
