-- Fitur balasan (reply) pada komentar game.
-- Balasan hanya satu tingkat: membalas sebuah balasan akan tetap ditempelkan ke komentar utamanya.
alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

create index if not exists comments_parent_created_idx
  on public.comments (parent_id, created_at);

create or replace function public.normalize_comment_reply()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_row public.comments%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into parent_row from public.comments where id = new.parent_id;
  if not found then
    raise exception 'Komentar yang dibalas tidak ditemukan.';
  end if;

  -- Tempelkan ke komentar utama agar thread tetap satu tingkat.
  if parent_row.parent_id is not null then
    new.parent_id := parent_row.parent_id;
  end if;

  -- Balasan harus berada pada game yang sama dengan komentar utamanya.
  if parent_row.game_id <> new.game_id then
    raise exception 'Balasan harus berada pada game yang sama.';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_normalize_reply on public.comments;
create trigger comments_normalize_reply
  before insert on public.comments
  for each row execute function public.normalize_comment_reply();
