import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getVipStatus, isVipDuration, VIP_PRICES } from "@/lib/server/vip";
import { compressGameImage, readImageSource } from "@/lib/server/game-images";

export const runtime = "nodejs";

const BUCKET = "vip-proofs";

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireUser() {
  const { userId } = await auth();
  if (!userId) return { error: NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }) };

  const user = await currentUser();
  const username = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "Player";
  return { userId, username };
}

function isImageFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

/** Status langganan + harga paket, dipakai halaman /vip dan navbar. */
export async function GET() {
  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });

  const { userId, error } = await requireUser();
  if (error) return error;

  const vip = await getVipStatus(userId);

  const { data: lastRequest } = await supabase
    .from("vip_requests")
    .select("id, duration_days, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  return NextResponse.json({
    vip,
    prices: VIP_PRICES,
    lastRequest: lastRequest?.[0] ?? null,
  });
}

/**
 * Kirim pesan ke admin. Menerima JSON (teks) atau FormData (teks + bukti transfer).
 * Otomatis membuka percakapan bila belum ada pesan sebelumnya.
 */
export async function POST(request: Request) {
  const { userId, username, error: authError } = await requireUser();
  if (authError) return authError;

  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });

  let message = "";
  let durationDays: unknown = null;
  let proofFile: File | null = null;
  let note = "";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const text = formData.get("message");
    message = typeof text === "string" ? text.trim() : "";
    note = typeof formData.get("note") === "string" ? String(formData.get("note")).trim() : "";
    const duration = formData.get("durationDays");
    if (duration !== null && duration !== "") durationDays = Number(duration);
    const proof = formData.get("proof");
    if (isImageFile(proof)) proofFile = proof;
  } else {
    const body = (await request.json().catch(() => null)) as { message?: unknown; durationDays?: unknown; note?: unknown } | null;
    message = typeof body?.message === "string" ? body.message.trim() : "";
    note = typeof body?.note === "string" ? body.note.trim() : "";
    durationDays = body?.durationDays ?? null;
  }

  let attachmentUrl: string | null = null;
  if (proofFile) {
    if (proofFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran bukti transfer maksimal 5 MB." }, { status: 400 });
    }
    let compressed: Uint8Array;
    try {
      const source = await readImageSource(proofFile, "");
      if (!source) return NextResponse.json({ error: "Bukti transfer tidak valid." }, { status: 400 });
      compressed = await compressGameImage(source, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bukti transfer tidak valid.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const path = `${userId}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, compressed, {
      contentType: "image/webp",
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: "Bukti transfer gagal diunggah." }, { status: 500 });
    attachmentUrl = path;
  }

  if (!message && !attachmentUrl) {
    return NextResponse.json({ error: "Tulis pesan atau lampirkan bukti transfer." }, { status: 400 });
  }

  // Pengajuan langganan (opsional, bisa dikirim bersamaan dengan pesan pertama).
  let requestId: string | null = null;
  if (isVipDuration(durationDays)) {
    const { data, error: requestError } = await supabase
      .from("vip_requests")
      .insert({ user_id: userId, username, duration_days: durationDays, note: note || null })
      .select("id")
      .single();
    if (requestError) return NextResponse.json({ error: "Pengajuan VIP gagal disimpan." }, { status: 500 });
    requestId = data.id;
  } else if (note) {
    return NextResponse.json({ error: "Durasi VIP tidak valid." }, { status: 400 });
  }

  const { data: saved, error: messageError } = await supabase
    .from("vip_messages")
    .insert({
      user_id: userId,
      sender: "user",
      message: message || "Bukti transfer dikirim.",
      attachment_url: attachmentUrl,
    })
    .select("id, user_id, sender, message, attachment_url, created_at")
    .single();

  if (messageError) return NextResponse.json({ error: "Pesan gagal dikirim." }, { status: 500 });

  return NextResponse.json({ message: saved, requestId }, { status: 201 });
}