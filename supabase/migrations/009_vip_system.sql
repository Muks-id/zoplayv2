-- ===== Sistem langganan VIP (aktivasi manual oleh admin) =====
--
-- Tiga tabel:
--   vip_subscriptions : status VIP per user (satu baris per user, masa berlaku)
--   vip_requests      : pengajuan langganan yang menunggu ditinjau admin
--   vip_messages      : percakapan pribadi user dengan admin (termasuk bukti transfer)

create table if not exists public.vip_subscriptions (
  user_id text primary key,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  granted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vip_subscriptions_expires_idx on public.vip_subscriptions (expires_at desc);

create table if not exists public.vip_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  username text not null,
  duration_days integer not null check (duration_days in (7, 14, 30)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text,
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now()
);

create index if not exists vip_requests_status_created_idx on public.vip_requests (status, created_at desc);
create index if not exists vip_requests_user_idx on public.vip_requests (user_id, created_at desc);

create table if not exists public.vip_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  sender text not null check (sender in ('user', 'admin')),
  message text not null check (char_length(message) between 1 and 2000),
  attachment_url text,
  read_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists vip_messages_user_created_idx on public.vip_messages (user_id, created_at desc);
create index if not exists vip_messages_unread_admin_idx on public.vip_messages (read_by_admin) where read_by_admin = false;

alter table public.vip_subscriptions enable row level security;
alter table public.vip_requests enable row level security;
alter table public.vip_messages enable row level security;

-- Tidak ada policy untuk anon/authenticated: semua akses lewat server, setelah
-- sesi Clerk diperiksa. revoke menutup akses lewat API publik Supabase.
revoke all on public.vip_subscriptions from anon, authenticated;
revoke all on public.vip_requests from anon, authenticated;
revoke all on public.vip_messages from anon, authenticated;

-- Fungsi bantu: admin menambah/memperpanjang VIP. Perpanjangan ditambahkan dari
-- tanggal berakhir yang masih aktif, jadi masa langganan tidak terpotong.
create or replace function public.grant_vip(p_user_id text, p_duration_days integer, p_granted_by text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  result timestamptz;
begin
  insert into public.vip_subscriptions (user_id, started_at, expires_at, granted_by, updated_at)
  values (
    p_user_id,
    case
      when exists (
        select 1 from public.vip_subscriptions where user_id = p_user_id and expires_at > now()
      ) then (select started_at from public.vip_subscriptions where user_id = p_user_id)
      else now()
    end,
    case
      when exists (
        select 1 from public.vip_subscriptions where user_id = p_user_id and expires_at > now()
      ) then (select expires_at from public.vip_subscriptions where user_id = p_user_id)
           + make_interval(days => p_duration_days)
      else now() + make_interval(days => p_duration_days)
    end,
    p_granted_by,
    now()
  )
  on conflict (user_id) do update
    set expires_at = case
          when public.vip_subscriptions.expires_at > now()
            then public.vip_subscriptions.expires_at + make_interval(days => p_duration_days)
          else now() + make_interval(days => p_duration_days)
        end,
        granted_by = excluded.granted_by,
        updated_at = now()
  returning expires_at into result;
  return result;
end;
$$;

revoke all on function public.grant_vip(text, integer, text) from public, anon, authenticated;
grant execute on function public.grant_vip(text, integer, text) to service_role;

-- Menutup celah: link asli tidak boleh dibaca langsung dari browser. Karena VIP
-- berbayar, destination_url hanya boleh diambil lewat server (safelink atau VIP).
drop policy if exists "Public can read download links" on public.download_links;
revoke select on public.download_links from anon, authenticated;

-- Bucket bukti transfer: tidak publik, hanya dilayani lewat server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vip-proofs',
  'vip-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';