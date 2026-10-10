import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "DMCA | ZOPLAY" };

export default function DmcaPage() {
  return (
    <LegalPage label="HAK CIPTA" title="DMCA" updated="7 Oktober 2026" current="/dmca">
      <p>
        ZOPLAY menghormati hak kekayaan intelektual. ZOPLAY tidak menyimpan file game di server sendiri; kami hanya
        menampilkan informasi dan tautan yang tersedia di internet melalui layanan pihak ketiga.
      </p>
      <h2>Mengajukan permintaan penghapusan</h2>
      <p>Jika kamu adalah pemilik hak cipta atau perwakilan resminya, kirimkan pemberitahuan yang memuat:</p>
      <ul>
        <li>Identitas dan informasi kontak kamu (nama, perusahaan, alamat email).</li>
        <li>Penjelasan karya berhak cipta yang menurutmu dilanggar.</li>
        <li>URL halaman di ZOPLAY yang berisi materi tersebut.</li>
        <li>Pernyataan bahwa kamu meyakini dengan itikad baik bahwa penggunaan materi tersebut tidak diizinkan.</li>
        <li>Pernyataan bahwa informasi yang diberikan akurat, serta tanda tangan fisik atau elektronik.</li>
      </ul>
      <h2>Proses</h2>
      <p>
        Setiap laporan yang lengkap akan kami tinjau, dan konten yang terbukti melanggar akan dihapus secepatnya,
        biasanya dalam 1–3 hari kerja. Laporan yang tidak lengkap mungkin tidak dapat kami proses.
      </p>
      <h2>Kontak</h2>
      <p>Kirimkan pemberitahuan DMCA ke alamat email admin ZOPLAY dengan subjek &quot;DMCA Takedown&quot;.</p>
    </LegalPage>
  );
}
