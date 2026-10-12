"use client";

import { ArrowRight, Star } from "lucide-react";
import { PlatformPill } from "@/components/platform-icons";
import { useBackgroundImage } from "@/components/blur-image";
import type { Game } from "@/lib/games";

/**
 * Tombol kartu game dengan gambar yang masuk halus.
 *
 * Dipisah jadi komponen sendiri karena `useBackgroundImage` adalah hook —
 * tidak bisa dipanggil di dalam `.map()` pada halaman beranda.
 */
export function GameArtButton({
  image,
  title,
  platform,
  rating,
  onOpen,
}: {
  image: string;
  title: string;
  platform: Game["platform"];
  rating: string;
  onOpen: () => void;
}) {
  const loaded = useBackgroundImage(image);

  return (
    <button
      className={`game-art ${loaded ? "is-loaded" : "media-fade"}`.trim()}
      aria-label={`Lihat ${title}`}
      onClick={onOpen}
      style={{ backgroundImage: `url("${image}")` }}
    >
      <PlatformPill platform={platform} />
      <span className="rating-pill"><Star size={12} fill="currentColor" /> {rating}</span>
      <span className="art-open"><ArrowRight size={17} /></span>
    </button>
  );
}