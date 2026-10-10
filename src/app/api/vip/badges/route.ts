import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daftar user yang sedang jadi VIP, dipakai untuk menampilkan lencana di komentar
 * dan chat. Membaca ID user (bukan data pribadi), jadi tetap terbuka untuk pengunjung.
 */
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ vipUserIds: [] });

  const body = (await request.json().catch(() => null)) as { userIds?: unknown } | null;
  const userIds = Array.isArray(body?.userIds)
    ? (body.userIds as unknown[]).filter((id): id is string => typeof id === "string").slice(0, 200)
    : [];
  if (!userIds.length) return NextResponse.json({ vipUserIds: [] });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await supabase
    .from("vip_subscriptions")
    .select("user_id")
    .in("user_id", [...new Set(userIds)])
    .gt("expires_at", new Date().toISOString());

  return NextResponse.json({ vipUserIds: ((data ?? []) as { user_id: string }[]).map((row) => row.user_id) });
}