# Deploy ZOPLAY ke Cloudflare Workers

Proyek ini menggunakan Next.js 16 App Router dan OpenNext Cloudflare. Worker menjalankan aplikasi Next.js; Supabase dan Clerk tetap menjadi layanan eksternal.

## Persiapan akun

1. Gunakan Node.js 20 atau lebih baru dan npm.
2. Buat bucket R2 bernama `zoplay-opennext-cache` di akun Cloudflare.
3. Hubungkan domain ke Cloudflare (atau gunakan domain `workers.dev` sementara).
4. Pastikan semua migration `supabase/migrations/001` sampai `014` sudah diterapkan pada proyek Supabase.
5. Di Supabase, pastikan bucket `game-media` dan `vip-proofs` sudah ada dengan visibilitas dan policy yang sesuai. `vip-proofs` sebaiknya privat; media publik game menggunakan `game-media`.
6. Pastikan Clerk production instance mengizinkan domain produksi dan URL redirect sign-in/sign-up yang digunakan situs.

Worker name dan nama bucket cache dapat diubah di `wrangler.jsonc`. Jika worker name diganti, ubah juga nama pada self-reference service binding agar tetap sama.

## Variabel rahasia

Jangan commit `.dev.vars` atau memasukkan kunci server ke `NEXT_PUBLIC_*`. Untuk uji lokal, salin `.dev.vars.example` menjadi `.dev.vars` dan isi nilainya.

Simpan nilai berikut sebagai Cloudflare Worker secrets:

```powershell
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put SAFELINK_SECRET
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
```

`ANTHROPIC_API_KEY` hanya diperlukan jika fitur yang memakainya diaktifkan. `OPENAI_API_KEY` dibutuhkan endpoint chat. Gunakan kredensial production, dan rotasi secret yang pernah terekspos.

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bukan rahasia. Sediakan ketiganya pada **environment build** sebelum menjalankan `npm run build:cloudflare`; Next.js memasukkan nilai `NEXT_PUBLIC_*` ke bundle browser pada saat build. Atur juga sebagai Worker variables pada dashboard Cloudflare bila kode server membacanya saat runtime. `wrangler secret put` setelah build saja tidak mengganti nilai yang sudah dibundel.

Untuk Clerk, atur juga domain production, sign-in URL, sign-up URL, dan allowed redirect/origin pada dashboard Clerk. Pastikan role `admin` diset melalui Clerk public metadata hanya untuk akun admin yang benar.

## Uji lokal dengan runtime Cloudflare

```powershell
npm ci
npm run typecheck
npm run lint
npm run build:cloudflare
npm run preview
```

`npm run preview` menjalankan aplikasi di runtime Workers lokal. Isi `.dev.vars` terlebih dahulu untuk menguji login, database, chat, unduhan, dan admin. Aplikasi Next.js tetap dapat dikembangkan dengan `npm run dev`.

## Deploy

Login Cloudflare satu kali, lalu:

```powershell
npx wrangler login
npm run deploy
```

`npm run deploy` membangun bundle OpenNext, mempersiapkan cache R2, lalu mengirim Worker. Setelah deploy, tambahkan domain custom di dashboard Cloudflare Workers & Pages dan pastikan DNS/TLS aktif.

Untuk CI/CD, simpan `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` sebagai secrets pipeline; jangan letakkan token di repository. Jalankan langkah typecheck, lint, dan `npm run build:cloudflare` sebelum deployment production.

## Pemeriksaan setelah deploy

- Beranda, halaman game, aset statis, dan halaman 404.
- Sign-in/sign-up Clerk, akses profil, dan route admin tanpa role.
- Supabase: rating, chat, presence, VIP, profil, dan riwayat.
- Safelink serta redirect unduhan untuk user biasa dan VIP.
- Upload thumbnail/screenshot serta bukti VIP dari panel admin/member.
- Chat AI dengan `OPENAI_API_KEY`.
- Domain Clerk/Supabase allowlist, cookie Secure, dan HTTPS pada domain custom.
- Log Worker pada Cloudflare, terutama error runtime dan kegagalan koneksi eksternal.

## Batasan dan risiko yang perlu dipantau

- Gambar diproses memakai WebAssembly Photon, bukan native `sharp`, karena native binaries tidak berjalan di Workers. Ukuran input dibatasi 10 MB, output WebP 5 MB, dan gambar di atas 12 megapiksel ditolak untuk menekan risiko kehabisan memori Worker. Uji unggah PNG/JPEG/WebP nyata sebelum membuka admin.
- Worker CPU/memori dan ukuran bundle memiliki batas Cloudflare plan. Jika gambar besar atau trafik tinggi menjadi bottleneck, pindahkan transformasi ke Cloudflare Images atau pipeline media terpisah; jangan menaikkan batas gambar tanpa mengukur memori.
- Unduh gambar URL dari panel admin menggunakan Fetch API Worker. Redirect ditolak, URL non-HTTPS dan alamat lokal/literal ditolak, dan `global_fetch_strictly_public` mencegah fetch ke alamat privat. Uji URL sumber yang memang digunakan admin.
- Data aplikasi utama tetap berada di Supabase/Clerk. R2 pada konfigurasi ini hanya untuk cache Next.js; cache dapat dibuat ulang, tetapi bucket harus ada agar deployment OpenNext memakai incremental cache.
- Fitur yang bergantung pada penyedia eksternal (Clerk, Supabase, OpenAI/Anthropic) tetap bergantung pada limit, availability, dan konfigurasi jaringan penyedia tersebut. Buat alert/logging dan rencana backup database di Supabase.
- Jangan aktifkan cache publik untuk route yang memuat data user, cookies, VIP, admin, atau chat. Review setiap penggunaan cache/revalidation baru sebelum merge.
- Versi OpenNext Cloudflare yang dipakai memerlukan Next.js `>=15.5.27 <16` atau `>=16.3.8`. Proyek menggunakan Next.js 16.4.0.
- Chat AI menghabiskan kuota OpenAI. Endpoint sudah membatasi payload, panjang pesan, dan jumlah riwayat; tetap tambahkan Cloudflare rate-limiting/WAF rule pada `/api/chat` sebelum membuka layanan publik, serta pantau biaya provider.
- Next.js 16 menandai `middleware.ts` deprecated, tetapi OpenNext memperingatkan dukungan `proxy.ts` berbasis Node belum resmi. Proyek mempertahankan middleware Clerk yang ringan agar build Worker memakai jalur middleware yang didukung; migrasikan sebelum Next.js menghapus convention tersebut, setelah OpenNext menstabilkan Proxy.
- Patch terkunci di `patches/` membuat OpenNext mengembalikan manifest kosong untuk `preview-props.json`, yang tidak dipaketkan adapter tetapi dibaca Next.js saat startup Worker. Aplikasi ini tidak menggunakan Next Draft/Preview Mode; jangan aktifkan fitur itu tanpa mengganti workaround dan menguji ulang. Tinjau atau hapus patch saat memperbarui OpenNext.
- `npm audit --omit=dev` masih menemukan 7 advisori production, termasuk high pada rantai AI SDK (`jsondiffpatch`) dan moderate pada `@ai-sdk/provider-utils`. Audit menyarankan major upgrade AI SDK yang bisa mengubah API chat; jangan deploy layanan chat publik sampai SDK diperbarui dan alur chat diuji. Audit penuh juga menemukan 11 temuan tambahan pada dependency development/transitif.
