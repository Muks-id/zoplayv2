import { Monitor, Smartphone } from "lucide-react";
import type { Game } from "@/lib/games";

const platformLabels: Record<Game["platform"], string> = {
  PC: "Windows",
  Android: "Android",
  "PC & Android": "Windows dan Android",
};

export function PlatformPill({ platform }: { platform: Game["platform"] }) {
  const label = platformLabels[platform];
  return (
    <span className="platform-pill platform-icon-set" aria-label={label} title={label}>
      {platform !== "Android" && <Monitor size={12} />}
      {platform !== "PC" && <Smartphone size={12} />}
    </span>
  );
}
