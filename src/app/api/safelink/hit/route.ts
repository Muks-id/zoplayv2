import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { decryptSafelinkToken } from "@/lib/server/safelink-token";
import { dedupeCookieName, downloadCookieOptions, incrementDownloadCount, wasCountedRecently } from "@/lib/server/download-count";
import { recordDownloadXp } from "@/lib/server/profiles";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let token = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "id" in body && typeof body.id === "string") token = body.id;
  } catch {
    return NextResponse.json({ counted: false, error: "Permintaan tidak valid." }, { status: 400 });
  }

  const payload = token ? decryptSafelinkToken(token) : null;
  if (!payload) return NextResponse.json({ counted: false, error: "Link tidak valid." }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ counted: false, error: "Konfigurasi server Supabase belum lengkap." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Pastikan game dan link yang dituju memang ada sebelum dihitung.
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, game_download_versions(id, download_links(platform, server_name))")
    .eq("slug", payload.slug)
    .maybeSingle();
  if (gameError || !game) return NextResponse.json({ counted: false, error: "Game tidak ditemukan." }, { status: 404 });

  const row = game as unknown as {
    id: string;
    game_download_versions: { id: string; download_links: { platform: string; server_name: string }[] | null }[] | null;
  };
  const linkExists = row.game_download_versions?.some((version) => version.id === payload.versionId
    && version.download_links?.some((link) => link.platform === payload.platform && link.server_name === payload.serverName));
  if (!linkExists) return NextResponse.json({ counted: false, error: "Link download tidak ditemukan." }, { status: 404 });

  const cookieName = dedupeCookieName(row.id);
  if (wasCountedRecently(request.headers.get("cookie"), row.id)) {
    return NextResponse.json({ counted: false, reason: "recently-counted" });
  }

  const ok = await incrementDownloadCount(supabase, row.id);
  if (!ok) return NextResponse.json({ counted: false, error: "Download gagal dihitung." }, { status: 500 });

  // Jika pengunjung login, tambahkan XP & catat riwayat download.
  const { userId } = await auth();
  if (userId) {
    const user = await currentUser();
    const name = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Player";
    void recordDownloadXp(userId, name, payload.slug, payload.platform, payload.serverName);
  }

  const response = NextResponse.json({ counted: true });
  response.cookies.set(cookieName, "1", downloadCookieOptions());
  return response;
}
