import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const WINDOW_SECONDS = 90;
const COOKIE = "zoplay_presence";

function serviceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function sessionFrom(cookieHeader: string | null) {
  const raw = cookieHeader?.split(/;\s*/).find((item) => item.startsWith(`${COOKIE}=`))?.split("=")[1];
  return raw && /^[a-zA-Z0-9-]{8,64}$/.test(raw) ? raw : null;
}

async function countOnline(supabase: NonNullable<ReturnType<typeof serviceClient>>) {
  const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();
  const { count } = await supabase
    .from("presence_sessions")
    .select("session_id", { count: "exact", head: true })
    .gt("last_seen", since);
  return count ?? 0;
}

/** Heartbeat pengunjung: memperbarui sesi lalu mengembalikan jumlah yang sedang online. */
export async function POST(request: Request) {
  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ online: null });

  let sessionId = sessionFrom(request.headers.get("cookie"));
  const isNew = !sessionId;
  if (!sessionId) sessionId = randomUUID();

  await supabase.from("presence_sessions").upsert({ session_id: sessionId, last_seen: new Date().toISOString() });

  // Bersihkan sesi lama sesekali agar tabel tidak membengkak.
  if (isNew || Math.random() < 0.05) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    void supabase.from("presence_sessions").delete().lt("last_seen", cutoff);
  }

  const online = await countOnline(supabase);
  const response = NextResponse.json({ online });
  if (isNew) {
    response.cookies.set(COOKIE, sessionId, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return response;
}

export async function GET() {
  const supabase = serviceClient();
  if (!supabase) return NextResponse.json({ online: null });
  return NextResponse.json({ online: await countOnline(supabase) });
}
