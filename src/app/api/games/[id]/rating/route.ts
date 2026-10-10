import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getSummary(gameId: string, userId?: string) {
  const supabase = getServerSupabase();
  if (!supabase) return { response: NextResponse.json({ error: "Konfigurasi rating belum tersedia." }, { status: 503 }) };

  const { data, error } = await supabase.from("game_ratings").select("rating, user_id").eq("game_id", gameId);
  if (error) return { response: NextResponse.json({ error: "Rating game gagal dimuat." }, { status: 500 }) };

  const total = data.reduce((sum, row) => sum + row.rating, 0);
  return {
    summary: {
      average: data.length ? Number((total / data.length).toFixed(1)) : null,
      count: data.length,
      userRating: userId ? data.find((row) => row.user_id === userId)?.rating ?? null : null,
    },
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await currentUser();
  const result = await getSummary(id, user?.id);
  return "response" in result ? result.response : NextResponse.json(result.summary);
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Masuk dulu untuk memberi rating." }, { status: 401 });

  let body: { rating?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Rating tidak valid." }, { status: 400 });
  }
  if (typeof body.rating !== "number" || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Rating harus bernilai 1 sampai 5." }, { status: 400 });
  }

  const { id } = await params;
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ error: "Konfigurasi rating belum tersedia." }, { status: 503 });

  const { error } = await supabase.from("game_ratings").upsert({
    game_id: id,
    user_id: user.id,
    rating: body.rating,
    updated_at: new Date().toISOString(),
  }, { onConflict: "game_id,user_id" });
  if (error) return NextResponse.json({ error: "Rating gagal disimpan." }, { status: 500 });

  const result = await getSummary(id, user.id);
  return "response" in result ? result.response : NextResponse.json(result.summary);
}
