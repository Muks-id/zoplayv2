import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getVipStatus } from "@/lib/server/vip";
import { decryptSafelinkToken } from "@/lib/server/safelink-token";
import { serverSupabase } from "@/lib/server/supabase-admin";
import { dedupeCookieName, downloadCookieOptions, incrementDownloadCount, wasCountedRecently } from "@/lib/server/download-count";

/**
 * Pintu redirect ke URL download asli (dahulu /api/download/redirect).
 * URL tujuan tidak pernah dikirim ke browser — hanya redirect 302 dari server.
 *
 * - Member VIP: langsung dialihkan ke link asli.
 * - User biasa: harus sudah pernah membuka halaman safelink (cookie dari
 *   /api/safelink/hit), jika tidak akan dikembalikan ke /safelink dulu.
 */
export async function handleDownloadRedirect(request: Request, token: string) {
  const url = new URL(request.url);
  const payload = token ? decryptSafelinkToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Link tidak valid." }, { status: 400 });

  const supabase = serverSupabase();
  if (!supabase) return NextResponse.json({ error: "Konfigurasi server Supabase belum lengkap." }, { status: 503 });

  const { data: game, error } = await supabase
    .from("games")
    .select("id, game_download_versions(id, download_links(platform, server_name, destination_url))")
    .eq("slug", payload.slug)
    .maybeSingle();
  if (error || !game) return NextResponse.json({ error: "Game tidak ditemukan." }, { status: 404 });

  const row = game as unknown as {
    id: string;
    game_download_versions: { id: string; download_links: { platform: string; server_name: string; destination_url: string }[] | null }[] | null;
  };
  const version = row.game_download_versions?.find((item) => item.id === payload.versionId);
  const destinationUrl = version?.download_links?.find(
    (link) => link.platform === payload.platform && link.server_name === payload.serverName,
  )?.destination_url;
  if (!destinationUrl) return NextResponse.json({ error: "Link download tidak ditemukan." }, { status: 404 });

  try {
    const parsed = new URL(destinationUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "URL tujuan tidak valid." }, { status: 400 });
  }

  const { userId } = await auth();
  const vip = await getVipStatus(userId);
  const cookieName = dedupeCookieName(row.id);
  const cookieHeader = request.headers.get("cookie");

  if (!vip.isVip && !wasCountedRecently(cookieHeader, row.id)) {
    // Belum melewati halaman safelink: arahkan ke sana dulu (dihitung di sana).
    return NextResponse.redirect(new URL(`/safelink?id=${encodeURIComponent(token)}`, url.origin));
  }

  // VIP biasanya belum punya cookie hitung: hitung di sini. Non-VIP sudah dihitung di safelink.
  const response = NextResponse.redirect(destinationUrl);
  if (!wasCountedRecently(cookieHeader, row.id)) {
    const counted = await incrementDownloadCount(supabase, row.id);
    if (counted) response.cookies.set(cookieName, "1", downloadCookieOptions());
  }
  return response;
}