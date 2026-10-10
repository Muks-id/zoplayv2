export const VIP_DURATIONS = [7, 14, 30] as const;
export type VipDuration = (typeof VIP_DURATIONS)[number];

/** Harga per durasi (rupiah, tanpa titik). Dicerminkan dari server agar bisa dipakai di komponen client. */
export const VIP_PRICES: Record<VipDuration, number> = {
  7: 5000,
  14: 9500,
  30: 145000,
};