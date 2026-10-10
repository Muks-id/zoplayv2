import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Klien Supabase untuk kode server saja.
 * Dipakai di tempat yang perlu membaca `destination_url`, karena tabel `download_links`
 * sudah ditutup untuk akses publik (browse dari browser).
 * Selalu panggil hanya setelah sesi pengguna diverifikasi.
 */
export function serverSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}