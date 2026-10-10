import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type SafelinkPayload = {
  /** Slug game */
  slug: string;
  /** ID versi download */
  versionId: string;
  platform: "windows" | "android";
  serverName: string;
};

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

let warnedAboutFallback = false;

function getKey() {
  const secret = process.env.SAFELINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CLERK_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") throw new Error("SAFELINK_SECRET belum diatur.");
    if (!warnedAboutFallback) {
      console.warn("[safelink] SAFELINK_SECRET belum diatur; memakai kunci development.");
      warnedAboutFallback = true;
    }
  }
  return createHash("sha256").update(`zoplay-safelink:${secret ?? "development-only-key"}`).digest();
}

/** Mengenkripsi data link download menjadi token base64url yang aman dipakai di URL. */
export function encryptSafelinkToken(payload: SafelinkPayload) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const body = JSON.stringify([payload.slug, payload.versionId, payload.platform, payload.serverName]);
  const encrypted = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

/** Mendekripsi token; mengembalikan null jika token rusak, diubah, atau tidak valid. */
export function decryptSafelinkToken(token: string): SafelinkPayload | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length <= IV_LENGTH + TAG_LENGTH) return null;
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const body = Buffer.concat([decipher.update(raw.subarray(IV_LENGTH + TAG_LENGTH)), decipher.final()]).toString("utf8");
    const parsed: unknown = JSON.parse(body);
    if (!Array.isArray(parsed) || parsed.length !== 4 || !parsed.every((item) => typeof item === "string")) return null;
    const [slug, versionId, platform, serverName] = parsed as string[];
    if (platform !== "windows" && platform !== "android") return null;
    return { slug, versionId, platform, serverName };
  } catch {
    return null;
  }
}
