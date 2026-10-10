import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { compressGameImage, readImageSource } from "@/lib/server/game-images";
import { parseDownloadVersions } from "@/lib/server/download-versions";

export const runtime = "nodejs";

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || `game-${crypto.randomUUID().slice(0, 8)}`;
}

function isImageFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.publicMetadata.role !== "admin") {
    return NextResponse.json({ error: "Akun ini tidak memiliki akses admin." }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Konfigurasi server Supabase belum lengkap." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase
    .from("games")
    .select("id, slug, title, thumbnail, description, developer, release_date, file_size, is_featured, is_18_plus, category:categories(name), game_galleries(id, image_url), game_download_versions(id, version_label, download_links(id, platform, server_name, destination_url))")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Daftar game gagal dimuat." }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.publicMetadata.role !== "admin") {
    return NextResponse.json({ error: "Akun ini tidak memiliki akses admin." }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Konfigurasi server Supabase belum lengkap." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form upload tidak dapat dibaca." }, { status: 400 });
  }

  const title = getText(formData, "title");
  const categoryName = getText(formData, "category");
  const description = getText(formData, "description");
  const thumbnailValue = formData.get("thumbnail");
  const thumbnailFile = isImageFile(thumbnailValue) ? thumbnailValue : null;
  const thumbnailUrl = getText(formData, "thumbnail_url");
  const screenshots = formData.getAll("screenshots").filter(isImageFile);
  const screenshotUrls = getText(formData, "screenshot_urls").split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
  const downloadVersions = parseDownloadVersions(getText(formData, "downloadVersions"));

  if (!title || !categoryName || !description || (!thumbnailFile && !thumbnailUrl)) {
    return NextResponse.json({ error: "Lengkapi judul, kategori, deskripsi, dan thumbnail melalui file atau URL." }, { status: 400 });
  }
  if (thumbnailFile && thumbnailUrl) {
    return NextResponse.json({ error: "Pilih file atau URL untuk thumbnail, jangan keduanya." }, { status: 400 });
  }
  if (screenshots.length > 0 && screenshotUrls.length > 0) {
    return NextResponse.json({ error: "Pilih file atau URL untuk screenshot, jangan keduanya." }, { status: 400 });
  }
  const screenshotCount = screenshots.length || screenshotUrls.length;
  if (screenshotCount < 3 || screenshotCount > 5) {
    return NextResponse.json({ error: "Unggah 3 sampai 5 screenshot gameplay." }, { status: 400 });
  }
  if (!downloadVersions) {
    return NextResponse.json({ error: "Tambahkan versi dengan label unik dan minimal satu link server." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  if (getText(formData, "is_featured") === "true") {
    const { count, error } = await supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("is_featured", true);
    if (error) return NextResponse.json({ error: "Status featured belum dapat diperiksa." }, { status: 500 });
    if ((count ?? 0) >= 5) return NextResponse.json({ error: "Maksimal lima game dapat menjadi featured." }, { status: 409 });
  }

  const slug = slugify(title);
  const uploadedPaths: string[] = [];
  let gameId: string | null = null;

  const uploadImage = async (source: Uint8Array, width: number) => {
    const buffer = await compressGameImage(source, width);

    const path = `${slug}/${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage.from("game-media").upload(path, buffer, {
      contentType: "image/webp",
      upsert: false,
    });
    if (error) throw new Error("Gagal mengunggah gambar ke Supabase Storage.");

    uploadedPaths.push(path);
    return supabase.storage.from("game-media").getPublicUrl(path).data.publicUrl;
  };

  try {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .upsert({ name: categoryName, slug: slugify(categoryName) }, { onConflict: "slug" })
      .select("id")
      .single();
    if (categoryError) throw new Error("Gagal menyimpan kategori game.");

    const thumbnailBuffer = await readImageSource(thumbnailFile, thumbnailUrl);
    if (!thumbnailBuffer) throw new Error("Thumbnail tidak tersedia.");
    const screenshotBuffers = screenshots.length
      ? await Promise.all(screenshots.map((file) => readImageSource(file, "")))
      : await Promise.all(screenshotUrls.map((url) => readImageSource(null, url)));
    if (screenshotBuffers.some((buffer) => !buffer)) throw new Error("Screenshot tidak tersedia.");

    const storedThumbnailUrl = await uploadImage(thumbnailBuffer, 1400);
    const galleryUrls = await Promise.all(screenshotBuffers.map((buffer) => uploadImage(buffer!, 1800)));

    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        title,
        slug,
        thumbnail: storedThumbnailUrl,
        description,
        developer: getText(formData, "developer") || null,
        release_date: getText(formData, "release_date") || null,
        file_size: getText(formData, "file_size") || null,
        is_featured: getText(formData, "is_featured") === "true",
        is_18_plus: getText(formData, "is_18_plus") === "true",
        category_id: category.id,
        user_id: user.id,
      })
      .select("id")
      .single();
    if (gameError) throw new Error(gameError.code === "23505" ? "Slug game sudah digunakan; ubah judul atau versi." : "Gagal menyimpan data game.");
    gameId = game.id;

    const { error: galleryError } = await supabase
      .from("game_galleries")
      .insert(galleryUrls.map((imageUrl) => ({ game_id: game.id, image_url: imageUrl })));
    if (galleryError) throw new Error("Gagal menyimpan screenshot game.");

    const { data: storedVersions, error: versionsError } = await supabase
      .from("game_download_versions")
      .insert(downloadVersions.map((version) => ({ game_id: game.id, version_label: version.versionLabel })))
      .select("id, version_label");
    if (versionsError || !storedVersions) throw new Error("Gagal menyimpan versi download.");

    for (const storedVersion of storedVersions) {
      const inputVersion = downloadVersions.find((version) => version.versionLabel === storedVersion.version_label);
      if (!inputVersion) throw new Error("Versi download tidak cocok.");
      const { error: linksError } = await supabase.from("download_links").insert(inputVersion.links.map((link) => ({
        game_id: game.id,
        version_id: storedVersion.id,
        platform: link.platform,
        server_name: link.serverName,
        destination_url: link.destinationUrl,
      })));
      if (linksError) throw new Error("Gagal menyimpan link server versi download.");
    }

    return NextResponse.json({ id: game.id, title }, { status: 201 });
  } catch (error) {
    if (gameId) await supabase.from("games").delete().eq("id", gameId);
    if (uploadedPaths.length) await supabase.storage.from("game-media").remove(uploadedPaths);
    const message = error instanceof Error ? error.message : "Game gagal disimpan.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}