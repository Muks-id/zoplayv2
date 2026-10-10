import "server-only";
import { createClient } from "@supabase/supabase-js";

import { VIP_DURATIONS, VIP_PRICES, type VipDuration } from "@/lib/vip-shared";

export { VIP_DURATIONS, VIP_PRICES };
export type { VipDuration };

export type VipStatus = {
  isVip: boolean;
  expiresAt: string | null;
  daysLeft: number;
};

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Status VIP user berdasarkan langganan yang masih berlaku.
 * Selalu dibandingkan dengan waktu server, jadi tidak bisa dimanipulasi dari browser.
 */
export async function getVipStatus(userId: string | null | undefined): Promise<VipStatus> {
  if (!userId) return { isVip: false, expiresAt: null, daysLeft: 0 };

  const supabase = serviceClient();
  if (!supabase) return { isVip: false, expiresAt: null, daysLeft: 0 };

  const { data } = await supabase
    .from("vip_subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.expires_at) return { isVip: false, expiresAt: null, daysLeft: 0 };

  const expiresAt = new Date(data.expires_at);
  const remainingMs = expiresAt.getTime() - Date.now();
  if (remainingMs <= 0) return { isVip: false, expiresAt: null, daysLeft: 0 };

  return { isVip: true, expiresAt: expiresAt.toISOString(), daysLeft: Math.ceil(remainingMs / 86_400_000) };
}

/** Daftar user_id yang sedang jadi VIP, untuk menampilkan lencana sekaligus. */
export async function getVipUserIds(userIds: string[]): Promise<Set<string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return new Set();

  const supabase = serviceClient();
  if (!supabase) return new Set();

  const { data } = await supabase
    .from("vip_subscriptions")
    .select("user_id, expires_at")
    .in("user_id", unique)
    .gt("expires_at", new Date().toISOString());

  return new Set(((data ?? []) as { user_id: string }[]).map((row) => row.user_id));
}

export function isVipDuration(value: unknown): value is VipDuration {
  return typeof value === "number" && (VIP_DURATIONS as readonly number[]).includes(value);
}

export function formatVipExpiry(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}