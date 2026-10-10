// Daftar pilihan foto profil.
//
// Berkas di /public/avatars sudah diperkecil: crop ke bujur sangkar dari tengah
// lalu resize ke 256x256 JPEG quality 82 (total ±173 KB untuk 10 gambar).
// Ukuran itu cukup untuk avatar yang tampil maksimal sekitar 120 px.
//
// Catatan: `src` disimpan apa adanya ke kolom `avatar_url` di Supabase, jadi
// memindahkan berkas gambar akan membuat avatar lama tidak bisa dimuat.
export type AvatarOption = {
  id: string;
  label: string;
  src: string;
};

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "avatar-1", label: "Foto profil 1", src: "/avatars/avatar-1.jpg" },
  { id: "avatar-2", label: "Foto profil 2", src: "/avatars/avatar-2.jpg" },
  { id: "avatar-3", label: "Foto profil 3", src: "/avatars/avatar-3.jpg" },
  { id: "avatar-4", label: "Foto profil 4", src: "/avatars/avatar-4.jpg" },
  { id: "avatar-5", label: "Foto profil 5", src: "/avatars/avatar-5.jpg" },
  { id: "avatar-6", label: "Foto profil 6", src: "/avatars/avatar-6.jpg" },
  { id: "avatar-7", label: "Foto profil 7", src: "/avatars/avatar-7.jpg" },
  { id: "avatar-8", label: "Foto profil 8", src: "/avatars/avatar-8.jpg" },
  { id: "avatar-9", label: "Foto profil 9", src: "/avatars/avatar-9.jpg" },
  { id: "avatar-10", label: "Foto profil 10", src: "/avatars/avatar-10.jpg" },
];