import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <main className="safelink-page not-found-page">
      <SiteNavigation />
      <div className="safelink-container">
        <section className="safelink-card safelink-confirm">
          <div className="safelink-modal-icon"><SearchX size={22} /></div>
          <span className="section-label">404 / HALAMAN TIDAK DITEMUKAN</span>
          <h2>Halaman yang kamu cari tidak ada.</h2>
          <p>Mungkin tautannya salah, sudah kedaluwarsa, atau game tersebut telah dihapus.</p>
        </section>
        <Link className="safelink-back" href="/"><ArrowLeft size={14} /> Kembali ke beranda</Link>
      </div>
      <SiteFooter />
    </main>
  );
}
