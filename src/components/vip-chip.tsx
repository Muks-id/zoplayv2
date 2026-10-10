import { Crown } from "lucide-react";
import Link from "next/link";

type VipChipProps = {
  isVip: boolean;
  /** Kalau user belum login, tombolnya jadi ajakan masuk dulu. */
  isSignedIn: boolean;
  className?: string;
};

/**
 * Tombol VIP di navbar: untuk member aktif jadi lencana, untuk selainnya tautan ke halaman /vip.
 */
export function VipChip({ isVip, isSignedIn, className = "" }: VipChipProps) {
  if (isVip) {
    return (
      <span className={`vip-chip is-member ${className}`} title="Status VIP kamu aktif">
        <Crown size={13} strokeWidth={2.5} /> VIP
      </span>
    );
  }

  return (
    <Link className={`vip-chip ${className}`} href={isSignedIn ? "/vip" : "/sign-in"}>
      <Crown size={13} strokeWidth={2.5} /> {isSignedIn ? "Jadi VIP" : "VIP"}
    </Link>
  );
}