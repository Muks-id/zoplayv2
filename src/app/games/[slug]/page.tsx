import { notFound } from "next/navigation";
import GameDetail from "./game-detail";
import { demoGames, type Game } from "@/lib/games";
import { encryptSafelinkToken } from "@/lib/server/safelink-token";
import { serverSupabase } from "@/lib/server/supabase-admin";

type GameRow = {
  id: string;
  slug: string;
  title: string;
  thumbnail: string | null;
  description: string | null;
  developer: string | null;
  release_date: string | null;
  file_size: string | null;
  min_req_win: string | null;
  min_req_android: string | null;
  is_18_plus: boolean;
  download_count: number;
  category: { name: string } | { name: string }[] | null;
  game_galleries: { image_url: string }[] | null;
  game_download_versions: {
    id: string;
    version_label: string;
    download_links: { platform: string; server_name: string }[] | null;
  }[] | null;
  comments: { id: string }[] | null;
};

type RecommendationRow = {
  slug: string;
  title: string;
  thumbnail: string | null;
  download_count: number;
  min_req_win: string | null;
  min_req_android: string | null;
  category: { name: string } | { name: string }[] | null;
};

export const dynamic = "force-dynamic";

async function findGame(slug: string): Promise<Game | null> {
  const demoGame = demoGames.find((game) => game.slug === slug);
  // Halaman ini perlu server_name untuk membuat token safelink, jadi memakai klien server.
  const client = serverSupabase();
  if (!client) return demoGame ?? null;

  const { data, error } = await client
    .from("games")
    .select("id, slug, title, thumbnail, description, developer, release_date, file_size, min_req_win, min_req_android, is_18_plus, download_count, category:categories(name), game_galleries(image_url), game_download_versions(id, version_label, download_links(platform, server_name)), comments(id)")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return demoGame ?? null;

  const row = data as unknown as GameRow;
  const category = Array.isArray(row.category) ? row.category[0]?.name : row.category?.name;
  const versions = row.game_download_versions?.map((version) => ({
    id: version.id,
    versionLabel: version.version_label,
    links: version.download_links?.map((link) => {
      const platform = link.platform === "windows" ? "windows" as const : "android" as const;
      // URL tujuan asli tidak dikirim ke browser; tombol download memakai token terenkripsi.
      return {
        platform,
        serverName: link.server_name,
        safelinkId: encryptSafelinkToken({ slug: row.slug, versionId: version.id, platform, serverName: link.server_name }),
      };
    }) ?? [],
  })) ?? [];
  const hasWindowsLink = versions.some((version) => version.links.some((link) => link.platform === "windows"));
  const hasAndroidLink = versions.some((version) => version.links.some((link) => link.platform === "android"));
  const supportsPC = Boolean(row.min_req_win || hasWindowsLink);
  const supportsAndroid = Boolean(row.min_req_android || hasAndroidLink);
  const release = row.release_date
    ? new Date(`${row.release_date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "Belum diumumkan";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: category ?? "Lainnya",
    platform: supportsPC && supportsAndroid ? "PC & Android" : supportsPC ? "PC" : "Android",
    image: row.thumbnail || demoGames[0].image,
    rating: "BARU",
    downloads: new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(row.download_count),
    downloadCount: row.download_count,
    comments: row.comments?.length ?? 0,
    size: row.file_size ?? "Belum tersedia",
    developer: row.developer ?? "Belum diketahui",
    release,
    description: row.description ?? "Belum ada deskripsi untuk game ini.",
    is18Plus: row.is_18_plus,
    galleryImages: row.game_galleries?.map((image) => image.image_url) ?? [],
    downloadVersions: versions,
  };
}

async function findRecommendations(currentSlug: string): Promise<Game[]> {
  const client = serverSupabase();
  const fallbackGames = demoGames.filter((game) => game.slug !== currentSlug);

  if (client) {
    const { data, error } = await client
      .from("games")
      .select("slug, title, thumbnail, download_count, min_req_win, min_req_android, category:categories(name)")
      .neq("slug", currentSlug)
      .limit(30);

    if (!error && data?.length) {
      const rows = data as unknown as RecommendationRow[];
      const shuffledRows = [...rows];
      for (let position = shuffledRows.length - 1; position > 0; position -= 1) {
        const swapPosition = Math.floor(Math.random() * (position + 1));
        [shuffledRows[position], shuffledRows[swapPosition]] = [shuffledRows[swapPosition], shuffledRows[position]];
      }

      return shuffledRows.slice(0, 3).map((row) => {
        const category = Array.isArray(row.category) ? row.category[0]?.name : row.category?.name;
        const supportsPC = Boolean(row.min_req_win);
        const supportsAndroid = Boolean(row.min_req_android);
        return {
          slug: row.slug,
          title: row.title,
          category: category ?? "Lainnya",
          platform: supportsPC && supportsAndroid ? "PC & Android" : supportsPC ? "PC" : "Android",
          image: row.thumbnail || demoGames[0].image,
          rating: "BARU",
          downloads: new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(row.download_count),
          comments: 0,
          size: "",
          developer: "",
          release: "",
          description: "",
        };
      });
    }
  }

  const shuffledFallbacks = [...fallbackGames];
  for (let position = shuffledFallbacks.length - 1; position > 0; position -= 1) {
    const swapPosition = Math.floor(Math.random() * (position + 1));
    [shuffledFallbacks[position], shuffledFallbacks[swapPosition]] = [shuffledFallbacks[swapPosition], shuffledFallbacks[position]];
  }
  return shuffledFallbacks.slice(0, 3);
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await findGame(slug);
  if (!game) notFound();
  const recommendations = await findRecommendations(slug);

  return <GameDetail game={game} recommendations={recommendations} />;
}
