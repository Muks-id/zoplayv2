import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";
import { SiteFooter } from "@/components/site-footer";

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/dmca", label: "DMCA" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export function LegalPage({
  label,
  title,
  updated,
  current,
  children,
}: {
  label: string;
  title: string;
  updated: string;
  current: "/privacy" | "/dmca" | "/disclaimer";
  children: ReactNode;
}) {
  return (
    <main className="safelink-page legal-page">
      <SiteNavigation />

      <div className="safelink-container legal-container">
        <nav className="legal-nav" aria-label="Halaman informasi">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className={link.href === current ? "selected" : ""} aria-current={link.href === current ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <article className="safelink-thanks legal-content">
          <span className="section-label">{label}</span>
          <h1>{title}</h1>
          <p className="legal-updated">Terakhir diperbarui: {updated}</p>
          {children}
        </article>
        <Link className="safelink-back" href="/"><ArrowLeft size={14} /> Kembali ke beranda</Link>
      </div>

      <SiteFooter />
    </main>
  );
}
