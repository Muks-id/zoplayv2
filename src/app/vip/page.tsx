import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { SiteNavigation } from "@/components/site-navigation";
import { SiteFooter } from "@/components/site-footer";
import { getVipStatus } from "@/lib/server/vip";
import { VIP_DURATIONS, VIP_PRICES } from "@/lib/vip-shared";
import VipChat from "./vip-chat";

const BENEFITS = [
  { title: "Download tanpa iklan", text: "Link langsung ke server tanpa popup hitung mundur dan tanpa halaman safelink." },
  { title: "Semua iklan hilang", text: "Slot iklan di seluruh halaman otomatis disembunyikan selama kamu jadi member." },
  { title: "Lencana VIP", text: "Namamu membawa lencana VIP di komentar dan di chat publik." },
];

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function formatExpiry(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export const metadata = { title: "VIP | ZOPLAY" };
export const dynamic = "force-dynamic";

export default async function VipPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=%2Fvip");

  const vip = await getVipStatus(user.id);
  const displayName = user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "Player";

  return (
    <main className="safelink-page vip-page">
      <SiteNavigation />

      <div className="safelink-container vip-container">
        <section className="vip-hero">
          <span className="section-label">LANGGANAN ZOPLAY</span>
          <h1>{vip.isVip ? `VIP aktif sampai ${formatExpiry(vip.expiresAt!)}` : "Lewati iklan, download langsung."}</h1>
          <p>
            {vip.isVip
              ? `Masa langgananmu tersisa ${vip.daysLeft} hari. Perpanjang kapan saja lewat form di bawah.`
              : "Pilih paket, transfer, lalu kirim bukti lewat chat di bawah. Admin akan mengaktifkan VIP-mu."}
          </p>
          <div className="vip-status-card">
            <div><span>Status</span><strong>{vip.isVip ? "Aktif" : "Belum aktif"}</strong></div>
            <div><span> Berlaku sampai</span><strong>{vip.isVip ? formatExpiry(vip.expiresAt!) : "-"}</strong></div>
            <div><span>Sisa waktu</span><strong>{vip.isVip ? `${vip.daysLeft} hari` : "-"}</strong></div>
          </div>
        </section>

        <section className="vip-plans">
          <h2>Pilih durasi</h2>
          <div className="vip-plan-grid">
            {VIP_DURATIONS.map((days) => (
              <div className={days === 7 ? "vip-plan-card is-recommended" : "vip-plan-card"} key={days}>
                {days === 7 && <span className="vip-plan-tag">Paling populer</span>}
                <span className="vip-plan-days">{days} hari</span>
                <strong>{formatRupiah(VIP_PRICES[days])}</strong>
                <small>{formatRupiah(Math.round(VIP_PRICES[days] / days))} / hari</small>
              </div>
            ))}
          </div>
        </section>

        <section className="vip-benefits">
          <h2>Keuntungan member</h2>
          <div className="vip-benefit-list">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title}><strong>{benefit.title}</strong><p>{benefit.text}</p></div>
            ))}
          </div>
        </section>

        <section className="vip-payment">
          <h2>Cara pembayaran</h2>
          <ol className="vip-steps">
            <li>Pilih durasi di atas, lalu tekan tombol <strong>Ajukan Langganan</strong>.</li>
            <li>Pesan otomatis terkirim ke admin. Transfer Rp30.000 (7 hari), Rp60.000 (14 hari), atau Rp110.000 (30 hari).</li>
            <li>Lampirkan bukti transfer (foto/screenshot) di chat yang sama.</li>
            <li>Admin memeriksa bukti lalu mengaktifkan VIP. Status berubah seketika, tidak perlu menunggu lama.</li>
          </ol>
          <p className="vip-payment-note">
            Masa langganan yang masih aktif otomatis diperpanjang, jadi tidak ada yang terpotong. Untuk
            perpanjangan atau pembatalan, balas saja di chat.
          </p>
        </section>

        <VipChat displayName={displayName} />
      </div>
      <SiteFooter />
    </main>
  );
}