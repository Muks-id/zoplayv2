/** Warna khas untuk setiap tier XP (siap dipakai sebagai style inline). */
export const TIER_STYLES: Record<string, { color: string; borderColor: string; background: string }> = {
  Rookie: { color: "#9be15d", borderColor: "rgba(155,225,93,.35)", background: "rgba(155,225,93,.1)" },
  Gamer: { color: "#7ba8ff", borderColor: "rgba(123,168,255,.35)", background: "rgba(123,168,255,.1)" },
  "Pro Player": { color: "#c08bff", borderColor: "rgba(192,139,255,.35)", background: "rgba(192,139,255,.1)" },
  Veteran: { color: "#ff7b7b", borderColor: "rgba(255,123,123,.35)", background: "rgba(255,123,123,.1)" },
  Elite: { color: "#ffb35c", borderColor: "rgba(255,179,92,.35)", background: "rgba(255,179,92,.1)" },
  Legend: { color: "#fff", borderColor: "rgba(245,197,66,.55)", background: "linear-gradient(90deg, rgba(245,197,66,.35), rgba(255,123,123,.35), rgba(192,139,255,.35))" },
};

export function tierStyle(title: string) {
  return TIER_STYLES[title] ?? { color: "#a4b0a7", borderColor: "rgba(164,176,167,.3)", background: "rgba(164,176,167,.08)" };
}
