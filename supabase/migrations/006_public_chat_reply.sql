-- Fitur reply pada chat publik
alter table public.public_chat
  add column if not exists reply_to_id uuid references public.public_chat(id) on delete set null;

create index if not exists public_chat_reply_to_id_idx
  on public.public_chat (reply_to_id);
