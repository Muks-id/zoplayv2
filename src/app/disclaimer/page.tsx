import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Disclaimer | ZOPLAY" };

export default function DisclaimerPage() {
  return (
    <LegalPage label="PENAFIAN" title="Disclaimer" updated="7 Oktober 2026" current="/disclaimer">
      <p>
        Seluruh informasi di ZOPLAY disediakan apa adanya untuk tujuan informasi dan hiburan. Dengan menggunakan situs
        ini, kamu dianggap telah membaca dan menyetujui penafian berikut.
      </p>
      <h2>Konten dan tautan</h2>
      <ul>
        <li>ZOPLAY tidak meng-hosting file game. Semua tautan download mengarah ke layanan penyimpanan pihak ketiga.</li>
        <li>Kami tidak menjamin ketersediaan, kecepatan, atau keamanan file pada layanan pihak ketiga tersebut.</li>
        <li>Seluruh merek dagang, logo, dan gambar adalah milik pemiliknya masing-masing.</li>
      </ul>
      <h2>Batasan usia</h2>
      <p>
        Beberapa game ditandai sebagai konten <strong>18+</strong>. Pengguna di bawah umur dilarang mengunduh game
        tersebut. Orang tua atau wali bertanggung jawab mengawasi penggunaan situs oleh anak.
      </p>
      <h2>Risiko penggunaan</h2>
      <p>
        Segala risiko yang timbul dari mengunduh atau memasang file, termasuk kerusakan perangkat atau kehilangan data,
        sepenuhnya menjadi tanggung jawab pengguna. Selalu pindai file dengan antivirus sebelum digunakan.
      </p>
      <h2>Dukung developer</h2>
      <p>Jika kamu menyukai sebuah game, dukung developernya dengan membeli versi resmi.</p>
    </LegalPage>
  );
}
