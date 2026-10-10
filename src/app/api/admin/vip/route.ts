import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isVipDuration } from "@/lib/server/vip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "vip-proofs";

async function adminSupabase() {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }) };
  if (user.publicMetadata.role !== "admin") {
    return { error: NextResponse.json({ error: "Akun ini tidak memiliki akses admin." }, { status: 403 }) };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { error: NextResponse.json({ error: "Konfigurasi server Supabase belum lengkap." }, { status: 503 }) };
  }

  return {
    adminId: user.id,
    adminName: user.fullName ?? user.username ?? "Admin",
    client: createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }),
  };
}

export async function GET() {
  const { error, client } = await adminSupabase();
  if (error) return error;

  const [requests, subscriptions, messages] = await Promise.all([
    client.from("vip_requests").select("id, user_id, username, duration_days, status, note, decided_at, created_at").order("created_at", { ascending: false }).limit(100),
    client.from("vip_subscriptions").select("user_id, started_at, expires_at, granted_by").order("expires_at", { ascending: false }),
    client.from("vip_messages").select("id, user_id, sender, message, attachment_url, read_by_admin, created_at").order("created_at", { ascending: false }).limit(200),
  ]);

  if (requests.error || subscriptions.error || messages.error) {
    return NextResponse.json({ error: "Data VIP gagal dimuat." }, { status: 500 });
  }

  const rows = (messages.data ?? []) as { attachment_url: string | null }[];
  const paths = rows.map((row) => row.attachment_url).filter((path): path is string => Boolean(path));
  const signedUrls: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await client.storage.from(BUCKET).createSignedUrls(paths, 3600);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) signedUrls[item.path] = item.signedUrl;
    }
  }

  return NextResponse.json({
    requests: requests.data ?? [],
    subscriptions: subscriptions.data ?? [],
    messages: rows.map((row) => ({ ...row, attachment_url: row.attachment_url ? signedUrls[row.attachment_url] ?? null : null })),
  });
}

/** Aksi admin: activate (aktifkan/perpanjang), reject (tolak), extend (perpanjang), revoke (batalkan), reply (balas chat). */
export async function POST(request: Request) {
  const { error, adminId, client } = await adminSupabase();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as
    | { action?: string; userId?: string; durationDays?: unknown; requestId?: string; message?: unknown }
    | null;

  const action = body?.action;
  if (!action) return NextResponse.json({ error: "Aksi tidak valid." }, { status: 400 });

  if (action === "reply") {
    const targetUserId = typeof body?.userId === "string" ? body.userId : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!targetUserId || !message) return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });

    const { error: insertError } = await client
      .from("vip_messages")
      .insert({ user_id: targetUserId, sender: "admin", message: message.slice(0, 2000) });
    if (insertError) return NextResponse.json({ error: "Balasan gagal dikirim." }, { status: 500 });

    await client.from("vip_messages").update({ read_by_admin: true }).eq("user_id", targetUserId).eq("sender", "user");
    return NextResponse.json({ ok: true });
  }

  const targetUserId = typeof body?.userId === "string" ? body.userId : "";
  if (!targetUserId) return NextResponse.json({ error: "User tidak valid." }, { status: 400 });

  if (action === "activate" || action === "extend") {
    const durationDays = isVipDuration(body?.durationDays) ? body.durationDays : 7;
    const { data, error: grantError } = await client.rpc("grant_vip", {
      p_user_id: targetUserId,
      p_duration_days: durationDays,
      p_granted_by: adminId,
    });

    // Cadangan bila migration 009 belum dijalankan: tulis langsung.
    let expiresAt: string | null = (data as string | null) ?? null;
    if (grantError) {
      const { data: current } = await client.from("vip_subscriptions").select("expires_at").eq("user_id", targetUserId).maybeSingle();
      const base = current?.expires_at && new Date(current.expires_at) > new Date() ? new Date(current.expires_at) : new Date();
      expiresAt = new Date(base.getTime() + durationDays * 86_400_000).toISOString();
      const { error: upsertError } = await client.from("vip_subscriptions").upsert({
        user_id: targetUserId,
        started_at: base.getTime() > Date.now() ? (current?.expires_at ?? new Date().toISOString()) : new Date().toISOString(),
        expires_at: expiresAt,
        granted_by: adminId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (upsertError) return NextResponse.json({ error: "VIP gagal diaktifkan." }, { status: 500 });
    }

    if (typeof body?.requestId === "string" && body.requestId) {
      await client.from("vip_requests")
        .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: adminId })
        .eq("id", body.requestId);
    }

    await client.from("vip_messages").update({ read_by_admin: true }).eq("user_id", targetUserId).eq("sender", "user");
    const expiryLabel = expiresAt
      ? new Date(expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
      : "beberapa waktu lagi";
    await client.from("vip_messages").insert({
      user_id: targetUserId,
      sender: "admin",
      message: `VIP aktif sampai ${expiryLabel}. Nikmati akses download tanpa iklan.`,
    });

    return NextResponse.json({ ok: true, expiresAt });
  }

  if (action === "reject") {
    await client.from("vip_subscriptions").delete().eq("user_id", targetUserId);
    if (typeof body?.requestId === "string" && body.requestId) {
      await client.from("vip_requests")
        .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: adminId })
        .eq("id", body.requestId);
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "revoke") {
    const { error: deleteError } = await client.from("vip_subscriptions").delete().eq("user_id", targetUserId);
    if (deleteError) return NextResponse.json({ error: "VIP gagal dibatalkan." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}

