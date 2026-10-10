import "server-only";
import { createClient } from "@supabase/supabase-js";

export type TierInfo = { title: string; nextTitle: string | null; xpIntoTier: number; xpForNext: number | null; progress: number };

const TIERS: { at: number; title: string }[] = [
  { at: 0, title: "Rookie" },
  { at: 150, title: "Gamer" },
  { at: 400, title: "Pro Player" },
  { at: 900, title: "Veteran" },
  { at: 1800, title: "Elite" },
  { at: 3500, title: "Legend" },
];

export const XP_PER_DOWNLOAD = 25;

export function tierForXp(xp: number): TierInfo {
  let index = 0;
  for (let i = 0; i < TIERS.length; i += 1) if (xp >= TIERS[i].at) index = i;
  const current = TIERS[index];
  const next = TIERS[index + 1] ?? null;
  if (!next) return { title: current.title, nextTitle: null, xpIntoTier: xp - current.at, xpForNext: null, progress: 100 };
  const span = next.at - current.at;
  return {
    title: current.title,
    nextTitle: next.title,
    xpIntoTier: xp - current.at,
    xpForNext: span,
    progress: Math.min(100, Math.round(((xp - current.at) / span) * 100)),
  };
}

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Menambah XP dan mencatat riwayat download untuk user yang login. */
export async function recordDownloadXp(userId: string, username: string, slug: string, platform: string, serverName: string) {
  const supabase = serviceClient();
  if (!supabase) return;

  const { data: profile } = await supabase.from("profiles").select("xp").eq("user_id", userId).maybeSingle();
  if (profile) {
    await supabase.from("profiles").update({ xp: (profile.xp ?? 0) + XP_PER_DOWNLOAD, username, updated_at: new Date().toISOString() }).eq("user_id", userId);
  } else {
    await supabase.from("profiles").insert({ user_id: userId, username, xp: XP_PER_DOWNLOAD });
  }

  await supabase.from("download_history").insert({ user_id: userId, game_slug: slug, platform, server_name: serverName });
}

export type ProfileSummary = {
  username: string;
  xp: number;
  tier: TierInfo;
  avatarUrl: string | null;
  history: { id: string; game_slug: string; platform: string | null; server_name: string | null; created_at: string }[];
};

export async function getProfileSummary(userId: string, username: string): Promise<ProfileSummary> {
  const supabase = serviceClient();
  const fallback: ProfileSummary = { username, xp: 0, tier: tierForXp(0), avatarUrl: null, history: [] };
  if (!supabase) return fallback;

  const { data: profile } = await supabase.from("profiles").select("xp, username, avatar_url").eq("user_id", userId).maybeSingle();
  const { data: history } = await supabase
    .from("download_history")
    .select("id, game_slug, platform, server_name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const xp = profile?.xp ?? 0;
  return { username: profile?.username ?? username, xp, tier: tierForXp(xp), avatarUrl: profile?.avatar_url ?? null, history: (history ?? []) as ProfileSummary["history"] };
}

/** Menyimpan avatar profil (data URI preset / foto sendiri / null untuk menghapus). */
export async function setProfileAvatar(userId: string, username: string, avatarUrl: string | null) {
  const supabase = serviceClient();
  if (!supabase) return false;
  const { data: existing } = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq("user_id", userId);
    return !error;
  }
  const { error } = await supabase.from("profiles").insert({ user_id: userId, username, xp: 0, avatar_url: avatarUrl });
  return !error;
}
