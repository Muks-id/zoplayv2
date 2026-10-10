create table if not exists public.game_download_versions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  version_label text not null check (char_length(version_label) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (game_id, version_label)
);

alter table public.download_links
  add column if not exists version_id uuid references public.game_download_versions(id) on delete cascade;

insert into public.game_download_versions (game_id, version_label)
select distinct game_id, 'Versi saat ini'
from public.download_links
where version_id is null
on conflict (game_id, version_label) do nothing;

update public.download_links as link
set version_id = version.id
from public.game_download_versions as version
where link.version_id is null
  and version.game_id = link.game_id
  and version.version_label = 'Versi saat ini';

alter table public.download_links
  alter column version_id set not null;

alter table public.download_links
  drop constraint if exists download_links_game_id_platform_server_name_key;

alter table public.download_links
  add constraint download_links_version_platform_server_name_key
  unique (version_id, platform, server_name);

create index if not exists game_download_versions_game_id_idx
  on public.game_download_versions (game_id, created_at desc);
create index if not exists download_links_version_id_idx
  on public.download_links (version_id);

alter table public.game_download_versions enable row level security;

drop policy if exists "Public can read game download versions" on public.game_download_versions;
create policy "Public can read game download versions" on public.game_download_versions
  for select to anon, authenticated using (true);

grant select on public.game_download_versions to anon, authenticated;