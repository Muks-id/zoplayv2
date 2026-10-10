import { notFound, redirect } from "next/navigation";
import { encryptSafelinkToken } from "@/lib/server/safelink-token";

export const dynamic = "force-dynamic";

/**
 * Route lama (/safelink/[slug]?version=..&platform=..&server=..).
 * Tetap dipertahankan agar link lama tidak rusak, lalu dialihkan ke format baru /safelink?id=<token terenkripsi>.
 */
export default async function LegacySafelinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ version?: string; platform?: string; server?: string }>;
}) {
  const { slug } = await params;
  const { version, platform, server } = await searchParams;
  if (!version || !server || (platform !== "windows" && platform !== "android")) notFound();

  redirect(`/safelink?id=${encodeURIComponent(encryptSafelinkToken({ slug, versionId: version, platform, serverName: server }))}`);
}
