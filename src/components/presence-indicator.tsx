"use client";

import { useEffect, useState } from "react";

/** Jumlah pengunjung yang sedang online. Heartbeat 30 detik; dianggap online bila aktif dalam 90 detik. */
export default function PresenceIndicator() {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        const response = await fetch("/api/presence", { method: "POST" });
        const data: unknown = await response.json().catch(() => null);
        if (!cancelled && data && typeof data === "object" && "online" in data && typeof (data as { online: unknown }).online === "number") {
          setOnline((data as { online: number }).online);
        }
      } catch {
        // Diam: indikator opsional, tidak perlu mengganggu UX.
      }
    };

    void ping();
    const id = window.setInterval(ping, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (online === null) return null;

  return (
    <span className="presence-pill" title="Jumlah pengunjung yang sedang online">
      <span className="presence-dot" /> {online.toLocaleString("id-ID")} online
    </span>
  );
}
