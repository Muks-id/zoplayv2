"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Progress bar tipis di paling atas halaman.
 *
 * Menampilkan gerakan saat pathname berubah. Karena App Router tidak memberi
 * event "navigasi selesai", bar disembunyikan dengan delay pendek setelah
 * pathname stabil — cukup untuk terasa responsif tanpa berkedip.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(timer);
  }, [key]);

  return (
    <div
      className={visible ? "route-progress is-active" : "route-progress is-idle"}
      role="progressbar"
      aria-label="Memuat halaman"
    />
  );
}