-- Penghitung download: dipanggil server saat pengunjung membuka halaman safelink.
-- Penambahan dilakukan langsung di database (atomic) agar aman saat banyak pengunjung bersamaan.
create or replace function public.increment_game_download(p_game_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.games
  set download_count = download_count + 1
  where id = p_game_id
  returning download_count;
$$;

-- Hanya server (service role) yang boleh memanggil, bukan pengunjung langsung dari browser.
revoke all on function public.increment_game_download(uuid) from public, anon, authenticated;
grant execute on function public.increment_game_download(uuid) to service_role;

notify pgrst, 'reload schema';
