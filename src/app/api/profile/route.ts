import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getProfileSummary, setProfileAvatar } from "@/lib/server/profiles";
import { getVipStatus } from "@/lib/server/vip";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });

  const user = await currentUser();
  const name = user?.username || user?.fullName || user?.primaryEmailAddress?.emailAddress || "Player";

  const [profile, vip] = await Promise.all([getProfileSummary(userId, name), getVipStatus(userId)]);
  return NextResponse.json({ profile, vip });
}

/** Menyimpan avatar profil (preset SVG data URI, foto sendiri sebagai data URL, atau null). */
export async function POST(request: Request) {
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
