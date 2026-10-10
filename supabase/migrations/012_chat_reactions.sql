-- Reaction emoji pada pesan chat publik: satu reaction per user per emoji per pesan.
create table if not exists public.chat_reactions (
  message_id uuid not null references public.public_chat (id) on delete cascade,
  user_id text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists chat_reactions_message_id_idx on public.chat_reactions (message_id);

alter table public.chat_reactions enable row level security;
-- Hanya server (service role) yang boleh baca/tulis; client melewati endpoint API.

notify pgrst, 'reload schema';
