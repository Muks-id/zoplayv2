import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/profile(.*)",
  "/admin(.*)",
  "/api/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  /**
   * Matcher Clerk.
   *
   * Regex pertama sudah mengecualikan apa pun yang mengandung titik (asset:
   * .css/.js/.jpg/.woff/dll) dan direktori _next, jadi middleware TIDAK berjalan
   * pada static asset. Dua entri lain ("/" dan "/(api|trpc)(.*)") bersifat
   * mubazir karena keduanya sudah tercakup regex pertama, dan keduanya membuat
   * middleware dievaluasi dua kali untuk path yang sama.
   *
   * Clerk tetap perlu berjalan untuk halaman publik (butuh <UserButton />), jadi
   * middleware tidak bisa dihapus sepenuhnya.
   */
  matcher: [
    // Semua path halaman, kecuali yang punya titik di segmen terakhir (asset).
    "/((?!.*\\..*|_next|_next/image|__clerk|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|webp|gif|avif|ico|woff2?|ttf|css|js|map|txt|xml)$).*)",
    // Endpoint Clerk.
    "/__clerk(.*)",
  ],
};
