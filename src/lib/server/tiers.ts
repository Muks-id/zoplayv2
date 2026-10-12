import { createClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { tierForXp } from "@/lib/server/profiles";

/**
 * Tier title per user (Rookie/Gamer/Pro Player/...) berdasarkan XP.
 * Dipakai untuk menampilkan tier di samping nama pada chat dan komentar.
 *
 * Logika ini sebelumnya hidup di route /api/profiles/tiers. Digabung ke
 * /api/profile supaya jumlah serverless function tetap di bawah batas Vercel.
 */

/** Ambil ID user dari body POST; batasi 200 agar query tidak meledak. */
export function readUserIds(body: unknown): string[] {
  const userIds = body && typeof body === "object" && "userIds" in body
    ? (body as { userIds?: unknown }).userIds
    : null;
  if (!Array.isArray(userIds)) return [];
  return (userIds as unknown[])
    .filter((id): id is string => typeof id === "string")
    .slice(0, 200);
}

export async function handleTiers(body: unknown) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ tiers: {}, admins: [] });

  const userIds = readUserIds(body);
  if (!userIds.length) return NextResponse.json({ tiers: {}, admins: [] });

  const unique = [...new Set(userIds)];
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await supabase
    .from("profiles")
    .select("user_id, xp")
    .in("user_id", unique);

  // Admin selalu bertier Legend, dan juga diberi label "Admin" terpisah.
  const admins: string[] = [];
  try {
    const client = await clerkClient();
    for (const id of unique) {
      try {
        const u = await client.users.getUser(id);
        if ((u.publicMetadata as { role?: string } | undefined)?.role === "admin") admins.push(id);
      } catch {
        // user tidak ditemukan — lewati
      }
    }
  } catch {
    // Clerk tidak tersedia — lanjut tanpa label admin
  }

  const tiers: Record<string, string> = {};
  const found = new Set((data ?? []).map((row) => row.user_id));
  for (const row of (data ?? []) as { user_id: string; xp: number }[]) {
    tiers[row.user_id] = tierForXp(row.xp).title;
  }
  // User tanpa riwayat profil dianggap Rookie.
  for (const id of unique) {
    if (!found.has(id)) tiers[id] = tierForXp(0).title;
  }
  for (const id of admins) tiers[id] = tierForXp(3500).title; // Legend

  return NextResponse.json({ tiers, admins });
}