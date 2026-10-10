"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ArrowRight, ChevronDown, Gamepad2, Search, X } from "lucide-react";
import type { Game } from "@/lib/games";

type SiteHeaderProps = {
  games: Game[];
  categories: string[];
  isAdmin: boolean;
  search: string;
  onSearchChange: (query: string) => void;
  onSelectCategory: (category: string) => void;
  mobileSearchOpen: boolean;
  onMobileSearchOpenChange: (open: boolean) => void;
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
  currentPage: "home" | "detail" | "chat" | "page" | "admin" | "profile";
  /** Tombol VIP di navbar (disisipkan oleh SiteNavigation). */
  vipSlot?: React.ReactNode;
  /** Baris VIP di panel menu mobile. */
  vipMenuLink?: React.ReactNode;
};

export function SiteHeader({
  games,
  categories,
  isAdmin,
  search,
  onSearchChange,
  onSelectCategory,
  mobileSearchOpen,
  onMobileSearchOpenChange,
  mobileMenuOpen,
  onMobileMenuOpenChange,
  currentPage,
  vipSlot,
  vipMenuLink,
}: SiteHeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const searchMatches = search.trim()
    ? games.filter((game) => `${game.title} ${game.category} ${game.platform}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 6)
    : [];

  const chooseCategory = (category: string) => {
    onSelectCategory(category);
    setCategoryMenuOpen(false);
    setSearchOpen(false);
    onMobileSearchOpenChange(false);
    onMobileMenuOpenChange(false);
  };

  const openGame = (game: Game) => {
    onMobileSearchOpenChange(false);
    setSearchOpen(false);
    router.push(`/games/${encodeURIComponent(game.slug)}`);
  };

  const renderSearchPreview = (className = "search-preview") => search.trim() ? <div className={className} role="listbox" aria-label="Hasil pencarian">
    {searchMatches.length ? searchMatches.map((game) => <button className="search-preview-item" key={game.slug} role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => openGame(game)}>
      <span className="search-preview-thumb" style={{ backgroundImage: `url("${game.image}")` }} />
      <span className="search-preview-copy"><strong>{game.title}</strong><small>{game.category} · {game.platform}</small></span>
      <span className="search-preview-rating"><span aria-hidden="true">★</span> {game.rating}</span>
    </button>) : <div className="search-preview-empty">Game tidak ditemukan.</div>}
  </div> : null;

  const searchInput = (mobile = false) => <label className="header-search">
    <Search size={mobile ? 18 : 17} />
    <input
      autoFocus={mobile}
      aria-label={mobile ? "Cari game di mobile" : "Cari game"}
      placeholder="Cari game..."
      value={search}
      onFocus={() => setSearchOpen(true)}
      onChange={(event) => { onSearchChange(event.target.value); setSearchOpen(true); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setSearchOpen(false);
          if (mobile) onMobileSearchOpenChange(false);
        }
        if (event.key === "Enter" && searchMatches[0]) {
          event.preventDefault();
          openGame(searchMatches[0]);
        }
      }}
    />
    {!mobile && <kbd>/</kbd>}
  </label>;

  const categoryItems = [
    { label: "Semua Game", value: "Semua Game" },
    ...categories.filter((category) => category !== "Semua Game").map((category) => ({ label: category, value: category })),
  ];

  return <>
    <header className="site-header">
      <Link className="brand" href="/" aria-label="ZOPLAY beranda"><span className="brand-mark"><Gamepad2 size={21} strokeWidth={2.5} /></span><span>ZOPLAY<span className="brand-period">.</span></span></Link>
      <nav className="desktop-nav" aria-label="Navigasi utama">
        <Link className={`nav-link ${currentPage === "home" ? "active" : ""}`} href="/">Home</Link>
        <div className="category-nav-wrap">
          <button className={`nav-link category-nav-trigger ${categoryMenuOpen ? "active" : ""}`} aria-expanded={categoryMenuOpen} onClick={() => setCategoryMenuOpen(!categoryMenuOpen)}>Kategori <ChevronDown size={14} className={categoryMenuOpen ? "category-chevron open" : "category-chevron"} /></button>
          {categoryMenuOpen && <div className="category-menu">{categoryItems.map((item) => <button key={item.value} onClick={() => chooseCategory(item.value)}>{item.label}<ArrowRight size={13} /></button>)}</div>}
        </div>
        <Link className={`nav-link ${currentPage === "chat" ? "active" : ""}`} href="/chat">Chat</Link>
        <Link className={`nav-link ${currentPage === "profile" ? "active" : ""}`} href="/profile">Profil</Link>
        {isAdmin && <><Link className={`nav-link ${currentPage === "admin" ? "active" : ""}`} href="/admin?section=vip">VIP</Link><Link className="nav-link" href="/admin">Admin</Link></>}
      </nav>
      <div className="header-actions">
        <div className="search-container">
          {searchInput()}
          {searchOpen && !mobileSearchOpen && renderSearchPreview()}
        </div>
        <div className="auth-controls">
          {vipSlot}
          <SignedOut><SignInButton><button className="auth-link">Masuk</button></SignInButton><SignUpButton><button className="auth-cta">Daftar</button></SignUpButton></SignedOut>
          <SignedIn><UserButton /></SignedIn>
        </div>
      </div>
    </header>

    {mobileSearchOpen && <div className="mobile-search-overlay">
      <div className="mobile-search-top">{searchInput(true)}<button className="icon-button" aria-label="Tutup pencarian" onClick={() => { onMobileSearchOpenChange(false); setSearchOpen(false); }}><X size={19} /></button></div>
      {renderSearchPreview("mobile-search-preview")}
    </div>}

    {mobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => onMobileMenuOpenChange(false)}>
      <div className="mobile-menu-panel" onClick={(event) => event.stopPropagation()}>
        <div className="mobile-menu-heading"><span>Jelajahi kategori</span><button className="icon-button" aria-label="Tutup menu" onClick={() => onMobileMenuOpenChange(false)}><X size={20} /></button></div>
        {categoryItems.map((item) => <button key={item.value} onClick={() => chooseCategory(item.value)}>{item.label}<ArrowRight size={16} /></button>)}
        {vipMenuLink}
        {isAdmin && <><Link className="mobile-menu-link" href="/admin?section=vip" onClick={() => onMobileMenuOpenChange(false)}>Kelola VIP <ArrowRight size={16} /></Link><Link className="mobile-menu-link" href="/admin" onClick={() => onMobileMenuOpenChange(false)}>Dashboard admin <ArrowRight size={16} /></Link></>}
        <Link className="mobile-menu-link" href="/chat" onClick={() => onMobileMenuOpenChange(false)}>Chat Publik <ArrowRight size={16} /></Link>
        <Link className="mobile-menu-link" href="/profile" onClick={() => onMobileMenuOpenChange(false)}>Profil Saya <ArrowRight size={16} /></Link>
      </div>
    </div>}
  </>;
}
