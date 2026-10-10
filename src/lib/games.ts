export type GameDownloadVersion = {
  id: string;
  versionLabel: string;
  links: { platform: "windows" | "android"; serverName: string; destinationUrl?: string; safelinkId?: string }[];
};

export type Game = {
  id?: string;
  slug: string;
  title: string;
  category: string;
  platform: "PC" | "Android" | "PC & Android";
  image: string;
  rating: string;
  downloads: string;
  downloadCount?: number;
  comments: number;
  size: string;
  developer: string;
  release: string;
  description: string;
  downloadVersions?: GameDownloadVersion[];
  galleryImages?: string[];
  featured?: boolean;
  is18Plus?: boolean;
};

export const gameCategories = ["Semua Game", "Action RPG", "Adventure", "Open World", "RPG", "Simulation", "MOBA"];

export function gameSlug(title: string) {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Mengubah angka ringkas seperti "24.8K" atau "1,2 jt" menjadi angka biasa. */
export function parseCompactCount(value: string) {
  const match = value.trim().toLowerCase().replace(",", ".").match(/^([\d.]+)\s*([a-z]*)/);
  if (!match) return 0;
  const amount = Number.parseFloat(match[1]);
  if (Number.isNaN(amount)) return 0;
  const suffix = match[2];
  const multiplier = suffix.startsWith("k") || suffix.startsWith("rb") ? 1e3 : suffix.startsWith("jt") || suffix.startsWith("m") ? 1e6 : suffix.startsWith("b") ? 1e9 : 1;
  return Math.round(amount * multiplier);
}

export function gameDownloadCount(game: Game) {
  return game.downloadCount ?? parseCompactCount(game.downloads);
}

export const demoGames: Game[] = [
  {
    slug: "elden-ring-shadow-of-the-erdtree",
    title: "Elden Ring: Shadow of the Erdtree",
    category: "Action RPG",
    platform: "PC",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85",
    rating: "9.8",
    downloads: "24.8K",
    comments: 128,
    size: "68.4 GB",
    developer: "FromSoftware",
    release: "21 Jun 2024",
    description: "Jelajahi Land of Shadow dalam ekspansi epik yang memperluas dunia Elden Ring. Hadapi musuh baru, temukan senjata legendaris, dan ungkap kisah yang tersembunyi di balik Erdtree.",
    featured: true,
    is18Plus: true,
  },
  {
    slug: "ghost-of-tsushima-directors-cut",
    title: "Ghost of Tsushima: Director’s Cut",
    category: "Adventure",
    platform: "PC",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=85",
    rating: "9.6",
    downloads: "18.2K",
    comments: 86,
    size: "53.2 GB",
    developer: "Sucker Punch",
    release: "16 May 2024",
    description: "Jadilah Jin Sakai dan lawan invasi Mongol di pulau Tsushima. Director’s Cut menghadirkan petualangan penuh aksi dengan eksplorasi dunia terbuka yang memukau.",
    featured: true,
  },
  {
    slug: "black-myth-wukong",
    title: "Black Myth: Wukong",
    category: "Action RPG",
    platform: "PC",
    image: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=900&q=85",
    rating: "9.4",
    downloads: "31.6K",
    comments: 214,
    size: "118 GB",
    developer: "Game Science",
    release: "20 Aug 2024",
    description: "Berangkat sebagai Destined One dalam aksi-RPG yang terinspirasi Journey to the West. Kuasai jurus, transformasi, dan hadapi legenda yang terlupakan.",
    featured: true,
    is18Plus: true,
  },
  {
    slug: "honkai-star-rail",
    title: "Honkai: Star Rail",
    category: "RPG",
    platform: "Android",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=85",
    rating: "9.2",
    downloads: "42.1K",
    comments: 302,
    size: "18.7 GB",
    developer: "HoYoverse",
    release: "26 Apr 2023",
    description: "Naiki Astral Express dan jelajahi dunia-dunia baru dalam petualangan space fantasy dengan pertarungan turn-based yang strategis.",
    featured: true,
  },
  {
    slug: "cyberpunk-2077-ultimate-edition",
    title: "Cyberpunk 2077: Ultimate Edition",
    category: "Open World",
    platform: "PC",
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85",
    rating: "9.1",
    downloads: "16.9K",
    comments: 175,
    size: "86.2 GB",
    developer: "CD Projekt Red",
    release: "10 Dec 2020",
    description: "Masuki Night City sebagai V, mercenary cyberpunk yang mengejar implan unik. Termasuk ekspansi Phantom Liberty dan seluruh pembaruan utama.",
    featured: true,
    is18Plus: true,
  },
  {
    slug: "wuthering-waves",
    title: "Wuthering Waves",
    category: "Action RPG",
    platform: "Android",
    image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=900&q=85",
    rating: "8.9",
    downloads: "22.5K",
    comments: 96,
    size: "12.4 GB",
    developer: "Kuro Games",
    release: "22 May 2024",
    description: "Bangkit sebagai Rover di dunia pasca-apokaliptik yang luas. Nikmati combat cepat, mobilitas tinggi, dan kisah yang terus berkembang.",
  },
  {
    slug: "stardew-valley",
    title: "Stardew Valley",
    category: "Simulation",
    platform: "PC",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85",
    rating: "9.7",
    downloads: "12.3K",
    comments: 54,
    size: "620 MB",
    developer: "ConcernedApe",
    release: "26 Feb 2016",
    description: "Tinggalkan hidup di kota dan mulai lembaran baru di lembah. Bangun kebun, berteman dengan warga, dan temukan rahasia Stardew Valley.",
  },
  {
    slug: "mobile-legends-bang-bang",
    title: "Mobile Legends: Bang Bang",
    category: "MOBA",
    platform: "Android",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=85",
    rating: "8.7",
    downloads: "58.4K",
    comments: 442,
    size: "2.1 GB",
    developer: "Moonton",
    release: "14 Jul 2016",
    description: "Bertarung bersama tim dalam MOBA 5v5 yang serba cepat. Pilih hero andalan, susun strategi, dan kuasai Land of Dawn.",
  },
];
