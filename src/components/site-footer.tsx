import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import PresenceIndicator from "@/components/presence-indicator";

/**
 * Footer situs yang dipakai di semua halaman.
 *
 * Sebelumnya markup-nya disalin ke beberapa file dengan dua gaya berbeda
 * (`.site-footer` di beranda, `.safelink-footer` di halaman legal), sehingga
 * halaman baru mudah lupa memasang footer. Sekarang satu sumber saja.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="brand footer-brand" href="/" aria-label="ZOPLAY beranda">
        <span className="brand-mark"><Gamepad2 size={18} strokeWidth={2.5} /></span>
        <span>ZOPLAY<span className="brand-period">.</span></span>
      </Link>
      <span className="copyright">© 2025 ZOPLAY. Dibuat untuk para player.</span>
      <nav aria-label="Informasi">
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/dmca">DMCA</Link>
        <Link href="/disclaimer">Disclaimer</Link>
      </nav>
      <PresenceIndicator />
    </footer>
  );
}