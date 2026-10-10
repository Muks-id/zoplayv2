import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy | ZOPLAY" };

export default function PrivacyPage() {
  return (
    <LegalPage label="KEBIJAKAN PRIVASI" title="Privacy Policy" updated="7 Oktober 2026" current="/privacy">
      <p>
        Kebijakan privasi ini menjelaskan bagaimana ZOPLAY mengumpulkan, menggunakan, dan melindungi informasi
        pengunjung saat menggunakan situs ini.
      </p>
      <h2>Informasi yang kami kumpulkan</h2>
      <ul>
        <li><strong>Data akun:</strong> jika kamu masuk, layanan autentikasi pihak ketiga (Clerk) menyimpan nama, email, dan foto profil yang kamu berikan.</li>
        <li><strong>Konten yang kamu kirim:</strong> komentar, rating, dan pesan chat yang kamu tulis disimpan beserta nama yang ditampilkan.</li>
        <li><strong>Data lokal di perangkat:</strong> daftar game yang kamu bookmark disimpan di <em>localStorage</em> browser dan tidak dikirim ke server kami.</li>
        <li><strong>Data teknis:</strong> statistik anonim seperti jumlah view dan download dipakai untuk menampilkan game populer.</li>
      </ul>
      <h2>Cookie dan iklan</h2>
      <p>
        Situs ini dapat menampilkan iklan dari jaringan pihak ketiga. Penyedia iklan tersebut dapat menggunakan cookie
        atau teknologi serupa untuk menampilkan iklan yang relevan. Kamu dapat menonaktifkan cookie melalui pengaturan
        browser, namun beberapa fitur mungkin tidak berjalan dengan normal.
      </p>
      <h2>Tautan eksternal</h2>
      <p>
        Tombol download mengarahkan ke layanan penyimpanan pihak ketiga (misalnya Google Drive, Mega, atau Mediafire).
        Kami tidak bertanggung jawab atas praktik privasi situs-situs tersebut.
      </p>
      <h2>Keamanan dan penghapusan data</h2>
      <p>
        Kami menggunakan penyedia infrastruktur tepercaya untuk menyimpan data. Jika ingin menghapus akun atau konten
        yang pernah kamu kirim, hubungi kami melalui halaman DMCA atau kontak admin.
      </p>
    </LegalPage>
  );
}
