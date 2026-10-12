import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { readUserIds } from "@/lib/server/tiers";

/**
 * Dua endpoint lama digabung ke /api/vip supaya jumlah serverless function
 * tetap di bawah batas Vercel Hobby (12):
 *   - POST /api/vip  { action: "badges", userIds }  (dari /api/vip/badges)
 *   - GET  /api/vip?action=messages                 (dari /api/vip/messages)
 */

const BUCKET = "vip-proofs";

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Daftar user yang sedang jadi VIP, untuk lencana di komentar dan chat.
 * Membaca ID user saja (bukan data pribadi), jadi tetap terbuka untuk pengunjung.
 */
export async function handleVipBadges(body: unknown) {
  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ vipUserIds: [] });

  const userIds = readUserIds(body);
  if (!userIds.length) return NextResponse.json({ vipUserIds: [] });

  const { data } = await supabase
    .from("vip_subscriptions")
    .select("user_id")
    .in("user_id", [...new Set(userIds)])
    .gt("expires_at", new Date().toISOString());

  return NextResponse.json({ vipUserIds: ((data ?? []) as { user_id: string }[]).map((row) => row.user_id) });
}

/** Riwayat percakapan user sendiri dengan admin. */
export async function handleVipMessages() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });

  const { data, error } = await supabase
    .from("vip_messages")
    .select("id, user_id, sender, message, attachment_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) return NextResponse.json({ error: "Gagal memuat percakapan." }, { status: 500 });

  // Bukti transfer disimpan di bucket privat, jadi dikirim lewat server
  // dengan URL bertanda tangan sementara.
  const paths = (data ?? [])
    .map((row) => (row as { attachment_url: string | null }).attachment_url)
    .filter((path): path is string => Boolean(path));
  const signedUrls: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) signedUrls[item.path] = item.signedUrl;
    }
  }

  return NextResponse.json({
    messages: (data ?? []).map((row) => {
      const message = row as { attachment_url: string | null };
      return {
        ...message,
        attachment_url: message.attachment_url ? signedUrls[message.attachment_url] ?? null : null,
      };
    }),
  });
}