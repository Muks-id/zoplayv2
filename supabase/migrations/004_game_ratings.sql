create table if not exists public.game_ratings (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id text not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create index if not exists game_ratings_game_id_idx
  on public.game_ratings (game_id);

alter table public.game_ratings enable row level security;

drop policy if exists "Public can read game ratings" on public.game_ratings;
create policy "Public can read game ratings" on public.game_ratings
  for select to anon, authenticated using (true);

revoke all on public.game_ratings from anon, authenticated;
-- PostgREST needs access to game_id to resolve games -> game_ratings embeds.
grant select (game_id, rating) on public.game_ratings to anon, authenticated;
