// Membuat banner GIF profil gaming: RGB neon berubah warna, bintang bergerak, dan "scanline" bergerak.
// Jalankan: node scripts/generate-profile-gif.mjs
import pkg from "gifenc";
const { GIFEncoder, applyPalette, quantize } = pkg;
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

const WIDTH = 1280;
const HEIGHT = 480;
const FRAMES = 24;
const DELAY = 60;

function frameSvg(i) {
  const t = i / FRAMES;
  const hue = Math.round(t * 360);
  const hue2 = (hue + 40) % 360;
  // Bintang "pixels" ala arcade yang bergerak diagonal
  let stars = "";
  for (let k = 0; k < 26; k += 1) {
    const x = (k * 97 + i * 42) % WIDTH;
    const y = (k * 53 + i * 26) % HEIGHT;
    const a = 0.25 + ((k + i) % 4) * 0.18;
    const s = 3 + ((k * 7 + i) % 3) * 2;
    stars += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="rgba(155,225,93,${a})"/>`;
  }
  // Scanline bergerak
  const scanY = (i / FRAMES) * (HEIGHT + 120) - 60;
  // Logo gamepad sederhana yang "mengapung"
  const floatY = Math.sin(t * Math.PI * 2) * 14;
  return `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${hue},70%,16%)"/>
        <stop offset="1" stop-color="hsl(${hue2},65%,7%)"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
    ${stars}
    <rect x="0" y="${scanY}" width="${WIDTH}" height="60" fill="rgba(155,225,93,0.07)"/>
    <g transform="translate(${WIDTH / 2 - 60}, ${HEIGHT / 2 - 40 + floatY})">
      <rect x="0" y="0" width="120" height="72" rx="26" fill="rgba(5,10,8,0.55)" stroke="hsl(${hue2},80%,60%)" stroke-width="3"/>
      <rect x="22" y="30" width="34" height="12" rx="6" fill="hsl(${hue2},80%,60%)"/>
      <rect x="33" y="19" width="12" height="34" rx="6" fill="hsl(${hue2},80%,60%)"/>
      <circle cx="82" cy="26" r="7" fill="hsl(${hue},85%,62%)"/>
      <circle cx="98" cy="44" r="7" fill="hsl(${hue2},85%,62%)"/>
    </g>
  </svg>`;
}

const gif = GIFEncoder();
for (let i = 0; i < FRAMES; i += 1) {
  const png = await sharp(Buffer.from(frameSvg(i))).resize(WIDTH, HEIGHT).png().toBuffer();
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const palette = quantize(data, 128);
  const index = applyPalette(data, palette);
  gif.writeFrame(index, info.width, info.height, { palette, delay: DELAY });
}
gif.finish();

mkdirSync("public", { recursive: true });
writeFileSync("public/profile-banner.gif", gif.bytes());
console.log("OK: public/profile-banner.gif");
