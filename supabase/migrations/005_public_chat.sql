-- Tabel chat publik untuk user yang sudah login
create table if not exists public.public_chat (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  username text not null,
  message text not null check (char_length(message) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists public_chat_created_at_idx
  on public.public_chat (created_at desc);

alter table public.public_chat enable row level security;

-- Semua orang bisa membaca isi chat
drop policy if exists "Anyone can read public chat" on public.public_chat;
create policy "Anyone can read public chat" on public.public_chat
  for select to anon, authenticated using (true);

-- Hanya user yang login bisa mengirim pesan
drop policy if exists "Authenticated can post public chat" on public.public_chat;
create policy "Authenticated can post public chat" on public.public_chat
  for insert to authenticated with check (true);

-- Tidak ada user yang bisa mengedit/menghapus pesan orang lain
revoke all on public.public_chat from anon, authenticated;
grant select on public.public_chat to anon, authenticated;
grant insert on public.public_chat to authenticated;
