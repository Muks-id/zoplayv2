import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SafelinkClient from "./safelink-client";
import { demoGames, type Game } from "@/lib/games";
import { decryptSafelinkToken } from "@/lib/server/safelink-token";
import { serverSupabase } from "@/lib/server/supabase-admin";

type SafelinkRow = {
  slug: string;
  title: string;
  thumbnail: string | null;
  game_download_versions: {
    id: string;
    download_links: { platform: string; server_name: string; destination_url: string }[] | null;
  }[] | null;
};

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

async function resolveSafelink(token: string): Promise<{ game: Game; destinationUrl: string | null } | null> {
  const payload = decryptSafelinkToken(token);
  if (!payload) return null;

  const demoGame = demoGames.find((game) => game.slug === payload.slug);
  // Butuh destination_url, jadi hanya boleh dibaca lewat server.
  const client = serverSupabase();
  if (!client) return demoGame ? { game: demoGame, destinationUrl: null } : null;

  const { data, error } = await client
    .from("games")
    .select("slug, title, thumbnail, game_download_versions(id, download_links(platform, server_name, destination_url))")
    .eq("slug", payload.slug)
    .maybeSingle();

  if (error || !data) return demoGame ? { game: demoGame, destinationUrl: null } : null;

  const row = data as unknown as SafelinkRow;
  const version = row.game_download_versions?.find((item) => item.id === payload.versionId);
  const destinationUrl = version?.download_links?.find(
    (link) => link.platform === payload.platform && link.server_name === payload.serverName,
  )?.destination_url ?? null;

  return {
    destinationUrl,
    game: {
      slug: row.slug,
      title: row.title,
      category: "",
      platform: payload.platform === "windows" ? "PC" : "Android",
      image: row.thumbnail || demoGames[0].image,
      rating: "BARU",
      downloads: "0",
      comments: 0,
      size: "",
      developer: "",
      release: "",
      description: "",
    },
  };
}

export default async function SafelinkPage({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const { id } = await searchParams;
  const token = Array.isArray(id) ? id[0] : id;
  if (!token) notFound();

  const result = await resolveSafelink(token);
  if (!result) notFound();

  // URL tujuan TIDAK dikirim ke browser; client hanya menerima status ketersediaan.
  // Pengalihan dilakukan via /api/download/redirect yang diarahkan server.
  return <SafelinkClient game={result.game} hasDestination={Boolean(result.destinationUrl)} safelinkId={result.destinationUrl ? token : null} />;
}
