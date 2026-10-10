import { Crown } from "lucide-react";

/** Lencana VIP di samping nama. Sengaja kecil supaya tidak mengganggu daftar komentar atau chat. */
export function VipBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`vip-badge vip-gold ${className}`} title="Member VIP" aria-label="Member VIP">
      <Crown size={11} strokeWidth={2.5} /> VIP
    </span>
  );
}