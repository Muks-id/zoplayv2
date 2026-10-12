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

const MEDIA_BUCKET = "game-media";

function storagePathFromPublicUrl(value: string | null) {
  if (!value) return null;
  try {
    const path = new URL(value).pathname;
    const prefix = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
    if (!path.includes(prefix)) return null;
    return decodeURIComponent(path.slice(path.indexOf(prefix) + prefix.length));
  } catch {
    return null;
  }
}

async function getAdminSupabase() {
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
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
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

export async function PATCH(request: Request) {
  const context = await getAdminSupabase();
  if ("error" in context) return context.error;
  const { client } = context;

  if (request.headers.get("content-type")?.includes("application/json")) {
    let body: { id?: unknown; is_featured?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
    }
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "ID game tidak valid." }, { status: 400 });
    if (typeof body.is_featured !== "boolean") {
      return NextResponse.json({ error: "Status featured tidak valid." }, { status: 400 });
    }

    const { data: game, error: gameError } = await client.from("games").select("id, is_featured").eq("id", id).maybeSingle();
    if (gameError || !game) return NextResponse.json({ error: "Game tidak ditemukan." }, { status: 404 });
    if (body.is_featured && !game.is_featured) {
      const { count, error } = await client.from("games").select("id", { count: "exact", head: true }).eq("is_featured", true);
      if (error) return NextResponse.json({ error: "Status featured belum dapat diperiksa." }, { status: 500 });
      if ((count ?? 0) >= 5) return NextResponse.json({ error: "Maksimal lima game dapat menjadi featured." }, { status: 409 });
    }

    const { error } = await client.from("games").update({ is_featured: body.is_featured }).eq("id", id);
    if (error) return NextResponse.json({ error: "Status featured gagal diperbarui." }, { status: 500 });
    return NextResponse.json({ id, is_featured: body.is_featured });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form edit tidak dapat dibaca." }, { status: 400 });
  }

  // Saat mengedit, form memuat id game di dalamnya.
  const id = getText(formData, "id");
  if (!id) return NextResponse.json({ error: "ID game tidak valid." }, { status: 400 });

  const title = getText(formData, "title");
  const categoryName = getText(formData, "category");
  const description = getText(formData, "description");
  const thumbnailValue = formData.get("thumbnail");
  const newThumbnailFile = isImageFile(thumbnailValue) ? thumbnailValue : null;
  const newThumbnailUrl = getText(formData, "thumbnail_url");
  const newScreenshots = formData.getAll("screenshots").filter(isImageFile);
  const newScreenshotUrls = getText(formData, "screenshot_urls").split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
  const downloadVersions = parseDownloadVersions(getText(formData, "downloadVersions"));

  if (!title || !categoryName || !description || !downloadVersions) {
    return NextResponse.json({ error: "Lengkapi judul, kategori, deskripsi, dan versi download yang valid." }, { status: 400 });
  }
  if (newThumbnailFile && newThumbnailUrl) {
    return NextResponse.json({ error: "Pilih file atau URL untuk thumbnail, jangan keduanya." }, { status: 400 });
  }
  if (newScreenshots.length > 0 && newScreenshotUrls.length > 0) {
    return NextResponse.json({ error: "Pilih file atau URL untuk screenshot, jangan keduanya." }, { status: 400 });
  }
  const replacingScreenshots = newScreenshots.length > 0 || newScreenshotUrls.length > 0;
  const newScreenshotCount = newScreenshots.length || newScreenshotUrls.length;
  if (replacingScreenshots && (newScreenshotCount < 3 || newScreenshotCount > 5)) {
    return NextResponse.json({ error: "Unggah 3 sampai 5 screenshot gameplay." }, { status: 400 });
  }

  const { data: oldGame, error: oldGameError } = await client
    .from("games")
    .select("id, slug, thumbnail, is_featured, game_galleries(image_url)")
    .eq("id", id)
    .maybeSingle();
  if (oldGameError || !oldGame) return NextResponse.json({ error: "Game tidak ditemukan." }, { status: 404 });

  const currentFeatured = oldGame.is_featured;
  const requestedFeatured = getText(formData, "is_featured") === "true";
  if (requestedFeatured && !currentFeatured) {
    const { count, error } = await client.from("games").select("id", { count: "exact", head: true }).eq("is_featured", true);
    if (error) return NextResponse.json({ error: "Status featured belum dapat diperiksa." }, { status: 500 });
    if ((count ?? 0) >= 5) return NextResponse.json({ error: "Maksimal lima game dapat menjadi featured." }, { status: 409 });
  }

  const uploadedPaths: string[] = [];
  const uploadImage = async (source: Uint8Array, width: number) => {
    const buffer = await compressGameImage(source, width);

    const path = `${slugify(title)}/${crypto.randomUUID()}.webp`;
    const { error } = await client.storage.from(MEDIA_BUCKET).upload(path, buffer, { contentType: "image/webp", upsert: false });
    if (error) throw new Error("Gagal mengunggah media baru.");
    uploadedPaths.push(path);
    return client.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  };

  try {
    const { data: category, error: categoryError } = await client
      .from("categories")
      .upsert({ name: categoryName, slug: slugify(categoryName) }, { onConflict: "slug" })
      .select("id")
      .single();
    if (categoryError) throw new Error("Gagal menyimpan kategori.");

    const thumbnailBuffer = newThumbnailFile || newThumbnailUrl
      ? await readImageSource(newThumbnailFile, newThumbnailUrl)
      : null;
    const screenshotBuffers = newScreenshots.length
      ? await Promise.all(newScreenshots.map((file) => readImageSource(file, "")))
      : newScreenshotUrls.length
        ? await Promise.all(newScreenshotUrls.map((url) => readImageSource(null, url)))
        : [];
    if (screenshotBuffers.some((buffer) => !buffer)) throw new Error("Screenshot tidak tersedia.");

    const thumbnailUrl = thumbnailBuffer ? await uploadImage(thumbnailBuffer, 1400) : oldGame.thumbnail;
    const galleryUrls = replacingScreenshots
      ? await Promise.all(screenshotBuffers.map((buffer) => uploadImage(buffer!, 1800)))
      : null;

    const { error: updateError } = await client.from("games").update({
      title,
      slug: slugify(title),
      thumbnail: thumbnailUrl,
      description,
      developer: getText(formData, "developer") || null,
      release_date: getText(formData, "release_date") || null,
      file_size: getText(formData, "file_size") || null,
      is_featured: requestedFeatured,
      is_18_plus: getText(formData, "is_18_plus") === "true",
      category_id: category.id,
    }).eq("id", id);
    if (updateError) throw new Error(updateError.code === "23505" ? "Slug game sudah digunakan; ubah judul atau versi." : "Gagal memperbarui data game.");

    if (galleryUrls) {
      const { error: clearGalleryError } = await client.from("game_galleries").delete().eq("game_id", id);
      if (clearGalleryError) throw new Error("Screenshot lama gagal diperbarui.");
      const { error: galleryError } = await client.from("game_galleries").insert(galleryUrls.map((image_url) => ({ game_id: id, image_url })));
      if (galleryError) throw new Error("Screenshot baru gagal disimpan.");
    }

    const { error: clearVersionsError } = await client.from("game_download_versions").delete().eq("game_id", id);
    if (clearVersionsError) throw new Error("Versi download lama gagal diperbarui.");
    const { data: storedVersions, error: versionsError } = await client
      .from("game_download_versions")
      .insert(downloadVersions.map((version) => ({ game_id: id, version_label: version.versionLabel })))
      .select("id, version_label");
    if (versionsError || !storedVersions) throw new Error("Versi download baru gagal disimpan.");

    for (const storedVersion of storedVersions) {
      const inputVersion = downloadVersions.find((version) => version.versionLabel === storedVersion.version_label);
      if (!inputVersion) throw new Error("Versi download tidak cocok.");
      const { error: linksError } = await client.from("download_links").insert(inputVersion.links.map((link) => ({
        game_id: id,
        version_id: storedVersion.id,
        platform: link.platform,
        server_name: link.serverName,
        destination_url: link.destinationUrl,
      })));
      if (linksError) throw new Error("Link server versi download gagal disimpan.");
    }

    const oldPaths = [
      thumbnailBuffer ? storagePathFromPublicUrl(oldGame.thumbnail) : null,
      ...(galleryUrls ? oldGame.game_galleries.map((image) => storagePathFromPublicUrl(image.image_url)) : []),
    ].filter((path): path is string => Boolean(path));
    if (oldPaths.length) await client.storage.from(MEDIA_BUCKET).remove(oldPaths);

    return NextResponse.json({ id, title });
  } catch (error) {
    if (uploadedPaths.length) await client.storage.from(MEDIA_BUCKET).remove(uploadedPaths);
    const message = error instanceof Error ? error.message : "Game gagal diperbarui.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const context = await getAdminSupabase();
  if ("error" in context) return context.error;
  const { client } = context;

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "ID game tidak valid." }, { status: 400 });

  const { data: game, error: gameError } = await client
    .from("games")
    .select("id, thumbnail, game_galleries(image_url)")
    .eq("id", id)
    .maybeSingle();
  if (gameError || !game) return NextResponse.json({ error: "Game tidak ditemukan." }, { status: 404 });

  const paths = [game.thumbnail, ...game.game_galleries.map((image) => image.image_url)]
    .map(storagePathFromPublicUrl)
    .filter((path): path is string => Boolean(path));
  const { error: deleteError } = await client.from("games").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: "Game gagal dihapus." }, { status: 500 });

  if (paths.length) {
    const { error: storageError } = await client.storage.from(MEDIA_BUCKET).remove([...new Set(paths)]);
    if (storageError) return NextResponse.json({ id, warning: "Game terhapus, tetapi sebagian file media perlu dihapus manual dari Storage." });
  }

  return NextResponse.json({ id, deleted: true });
}
