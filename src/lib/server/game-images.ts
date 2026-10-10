import "server-only";
import { PhotonImage, resize, SamplingFilter } from "@cf-wasm/photon/edge-light";

const maxSourceBytes = 10 * 1024 * 1024;
const maxStoredBytes = 5 * 1024 * 1024;
const maxPixels = 12_000_000;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const [first, second] = parts.map(Number);
  if (parts.some((part) => Number(part) > 255)) return true;
  return first === 0 || first === 10 || first === 127 || first >= 224
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && (second === 0 || second === 168))
    || (first === 198 && (second === 18 || second === 19 || second === 51))
    || (first === 203 && second === 0);
}

function isAllowedImageHeader(bytes: Uint8Array) {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isWebp = bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  return isJpeg || isPng || isWebp;
}

async function readRemoteImage(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || hostname.startsWith("[")
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname.endsWith(".internal")
    || isPrivateIpv4(hostname)
  ) {
    throw new Error("Gunakan URL HTTPS publik tanpa username atau password.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "image/jpeg,image/png,image/webp" },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Error("URL gambar tidak dapat diunduh atau mengarah ke host yang tidak diizinkan.");
  }
  if (!response.ok) throw new Error("URL gambar tidak dapat diunduh.");

  const mimeType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (!allowedMimeTypes.has(mimeType) || declaredLength > maxSourceBytes) {
    throw new Error("URL harus berisi gambar JPG, PNG, atau WebP maksimal 10 MB.");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("URL gambar tidak mengembalikan file yang dapat dibaca.");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxSourceBytes) {
        await reader.cancel();
        throw new Error("Ukuran gambar dari URL melebihi 10 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readImageSource(file: File | null, sourceUrl: string) {
  if (file && sourceUrl) throw new Error("Pilih file atau URL untuk gambar, jangan keduanya.");
  if (!file && !sourceUrl) return null;

  let bytes: Uint8Array;
  if (file) {
    if (file.size > maxSourceBytes || !allowedMimeTypes.has(file.type)) {
      throw new Error("File harus JPG, PNG, atau WebP dan maksimal 10 MB.");
    }
    bytes = new Uint8Array(await file.arrayBuffer());
  } else {
    let url: URL;
    try {
      url = new URL(sourceUrl);
    } catch {
      throw new Error("URL gambar tidak valid.");
    }
    bytes = await readRemoteImage(url);
  }

  if (!isAllowedImageHeader(bytes)) throw new Error("File bukan gambar JPG, PNG, atau WebP yang valid.");
  return bytes;
}

export async function compressGameImage(bytes: Uint8Array, width: number) {
  let image: PhotonImage | null = null;
  let resized: PhotonImage | null = null;
  try {
    image = PhotonImage.new_from_byteslice(bytes);
    const originalWidth = image.get_width();
    const originalHeight = image.get_height();
    if (!originalWidth || !originalHeight || originalWidth * originalHeight > maxPixels) {
      throw new Error("Ukuran gambar terlalu besar atau tidak valid.");
    }

    const scale = Math.min(1, width / originalWidth);
    resized = resize(
      image,
      Math.max(1, Math.round(originalWidth * scale)),
      Math.max(1, Math.round(originalHeight * scale)),
      SamplingFilter.Lanczos3,
    );
    const compressed = resized.get_bytes_webp();
    if (compressed.byteLength > maxStoredBytes) throw new Error("Hasil kompresi gambar melebihi 5 MB.");
    return compressed;
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Ukuran gambar") || error.message.includes("Hasil kompresi"))) throw error;
    throw new Error("File bukan gambar JPG, PNG, atau WebP yang valid.");
  } finally {
    resized?.free();
    image?.free();
  }
}
