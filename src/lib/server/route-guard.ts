import { NextResponse } from "next/server";

/**
 * Bungkus route handler agar kegagalan tidak langsung menjatuhkan Worker
 * dengan Error 1102 (unhandled exception).
 *
 * Di Cloudflare Workers, exception yang tidak tertangani membuat seluruh isolate
 * dan Cloudflare mengembalikan 1102 ke pengguna. Jadi setiap query Supabase
 * wajib dibungkus; di sini try/catch dik عالمية supaya tidak ada route yang
 * lupa.
 *
 * Pola ini TIDAK memperbaiki error 1102 akibat "Exceeded CPU Limit" — itu batas
 * hard 10ms di Workers Free dan hanya bisa diperbaiki lewat pengurangan
 * pekerjaan. Fungsi ini menjaga agar kegagalan I/O (Supabase timeout, DNS)
 * menjadi 500/503 yang rapi beserta lognya.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
  label: string,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Jangan pernah bocorkan stack trace ke pengguna.
      console.error(`[${label}] gagal:`, message);
      return NextResponse.json(
        { error: "Terjadi kesalahan di server. Silakan coba lagi." },
        { status: 500, headers: { "Retry-After": "5" } },
      );
    }
  };
}