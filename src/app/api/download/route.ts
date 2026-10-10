import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { decryptSafelinkToken } from "@/lib/server/safelink-token";
import { dedupeCookieName, downloadCookieOptions, incrementDownloadCount, wasCountedRecently } from "@/lib/server/download-count";
import { recordDownloadXp } from "@/lib/server/profiles";
import { getVipStatus } from "@/lib/server/vip";

export const runtime = "nodejs";

/**
 * Satu-satunya pintu download.
 * - Member VIP: langsung diarahkan ke link asli (tanpa popup dan tanpa safelink).
 * - User biasa / belum login: diarahkan ke halaman safelink seperti sebelumnya.
 *
 * Status VIP selalu dicek di server memakai sesi Clerk, jadi tidak bisa diakali
 * dengan mengubah kode di browser.
 */
export async function POST(request: Request) {
  let token = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "id" in body && typeof body.id === "string") token = body.id;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const payload = token ? decryptSafelinkToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Link download tidak valid." }, { status: 400 });

  const { userId } = await auth();
  const vip = await getVipStatus(userId);

  if (!vip.isVip) {
    return NextResponse.json({ url: `/safelink?id=${encodeURIComponent(token)}` });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Konfigurasi server Supabase belum lengkap." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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

  // Member VIP juga dihitung download-nya (sekali per 30 menit per game),
  // supaya download_count tetap akurat walau tidak melewati halaman safelink.
  const response = NextResponse.json({ url: destinationUrl, direct: true });
  if (!wasCountedRecently(request.headers.get("cookie"), row.id)) {
    const counted = await incrementDownloadCount(supabase, row.id);
    if (counted) {
      response.cookies.set(dedupeCookieName(row.id), "1", downloadCookieOptions());
      if (userId) {
        const user = await currentUser();
        const name = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Player";
        void recordDownloadXp(userId, name, payload.slug, payload.platform, payload.serverName);
      }
    }
  }
  return response;
}