import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminGameForm from "./admin-game-form";
import AdminVip from "./admin-vip";
import { SiteNavigation } from "@/components/site-navigation";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@supabase/supabase-js";

export const metadata = {
  title: "Admin Game | ZOPLAY",
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const user = await currentUser();

  if (!user) redirect("/sign-in?redirect_url=%2Fadmin");

  if (user.publicMetadata.role !== "admin") {
    return (
      <main className="admin-shell">
        <SiteNavigation />
        <section className="admin-denied">
          <span>403 · AKSES TERBATAS</span>
          <h1>Akun ini belum memiliki akses admin.</h1>
          <Link href="/">Kembali ke katalog</Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const query = await searchParams;
  const adminName = user.firstName ?? "Admin";
  const isVipSection = query.section === "vip";

  // Jumlah member VIP aktif, untuk penanda di navbar dashboard.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let vipMemberCount = 0;
  if (supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { count } = await supabase
      .from("vip_subscriptions")
      .select("user_id", { count: "exact", head: true })
      .gt("expires_at", new Date().toISOString());
    vipMemberCount = count ?? 0;
  }

  return isVipSection
    ? <AdminVip adminName={adminName} />
    : <AdminGameForm adminName={adminName} vipMemberCount={vipMemberCount} />;
}