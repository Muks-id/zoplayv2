"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site-header";
import { MobileBottomBar } from "@/components/mobile-bottom-bar";
import { VipChip } from "@/components/vip-chip";
import { useVipStatus } from "@/components/vip-provider";
import { supabase } from "@/lib/supabase-client";
import { gameCategories, type Game } from "@/lib/games";

type SearchGameRow = {
  slug: string;
  title: string;
  thumbnail: string | null;
  min_req_win: string | null;
  min_req_android: string | null;
  category: { name: string } | { name: string }[] | null;
  game_ratings: { rating: number }[] | null;
};

// Katalog untuk pencarian di navbar cukup dimuat sekali per kunjungan, lalu dipakai ulang di semua halaman.
let searchCatalogPromise: Promise<Game[] | null> | null = null;

function loadSearchCatalog() {
  const client = supabase;
  if (!client) return Promise.resolve(null);
  searchCatalogPromise ??= (async () => {
    const { data, error } = await client
      .from("games")
      // download_links tidak bisa dibaca dari browser, jadi platform ditentukan dari
  // kolom spesifikasi minimum. Tidak perlu mengambil link sama sekali.
  .select("slug, title, thumbnail, min_req_win, min_req_android, category:categories(name), game_ratings(rating)")
      .order("created_at", { ascending: false });
    if (error || !data?.length) return null;

    return (data as unknown as SearchGameRow[]).map((row) => {
      const category = Array.isArray(row.category) ? row.category[0]?.name : row.category?.name;
      const supportsPC = Boolean(row.min_req_win);
      const supportsAndroid = Boolean(row.min_req_android);
      return {
        slug: row.slug,
        title: row.title,
        category: category ?? "Lainnya",
        platform: supportsPC && supportsAndroid ? "PC & Android" : supportsPC ? "PC" : "Android",
        image: row.thumbnail || "/file.svg",
        rating: row.game_ratings?.length
          ? (row.game_ratings.reduce((total, item) => total + item.rating, 0) / row.game_ratings.length).toFixed(1)
          : "BARU",
        downloads: "0",
        comments: 0,
        size: "",
        developer: "",
        release: "",
        description: "",
      } satisfies Game;
    });
  })().catch(() => {
    searchCatalogPromise = null;
    return null;
  });
  return searchCatalogPromise;
}

const NO_EXTRA_GAMES: Game[] = [];
const EMPTY_CATALOG: Game[] = [];

type SiteNavigationProps = {
  currentPage?: "detail" | "chat" | "page" | "profile";
  /** Game tambahan yang pasti ikut di hasil pencarian (misalnya game yang sedang dibuka). */
  extraGames?: Game[];
};

/**
 * Navbar atas + bar navigasi bawah (mobile) yang bisa dipasang di halaman mana pun.
 * State pencarian dan menu dikelola sendiri, jadi halaman cukup menulis <SiteNavigation />.
 */
export function SiteNavigation({ currentPage = "page", extraGames = NO_EXTRA_GAMES }: SiteNavigationProps) {
  const router = useRouter();
  const { user } = useUser();
  const { isVip } = useVipStatus();
  // Kosong sampai katalog asli termuat: data demo tidak boleh muncul di pencarian.
  const [catalog, setCatalog] = useState<Game[]>(EMPTY_CATALOG);
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadSearchCatalog().then((games) => {
      if (!cancelled && games) setCatalog(games);
    });
    return () => { cancelled = true; };
  }, []);

  const games = useMemo(() => {
    const extraSlugs = new Set(extraGames.map((game) => game.slug));
    return [...extraGames, ...catalog.filter((game) => !extraSlugs.has(game.slug))];
  }, [catalog, extraGames]);

  const categories = useMemo(() => {
    const fromCatalog = [...new Set(catalog.map((game) => game.category).filter(Boolean))];
    return fromCatalog.length ? ["Semua Game", ...fromCatalog] : gameCategories;
  }, [catalog]);

  const selectCategory = (category: string) => {
    router.push(`/?category=${encodeURIComponent(category)}#games`);
  };

  return (
    <>
      <SiteHeader
        games={games}
        categories={categories}
        isAdmin={user?.publicMetadata.role === "admin"}
        search={search}
        onSearchChange={setSearch}
        onSelectCategory={selectCategory}
        mobileSearchOpen={mobileSearchOpen}
        onMobileSearchOpenChange={setMobileSearchOpen}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuOpenChange={setMobileMenuOpen}
        currentPage={currentPage}
        vipSlot={
          <span className="header-vip-slot">
            <SignedIn><VipChip isVip={isVip} isSignedIn /></SignedIn>
            <SignedOut><VipChip isVip={false} isSignedIn={false} /></SignedOut>
          </span>
        }
        vipMenuLink={isVip ? <span className="mobile-menu-link is-active"><VipChip isVip isSignedIn /></span> : <Link className="mobile-menu-link" href="/vip"><VipChip isVip={false} isSignedIn /></Link>}
      />
      <MobileBottomBar currentPage={currentPage} onSearchClick={() => setMobileSearchOpen(true)} onMenuClick={() => setMobileMenuOpen(true)} />
    </>
  );
}