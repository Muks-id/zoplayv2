import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isRecord } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Hapus komentar atau pesan chat (khusus admin).
 *
 * Balasannya `POST /api/admin/delete` dengan JSON:
 *   { "kind": "comment", "id": "<uuid>" }
 *   { "kind": "chat",    "id": "<uuid>" }
 *
 * Balasan komentar ikut terhapus karena `parent_id` memakai
 * `ON DELETE CASCADE` (lihat migration 007). Pesan chat yang membalas
 * pesan terhapus tidak ikut terhapus; `reply_to_id` dibiarkan null
 * supaya tidak ada referensi menggantung.
 */

const TABLES = {
  comment: "comments",
  chat: "public_chat",
} as const;

type Kind = keyof typeof TABLES;

function isKind(value: unknown): value is Kind {
  return value === "comment" || value === "chat";
}

/** UUID v4/bentuk umum dari PostgREST, untuk mencegah input sampah ke query. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.publicMetadata.role !== "admin") {
    return NextResponse.json({ error: "Akun ini tidak memiliki akses admin." }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });

  const kind = body.kind;
  const id = body.id;
  if (!isKind(kind)) return NextResponse.json({ error: "Jenis data tidak dikenal." }, { status: 400 });
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Konfigurasi server Supabase belum lengkap." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const table = TABLES[kind];

  // Balasan chat yang menunjuk pesan ini harus dilepas lebih dulu, karena
  // `reply_to_id` tidak memakai cascade. Tanpa ini, baris yang tersisa
  // akan menyalahi pesan yang sudah dihapus.
  if (kind === "chat") {
    const { error: detachError } = await supabase
      .from("public_chat")
      .update({ reply_to_id: null })
      .eq("reply_to_id", id);
    if (detachError) return NextResponse.json({ error: "Gagal melepas balasan pesan." }, { status: 500 });
  }

  const { data, error } = await supabase.from(table).delete().eq("id", id).select("id");
  if (error) return NextResponse.json({ error: "Gagal menghapus data." }, { status: 500 });

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Data tidak ditemukan atau sudah dihapus." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id });
}