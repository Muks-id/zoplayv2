"use client";

import { useEffect, useState } from "react";

/**
 * Gambar dengan placeholder + transisi blur.
 *
 * Sebelum `onLoad` menyala, gambar di-scale sedikit lebih besar dan transparan
 * di atas blok abu-abu. Saat selesai, gambar masuk halus ke tempatnya. Ini
 * membuat grid kartu game tidak terlihat "bolong" selagi thumb dimsuat.
 *
 * Sengaja memakai <img> + state, bukan next/image: sebagian besar gambar berasal
 * dari Supabase Storage dan UKE-nya dinamis, sehingga optimasi bawaan Next.js
 * tidak bisa dipakai tanpa remotePatterns tambahan.
 */
export function BlurImage({
  src,
  alt,
  className = "",
  sizes,
  eager = false,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  eager?: boolean;
  style?: React.CSSProperties;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`${className} skeleton`}
        role="img"
        aria-label={alt}
        style={style}
      />
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={`${className} ${loaded ? "is-loaded" : "media-fade"}`.trim()}
      style={style}
    />
  );
}

/**
 * Versi untuk elemen yang memakai `background-image` (kartu game, hero, gallery).
 *
 * CSS background tidak punya event onLoad, jadi gambar di-preload lewat
 * `new Image()` lalu class `is-loaded` dipasang setelah selesai. Hasilnya sama:
 * blok Starts tampil abu-abu, lalu gambar masuk dengan transisi halus.
 */
export function useBackgroundImage(src: string | null | undefined) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) {
      setLoaded(false);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    const probe = new Image();
    probe.onload = () => { if (!cancelled) setLoaded(true); };
    probe.onerror = () => { if (!cancelled) setLoaded(true); };
    probe.src = src;
    return () => { cancelled = true; };
  }, [src]);

  return loaded;
}