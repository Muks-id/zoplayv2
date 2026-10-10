"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  Download,
  MessageCircle,
  Monitor,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import type { Game } from "@/lib/games";
import { SiteNavigation } from "@/components/site-navigation";
import { useVipStatus } from "@/components/vip-provider";
import { PlatformPill } from "@/components/platform-icons";
import { SiteFooter } from "@/components/site-footer";
import CommentsSection from "./comments-section";
import GameRating from "./game-rating";

/** Durasi hitung mundur pada popup download untuk selain member VIP. */
const DOWNLOAD_SECONDS = 10;

function formatCountdown(seconds: number) {
  const remaining = Math.max(0, seconds);
  return `00:${String(remaining).padStart(2, "0")}`;
}

export default function GameDetail({ game, recommendations }: { game: Game; recommendations: Game[] }) {
  const { isVip, isSignedIn } = useVipStatus();
  const currentGameList = useMemo(() => [game], [game]);
  const [openVersion, setOpenVersion] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [downloadTimer, setDownloadTimer] = useState<number | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem("zoplay.bookmarks.v1") ?? "[]");
      setBookmarked(Array.isArray(saved) && saved.includes(game.title));
    } catch {
      setBookmarked(false);
    }
  }, [game.title]);

  useEffect(() => {
    if (downloadTimer === null || downloadTimer <= 0) {
      if (downloadTimer === 0) setDownloadReady(true);
      return;
    }
    const timer = window.setTimeout(() => setDownloadTimer(downloadTimer - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [downloadTimer]);

  const toggleBookmark = () => {
    let saved: string[] = [];
    try {
      const value: unknown = JSON.parse(window.localStorage.getItem("zoplay.bookmarks.v1") ?? "[]");
      if (Array.isArray(value)) saved = value.filter((title): title is string => typeof title === "string");
    } catch {
      saved = [];
    }
    const next = saved.includes(game.title) ? saved.filter((title) => title !== game.title) : [...saved, game.title];
    setBookmarked(next.includes(game.title));
  };

  // Satu pintu untuk semua pengguna: server yang memutuskan apakah member VIP
  // boleh langsung ke link asli, atau harus lewat safelink.
  const showDownloadPopup = (safelinkId: string) => {
    setDownloadLink(safelinkId);
    setDownloadReady(false);
    setDownloadTimer(DOWNLOAD_SECONDS);
  };

  const beginDownload = async (safelinkId: string) => {
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: safelinkId }),
      });
      const result = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !result?.url) {
        // Member VIP tidak perlu jalur safelink: cukup tampilkan pesan kesalahan.
        if (isVip) {
          setDownloadError(result?.error ?? "Gagal memulai download. Coba lagi nanti.");
          return;
        }
        showDownloadPopup(safelinkId);
        return;
      }
      if (result.url.startsWith("/")) {
        // Bukan member VIP: popup hitung mundur dulu, baru safelink.
        showDownloadPopup(safelinkId);
        return;
      }
      // Member VIP: langsung diarahkan ke link asli tanpa popup dan tanpa safelink.
      window.location.href = result.url;
    } catch {
      if (isVip) {
        setDownloadError("Server tidak dapat dihubungi. Coba lagi nanti.");
        return;
      }
      // Server tidak dapat dihubungi: pakai jalur safelink biasa.
      showDownloadPopup(safelinkId);
    }
  };

  const versions = game.downloadVersions ?? [];
  const galleryImages = game.galleryImages?.length ? game.galleryImages : [game.image];
  const [galleryIndex, setGalleryIndex] = useState(0);
  // Basis data bisa berubah (game disunting admin), jadi indeks dijepit agar
  // tidak menunjuk gambar yang sudah tidak ada.
  const activeGalleryIndex = Math.min(galleryIndex, Math.max(galleryImages.length - 1, 0));
  const activeGalleryImage = galleryImages[activeGalleryIndex] ?? game.image;

  return (
    <main className="game-detail-page">
      <SiteNavigation currentPage="detail" extraGames={currentGameList} />

      <article className="detail-content">
        <section className="detail-hero" style={{ backgroundImage: `url("${game.image}")` }}>
          <div className="detail-hero-shade" />
          <div className="detail-hero-copy">
            <div className="detail-tags"><span>{game.category}</span><span>{game.platform}</span></div>
            <h1>{game.title}</h1>
            <div className="detail-stats"><span><Star size={15} fill="currentColor" /> {game.rating}</span><span><Download size={15} /> {game.downloads} download</span><span><MessageCircle size={15} /> {game.comments} ulasan</span></div>
          </div>
        </section>

        <section className="detail-main-grid">
          <div className="detail-copy-column">
            <div className="detail-section-heading"><div><span className="section-label">TENTANG GAME</span><h2>Petualangan dimulai di sini.</h2></div><button className={`bookmark-action detail-bookmark ${bookmarked ? "is-saved" : ""}`} type="button" aria-label={bookmarked ? "Hapus bookmark" : "Simpan bookmark"} aria-pressed={bookmarked} onClick={toggleBookmark}><Bookmark size={17} fill={bookmarked ? "currentColor" : "none"} /></button></div>
            <p className="detail-description">{game.description}</p>
            <div className="detail-facts"><div><span>Developer</span><strong>{game.developer}</strong></div><div><span>Rilis</span><strong>{game.release}</strong></div><div><span>Ukuran</span><strong>{game.size}</strong></div><div><span>Platform</span><strong>{game.platform}</strong></div></div>
            <GameRating gameId={game.id} fallbackRating={game.rating} />
          </div>

          <aside className="detail-download-panel">
            {/* Semua orang tetap bisa download. Bedanya hanya jalur: member VIP langsung ke file asli,
                selain itu lewat safelink (server yang memutuskan, bukan kode di browser). */}
            <div className="detail-panel-heading"><div><span className="section-label">UNDUH GAME</span><h2>Versi tersedia</h2></div><span className="version-count">{versions.length}</span></div>
            {isVip
              ? <div className="vip-access-banner"><Crown size={15} /><span><strong>Akses VIP aktif</strong>Download langsung ke server, tanpa iklan.</span></div>
              : <div className="vip-offer-banner"><Crown size={15} /><span><strong>Ingin download tanpa iklan?</strong>Bergabung VIP untuk akses langsung ke semua server.</span><Link href={isSignedIn ? "/vip" : "/sign-in?redirect_url=%2Fvip"}>Jadi VIP</Link></div>}
            {versions.length ? versions.map((version) => <section className="detail-version-item" key={version.id}>
              <button className="accordion-trigger" aria-expanded={openVersion === version.id} onClick={() => setOpenVersion(openVersion === version.id ? null : version.id)}><span><Download size={17} /> Download <span className="download-version-label">{version.versionLabel}</span></span><ChevronDown className={openVersion === version.id ? "chevron open" : "chevron"} size={18} /></button>
              {openVersion === version.id && <div className="accordion-content">
                {(["windows", "android"] as const).map((platform) => {
                  const links = version.links.filter((link) => link.platform === platform);
                  if (!links.length) return null;
                  return <div className="download-platform-group" key={platform}>
                    <div className="download-platform"><span>{platform === "windows" ? <Monitor size={16} /> : <Smartphone size={16} />}{platform === "windows" ? "Windows" : "Android"}</span></div>
                    {links.map((link, index) => <div className="server-row" key={`${platform}-${link.serverName}`}><span>{link.serverName}{index === 0 && <small>Recommended</small>}</span><button disabled={!link.safelinkId} onClick={() => { if (link.safelinkId) beginDownload(link.safelinkId); }}><Download size={14} /> Download</button></div>)}
                  </div>;
                })}
                {!version.links.length && <div className="server-empty">Belum ada link pada versi ini.</div>}
              </div>}
            </section>) : <div className="detail-no-versions">Link download belum tersedia.</div>}

            <button className="accordion-trigger detail-gallery-trigger" aria-expanded={galleryOpen} onClick={() => setGalleryOpen(!galleryOpen)}><span><Sparkles size={17} /> Screenshot gallery</span><ChevronDown className={galleryOpen ? "chevron open" : "chevron"} size={18} /></button>
            {galleryOpen && (
              <div className="gallery-carousel">
                <div
                  className="gallery-slide"
                  style={{ backgroundImage: `url("${activeGalleryImage}")` }}
                  role="img"
                  aria-label={`Screenshot ${activeGalleryIndex + 1} dari ${galleryImages.length}`}
                />

                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="gallery-nav is-prev"
                      aria-label="Screenshot sebelumnya"
                      onClick={() => setGalleryIndex((activeGalleryIndex - 1 + galleryImages.length) % galleryImages.length)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      className="gallery-nav is-next"
                      aria-label="Screenshot berikutnya"
                      onClick={() => setGalleryIndex((activeGalleryIndex + 1) % galleryImages.length)}
                    >
                      <ChevronRight size={18} />
                    </button>

                    {/* Tanda penggeser: garis progres di bawah foto */}
                    <div className="gallery-dots" role="tablist" aria-label="Pilih screenshot">
                      {galleryImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          role="tab"
                          aria-selected={index === activeGalleryIndex}
                          aria-label={`Screenshot ${index + 1}`}
                          className={index === activeGalleryIndex ? "gallery-dot is-active" : "gallery-dot"}
                          onClick={() => setGalleryIndex(index)}
                        />
                      ))}
                    </div>

                    <span className="gallery-counter">
                      {activeGalleryIndex + 1} / {galleryImages.length}
                    </span>
                  </>
                )}
              </div>
            )}
            {game.is18Plus && <div className="age-warning"><ShieldAlert size={18} /><span><strong>Peringatan konten 18+</strong>Game ini ditujukan untuk pengguna dewasa.</span></div>}
          </aside>
        </section>

        <CommentsSection gameId={game.id} />

        <section className="recommendation-section">
          <div className="recommendation-heading"><div><span className="section-label">LANJUTKAN EKSPLORASI</span><h2>Postingan lainnya</h2></div><span>3 pilihan acak</span></div>
          {recommendations.length ? <div className="recommendation-grid">{recommendations.map((recommendedGame, index) => <article className="game-card recommendation-card" key={recommendedGame.slug} style={{ animationDelay: `${index * 45}ms` }}>
            <Link className="game-art" href={`/games/${encodeURIComponent(recommendedGame.slug)}`} aria-label={`Lihat ${recommendedGame.title}`} style={{ backgroundImage: `url("${recommendedGame.image}")` }}>
              <PlatformPill platform={recommendedGame.platform} />
              <span className="rating-pill"><Star size={12} fill="currentColor" /> {recommendedGame.rating}</span>
            </Link>
            <div className="game-info"><span className="game-category">{recommendedGame.category}</span><Link className="game-title" href={`/games/${encodeURIComponent(recommendedGame.slug)}`}>{recommendedGame.title}</Link><div className="game-stats"><span><Download size={13} /> {recommendedGame.downloads}</span></div></div>
          </article>)}</div> : <div className="comments-notice">Belum ada postingan lain untuk direkomendasikan.</div>}
        </section>

        <Link className="detail-bottom-back" href="/"><ArrowLeft size={15} /> Kembali ke semua game</Link>
      </article>

      <SiteFooter />


      {downloadError && <div className="dialog-backdrop download-backdrop" onClick={() => setDownloadError(null)}>
        <div className="download-dialog" role="alertdialog" aria-modal="true" aria-label="Kesalahan download" onClick={(event) => event.stopPropagation()}>
          <button className="dialog-close icon-button" aria-label="Tutup" onClick={() => setDownloadError(null)}><X size={19} /></button>
          <div className="download-modal-icon"><X size={24} /></div>
          <span className="section-label">DOWNLOAD GAGAL</span>
          <h2>Maaf, ada kendala</h2>
          <p>{downloadError}</p>
          <button className="primary-button download-continue" onClick={() => setDownloadError(null)}><span>Tutup</span></button>
        </div>
      </div>}

      {downloadTimer !== null && !isVip && <div className="dialog-backdrop download-backdrop" onClick={() => { setDownloadTimer(null); setDownloadReady(false); setDownloadLink(null); }}>
        <div className="download-dialog" role="dialog" aria-modal="true" aria-label="Konfirmasi download" onClick={(event) => event.stopPropagation()}>
          <Link className="download-vip-offer" href="/vip"><Crown size={14} /> Lewati iklan dengan VIP</Link>
          <button className="dialog-close icon-button" aria-label="Tutup" onClick={() => { setDownloadTimer(null); setDownloadReady(false); setDownloadLink(null); }}><X size={19} /></button>
          <div className="download-modal-icon">{downloadReady ? <Check size={24} /> : <Clock3 size={24} />}</div>
          <span className="section-label">ZOPLAY DOWNLOAD GATE</span>
          <h2>{downloadReady ? "Link siap dilanjutkan" : "Menyiapkan link download"}</h2>
          <p>{downloadReady ? "Terima kasih sudah menunggu. Link unduhan tersedia untuk melanjutkan." : "Mohon tunggu sebentar sementara kami menyiapkan link untukmu."}</p>
          {!isVip && <div className="mobile-ad-slot" aria-label="Slot iklan mobile"><div>Ruang iklan mobile</div></div>}
          {!downloadReady && <div className="countdown-number">{formatCountdown(downloadTimer ?? DOWNLOAD_SECONDS)}</div>}
          <div className="download-progress"><span style={{ width: downloadReady ? "100%" : `${((DOWNLOAD_SECONDS - (downloadTimer ?? DOWNLOAD_SECONDS)) / DOWNLOAD_SECONDS) * 100}%` }} /></div>
          <button className="primary-button download-continue" disabled={!downloadReady} onClick={() => { if (downloadLink) window.open(`/safelink?id=${encodeURIComponent(downloadLink)}`, "_blank", "noopener"); setDownloadTimer(null); setDownloadReady(false); setDownloadLink(null); }}><span>{downloadReady ? "Lanjutkan" : "Mohon tunggu..."}</span><ArrowRight size={17} /></button>
          <small className="demo-note">Link dari database Supabase</small>
        </div>
      </div>}
    </main>
  );
}
