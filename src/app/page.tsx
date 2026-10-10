"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { SiteHeader } from "@/components/site-header";
import { MobileBottomBar } from "@/components/mobile-bottom-bar";
import PresenceIndicator from "@/components/presence-indicator";
import { PlatformPill } from "@/components/platform-icons";
import { demoGames, gameCategories, gameDownloadCount, gameSlug, type Game } from "@/lib/games";
import { useUser } from "@clerk/nextjs";
import {
  ArrowDownToLine,
  ArrowRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Gamepad2,
  MessageCircle,
  Search,
  Sparkles,
  Star,
} from "lucide-react";

const games = demoGames;
const categories = gameCategories;
const FEATURE_INTERVAL_MS = 6000;

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

type SupabaseGameRow = {
  slug: string;
  title: string;
  thumbnail: string | null;
  description: string | null;
  developer: string | null;
  release_date: string | null;
  file_size: string | null;
  min_req_win: string | null;
  min_req_android: string | null;
  is_featured: boolean;
  is_18_plus: boolean;
  download_count: number;
  category: { name: string } | { name: string }[] | null;
  game_galleries: { image_url: string }[] | null;
  game_download_versions: {
    id: string;
    version_label: string;
  }[] | null;
  game_ratings: { rating: number }[] | null;
  comments: { id: string }[] | null;
};

export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata.role === "admin";
  const [catalogGames, setCatalogGames] = useState<Game[]>(games);
  const [catalogCategories, setCatalogCategories] = useState(categories);
  const [activeCategory, setActiveCategory] = useState("Semua Game");
  const [activeTab, setActiveTab] = useState<"popular" | "recent">("popular");
  const [bookmarkedTitles, setBookmarkedTitles] = useState<string[]>([]);
  const [bookmarksReady, setBookmarksReady] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let cancelled = false;
    const loadCatalog = async () => {
      const { data, error } = await client
        .from("games")
        // download_links tidak diambil dari browser: tabel itu hanya bisa dibaca server.
        // Dukungan platform ditentukan dari kolom spesifikasi minimum.
        .select("id, slug, title, thumbnail, description, developer, release_date, file_size, min_req_win, min_req_android, is_featured, is_18_plus, download_count, category:categories(name), game_galleries(image_url), game_download_versions(id, version_label), game_ratings(rating), comments(id)")
        .order("created_at", { ascending: false });

      if (error || !data?.length || cancelled) return;

      const rows = data as unknown as SupabaseGameRow[];
      const mappedGames = rows.map((row) => {
        const category = Array.isArray(row.category) ? row.category[0]?.name : row.category?.name;
        const downloadVersions = row.game_download_versions?.map((version) => ({
          id: version.id,
          versionLabel: version.version_label,
          links: [],
        })) ?? [];
        const supportsPC = Boolean(row.min_req_win);
        const supportsAndroid = Boolean(row.min_req_android);
        const release = row.release_date
          ? new Date(`${row.release_date}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
          : "Belum diumumkan";

        return {
          slug: row.slug,
          title: row.title,
          category: category ?? "Lainnya",
          platform: supportsPC && supportsAndroid ? "PC & Android" as const : supportsPC ? "PC" as const : "Android" as const,
          image: row.thumbnail || games[0].image,
          rating: row.game_ratings?.length
            ? (row.game_ratings.reduce((total, item) => total + item.rating, 0) / row.game_ratings.length).toFixed(1)
            : "BARU",
          downloads: new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(row.download_count),
          downloadCount: row.download_count,
          comments: row.comments?.length ?? 0,
          size: row.file_size ?? "Belum tersedia",
          developer: row.developer ?? "Belum diketahui",
          release,
          description: row.description ?? "Belum ada deskripsi untuk game ini.",
          galleryImages: row.game_galleries?.map((image) => image.image_url) ?? [],
          featured: row.is_featured,
          is18Plus: row.is_18_plus,
          downloadVersions,
        };
      });

      if (cancelled) return;
      if (!mappedGames.some((game) => game.featured)) mappedGames[0].featured = true;
      setCatalogGames(mappedGames);
      setCatalogCategories(["Semua Game", ...new Set(mappedGames.map((game) => game.category))]);
    };

    void loadCatalog();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    if (category && [...catalogCategories, "PC Games", "Android Games"].includes(category)) setActiveCategory(category);
  }, [catalogCategories]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("zoplay.bookmarks.v1");
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      setBookmarkedTitles(Array.isArray(parsed) ? parsed.filter((title): title is string => typeof title === "string") : []);
    } catch {
      setBookmarkedTitles([]);
    }
    setBookmarksReady(true);
  }, []);

  useEffect(() => {
    if (!bookmarksReady) return;
    try {
      window.localStorage.setItem("zoplay.bookmarks.v1", JSON.stringify(bookmarkedTitles));
    } catch {
      return;
    }
  }, [bookmarkedTitles, bookmarksReady]);

  const featuredGames = catalogGames.filter((game) => game.featured);
  const featureGames = featuredGames.length ? featuredGames : catalogGames;
  const featureCount = featureGames.length;
  const activeFeatureIndex = featureIndex % featureCount;
  const currentFeature = featureGames[activeFeatureIndex];

  // Slider otomatis; timer di-reset setiap kali slide berganti (termasuk saat diklik manual).
  useEffect(() => {
    if (featureCount < 2) return;
    const timer = window.setTimeout(() => setFeatureIndex((activeFeatureIndex + 1) % featureCount), FEATURE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [activeFeatureIndex, featureCount]);

  const filteredGames = catalogGames.filter((game) => {
    const matchesCategory = activeCategory === "Semua Game" || activeCategory === "PC Games" || activeCategory === "Android Games" || game.category === activeCategory;
    const matchesSearch = `${game.title} ${game.category} ${game.platform}`.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform = activeCategory === "PC Games" ? game.platform !== "Android" : activeCategory === "Android Games" ? game.platform !== "PC" : true;
    const matchesBookmark = !showBookmarks || bookmarkedTitles.includes(game.title);
    return matchesCategory && matchesSearch && matchesPlatform && matchesBookmark;
  });
  // Katalog dimuat urut dari yang terbaru (created_at desc), jadi "Terbaru" memakai urutan asli,
  // sedangkan "Populer" diurutkan berdasarkan jumlah download terbanyak.
  const visibleGames = activeTab === "popular" && !showBookmarks
    ? [...filteredGames].sort((a, b) => gameDownloadCount(b) - gameDownloadCount(a))
    : filteredGames;
  const isBookmarked = (game: Game) => bookmarkedTitles.includes(game.title);

  const toggleBookmark = (game: Game) => {
    setBookmarkedTitles((current) => current.includes(game.title)
      ? current.filter((title) => title !== game.title)
      : [...current, game.title]);
  };

  const selectCategory = (category: string) => {
    setActiveCategory(category);
    setShowBookmarks(false);
    setMobileMenuOpen(false);
    document.getElementById("games")?.scrollIntoView({ behavior: "smooth" });
  };

  const showGame = (game: Game) => {
    router.push(`/games/${encodeURIComponent(game.slug || gameSlug(game.title))}`);
  };

  return (
    <main className="zoplay-shell">
      <SiteHeader games={catalogGames} categories={catalogCategories} isAdmin={isAdmin} search={search} onSearchChange={setSearch} onSelectCategory={selectCategory} mobileSearchOpen={mobileSearchOpen} onMobileSearchOpenChange={setMobileSearchOpen} mobileMenuOpen={mobileMenuOpen} onMobileMenuOpenChange={setMobileMenuOpen} currentPage="home" />

      <section className="hero-wrap" id="top">
        <div className="hero-art" style={{ backgroundImage: `url("${currentFeature.image}")` }} />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="eyebrow"><span className="live-dot" /> FEATURED GAME <span className="eyebrow-line" /></div>
          <div className="hero-copy" key={currentFeature.title}>
            <div className="hero-kicker">{currentFeature.category} <span>•</span> {currentFeature.platform}</div>
            <h1>{currentFeature.title}</h1>
            <p>{currentFeature.description}</p>
            <div className="hero-meta"><span><Star size={15} fill="currentColor" /> {currentFeature.rating}</span><span><Download size={15} /> {currentFeature.downloads} downloads</span><span><MessageCircle size={15} /> {currentFeature.comments} ulasan</span></div>
            <button className="primary-button" onClick={() => showGame(currentFeature)}>Lihat Detail <ArrowRight size={17} /></button>
          </div>
          <div className="hero-controls">
            <span className="hero-count">{twoDigits(activeFeatureIndex + 1)}<i>/</i>{twoDigits(featureCount)}</span>
            <div className="hero-progress" aria-label={`Featured ${activeFeatureIndex + 1} dari ${featureCount}`}>
              {featureGames.map((game, index) => <button key={game.title} className={index === activeFeatureIndex ? "progress-segment selected" : "progress-segment"} aria-label={`Tampilkan ${game.title}`} onClick={() => setFeatureIndex(index)} />)}
            </div>
            <button className="round-control" aria-label="Game featured sebelumnya" onClick={() => setFeatureIndex((activeFeatureIndex + featureCount - 1) % featureCount)}><ChevronLeft size={18} /></button>
            <button className="round-control" aria-label="Game featured berikutnya" onClick={() => setFeatureIndex((activeFeatureIndex + 1) % featureCount)}><ChevronRight size={18} /></button>
          </div>
          <div className="hero-index">{twoDigits(activeFeatureIndex + 1)} <span>/</span> {twoDigits(featureCount)}</div>
        </div>
      </section>

      <section className="catalog-section" id="games">
        <div className="section-heading">
          <div><span className="section-label">TEMUKAN PETUALANGAN BARU</span><h2>Game pilihan <span>buat kamu.</span></h2></div>
          <a className="text-link" href="#games">Jelajahi semua <ArrowRight size={16} /></a>
        </div>

        <div className="catalog-toolbar">
          <div className="category-scroll" aria-label="Kategori game">
            {catalogCategories.map((category) => <button key={category} className={`category-chip ${activeCategory === category ? "selected" : ""}`} onClick={() => setActiveCategory(category)}>{category}</button>)}
          </div>
          <div className="catalog-tabs" role="tablist" aria-label="Urutkan game">
            <button role="tab" aria-selected={!showBookmarks && activeTab === "popular"} className={!showBookmarks && activeTab === "popular" ? "selected" : ""} onClick={() => { setActiveTab("popular"); setShowBookmarks(false); }}><Sparkles size={14} /> Populer</button>
            <button role="tab" aria-selected={!showBookmarks && activeTab === "recent"} className={!showBookmarks && activeTab === "recent" ? "selected" : ""} onClick={() => { setActiveTab("recent"); setShowBookmarks(false); }}><Clock3 size={14} /> Terbaru</button>
            <button role="tab" aria-selected={showBookmarks} className={showBookmarks ? "selected" : ""} onClick={() => { setShowBookmarks(true); setActiveCategory("Semua Game"); }}><Bookmark size={14} /> Disimpan <span className="bookmark-count">{bookmarkedTitles.length}</span></button>
          </div>
        </div>

        {visibleGames.length > 0 ? <div className="game-grid">
          {visibleGames.map((game, index) => <article className="game-card" key={game.title} style={{ animationDelay: `${index * 45}ms` }}>
            <button className="game-art" aria-label={`Lihat ${game.title}`} onClick={() => showGame(game)} style={{ backgroundImage: `url("${game.image}")` }}>
              <PlatformPill platform={game.platform} />
              <span className="rating-pill"><Star size={12} fill="currentColor" /> {game.rating}</span>
              <span className="art-open"><ArrowRight size={17} /></span>
            </button>
            <div className="game-info">
              <div className="game-title-row"><span className="game-category">{game.category}</span><button className={`bookmark-action ${isBookmarked(game) ? "is-saved" : ""}`} type="button" aria-label={isBookmarked(game) ? `Hapus bookmark ${game.title}` : `Bookmark ${game.title}`} aria-pressed={isBookmarked(game)} title={isBookmarked(game) ? "Hapus bookmark" : "Simpan bookmark"} onClick={() => toggleBookmark(game)}><Bookmark size={16} fill={isBookmarked(game) ? "currentColor" : "none"} /></button></div>
              <button className="game-title" onClick={() => showGame(game)}>{game.title}</button>
              <div className="game-stats"><span><Download size={13} /> {game.downloads}</span><span><MessageCircle size={13} /> {game.comments}</span></div>
            </div>
          </article>)}
        </div> : <div className="empty-state"><Search size={23} /><p>{showBookmarks && bookmarkedTitles.length === 0 ? "Belum ada game tersimpan." : "Game tidak ditemukan."}</p><button onClick={() => { setSearch(""); setActiveCategory("Semua Game"); setShowBookmarks(false); }}>Tampilkan semua game</button></div>}
        <div className="load-more-wrap"><button className="load-more" onClick={() => setActiveCategory("Semua Game")}>Lihat katalog lengkap <ArrowDownToLine size={16} /></button></div>
      </section>

      <footer className="site-footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><Gamepad2 size={18} strokeWidth={2.5} /></span><span>ZOPLAY<span className="brand-period">.</span></span></a><span className="copyright">© 2025 ZOPLAY. Dibuat untuk para player.</span><nav aria-label="Informasi"><a href="/privacy">Privacy Policy</a><a href="/dmca">DMCA</a><a href="/disclaimer">Disclaimer</a></nav><PresenceIndicator /></footer>

      <MobileBottomBar currentPage="home" onSearchClick={() => setMobileSearchOpen(true)} onMenuClick={() => setMobileMenuOpen(true)} />

    </main>
  );
}
