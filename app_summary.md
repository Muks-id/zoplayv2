1. Arsitektur & Alur Web (Web Flow)
A. Tampilan & Layout Utama
Tema Visual: Dark Mode dengan nuansa warna Hijau Toska/Neon (#00FF88, #0F2027, #203A43). Menggunakan efek Glassmorphism (backdrop-filter: blur(), border semi-transparan, dan bayangan glowing).

Header:

Logo Web.

3 Menu Utama (misal: Home, PC Games, Android Games).

Post Slider:

Slider otomatis yang menampilkan 5 game featured / unggulan terbaru dengan efek glassmorphism di atas gambar.

Main Content Grid:

PC/Desktop: Grid 4 atau 5 kolom (responsif dan rapi).

Mobile: Grid 3 kolom.

Elemen Kartu/Thumbnail Game: Gambar Thumbnail, Label/Kategori, Jumlah Download, Info Komentar, dan Judul Game.

Bagian Tab/Kategori Utama:

Popular Posts & Recent Posts.

Mobile Bottom Bar (Khusus Tampilan HP):

Bar navigasi melayang (sticky bottom) berisi 3 ikon: Pencarian (Search), Home, dan Menu (Drawer).

Footer:

Footer minimalis berisi Hak Cipta, Link Kebijakan Privasi (Privacy Policy), DMCA, dan Disclaimers.

B. Alur Halaman Detail Postingan (Single Post Game)
Header Media / Thumbnail Utama:

Foto thumbnail ukuran penuh dengan efek gradient fade dari bawah ke atas agar menyatu secara smooth dengan background dark.

Deskripsi Game:

Teks ulasan/penjelasan ringkas mengenai game.

Tabel 1: Informasi Game:

Spesifikasi minimum, ukuran file, tanggal rilis, developer, dan genre.

Tabel 2: Tempat Download (Accordion Download):

Accordion Judul Game + Versi.

Saat Accordion Dibuka:

Section Windows: Keterangan Spesifikasi Device + 3 Tombol Server Download (Server 1, Server 2, Server 3).

Section Android: Keterangan Spesifikasi Device + 3 Tombol Server Download (Server 1, Server 2, Server 3).

Alur Safelink & Iklan (Monetisasi):

Klik Tombol Download: Membuka Modal/Pop-up Iklan dengan hitungan mundur 5 Detik → Muncul tombol "Lanjutkan".

Halaman Safelink:

Slot Iklan Atas & Slot Iklan Bawah (khusus mobile optimized).

Progress bar berjalan selama 10 Detik.

Setelah 100%, muncul tombol "Generate Link".

Ketika klik "Generate Link", halaman otomatis scroll/bergulir ke bawah menuju area konfirmasi.

Timer hitung mundur 20 Detik bertuliskan "Please Wait...".

Setelah selesai, muncul tombol "Go to Link" yang mengarah ke URL file asli di cloud storage (Mega, Google Drive, Mediafire, dll).

Accordion Gallery Screenshots (Accordion Kedua):

Accordion yang jika dibuka menampilkan Image Slider berisi 3–5 tangkapan layar (screenshot) gameplay.

Warning Table (Peringatan Usia):

Tabel peringatan bercetak tegas: "Peringatan: Konten ini khusus 18+. Pengguna di bawah umur dilarang mendownload game ini."

2. Skema Basis Data (Database Schema)
Menggunakan basis data relasional (seperti MySQL / PostgreSQL).

                                +-------------------+
                                |    categories     |
                                +-------------------+
                                | id (PK)           |
                                | name              |
                                | slug              |
                                +---------+---------+
                                          |
                                          | 1
                                          |
                                          | N
+-------------------+           +---------+---------+           +-------------------+
|       users       |           |       games       |           |   game_galleries  |
+-------------------+           +-------------------+           +-------------------+
| id (PK)           | 1       N | id (PK)           | 1       N | id (PK)           |
| name              |-----------| title             |-----------| game_id (FK)      |
| email             |           | slug              |           | image_url         |
| password          |           | thumbnail         |           +-------------------+
+-------------------+           | description       |
                                | developer         |
                                | release_date      |           +-------------------+
                                | min_req_win       |           |    download_links |
                                | min_req_android   |           +-------------------+
                                | views_count       | 1       N | id (PK)           |
                                | download_count    |-----------| game_id (FK)      |
                                | category_id (FK)  |           | platform          |
                                | user_id (FK)      |           | server_name       |
                                +---------+---------+           | destination_url   |
                                          |                     +-------------------+
                                          | 1
                                          |
                                          | N
                                +---------+---------+
                                |     comments      |
                                +-------------------+
                                | id (PK)           |
                                | game_id (FK)      |
                                | author_name       |
                                | comment_text      |
                                | created_at        |
                                +-------------------+
Rincian Tabel Database
1. Tabel users (Pengelola/Admin)
id (INT, Primary Key, Auto Increment)

name (VARCHAR)

email (VARCHAR, Unique)

password (VARCHAR)

created_at (TIMESTAMP)

2. Tabel categories
id (INT, Primary Key, Auto Increment)

name (VARCHAR) — Contoh: Action, RPG, Open World

slug (VARCHAR, Unique)

3. Tabel games (Data Utama Game)
id (INT, Primary Key, Auto Increment)

title (VARCHAR) — Judul Game & Versi

slug (VARCHAR, Unique) — URL ramah SEO

thumbnail (VARCHAR) — Path/URL foto utama

description (TEXT)

developer (VARCHAR)

release_date (DATE)

min_req_win (TEXT) — Spesifikasi minimum Windows

min_req_android (TEXT) — Spesifikasi minimum Android

is_featured (BOOLEAN) — Status untuk masuk Post Slider 5 teratas (1/0)

is_18_plus (BOOLEAN) — Status penanda warning 18+ (default: 1)

download_count (INT, Default: 0)

views_count (INT, Default: 0)

category_id (INT, Foreign Key ke categories.id)

user_id (INT, Foreign Key ke users.id)

created_at (TIMESTAMP)

4. Tabel game_galleries (Slide Screenshots)
id (INT, Primary Key, Auto Increment)

game_id (INT, Foreign Key ke games.id)

image_url (VARCHAR) — Tautan/Path foto screenshot gameplay

5. Tabel download_links (Link Server Download)
id (INT, Primary Key, Auto Increment)

game_id (INT, Foreign Key ke games.id)

platform (ENUM: 'windows', 'android')

server_name (VARCHAR) — Contoh: Server 1, Server 2, Server 3

destination_url (TEXT) — Link asli penyimpanan file

6. Tabel comments
id (INT, Primary Key, Auto Increment)

game_id (INT, Foreign Key ke games.id)

author_name (VARCHAR)

comment_text (TEXT)

created_at (TIMESTAMP)

3. Fitur Auto-Upload / Form Input Ringkas (Dashboard Admin)
Agar proses input postingan tidak rumit, buatlah Form Admin dengan sistem Auto-Fill / Auto-Upload Ringkas:

Input yang Wajib Diisi:

Judul Game & Versi

File Thumbnail (Otomatis dibuat efek gradient fade lewat CSS di frontend)

Kategori & Tag 18+ (Checkbox)

Deskripsi Ringkas

Screenshots (Upload sekaligus 3-5 gambar)

Link Download Server:

Field Input Link Windows (Server 1, Server 2, Server 3)

Field Input Link Android (Server 1, Server 2, Server 3)

Sistem Otomatisasi (Back-end logic):

Sistem memotong/mengompresi gambar thumbnail secara otomatis agar ukuran ringan.

Sistem membuat URL Safelink terenkripsi (misal: [domain.com/safelink?id=XYZ](https://domain.com/safelink?id=XYZ)) secara otomatis dari destination_url tanpa perlu input manual satu per satu.