// 10 avatar anime original: 5 perempuan + 5 laki-laki.
// Setiap karakter unik: gaya rambut, warna, mata, ekspresi, pakaian, aksesori, dan aura berbeda.
// Tema: modern anime gaming profile avatar, stylish, premium, youthful.

function avatarFrame(bg1: string, bg2: string, children: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.6">
      <stop offset="0" stop-color="rgba(255,255,255,0.12)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="200" height="200" fill="url(#bg)"/>
  <rect width="200" height="200" fill="url(#glow)"/>
  ${children}
</svg>`;
}

function eye(cx: number, cy: number, irisColor: string, highlightColor: string) {
  return `
  <ellipse cx="${cx}" cy="${cy}" rx="7" ry="8" fill="#fff"/>
  <ellipse cx="${cx}" cy="${cy + 0.5}" rx="5.5" ry="6.5" fill="${irisColor}"/>
  <ellipse cx="${cx}" cy="${cy + 1}" rx="3" ry="4" fill="#1a1a2e"/>
  <circle cx="${cx - 2}" cy="${cy - 2}" r="2" fill="${highlightColor}"/>
  <circle cx="${cx + 2.5}" cy="${cy + 1}" r="1" fill="${highlightColor}" opacity="0.6"/>
  <path d="M${cx - 7} ${cy - 3} Q${cx} ${cy - 8} ${cx + 7} ${cy - 3}" stroke="#2d2d3a" stroke-width="1.5" fill="none"/>
  <path d="M${cx - 6} ${cy + 5} Q${cx} ${cy + 7} ${cx + 6} ${cy + 5}" stroke="#2d2d3a" stroke-width="0.8" fill="none" opacity="0.4"/>`;
}

function blush(cx: number, cy: number, opacity: number) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="8" ry="4" fill="#ffb3c6" opacity="${opacity}"/>`;
}

// ============================================================
// FEMALE 1: "Akari" — cheerful, playful, pink twin-tails
// ============================================================
const female1 = avatarFrame("#ff6b9d", "#c44569", `
  <!-- Shoulders / Hoodie -->
  <path d="M40 200 Q50 155 100 150 Q150 155 160 200 Z" fill="#ff8fab"/>
  <path d="M40 200 Q50 155 100 150 Q150 155 160 200 Z" fill="url(#glow)"/>
  <path d="M70 155 Q100 165 130 155" stroke="#e0567a" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="88" y="130" width="24" height="25" rx="8" fill="#ffd9b3"/>
  <!-- Face -->
  <ellipse cx="100" cy="100" rx="38" ry="42" fill="#ffd9b3"/>
  <!-- Twin-tails -->
  <path d="M62 85 Q55 40 75 30 Q95 20 100 35 Q105 20 125 30 Q145 40 138 85" fill="#ff6b9d"/>
  <path d="M62 85 Q50 90 48 110 Q47 130 55 145 Q58 130 60 110 Q62 95 68 88" fill="#ff6b9d"/>
  <path d="M138 85 Q150 90 152 110 Q153 130 145 145 Q142 130 140 110 Q138 95 132 88" fill="#ff6b9d"/>
  <!-- Bangs -->
  <path d="M62 85 Q65 55 80 48 Q90 44 100 46 Q110 44 120 48 Q135 55 138 85 Q130 65 115 60 Q100 56 85 60 Q70 65 62 85 Z" fill="#ff8fab"/>
  <!-- Star hair clips -->
  <path d="M72 58 L74 53 L76 58 L81 58 L77 61 L78 66 L72 63 L66 66 L67 61 L63 58 Z" fill="#ffd700"/>
  <path d="M128 58 L130 53 L132 58 L137 58 L133 61 L134 66 L128 63 L122 66 L123 61 L119 58 Z" fill="#ffd700"/>
  <!-- Eyes -->
  ${eye(85, 100, "#ff9ec7", "#fff")}
  ${eye(115, 100, "#ff9ec7", "#fff")}
  <!-- Eyebrows -->
  <path d="M78 90 Q85 87 92 90" stroke="#d4739e" stroke-width="1.5" fill="none"/>
  <path d="M108 90 Q115 87 122 90" stroke="#d4739e" stroke-width="1.5" fill="none"/>
  <!-- Nose -->
  <path d="M100 108 L98 114 L102 114" stroke="#e8b89a" stroke-width="1" fill="none"/>
  <!-- Mouth - cheerful smile -->
  <path d="M90 120 Q100 128 110 120" stroke="#d4739e" stroke-width="2" fill="none" stroke-linecap="round"/>
  ${blush(75, 112, 0.4)}
  ${blush(125, 112, 0.4)}
`);

// ============================================================
// FEMALE 2: "Yuki" — cool, elegant, long silver-blue hair
// ============================================================
const female2 = avatarFrame("#4a6fa5", "#1a2332", `
  <!-- Shoulders / Blue jacket -->
  <path d="M35 200 Q48 150 100 145 Q152 150 165 200 Z" fill="#2c3e50"/>
  <path d="M35 200 Q48 150 100 145 Q152 150 165 200 Z" fill="url(#glow)"/>
  <path d="M60 150 L100 165 L140 150" stroke="#4a6fa5" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="88" y="128" width="24" height="28" rx="8" fill="#f0d5c0"/>
  <!-- Face -->
  <ellipse cx="100" cy="98" rx="36" ry="40" fill="#f0d5c0"/>
  <!-- Long straight hair -->
  <path d="M64 80 Q58 30 80 22 Q95 15 100 20 Q105 15 120 22 Q142 30 136 80 L136 140 Q130 145 125 140 L125 90 Q120 70 100 68 Q80 70 75 90 L75 140 Q70 145 64 140 Z" fill="#a8c4e0"/>
  <!-- Side strands -->
  <path d="M64 80 Q58 100 60 130 Q62 145 68 148 L68 90 Z" fill="#8fb8d8"/>
  <path d="M136 80 Q142 100 140 130 Q138 145 132 148 L132 90 Z" fill="#8fb8d8"/>
  <!-- Bangs -->
  <path d="M64 80 Q68 50 85 42 Q95 38 100 40 Q105 38 115 42 Q132 50 136 80 Q125 58 110 54 Q100 52 90 54 Q75 58 64 80 Z" fill="#c4d8ec"/>
  <!-- Eyes - cool, slightly narrowed -->
  ${eye(85, 98, "#5b8db8", "#e8f4ff")}
  ${eye(115, 98, "#5b8db8", "#e8f4ff")}
  <!-- Eyebrows - straight, cool -->
  <path d="M78 88 L92 88" stroke="#6b8cae" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M108 88 L122 88" stroke="#6b8cae" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Nose -->
  <path d="M100 106 L98 112 L102 112" stroke="#d4a88a" stroke-width="1" fill="none"/>
  <!-- Mouth - subtle, elegant -->
  <path d="M93 118 Q100 121 107 118" stroke="#b8846a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Earring -->
  <circle cx="64" cy="108" r="2.5" fill="#8fb8d8"/>
  <circle cx="136" cy="108" r="2.5" fill="#8fb8d8"/>
`);

// ============================================================
// FEMALE 3: "Rin" — mysterious, dark purple bob, one eye covered
// ============================================================
const female3 = avatarFrame("#2d1b4e", "#0d0a1a", `
  <!-- Shoulders / Black turtleneck -->
  <path d="M38 200 Q50 152 100 148 Q150 152 162 200 Z" fill="#1a1a2e"/>
  <path d="M38 200 Q50 152 100 148 Q150 152 162 200 Z" fill="url(#glow)"/>
  <path d="M75 152 Q100 160 125 152" stroke="#2d2d4a" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="88" y="130" width="24" height="25" rx="8" fill="#e8c4a8"/>
  <!-- Face -->
  <ellipse cx="100" cy="100" rx="37" ry="41" fill="#e8c4a8"/>
  <!-- Bob hair -->
  <path d="M63 82 Q55 35 78 25 Q95 18 100 22 Q105 18 122 25 Q145 35 137 82 L137 110 Q130 115 125 110 L125 85 Q118 65 100 63 Q82 65 75 85 L75 110 Q70 115 63 110 Z" fill="#4a2d6b"/>
  <!-- Bangs covering right eye -->
  <path d="M63 82 Q66 48 82 40 Q92 35 100 37 Q108 35 118 40 Q134 48 137 82 Q128 55 112 50 Q100 47 88 50 Q72 55 63 82 Z" fill="#5c3d82"/>
  <!-- Extra strand over right eye -->
  <path d="M100 37 Q115 42 125 55 Q128 65 125 75 Q118 60 110 52 Q100 47 95 50 Q90 55 88 65 Q85 55 90 45 Q95 38 100 37 Z" fill="#6b4d94"/>
  <!-- Left eye visible -->
  ${eye(82, 100, "#8b5cf6", "#e0d0ff")}
  <!-- Right eye partially hidden -->
  <path d="M108 95 Q115 92 122 95" stroke="#3d2060" stroke-width="2" fill="none"/>
  <!-- Eyebrows -->
  <path d="M75 90 Q82 87 89 90" stroke="#3d2060" stroke-width="1.5" fill="none"/>
  <path d="M111 88 Q118 86 125 88" stroke="#3d2060" stroke-width="1.5" fill="none"/>
  <!-- Nose -->
  <path d="M100 108 L98 114 L102 114" stroke="#c49a7a" stroke-width="1" fill="none"/>
  <!-- Mouth - mysterious smirk -->
  <path d="M92 120 Q100 124 108 119" stroke="#a06a5a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <!-- Choker -->
  <rect x="82" y="148" width="36" height="4" rx="2" fill="#1a1a2e"/>
  <circle cx="100" cy="150" r="2" fill="#8b5cf6"/>
`);

// ============================================================
// FEMALE 4: "Mika" — confident, orange wavy side ponytail
// ============================================================
const female4 = avatarFrame("#e85d04", "#9d0208", `
  <!-- Shoulders / Red jacket -->
  <path d="M36 200 Q48 150 100 146 Q152 150 164 200 Z" fill="#6a040f"/>
  <path d="M36 200 Q48 150 100 146 Q152 150 164 200 Z" fill="url(#glow)"/>
  <path d="M62 150 L100 162 L138 150" stroke="#9d0208" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="88" y="128" width="24" height="28" rx="8" fill="#d4a574"/>
  <!-- Face -->
  <ellipse cx="100" cy="98" rx="38" ry="42" fill="#d4a574"/>
  <!-- Side ponytail base -->
  <path d="M62 82 Q55 35 78 25 Q95 18 100 22 Q105 18 122 25 Q145 35 138 82" fill="#e85d04"/>
  <!-- Wavy ponytail -->
  <path d="M138 82 Q155 90 158 115 Q160 140 150 160 Q145 170 138 165 Q145 150 142 130 Q140 110 132 95 Z" fill="#e85d04"/>
  <path d="M138 82 Q155 90 158 115 Q160 140 150 160" stroke="#c44d00" stroke-width="1.5" fill="none"/>
  <!-- Bangs -->
  <path d="M62 82 Q65 52 82 44 Q92 40 100 42 Q108 40 118 44 Q135 52 138 82 Q128 60 112 55 Q100 52 88 55 Q72 60 62 82 Z" fill="#f48c06"/>
  <!-- Hair tie -->
  <circle cx="138" cy="82" r="4" fill="#ffd700"/>
  <!-- Eyes - confident, sharp -->
  ${eye(85, 98, "#2d6a4f", "#d8f3dc")}
  ${eye(115, 98, "#2d6a4f", "#d8f3dc")}
  <!-- Eyebrows - angled, confident -->
  <path d="M77 88 L92 91" stroke="#8b4513" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M123 88 L108 91" stroke="#8b4513" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Nose -->
  <path d="M100 106 L98 112 L102 112" stroke="#b8846a" stroke-width="1" fill="none"/>
  <!-- Mouth - confident smirk -->
  <path d="M90 119 Q100 125 110 118" stroke="#8b4513" stroke-width="2" fill="none" stroke-linecap="round"/>
  ${blush(75, 110, 0.25)}
  ${blush(125, 110, 0.25)}
`);

// ============================================================
// FEMALE 5: "Sakura" — cute, calm, light green short bob with ahoge
// ============================================================
const female5 = avatarFrame("#52b788", "#1b4332", `
  <!-- Shoulders / White turtleneck -->
  <path d="M40 200 Q52 152 100 148 Q148 152 160 200 Z" fill="#f8f9fa"/>
  <path d="M40 200 Q52 152 100 148 Q148 152 160 200 Z" fill="url(#glow)"/>
  <path d="M72 152 Q100 162 128 152" stroke="#dee2e6" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="88" y="130" width="24" height="25" rx="8" fill="#fce4d6"/>
  <!-- Face -->
  <ellipse cx="100" cy="100" rx="37" ry="41" fill="#fce4d6"/>
  <!-- Short bob -->
  <path d="M63 82 Q56 38 78 28 Q95 22 100 26 Q105 22 122 28 Q144 38 137 82 L137 105 Q130 110 125 105 L125 88 Q118 68 100 66 Q82 68 75 88 L75 105 Q70 110 63 105 Z" fill="#74c69d"/>
  <!-- Ahoge -->
  <path d="M100 26 Q102 18 108 15 Q104 22 103 28" fill="#74c69d"/>
  <!-- Bangs -->
  <path d="M63 82 Q66 52 82 44 Q92 40 100 42 Q108 40 118 44 Q134 52 137 82 Q128 60 112 55 Q100 52 88 55 Q72 60 63 82 Z" fill="#95d5b2"/>
  <!-- Eyes - soft, gentle -->
  ${eye(85, 100, "#48bfe3", "#e0f7fa")}
  ${eye(115, 100, "#48bfe3", "#e0f7fa")}
  <!-- Eyebrows - soft -->
  <path d="M78 90 Q85 88 92 90" stroke="#5a8a6a" stroke-width="1.5" fill="none"/>
  <path d="M108 90 Q115 88 122 90" stroke="#5a8a6a" stroke-width="1.5" fill="none"/>
  <!-- Nose -->
  <path d="M100 108 L98 114 L102 114" stroke="#e8b89a" stroke-width="1" fill="none"/>
  <!-- Mouth - gentle smile -->
  <path d="M92 119 Q100 125 108 119" stroke="#c4846a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  ${blush(75, 112, 0.5)}
  ${blush(125, 112, 0.5)}
  <!-- Small flower accessory -->
  <circle cx="130" cy="70" r="3" fill="#ffb703"/>
  <circle cx="130" cy="70" r="1.5" fill="#fb8500"/>
`);

// ============================================================
// MALE 1: "Kaito" — cool, confident, black spiky hair with blue highlights
// ============================================================
const male1 = avatarFrame("#1a1a2e", "#16213e", `
  <!-- Shoulders / Dark hoodie -->
  <path d="M32 200 Q46 148 100 144 Q154 148 168 200 Z" fill="#0f3460"/>
  <path d="M32 200 Q46 148 100 144 Q154 148 168 200 Z" fill="url(#glow)"/>
  <path d="M65 148 Q100 158 135 148" stroke="#1a5276" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="88" y="126" width="24" height="30" rx="8" fill="#c49a6c"/>
  <!-- Face -->
  <ellipse cx="100" cy="96" rx="39" ry="43" fill="#c49a6c"/>
  <!-- Spiky hair -->
  <path d="M61 78 Q52 25 75 18 L70 30 L82 20 L80 32 L95 22 L92 35 L105 25 L100 38 L112 28 L108 40 L120 32 L115 42 L128 35 L122 45 L135 40 L128 50 L139 45 L132 55 L142 50 L135 58 L145 55 L138 62 L148 60 L140 68 L150 65 L142 72 L152 70 L144 78 Q135 55 118 50 Q100 46 82 50 Q65 55 61 78 Z" fill="#1a1a2e"/>
  <!-- Blue highlights -->
  <path d="M75 18 L70 30 L82 20 L80 32 L95 22 L92 35 L105 25 L100 38 L112 28 L108 40 L120 32 L115 42 L128 35 L122 45 L135 40 L128 50 L139 45 L132 55 L142 50 L135 58 L145 55 L138 62 L148 60 L140 68 L150 65 L142 72 L152 70 L144 78" stroke="#2980b9" stroke-width="1" fill="none" opacity="0.6"/>
  <!-- Bangs -->
  <path d="M61 78 Q64 48 80 40 Q90 36 100 38 Q110 36 120 40 Q136 48 139 78 Q130 55 115 50 Q100 47 85 50 Q70 55 61 78 Z" fill="#2c3e50"/>
  <!-- Eyes - sharp, red -->
  ${eye(85, 96, "#c0392b", "#ff6b6b")}
  ${eye(115, 96, "#c0392b", "#ff6b6b")}
  <!-- Eyebrows - thick, angled -->
  <path d="M76 86 L92 89" stroke="#1a1a2e" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M124 86 L108 89" stroke="#1a1a2e" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Nose -->
  <path d="M100 104 L97 111 L103 111" stroke="#a0785a" stroke-width="1.2" fill="none"/>
  <!-- Mouth - confident smirk -->
  <path d="M90 117 Q100 123 110 116" stroke="#8b5e3c" stroke-width="2" fill="none" stroke-linecap="round"/>
`);

// ============================================================
// MALE 2: "Haru" — cheerful, playful, brown messy hair
// ============================================================
const male2 = avatarFrame("#2d6a4f", "#1b4332", `
  <!-- Shoulders / Green jacket -->
  <path d="M34 200 Q48 150 100 146 Q152 150 166 200 Z" fill="#40916c"/>
  <path d="M34 200 Q48 150 100 146 Q152 150 166 200 Z" fill="url(#glow)"/>
  <path d="M64 150 L100 160 L136 150" stroke="#52b788" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="88" y="128" width="24" height="28" rx="8" fill="#d4a574"/>
  <!-- Face -->
  <ellipse cx="100" cy="98" rx="38" ry="42" fill="#d4a574"/>
  <!-- Messy hair -->
  <path d="M62 80 Q54 30 78 20 Q72 28 85 18 L80 30 L95 20 L90 32 L105 22 L100 35 L115 25 L110 38 L125 28 L120 40 L135 32 L128 42 L140 35 L132 45 L145 40 L138 50 L148 45 L140 55 L150 50 L142 60 L152 55 L144 65 Q138 48 120 42 Q100 38 80 42 Q62 48 62 80 Z" fill="#6b4226"/>
  <!-- Bangs -->
  <path d="M62 80 Q65 50 82 42 Q92 38 100 40 Q108 38 118 42 Q135 50 138 80 Q128 58 112 52 Q100 49 88 52 Q72 58 62 80 Z" fill="#8b5e3c"/>
  <!-- Eyes - bright, golden -->
  ${eye(85, 98, "#d4a017", "#fff3cd")}
  ${eye(115, 98, "#d4a017", "#fff3cd")}
  <!-- Eyebrows - friendly -->
  <path d="M77 88 Q84 85 91 88" stroke="#5a3a1a" stroke-width="1.8" fill="none"/>
  <path d="M109 88 Q116 85 123 88" stroke="#5a3a1a" stroke-width="1.8" fill="none"/>
  <!-- Nose -->
  <path d="M100 106 L98 112 L102 112" stroke="#b8846a" stroke-width="1" fill="none"/>
  <!-- Mouth - bright smile -->
  <path d="M88 117 Q100 126 112 117" stroke="#8b5e3c" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  ${blush(75, 110, 0.3)}
  ${blush(125, 110, 0.3)}
`);

// ============================================================
// MALE 3: "Ren" — mysterious, elegant, long dark blue hair tied back
// ============================================================
const male3 = avatarFrame("#1b2838", "#0a0f1a", `
  <!-- Shoulders / Black turtleneck -->
  <path d="M36 200 Q50 150 100 146 Q150 150 164 200 Z" fill="#1a1a2e"/>
  <path d="M36 200 Q50 150 100 146 Q150 150 164 200 Z" fill="url(#glow)"/>
  <path d="M68 150 Q100 158 132 150" stroke="#2d3a4a" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="88" y="128" width="24" height="28" rx="8" fill="#e8c4a8"/>
  <!-- Face -->
  <ellipse cx="100" cy="98" rx="37" ry="41" fill="#e8c4a8"/>
  <!-- Long hair back -->
  <path d="M63 80 Q55 28 78 18 Q95 12 100 16 Q105 12 122 18 Q145 28 137 80 L137 150 Q130 155 125 150 L125 85 Q118 62 100 60 Q82 62 75 85 L75 150 Q70 155 63 150 Z" fill="#1a3a5c"/>
  <!-- Bangs -->
  <path d="M63 80 Q66 48 82 40 Q92 36 100 38 Q108 36 118 40 Q134 48 137 80 Q128 55 112 50 Q100 47 88 50 Q72 55 63 80 Z" fill="#2c5282"/>
  <!-- Side strands -->
  <path d="M63 80 Q58 100 60 130 Q62 145 68 148 L68 85 Z" fill="#1a3a5c"/>
  <path d="M137 80 Q142 100 140 130 Q138 145 132 148 L132 85 Z" fill="#1a3a5c"/>
  <!-- Eyes - deep purple, calm -->
  ${eye(85, 98, "#6b46c1", "#e0d0ff")}
  ${eye(115, 98, "#6b46c1", "#e0d0ff")}
  <!-- Eyebrows - straight, elegant -->
  <path d="M77 88 L92 88" stroke="#1a3a5c" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M108 88 L123 88" stroke="#1a3a5c" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Nose -->
  <path d="M100 106 L98 112 L102 112" stroke="#c49a7a" stroke-width="1" fill="none"/>
  <!-- Mouth - calm, subtle -->
  <path d="M93 118 Q100 121 107 118" stroke="#a06a5a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Earring -->
  <circle cx="63" cy="106" r="2" fill="#4a6fa5"/>
`);

// ============================================================
// MALE 4: "Sora" — calm, charismatic, white/silver short hair
// ============================================================
const male4 = avatarFrame("#0077b6", "#023e8a", `
  <!-- Shoulders / White jacket -->
  <path d="M34 200 Q48 150 100 146 Q152 150 166 200 Z" fill="#e0f2fe"/>
  <path d="M34 200 Q48 150 100 146 Q152 150 166 200 Z" fill="url(#glow)"/>
  <path d="M64 150 L100 160 L136 150" stroke="#bae6fd" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="88" y="128" width="24" height="28" rx="8" fill="#fce4d6"/>
  <!-- Face -->
  <ellipse cx="100" cy="98" rx="38" ry="42" fill="#fce4d6"/>
  <!-- Short silver hair -->
  <path d="M62 80 Q55 32 78 22 Q95 16 100 20 Q105 16 122 22 Q145 32 138 80 Q130 55 115 50 Q100 47 85 50 Q70 55 62 80 Z" fill="#c0c0c0"/>
  <!-- Bangs -->
  <path d="M62 80 Q65 50 82 42 Q92 38 100 40 Q108 38 118 42 Q135 50 138 80 Q128 58 112 52 Q100 49 88 52 Q72 58 62 80 Z" fill="#e0e0e0"/>
  <!-- Eyes - cyan, calm -->
  ${eye(85, 98, "#00b4d8", "#caf0f8")}
  ${eye(115, 98, "#00b4d8", "#caf0f8")}
  <!-- Eyebrows - soft -->
  <path d="M77 88 Q84 86 91 88" stroke="#808080" stroke-width="1.8" fill="none"/>
  <path d="M109 88 Q116 86 123 88" stroke="#808080" stroke-width="1.8" fill="none"/>
  <!-- Nose -->
  <path d="M100 106 L98 112 L102 112" stroke="#e8b89a" stroke-width="1" fill="none"/>
  <!-- Mouth - gentle smile -->
  <path d="M92 118 Q100 123 108 118" stroke="#c4846a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
`);

// ============================================================
// MALE 5: "Ryu" — confident, bold, red spiky hair
// ============================================================
const male5 = avatarFrame("#9d0208", "#370617", `
  <!-- Shoulders / Red/Black jacket -->
  <path d="M32 200 Q46 148 100 144 Q154 148 168 200 Z" fill="#2b2d42"/>
  <path d="M32 200 Q46 148 100 144 Q154 148 168 200 Z" fill="url(#glow)"/>
  <path d="M62 148 L100 158 L138 148" stroke="#9d0208" stroke-width="2" fill="none"/>
  <!-- Neck -->
  <rect x="88" y="126" width="24" height="30" rx="8" fill="#b8846a"/>
  <!-- Face -->
  <ellipse cx="100" cy="96" rx="39" ry="43" fill="#b8846a"/>
  <!-- Red spiky hair -->
  <path d="M61 78 Q52 22 75 15 L70 28 L82 18 L80 30 L95 20 L92 33 L105 22 L100 36 L112 25 L108 38 L120 28 L115 40 L128 32 L122 43 L135 36 L128 47 L139 42 L132 52 L142 47 L135 56 L145 52 L138 60 L148 57 L140 65 L150 62 L142 70 L152 67 L144 75 Q135 52 118 47 Q100 43 82 47 Q65 52 61 78 Z" fill="#c1121f"/>
  <!-- Bangs -->
  <path d="M61 78 Q64 46 80 38 Q90 34 100 36 Q110 34 120 38 Q136 46 139 78 Q130 54 115 49 Q100 46 85 49 Q70 54 61 78 Z" fill="#e85d04"/>
  <!-- Eyes - amber, intense -->
  ${eye(85, 96, "#d4a017", "#fff3cd")}
  ${eye(115, 96, "#d4a017", "#fff3cd")}
  <!-- Eyebrows - thick, determined -->
  <path d="M76 85 L92 89" stroke="#8b0000" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M124 85 L108 89" stroke="#8b0000" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Nose -->
  <path d="M100 104 L97 111 L103 111" stroke="#8b5e3c" stroke-width="1.2" fill="none"/>
  <!-- Mouth - determined -->
  <path d="M92 118 Q100 122 108 118" stroke="#6b3a2a" stroke-width="2" fill="none" stroke-linecap="round"/>
`);

export const AVATAR_OPTIONS: { id: string; label: string; svg: string }[] = [
  { id: "female1", label: "Akari — Cheerful", svg: female1 },
  { id: "female2", label: "Yuki — Elegant", svg: female2 },
  { id: "female3", label: "Rin — Mysterious", svg: female3 },
  { id: "female4", label: "Mika — Confident", svg: female4 },
  { id: "female5", label: "Sakura — Calm", svg: female5 },
  { id: "male1", label: "Kaito — Cool", svg: male1 },
  { id: "male2", label: "Haru — Cheerful", svg: male2 },
  { id: "male3", label: "Ren — Mysterious", svg: male3 },
  { id: "male4", label: "Sora — Calm", svg: male4 },
  { id: "male5", label: "Ryu — Bold", svg: male5 },
];

/** Mengubah SVG string jadi URL data yang bisa dipasang di <img src>. */
export function svgToDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
