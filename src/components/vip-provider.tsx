"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { isRecord } from "@/lib/utils";

type VipContextValue = { isVip: boolean; isSignedIn: boolean; expiresAt: string | null };

const VipContext = createContext<VipContextValue>({ isVip: false, isSignedIn: false, expiresAt: null });

export function useVipStatus() {
  return useContext(VipContext);
}

/**
 * Menyediakan status VIP ke seluruh halaman sekaligus.
 * Ditaruh di layout utama supaya halaman mana pun bisa membacanya, termasuk
 * halaman yang sekaligus memuat SiteNavigation di dalamnya.
 */
export function VipProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [isVip, setIsVip] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setIsVip(false);
      setExpiresAt(null);
      return;
    }

    let cancelled = false;
    fetch("/api/vip", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result: unknown = await response.json();
        if (!isRecord(result) || !isRecord(result.vip)) return null;
        return {
          isVip: result.vip.isVip === true,
          expiresAt: typeof result.vip.expiresAt === "string" ? result.vip.expiresAt : null,
        };
      })
      .then((result) => {
        if (cancelled) return;
        setIsVip(Boolean(result?.isVip));
        setExpiresAt(result?.expiresAt ?? null);
      })
      .catch(() => { if (!cancelled) setIsVip(false); });

    return () => { cancelled = true; };
  }, [userId]);

  return (
    <VipContext.Provider value={{ isVip, isSignedIn: isUserLoaded && Boolean(userId), expiresAt }}>
      {children}
    </VipContext.Provider>
  );
}