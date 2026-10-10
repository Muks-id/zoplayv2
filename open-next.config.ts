import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// R2 incremental cache tidak dipakai: seluruh route dinamis (`force-dynamic`)
// sehingga tidak ada ISR yang perlu disimpan. Menghapus binding R2 membebaskan
// deploy dari kewajiban mengaktifkan R2 di akun Cloudflare.
export default defineCloudflareConfig({});
