import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Satu pengunjung dihitung sekali per game dalam rentang waktu ini (mencegah refresh menggandakan hitungan). */
export const DEDUPE_SECONDS = 30 * 60;

export function dedupeCookieName(gameId: string) {
  return `zoplay_dl_${gameId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
}

/** True bila request sudah membawa cookie hitung download untuk game ini. */
export function wasCountedRecently(cookieHeader: string | null, gameId: string) {
  const cookieName = dedupeCookieName(gameId);
  return cookieHeader?.split(/;\s*/).some((item) => item.startsWith(`${cookieName}=`)) ?? false;
}

/** Menambah download_count satu kali; fallback baca-tulis bila migration RPC belum dijalankan. */
export async function incrementDownloadCount(supabase: SupabaseClient, gameId: string): Promise<boolean> {
  const { error: rpcError } = await supabase.rpc("increment_game_download", { p_game_id: gameId });
  if (!rpcError) return true;

  const { data: current, error: readError } = await supabase.from("games").select("download_count").eq("id", gameId).single();
  if (readError || !current) return false;
  const { error: updateError } = await supabase
    .from("games")
    .update({ download_count: (current.download_count ?? 0) + 1 })
    .eq("id", gameId);
  return !updateError;
}

export function downloadCookieOptions() {
  return {
    maxAge: DEDUPE_SECONDS,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
