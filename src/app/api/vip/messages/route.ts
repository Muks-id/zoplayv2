import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "vip-proofs";

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Riwayat percakapan user sendiri dengan admin. */
export async function GET() {
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

  // Bukti transfer disimpan di bucket privat, jadi dikirim lewat server dengan token sementara.
  const paths = (data ?? []).map((row) => (row as { attachment_url: string | null }).attachment_url).filter((path): path is string => Boolean(path));
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