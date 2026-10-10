"use client";

import { useEffect, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { LoaderCircle, Star } from "lucide-react";

type RatingSummary = { average: number | null; count: number; userRating: number | null };

export default function GameRating({ gameId, fallbackRating }: { gameId?: string; fallbackRating: string }) {
  const { user, isLoaded } = useUser();
  const [summary, setSummary] = useState<RatingSummary>({ average: null, count: 0, userRating: null });
  const [isLoading, setIsLoading] = useState(Boolean(gameId));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!gameId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/games/${encodeURIComponent(gameId)}/rating`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Rating belum tersedia.");
        return await response.json() as RatingSummary;
      })
      .then((result) => { if (!cancelled) setSummary(result); })
      .catch(() => { if (!cancelled) setErrorMessage("Rating belum tersedia."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [gameId]);

  const rateGame = async (rating: number) => {
    if (!gameId || !user) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      const result = await response.json() as RatingSummary | { error?: string };
      if (!response.ok) throw new Error("error" in result ? result.error ?? "Rating gagal disimpan." : "Rating gagal disimpan.");
      setSummary(result as RatingSummary);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Rating gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const displayRating = summary.average ?? (Number.parseFloat(fallbackRating) || null);

  return (
    <section className="game-rating-widget" aria-label="Rating game">
      <div className="game-rating-copy"><span>Rating pemain</span><strong>{isLoading ? "Memuat..." : displayRating ? `${displayRating.toFixed(1)} / 5` : "Belum ada rating"}</strong><small>{summary.count} rating</small></div>
      <div className="game-rating-actions">
        <div className="rating-stars" aria-label={displayRating ? `Rating rata-rata ${displayRating} dari 5` : "Belum ada rating"}>
          {[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-label={`Beri rating ${rating} dari 5`} aria-pressed={summary.userRating === rating} disabled={!gameId || !user || isSaving} onClick={() => void rateGame(rating)}><Star size={19} fill={(summary.userRating ?? Math.round(displayRating ?? 0)) >= rating ? "currentColor" : "none"} /></button>)}
        </div>
        {isSaving && <LoaderCircle className="rating-spinner" size={14} />}
      </div>
      {!isLoaded ? <small className="rating-auth-hint">Memeriksa akun...</small> : !gameId ? <small className="rating-auth-hint">Rating tersedia setelah game tersimpan di Supabase.</small> : !user ? <SignInButton><button className="rating-login-button">Masuk untuk memberi rating</button></SignInButton> : <small className="rating-auth-hint">{summary.userRating ? "Rating kamu tersimpan. Pilih bintang lain untuk mengubahnya." : "Masuk untuk mengirim rating kamu."}</small>}
      {errorMessage && <small className="rating-error" role="status">{errorMessage}</small>}
    </section>
  );
}
