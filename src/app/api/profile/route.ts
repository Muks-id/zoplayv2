import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getProfileSummary, setProfileAvatar } from "@/lib/server/profiles";
import { getVipStatus } from "@/lib/server/vip";
import { handleTiers } from "@/lib/server/tiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST juga melayani aksi "tiers" (dahulu route /api/profiles/tiers). */
function isTiersRequest(body: unknown): boolean {
  return Boolean(body && typeof body === "object" && "action" in body && (body as { action?: unknown }).action === "tiers");
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });

  const user = await currentUser();
  const name = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Player";

  const [profile, vip] = await Promise.all([getProfileSummary(userId, name), getVipStatus(userId)]);
  return NextResponse.json({ profile, vip });
}

/** Menyimpan avatar profil, atau answering `action: "tiers"` untuk lencana tier. */
export async function POST(request: Request) {
  // Aksi "tiers" bersifat publik (dipakai chat & komentar untuk user lain),
  // jadi harus dicek sebelum guard login di bawah.
  const rawBody: unknown = await request.clone().json().catch(() => null);
  if (isTiersRequest(rawBody)) return handleTiers(rawBody);

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });

  const user = await currentUser();
  const name = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Player";

  const body = (await request.json().catch(() => null)) as { avatarUrl?: unknown } | null;
  const avatarUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl : body?.avatarUrl === null ? null : undefined;
  if (avatarUrl === undefined) return NextResponse.json({ error: "avatarUrl tidak valid." }, { status: 400 });
  if (typeof avatarUrl === "string" && avatarUrl.length > 3_000_000) {
    return NextResponse.json({ error: "Foto terlalu besar. Maksimal 2 MB." }, { status: 400 });
  }

  const ok = await setProfileAvatar(userId, name, avatarUrl);
  if (!ok) return NextResponse.json({ error: "Gagal menyimpan avatar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
