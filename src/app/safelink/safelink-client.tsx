"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Shield,
  ShieldAlert,
  Sparkles,
  Crown,
} from "lucide-react";
import type { Game } from "@/lib/games";
import { SiteNavigation } from "@/components/site-navigation";
import { SiteFooter } from "@/components/site-footer";
import { useVipStatus } from "@/components/vip-provider";
import { isRecord } from "@/lib/utils";

const PROGRESS_SECONDS = 15;
const COUNTDOWN_SECONDS = 20;

export default function SafelinkClient({ game, hasDestination, safelinkId = null }: { game: Game; hasDestination: boolean; safelinkId?: string | null }) {
  const { isVip } = useVipStatus();
  const [progress, setProgress] = useState(0);
  const countedRef = useRef(false);

  // Hitung download begitu pengunjung (login maupun belum) masuk ke halaman safelink.
  useEffect(() => {
    if (!safelinkId || countedRef.current) return;
    countedRef.current = true;
    void fetch("/api/safelink/hit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: safelinkId }),
      keepalive: true,
    }).catch(() => undefined);
  }, [safelinkId]);
  const [progressDone, setProgressDone] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownDone, setCountdownDone] = useState(false);
  const confirmRef = useRef<HTMLDivElement | null>(null);

  // Fase 1: progress bar 15 detik
  useEffect(() => {
    const started = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      setProgress(Math.min(100, (elapsed / PROGRESS_SECONDS) * 100));
      if (elapsed >= PROGRESS_SECONDS) {
        window.clearInterval(interval);
        setProgress(100);
        setProgressDone(true);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  // Member VIP tidak perlu melewati halaman ini: langsung ke link asli.
  useEffect(() => {
    if (!isVip || !safelinkId) return;
    void fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: safelinkId }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const result: unknown = await response.json();
        return isRecord(result) && result.direct === true && typeof result.url === "string" ? result.url : null;
      })
      .then((destination) => {
        if (destination) window.location.replace(destination);
      })
      .catch(() => undefined);
  }, [isVip, safelinkId]);

  // Fase 3: countdown 20 detik setelah Generate Link ditekan
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdownDone(true);
      return;
    }
    const timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const handleGenerate = () => {
    setCountdown(COUNTDOWN_SECONDS);
    window.setTimeout(() => confirmRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const handleGoToLink = () => {
    if (!safelinkId) return;
    // Server yang mengalihkan ke URL asli; URL-nya tidak pernah bocor ke browser.
    window.location.href = `/api/download?redirect=${encodeURIComponent(safelinkId)}`;
  };

  return (
    <main className="safelink-page">
      <SiteNavigation />

      <div className="safelink-container">
        {!isVip && <div className="mobile-ad-slot" aria-label="Slot iklan atas progres bar"><div>Ruang iklan mobile</div></div>}

        <section className="safelink-card">
          {isVip && <div className="safelink-vip-banner"><Crown size={15} /> Kamu adalah member VIP. Halaman ini dilewati otomatis.</div>}
          <div className="safelink-game-row">
            <div className="safelink-game-meta">
              <h1>{game.title}</h1>
            </div>
          </div>

          <div className="safelink-progress-head">
            <span>{progressDone ? "Progres selesai / Progress complete" : "Membuat link aman..."}</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div className="safelink-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="safelink-hint">
            {progressDone ? "Link sudah siap. Tekan tombol di bawah untuk melanjutkan." : `Mohon tunggu ${PROGRESS_SECONDS - Math.floor((progress / 100) * PROGRESS_SECONDS)} detik lagi...`}
          </p>

          <button className="primary-button safelink-generate" disabled={!progressDone} onClick={handleGenerate}>
            {progressDone ? <>Generate Link <ArrowRight size={17} /></> : <><Loader2 size={17} className="safelink-spin" /> Please wait...</>}
          </button>
        </section>

        {!isVip && <div className="mobile-ad-slot" aria-label="Slot iklan bawah progres bar"><div>Ruang iklan mobile</div></div>}

        {/* Konten terima kasih */}
        <section className="safelink-thanks">
          <h2>Terima kasih telah mendownload di ZOPLAY!</h2>
          <p>
            Kami sangat menghargai kepercayaanmu untuk menggunakan ZOPLAY sebagai tempat mengunduh game favoritmu.
            Setiap file yang kami sediakan telah melewati pemeriksaan tim kurator kami sebelum dipublikasikan, sehingga
            kamu bisa mengunduh dengan lebih tenang dan nyaman.
          </p>
          <p>
            Server download yang kami gunakan bersifat terdistribusi: Server 1 biasanya paling cepat dan stabil untuk
            pengguna di Asia Tenggara, Server 2 cocok sebagai cadangan saat server utama sedang sibuk, dan Server 3
            adalah mirror terakhir jika keduanya mengalami gangguan. Jika satu server gagal, silakan coba server
            lainnya — tautannya mengarah ke file yang sama persis.
          </p>
          <p>
            Sebelum memulai instalasi, pastikan perangkatmu memenuhi spesifikasi minimum game yang dipilih dan sisakan
            ruang penyimpanan yang cukup. Untuk game PC, matikan sementara antivirus yang terlalu agresif agar crack/
            patch tidak terhapus secara keliru, dan selalu ekstrak file menggunakan password yang tertera pada
            halaman postingan.
          </p>
          <p>
            Dukung developer game dengan membeli versi originalnya jika kamu menyukai karyanya. ZOPLAY hanya menyediakan
            tautan yang tersedia di internet untuk keperluan mencoba (try before buy) dan tidak menyimpan file game di
            server kami sendiri.
          </p>
          <div className="safelink-thanks-tips">
            <div><Sparkles size={15} /> Bookmark halaman ini agar mudah ditemukan kembali</div>
            <div><Shield size={15} /> Jangan pernah membayar untuk file di ZOPLAY — semuanya gratis</div>
            <div><Download size={15} /> Gunakan download manager untuk file berukuran besar</div>
          </div>
        </section>

        {/* Fase 3: konfirmasi + countdown 20 detik */}
        <div ref={confirmRef} className="safelink-confirm-anchor" />
        {!isVip && <div className="mobile-ad-slot" aria-label="Slot iklan atas go to link"><div>Ruang iklan mobile</div></div>}
        <section className="safelink-card safelink-confirm">
          {countdown === null && (
            <>
              <h2>Link belum digenerate</h2>
              <p>Tekan tombol &quot;Generate Link&quot; di bagian atas untuk melanjutkan proses download.</p>
            </>
          )}
          {countdown !== null && !countdownDone && (
            <>
              <div className="safelink-modal-icon"><Loader2 size={22} className="safelink-spin" /></div>
              <span className="section-label">MOHON TUNGGU / PLEASE WAIT</span>
              <div className="safelink-countdown">{String(countdown).padStart(2, "0")}</div>
              <p>Menyiapkan tautan aman... {countdown} detik lagi. Mohon jangan tutup halaman ini.</p>
              <div className="safelink-progress safelink-progress-tall"><span style={{ width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%` }} /></div>
            </>
          )}
          {countdownDone && (
            <>
              <div className="safelink-modal-icon ready"><CheckCircle2 size={22} /></div>
              <span className="section-label">LINK SIAP / LINK READY</span>
              <h2>Tautan kamu sudah siap!</h2>
              <p>Klik tombol di bawah untuk menuju halaman unduhan asli.</p>
              <button className="primary-button safelink-go" onClick={handleGoToLink} disabled={!hasDestination}>
                <>{hasDestination ? <>Go to Link <ExternalLink size={17} /></> : <>Link tidak tersedia</>}</>
              </button>
            </>
          )}
          {!isVip && <div className="safelink-vip-offer">
            <Crown size={16} />
            <div><strong>Ingin download tanpa iklan?</strong><span>Jadi VIP dan akses semua link langsung.</span></div>
            <Link className="primary-button" href="/vip">Lihat paket</Link>
          </div>}
          {!hasDestination && <small className="safelink-note">Tautan tidak ditemukan — kembali ke postingsan dan pilih server download yang valid.</small>}
        </section>

        {!isVip && <div className="mobile-ad-slot" aria-label="Slot iklan bawah go to link"><div>Ruang iklan mobile</div></div>}

        <section className="safelink-warning">
          <ShieldAlert size={17} />
          <span>Peringatan: konten ini khusus <strong>18+</strong>. Pengguna di bawah umur dilarang mendownload game ini.</span>
        </section>

        <Link className="safelink-back" href={`/games/${encodeURIComponent(game.slug)}`}>← Kembali ke postingan {game.title}</Link>
      </div>

      <SiteFooter />
    </main>
  );
}
