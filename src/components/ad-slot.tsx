/**
 * Slot iklan untuk beranda.
 *
 * Format slot mobile adalah 320x50. Setiap iklan ditumpuk vertikal dengan
 * jarak 8px, jadi tinggi container otomatis bertambah sesuai jumlah iklan
 * yang dikirim — tidak ada tinggi yang perlu ditulis manual.
 *
 * Data iklan belum tersedia, jadi `ads` default kosong dan komponen hanya
 * menampilkan placeholder setinggi slot 320x50. Begitu iklannya diisi,
 * tinggi container menyesuaikan dengan sendirinya karena tiap `<a>` punya
 * `aspect-ratio: 320 / 50`.
 */

export type Ad = {
  id: string;
  /** URL tujuan ketika iklan diklik. */
  href: string;
  src?: string;
  /** Teks alternatif / label yang tampil kalau gambar gagal dimuat. */
  label: string;
};

type AdSlotProps = {
  ads?: Ad[];
  className?: string;
};

export function AdSlot({ ads = [], className = "" }: AdSlotProps) {
  // Tanpa iklan: tetap sisakan ruang 320x50 supaya layout tidak melompat
  // ketika iklan baru dimuat.
  const items: Ad[] = ads.length
    ? ads
    : [{ id: "placeholder", href: "#", label: "Ruang iklan 320x50" }];

  return (
    <section className={`ad-slot ${className}`.trim()} aria-label="Iklan">
      <div className="ad-slot-stack">
        {items.map((ad) => (
          <a
            key={ad.id}
            className="ad-slot-item"
            href={ad.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            aria-label={ad.label}
          >
            {ad.src ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={ad.src} alt={ad.label} loading="lazy" />
            ) : (
              <span className="ad-slot-placeholder">{ad.label}</span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}