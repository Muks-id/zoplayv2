"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SignOutButton, UserProfile, useUser } from "@clerk/nextjs";
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  Crown,
  Download,
  LogOut,
  Settings,
  Trophy,
  UserRound,
} from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";
import { SiteFooter } from "@/components/site-footer";
import { tierStyle } from "@/lib/tier-style";
import { VipBadge } from "@/components/vip-badge";
import { isRecord } from "@/lib/utils";
import { AVATAR_OPTIONS } from "@/lib/avatars";

type ProfileData = {
  username: string;
  xp: number;
  tier: { title: string; nextTitle: string | null; xpIntoTier: number; xpForNext: number | null; progress: number };
  avatarUrl: string | null;
  history: { id: string; game_slug: string; platform: string | null; server_name: string | null; created_at: string }[];
};

type VipData = { isVip: boolean; expiresAt: string | null; daysLeft: number };

const banner = "/profile-banner.gif";

/**
 * Tabel tier harus sinkron dengan TIERS di src/lib/server/profiles.ts.
 * Nilai XP di sini juga dipakai untuk menghitung jumlah download minimum.
 */
const XP_PER_DOWNLOAD = 25;
const TIER_ROWS: { title: string; xp: number; downloads: number }[] = (
  [
    { title: "Rookie", xp: 0 },
    { title: "Gamer", xp: 150 },
    { title: "Pro Player", xp: 400 },
    { title: "Veteran", xp: 900 },
    { title: "Elite", xp: 1800 },
    { title: "Legend", xp: 3500 },
  ] as { title: string; xp: number }[]
).map((row) => ({ ...row, downloads: Math.ceil(row.xp / XP_PER_DOWNLOAD) }));

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [vip, setVip] = useState<VipData | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const refreshProfile = async () => {
    try {
      const r = await fetch("/api/profile");
      if (r.ok) {
        const d = (await r.json()) as { profile?: ProfileData; vip?: VipData } | null;
        if (d?.profile) setProfile(d.profile);
        if (d?.vip) setVip(d.vip);
      }
    } catch {
      // abaikan — data lokal tetap dipakai
    }
  };

  useEffect(() => {
    void refreshProfile();

    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem("zoplay.bookmarks.v1") ?? "[]");
      if (Array.isArray(saved)) setBookmarks(saved.filter((v): v is string => typeof v === "string"));
    } catch {
      setBookmarks([]);
    }
  }, []);

  const username = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || profile?.username || "Player";
  const initials = username.slice(0, 2).toUpperCase();

  // Admin selalu tampil dengan tier tertinggi (Legend), apa pun XP-nya.
  const isAdmin = user?.publicMetadata?.role === "admin";
  const title = isAdmin ? "Legend" : (profile?.tier.title ?? "Rookie");
  const style = tierStyle(title);
  // Legend punya background gradient multi-warna; VIP memakai emas bergeser.
  const badgeStyle = isAdmin
    ? { color: style.color, borderColor: style.borderColor, backgroundImage: style.background }
    : { color: style.color, borderColor: style.borderColor, background: style.background };

  // Admin selalu di Legend, jadi XP dan bar progresnya ikut menyesuaikan
  // supaya tidak menampilkan "25 XP menuju Legend" yang membingungkan.
  const LEGEND_XP = 3500;
  const displayXp = isAdmin ? LEGEND_XP : (profile?.xp ?? 0);
  const progress = isAdmin ? 100 : (profile?.tier.progress ?? 0);

  return (
    <main className="profile-page">
      <SiteNavigation currentPage="profile" />

      <div className="profile-container">
        {/* Kartu profil utama dengan thumbnail fade background */}
        <section className="profile-hero" style={{ backgroundImage: `url("${banner}")` }}>
          <div className="profile-hero-shade" />
          <div className="profile-hero-body">
            <div className="profile-avatar">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt={username} />
              ) : user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt={username} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="profile-identity">
              <div className="profile-name-row">
                <h1>{username}</h1>
              </div>
              <div className="chat-badges profile-badges">
                {isAdmin && <span className="admin-badge">Admin</span>}
                <span className="tier-badge" style={badgeStyle}>{title}</span>
                {vip?.isVip && <VipBadge />}
              </div>
              <div className="profile-xp">
                <div className="profile-xp-head">
                  <span>{displayXp} XP</span>
                  <span>
                    {isAdmin
                      ? "Tier tertinggi tercapai"
                      : profile?.tier.nextTitle
                        ? `${profile.tier.xpIntoTier} / ${profile.tier.xpForNext} XP menuju ${profile.tier.nextTitle}`
                        : "Tier tertinggi tercapai"}
                  </span>
                </div>
                <div className="profile-xp-bar">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Daftar menu */}
        <section className="profile-menu">
          <MenuRow icon={<Bookmark size={17} />} title="Bookmark History" subtitle={`${bookmarks.length} game tersimpan`} open={open === "bookmarks"} onToggle={() => setOpen(open === "bookmarks" ? null : "bookmarks")}>
            {bookmarks.length ? (
              <div className="profile-chip-list">
                {bookmarks.map((title) => (
                  <span className="profile-chip" key={title}>{title}</span>
                ))}
              </div>
            ) : (
              <p className="profile-empty">Belum ada bookmark. Tandai game yang kamu suka dari halaman detailnya.</p>
            )}
          </MenuRow>

          <MenuRow icon={<Download size={17} />} title="Download History" subtitle={`${profile?.history.length ?? 0} riwayat terakhir`} open={open === "history"} onToggle={() => setOpen(open === "history" ? null : "history")}>
            {profile?.history.length ? (
              <ul className="profile-history">
                {profile.history.map((item) => (
                  <li key={item.id}>
                    <strong>{item.game_slug}</strong>
                    <span>{item.platform ?? "-"} · {item.server_name ?? "-"} · {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="profile-empty">Belum ada riwayat download.</p>
            )}
          </MenuRow>

          <MenuRow icon={<Trophy size={17} />} title="Tabel Tier" subtitle="Syarat XP dan jumlah download" open={open === "tiers"} onToggle={() => setOpen(open === "tiers" ? null : "tiers")}>
            <TierTable currentTitle={title} />
          </MenuRow>

          <Link className="profile-row" href="/vip">
            <Crown size={17} />
            <div className="profile-row-main">
              <strong>Paket VIP</strong>
              <span>{vip?.isVip ? `Aktif, sisa ${vip.daysLeft} hari` : "Belum berlangganan — download tanpa iklan"}</span>
            </div>
            <ChevronRight size={17} />
          </Link>

          <MenuRow icon={<Settings size={17} />} title="Setting Account" subtitle="Email, nama profil, keamanan" open={open === "settings"} onToggle={() => setOpen(open === "settings" ? null : "settings")}>
            <div className="profile-userprofile">
              <UserProfile routing="hash" />
            </div>
          </MenuRow>

          <MenuRow icon={<UserRound size={17} />} title="Foto Profil" subtitle="Pilih avatar atau unggah foto sendiri" open={open === "avatar"} onToggle={() => setOpen(open === "avatar" ? null : "avatar")}>
            <AvatarPicker
              current={profile?.avatarUrl ?? null}
              onSave={async (avatarUrl) => {
                const res = await fetch("/api/profile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ avatarUrl }),
                });
                if (res.ok) {
                  await refreshProfile();
                } else {
                  const err: unknown = await res.json().catch(() => null);
                  throw new Error(isRecord(err) && typeof err.error === "string" ? err.error : "Gagal menyimpan avatar");
                }
              }}
            />
          </MenuRow>

          <SignOutButton>
            <button className="profile-row is-danger" type="button">
              <LogOut size={17} />
              <div className="profile-row-main">
                <strong>Logout</strong>
                <span>Keluar dari akun ZOPLAY</span>
              </div>
            </button>
          </SignOutButton>
        </section>
      </div>

      {!isLoaded && <p className="profile-loading">Memuat profil...</p>}
      <SiteFooter />
    </main>
  );
}

function TierTable({ currentTitle }: { currentTitle: string }) {
  const currentIndex = TIER_ROWS.findIndex((row) => row.title === currentTitle);

  return (
    <div className="tier-table-wrap">
      <table className="tier-table">
        <thead>
          <tr>
            <th scope="col">Tier</th>
            <th scope="col">XP</th>
            <th scope="col">Download</th>
          </tr>
        </thead>
        <tbody>
          {TIER_ROWS.map((row, index) => {
            const style = tierStyle(row.title);
            const isCurrent = row.title === currentTitle;
            const isReached = currentIndex >= 0 && index <= currentIndex;
            return (
              <tr key={row.title} className={isCurrent ? "is-current" : undefined}>
                <th scope="row">
                  <span
                    className="tier-badge"
                    style={
                      row.title === "Legend"
                        ? { color: style.color, borderColor: style.borderColor, backgroundImage: style.background }
                        : { color: style.color, borderColor: style.borderColor, background: style.background }
                    }
                  >
                    {row.title}
                  </span>
                </th>
                <td>{row.xp.toLocaleString("id-ID")}</td>
                <td>{row.downloads.toLocaleString("id-ID")}</td>
                <td className="tier-table-mark">
                  {isCurrent ? <span className="tier-mark is-you">Kamu</span> : isReached ? "✓" : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="profile-empty">Setiap download menambah {XP_PER_DOWNLOAD} XP. Tier naik otomatis sesuai XP yang terkumpul.</p>
    </div>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="profile-menu-item">
      <button className="profile-row" type="button" onClick={onToggle} aria-expanded={open}>
        {icon}
        <div className="profile-row-main">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        <ChevronDown size={17} className={open ? "chevron open" : "chevron"} />
      </button>
      {open && <div className="profile-panel">{children}</div>}
    </div>
  );
}

function AvatarPicker({
  current,
  onSave,
}: {
  current: string | null;
  onSave: (avatarUrl: string | null) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const save = async (avatarUrl: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(avatarUrl);
    } catch {
      setError("Gagal menyimpan avatar. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran foto maksimal 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") void save(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="avatar-picker">
      <div className="avatar-grid">
        {AVATAR_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={current === option.src ? "avatar-option is-selected" : "avatar-option"}
            onClick={() => void save(option.src)}
            disabled={saving}
            title={option.label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={option.src} alt={option.label} loading="lazy" width={256} height={256} />
          </button>
        ))}
      </div>
      <div className="avatar-actions">
        <button type="button" className="avatar-upload" onClick={() => fileRef.current?.click()} disabled={saving}>
          Unggah foto sendiri
        </button>
        <button type="button" className="avatar-remove" onClick={() => void save(null)} disabled={saving}>
          Hapus avatar
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {error && <p className="profile-empty">{error}</p>}
    </div>
  );
}
