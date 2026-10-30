/* ------------------------------------------------------------------ */
/* Affiliate banner artwork — single source of truth                   */
/*                                                                     */
/* Five individually designed, self-contained SVG banners in the       */
/* site's dark + gold brand. Pure string builders: no external assets, */
/* no scripts, and NO referral data inside the artwork — the           */
/* affiliate's referral link belongs in the wrapping <a> of embed      */
/* snippets, exactly as the resources page has always done it.         */
/*                                                                     */
/* Consumers:                                                          */
/*  - src/components/affiliate/BannerArt.tsx (in-page render +         */
/*    SVG/PNG downloads)                                               */
/*  - src/app/affiliate-banners/[slug]/route.ts (hosted image URL      */
/*    https://worldeye.app/affiliate-banners/<slug>.svg for embeds)    */
/*  - Marketing Studio embed tooling builds on BANNER_DESIGNS —        */
/*    do not fork the artwork.                                         */
/*                                                                     */
/* Copy rules: truthful claims only. The one statistic used is the     */
/* locked, true network figure: 74,229 live cameras.                   */
/* ------------------------------------------------------------------ */

export interface BannerDesign {
  slug: string;
  name: string;
  blurb: string;
  width: number;
  height: number;
  svg: () => string;
}

const FONT = "Arial, Helvetica, sans-serif";
const GOLD = "#f2b33d";
const GOLD_LIGHT = "#ffd977";
const INK = "#ffffff";
const SUB = "#c7cede";
const MUTED = "#8b94a7";
const LIVE_RED = "#ff5252";

/* Shared pill (call-to-action lozenge) — returns SVG markup. */
function pill(x: number, y: number, w: number, h: number, label: string, gid: string, fontSize = 22): string {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="url(#${gid})"/>` +
    `<text x="${x + w / 2}" y="${y + h / 2}" font-family="${FONT}" font-size="${fontSize}" font-weight="700" fill="#1a1206" text-anchor="middle" dominant-baseline="central">${label}</text>`
  );
}

function goldGrad(id: string): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GOLD_LIGHT}"/><stop offset="1" stop-color="#d99a16"/></linearGradient>`;
}

/* 1 — Globe rings, wide (link-share / blog header size) ------------- */
function globeRingSvg(): string {
  const dots: Array<[number, number, number]> = [
    [300, 124, 5], [415, 190, 4], [455, 330, 5], [380, 460, 4],
    [215, 480, 5], [150, 350, 4], [170, 185, 4], [300, 314, 6],
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 628" width="1200" height="628" role="img" aria-label="WorldEye — see the planet live">
<title>WorldEye — See the Planet Live</title>
<defs>
<radialGradient id="bg-globe-ring" cx="0.25" cy="0.5" r="0.9"><stop offset="0" stop-color="#0d1626"/><stop offset="0.55" stop-color="#070b14"/><stop offset="1" stop-color="#04060a"/></radialGradient>
${goldGrad("pill-globe-ring")}
</defs>
<rect width="1200" height="628" fill="url(#bg-globe-ring)"/>
<g fill="none" stroke="${GOLD}">
<circle cx="300" cy="314" r="196" stroke-opacity="0.55" stroke-width="2"/>
<circle cx="300" cy="314" r="142" stroke-opacity="0.35" stroke-width="1.5"/>
<circle cx="300" cy="314" r="88" stroke-opacity="0.25" stroke-width="1.5"/>
<ellipse cx="300" cy="314" rx="86" ry="196" stroke-opacity="0.4" stroke-width="1.5"/>
<ellipse cx="300" cy="314" rx="160" ry="196" stroke-opacity="0.22" stroke-width="1.5"/>
<line x1="104" y1="314" x2="496" y2="314" stroke-opacity="0.3" stroke-width="1.5"/>
</g>
${dots.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${GOLD}"/>`).join("\n")}
<text x="566" y="196" font-family="${FONT}" font-size="25" font-weight="700" letter-spacing="10" fill="${GOLD}">WORLDEYE</text>
<text x="562" y="292" font-family="${FONT}" font-size="76" font-weight="900" fill="${INK}">SEE THE PLANET</text>
<text x="562" y="376" font-family="${FONT}" font-size="76" font-weight="900" fill="${GOLD}">LIVE</text>
<text x="566" y="434" font-family="${FONT}" font-size="27" fill="${SUB}">74,229 live cameras on a free 3D globe</text>
${pill(566, 472, 232, 56, "Explore free →", "pill-globe-ring")}
</svg>`;
}

/* 2 — Camera grid, square (social post size) ------------------------ */
function cameraGridSvg(): string {
  const tiles: string[] = [];
  const fills = ["#0b2440", "#101c2c", "#0a1a2e", "#16222f", "#0d2036", "#111827", "#0b2440", "#131c26", "#0a1a2e", "#101c2c", "#16222f", "#0d2036"];
  const liveTiles = new Set([1, 4, 6, 9]);
  for (let i = 0; i < 12; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 70 + col * 240;
    const y = 64 + row * 172;
    tiles.push(`<rect x="${x}" y="${y}" width="220" height="150" rx="14" fill="${fills[i]}" stroke="#f2b33d" stroke-opacity="0.18"/>`);
    if (liveTiles.has(i)) {
      tiles.push(`<circle cx="${x + 26}" cy="${y + 26}" r="7" fill="${LIVE_RED}"/><text x="${x + 42}" y="${y + 32}" font-family="${FONT}" font-size="15" font-weight="700" letter-spacing="2" fill="#ffb3b3">LIVE</text>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080" role="img" aria-label="WorldEye — 74,229 live cameras">
<title>WorldEye — 74,229 Live Cameras</title>
<defs>
<radialGradient id="bg-camera-grid" cx="0.5" cy="0" r="1"><stop offset="0" stop-color="#0c1424"/><stop offset="1" stop-color="#04060a"/></radialGradient>
${goldGrad("pill-camera-grid")}
</defs>
<rect width="1080" height="1080" fill="url(#bg-camera-grid)"/>
${tiles.join("\n")}
<text x="540" y="716" font-family="${FONT}" font-size="84" font-weight="900" fill="${INK}" text-anchor="middle">74,229 LIVE CAMERAS</text>
<text x="540" y="782" font-family="${FONT}" font-size="31" fill="${SUB}" text-anchor="middle">One free globe — beaches, cities, highways, landmarks.</text>
${pill(395, 836, 290, 64, "Watch free →", "pill-camera-grid", 25)}
<text x="540" y="986" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="12" fill="${MUTED}" text-anchor="middle">WORLDEYE</text>
</svg>`;
}

/* 3 — Leaderboard strip (blog / forum signature size) --------------- */
function leaderboardSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 728 90" width="728" height="90" role="img" aria-label="WorldEye — watch 74,229 live cameras free">
<title>WorldEye — Watch 74,229 live cameras, free</title>
<defs>${goldGrad("pill-leaderboard")}</defs>
<rect width="728" height="90" fill="#05070c"/>
<circle cx="52" cy="45" r="27" fill="none" stroke="${GOLD}" stroke-width="2.5"/>
<ellipse cx="52" cy="45" rx="12" ry="27" fill="none" stroke="${GOLD}" stroke-opacity="0.6" stroke-width="1.5"/>
<circle cx="52" cy="45" r="4" fill="${GOLD}"/>
<text x="96" y="54" font-family="${FONT}" font-size="23" font-weight="900" letter-spacing="3" fill="${INK}">WORLDEYE</text>
<line x1="238" y1="18" x2="238" y2="72" stroke="#f2b33d" stroke-opacity="0.3"/>
<text x="258" y="53" font-family="${FONT}" font-size="20" fill="${SUB}">Watch 74,229 live cameras — free</text>
${pill(584, 24, 124, 42, "Open →", "pill-leaderboard", 17)}
</svg>`;
}

/* 4 — Rectangle (sidebar / in-article size) -------------------------- */
function rectangleSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 250" width="300" height="250" role="img" aria-label="WorldEye — the world, live">
<title>WorldEye — The World, Live</title>
<defs>
<radialGradient id="bg-rectangle" cx="0.5" cy="0.2" r="1"><stop offset="0" stop-color="#0d1626"/><stop offset="1" stop-color="#04060a"/></radialGradient>
${goldGrad("pill-rectangle")}
</defs>
<rect width="300" height="250" fill="url(#bg-rectangle)"/>
<circle cx="150" cy="42" r="19" fill="none" stroke="${GOLD}" stroke-width="2"/>
<ellipse cx="150" cy="42" rx="8" ry="19" fill="none" stroke="${GOLD}" stroke-opacity="0.6" stroke-width="1.2"/>
<text x="150" y="88" font-family="${FONT}" font-size="15" font-weight="700" letter-spacing="6" fill="${GOLD}" text-anchor="middle">WORLDEYE</text>
<text x="150" y="128" font-family="${FONT}" font-size="35" font-weight="900" fill="${INK}" text-anchor="middle">THE WORLD,</text>
<text x="150" y="166" font-family="${FONT}" font-size="35" font-weight="900" fill="${GOLD}" text-anchor="middle">LIVE.</text>
<text x="150" y="194" font-family="${FONT}" font-size="14" fill="${SUB}" text-anchor="middle">74,229 cameras · Free globe</text>
${pill(80, 206, 140, 34, "Explore free", "pill-rectangle", 14)}
</svg>`;
}

/* 5 — Pro command arcs, wide ----------------------------------------- */
function proCommandSvg(): string {
  const arcs: string[] = [];
  for (let i = 0; i < 5; i++) {
    const r = 240 + i * 78;
    arcs.push(`<circle cx="1050" cy="700" r="${r}" fill="none" stroke="${GOLD}" stroke-opacity="${0.4 - i * 0.07}" stroke-width="1.5"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 628" width="1200" height="628" role="img" aria-label="WorldEye Pro — go beyond the globe">
<title>WorldEye Pro — Go Beyond the Globe</title>
<defs>
<radialGradient id="bg-pro-command" cx="0.85" cy="1" r="1.1"><stop offset="0" stop-color="#171106"/><stop offset="0.5" stop-color="#08070c"/><stop offset="1" stop-color="#04060a"/></radialGradient>
${goldGrad("pill-pro-command")}
</defs>
<rect width="1200" height="628" fill="url(#bg-pro-command)"/>
${arcs.join("\n")}
<circle cx="1050" cy="700" r="10" fill="${GOLD}"/>
<text x="84" y="150" font-family="${FONT}" font-size="25" font-weight="700" letter-spacing="10" fill="${GOLD}">WORLDEYE PRO</text>
<text x="80" y="248" font-family="${FONT}" font-size="72" font-weight="900" fill="${INK}">GO BEYOND</text>
<text x="80" y="330" font-family="${FONT}" font-size="72" font-weight="900" fill="${INK}">THE GLOBE</text>
<text x="84" y="392" font-family="${FONT}" font-size="27" fill="${SUB}">AI analyst · Satellite view · OSINT toolkit</text>
<text x="84" y="434" font-family="${FONT}" font-size="21" fill="${MUTED}">Weekly · Monthly · Annual plans</text>
${pill(84, 470, 216, 56, "See plans →", "pill-pro-command")}
</svg>`;
}

export const BANNER_DESIGNS: BannerDesign[] = [
  {
    slug: "globe-ring",
    name: "Globe Rings — Wide",
    blurb: "Link-share and blog headers. The flagship look: gold orbit rings over a dark globe.",
    width: 1200,
    height: 628,
    svg: globeRingSvg,
  },
  {
    slug: "camera-grid",
    name: "Camera Grid — Square",
    blurb: "Social posts. A wall of live-camera tiles over the network's headline number.",
    width: 1080,
    height: 1080,
    svg: cameraGridSvg,
  },
  {
    slug: "leaderboard",
    name: "Leaderboard Strip",
    blurb: "Blog footers and forum signatures. One line, one action.",
    width: 728,
    height: 90,
    svg: leaderboardSvg,
  },
  {
    slug: "rectangle",
    name: "Rectangle",
    blurb: "Sidebars and in-article slots. Compact stacked wordmark design.",
    width: 300,
    height: 250,
    svg: rectangleSvg,
  },
  {
    slug: "pro-command",
    name: "Pro Command — Wide",
    blurb: "For Pro-focused posts. Signal arcs and the full Pro toolkit line.",
    width: 1200,
    height: 628,
    svg: proCommandSvg,
  },
];

export function bannerBySlug(slug: string): BannerDesign | undefined {
  return BANNER_DESIGNS.find((b) => b.slug === slug);
}

/** Public hosted URL for a banner's artwork (embed snippets point here). */
export function bannerImageUrl(slug: string): string {
  return `https://worldeye.app/affiliate-banners/${slug}.svg`;
}
