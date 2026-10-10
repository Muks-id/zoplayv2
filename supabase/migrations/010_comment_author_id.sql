-- Komentar dikaitkan ke akun agar lencana VIP bisa ditampilkan.
-- Kolom ini hanya diisi untuk komentar mode "Akun Google"; komentar Anonim tetap null.
alter table public.comments
  add column if not exists user_id text;

create index if not exists comments_user_id_idx
  on public.comments (user_id);

notify pgrst, 'reload schema';