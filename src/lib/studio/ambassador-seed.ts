/**
 * Marketing Studio — Ambassador template seed library.
 *
 * Four ambassador-exclusive designs (category "ambassador"), unlocked for
 * approved ambassadors (AffiliateProfile.isAmbassador). They mirror the
 * templates-seed token system exactly: a server renderer token-replaces
 * {{TOKENS}} into `svgBody`, rasterizes with sharp, then composites the
 * QR / logo layers listed in `layers`.
 *
 * Copy rules (same as templates-seed — verified product facts only):
 *  - "76,000+ live cameras in 105 countries" — never the stale figure.
 *  - No income promises; ambassador framing is about early access and
 *    representing WorldEye, not earnings.
 *
 * Seeding mirrors templates-seed: idempotent, slug-keyed upserts that
 * refresh design fields. Unlike the main library it also (re)sets
 * `active: true` — these four rows are managed as a set and an admin
 * retiring the category does so by gating access, not by archiving rows.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SeedTemplate } from "./templates-seed";
import type { EditableField, TemplateLayer } from "./types";

/* ------------------------------------------------------------------ */
/* Field + layer factories (mirrors templates-seed)                     */
/* ------------------------------------------------------------------ */

const headline = (def: string, maxLen = 60): EditableField => ({
  key: "headline",
  label: "Headline",
  type: "text",
  maxLen,
  default: def,
  required: true,
});
const subhead = (def: string): EditableField => ({
  key: "subhead",
  label: "Subheading",
  type: "textarea",
  maxLen: 110,
  default: def,
});
const cta = (def: string): EditableField => ({
  key: "cta",
  label: "Call to action",
  type: "text",
  maxLen: 28,
  default: def,
});
const accent = (def = "#f59e0b"): EditableField => ({
  key: "accent",
  label: "Accent color",
  type: "color",
  default: def,
});
const showUrl = (): EditableField => ({
  key: "showUrl",
  label: "Show referral link",
  type: "toggle",
  default: true,
});
const std = (h: string, s: string, c: string, withUrl = true): EditableField[] => {
  const f = [headline(h), subhead(s), cta(c), accent()];
  if (withUrl) f.push(showUrl());
  return f;
};

const qr = (x: number, y: number, size: number): TemplateLayer => ({
  type: "qr",
  x,
  y,
  size,
  pad: Math.max(6, Math.round(size * 0.09)),
  bg: "#ffffff",
  fg: "#050810",
  logo: size >= 110,
});
const logo = (x: number, y: number, width: number): TemplateLayer => ({
  type: "logo",
  x,
  y,
  width,
});

/* ------------------------------------------------------------------ */
/* SVG primitives (mirrors templates-seed)                             */
/* ------------------------------------------------------------------ */

const SANS = "'Inter','Liberation Sans','DejaVu Sans',sans-serif";
const MONO = "'JetBrains Mono','DejaVu Sans Mono',monospace";

type TOpts = {
  anchor?: string;
  weight?: number;
  family?: string;
  ls?: number;
  opacity?: number;
};
const T = (x: number, y: number, size: number, fill: string, text: string, o: TOpts = {}): string =>
  '<text x="' + x + '" y="' + y + '" font-family="' + (o.family ?? SANS) + '" font-size="' + size +
  '" font-weight="' + (o.weight ?? 700) + '" fill="' + fill + '"' +
  (o.anchor ? ' text-anchor="' + o.anchor + '"' : "") +
  (o.ls ? ' letter-spacing="' + o.ls + '"' : "") +
  (o.opacity !== undefined ? ' opacity="' + o.opacity + '"' : "") +
  ">" + text + "</text>";

const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0, extra = ""): string =>
  '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"' + extra + "/>";

const S = (w: number, h: number, body: string): string =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' +
  "<defs>" +
  '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#1a1206"/><stop offset="1" stop-color="#050810"/></linearGradient>' +
  '<linearGradient id="sheet" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#050810" stop-opacity="0"/><stop offset="0.35" stop-color="#050810" stop-opacity="0.88"/>' +
  '<stop offset="1" stop-color="#050810"/></linearGradient>' +
  '<radialGradient id="glow"><stop offset="0" stop-color="{{ACCENT}}" stop-opacity="0.45"/>' +
  '<stop offset="1" stop-color="{{ACCENT}}" stop-opacity="0"/></radialGradient>' +
  '<linearGradient id="pill" x1="0" y1="0" x2="1" y2="0">' +
  '<stop offset="0" stop-color="{{ACCENT}}"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>' +
  "</defs>" + body + "</svg>";

const bgRect = (w: number, h: number): string => rect(0, 0, w, h, "url(#bg)");
const glow = (cx: number, cy: number, r: number): string =>
  '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#glow)"/>';

const eye = (cx: number, cy: number, r: number): string =>
  '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="' + Math.max(3, r * 0.09) + '"/>' +
  '<circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.58 + '" fill="{{ACCENT}}"/>' +
  '<circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.27 + '" fill="#050810"/>' +
  '<circle cx="' + (cx + r * 0.2) + '" cy="' + (cy - r * 0.22) + '" r="' + r * 0.1 + '" fill="#ffffff"/>';

const rings = (cx: number, cy: number, r: number): string => {
  let s = "";
  for (const f of [1, 0.78, 0.56, 0.34]) {
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r * f + '" fill="none" stroke="#ffffff" stroke-opacity="' + (f === 1 ? 0.16 : 0.1) + '" stroke-width="2"/>';
  }
  s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r * 1.18 + '" ry="' + r * 0.42 + '" fill="none" stroke="{{ACCENT}}" stroke-opacity="0.5" stroke-width="2" transform="rotate(-18 ' + cx + " " + cy + ')"/>';
  s += '<circle cx="' + (cx + r * 0.78) + '" cy="' + (cy - r * 0.62) + '" r="7" fill="{{ACCENT}}"/>';
  s += '<circle cx="' + (cx - r * 0.9) + '" cy="' + (cy + r * 0.4) + '" r="5" fill="#fbbf24"/>';
  return s;
};

const brand = (x: number, y: number, size = 30): string =>
  eye(x + size * 0.62, y, size * 0.62) +
  T(x + size * 1.55, y + size * 0.36, size, "#ffffff", "WORLDEYE", { weight: 800, ls: 4 });

const urlText = (x: number, y: number, anchor = "start", size = 21): string =>
  T(x, y, size, "#94a3b8", "{{REF_URL}}", { family: MONO, weight: 400, anchor });

const ctaPill = (x: number, y: number, w: number, h: number, size?: number): string =>
  rect(x, y, w, h, "url(#pill)", h / 2) +
  T(x + w / 2, y + h / 2 + (size ?? h * 0.36) * 0.36, size ?? h * 0.36, "#050810", "{{CTA}}", { anchor: "middle", weight: 800, ls: 1 });

const qrFrame = (x: number, y: number, size: number, caption = true): string =>
  rect(x - 10, y - 10, size + 20, size + 20, "#ffffff", 18, ' fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.22"') +
  (caption ? T(x + size / 2, y + size + 42, 19, "#94a3b8", "SCAN TO VISIT", { anchor: "middle", weight: 600, ls: 3 }) : "");

const glassPanel = (x: number, y: number, w: number, h: number, rx = 28): string =>
  rect(x, y, w, h, "#ffffff", rx, ' fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.12"');

const badge = (x: number, y: number, label: string, fill = "{{ACCENT}}"): string => {
  const w = label.length * 15 + 44;
  return rect(x, y, w, 46, fill, 23) + T(x + w / 2, y + 31, 21, "#050810", label, { anchor: "middle", weight: 800, ls: 3 });
};

const liveDot = (x: number, y: number, r = 10): string =>
  '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#ef4444"/>' +
  '<circle cx="' + x + '" cy="' + y + '" r="' + r * 2 + '" fill="none" stroke="#ef4444" stroke-opacity="0.5" stroke-width="2"/>';

/** Five-point star centred at (cx, cy) — the ambassador mark. */
const star = (cx: number, cy: number, r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push((cx + rad * Math.cos(a)).toFixed(1) + "," + (cy + rad * Math.sin(a)).toFixed(1));
  }
  return '<polygon points="' + pts.join(" ") + '" fill="{{ACCENT}}"/>';
};

/* ------------------------------------------------------------------ */
/* Templates — 4 distinct ambassador designs                           */
/* ------------------------------------------------------------------ */

export const AMBASSADOR_TEMPLATES: SeedTemplate[] = [
  {
    slug: "ambassador-story-exclusive",
    title: "Ambassador — Exclusive Story (9:16)",
    category: "ambassador",
    kind: "svg",
    format: "story_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) + glow(540, 620, 520) + rings(540, 620, 340) +
      star(540, 300, 54) +
      T(540, 420, 28, "{{ACCENT}}", "AMBASSADOR EXCLUSIVE", { anchor: "middle", weight: 800, ls: 5 }) +
      eye(540, 620, 128) +
      T(540, 1010, 84, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 1076, 31, "#cbd5e1", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      ctaPill(350, 1160, 380, 80) +
      qrFrame(465, 1420, 150) +
      T(540, 1700, 21, "#94a3b8", "{{REF_URL}}", { family: MONO, weight: 400, anchor: "middle" }) +
      T(540, 1852, 20, "#64748b", "WORLDEYE AMBASSADOR", { anchor: "middle", weight: 700, ls: 4 })),
    editableFields: std("I REPRESENT WORLDEYE", "As an ambassador, I share the live world first.", "EXPLORE WITH ME"),
    layers: [qr(465, 1420, 150)],
    carouselGroup: null,
    slideIndex: null,
    featured: true,
    sortOrder: 201,
    tags: ["ambassador", "story", "exclusive"],
  },
  {
    slug: "ambassador-feed-portrait",
    title: "Ambassador — Feed Portrait (4:5)",
    category: "ambassador",
    kind: "svg",
    format: "feed_4x5",
    width: 1080,
    height: 1350,
    assetUrl: null,
    svgBody: S(1080, 1350,
      bgRect(1080, 1350) + glow(860, 240, 360) +
      brand(64, 84) + badge(64, 150, "AMBASSADOR") +
      T(64, 330, 76, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 388, 30, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(64, 470, 952, 430, 32) +
      star(150, 580, 40) + T(220, 594, 36, "#ffffff", "Early access to new features", { weight: 700 }) +
      star(150, 700, 40) + T(220, 714, 36, "#ffffff", "76,000+ live cameras, one map", { weight: 700 }) +
      star(150, 820, 40) + T(220, 834, 36, "#ffffff", "Direct line to the WorldEye team", { weight: 700 }) +
      ctaPill(64, 980, 360, 74) +
      qrFrame(892, 956, 120) +
      urlText(64, 1300, "start", 19)),
    editableFields: std("PROUDLY AN AMBASSADOR", "I help people discover the live planet.", "JOIN ME LIVE"),
    layers: [qr(892, 956, 120)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 202,
    tags: ["ambassador", "feed", "portrait"],
  },
  {
    slug: "ambassador-banner-wide",
    title: "Ambassador — Wide Banner",
    category: "ambassador",
    kind: "svg",
    format: "banner_1920x640",
    width: 1920,
    height: 640,
    assetUrl: null,
    svgBody: S(1920, 640,
      bgRect(1920, 640) + glow(1620, 320, 420) + rings(1640, 320, 190) +
      eye(230, 320, 120) +
      star(420, 150, 34) +
      T(430, 268, 30, "{{ACCENT}}", "WORLDEYE AMBASSADOR", { weight: 800, ls: 5 }) +
      T(430, 372, 72, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(430, 428, 28, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(430, 478, 340, 68, 24) +
      qrFrame(1180, 420, 120, false) +
      urlText(1180, 600, "start", 19)),
    editableFields: std("WATCH THE WORLD WITH ME", "76,000+ live cameras in 105 countries — through my link.", "EXPLORE LIVE", false),
    layers: [qr(1180, 420, 120)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 203,
    tags: ["ambassador", "banner", "wide"],
  },
  {
    slug: "ambassador-reel-cover",
    title: "Ambassador — Reel Cover (9:16)",
    category: "ambassador",
    kind: "svg",
    format: "reel_9x16",
    width: 1080,
    height: 1920,
    assetUrl: "/worldeye-cinematic-poster.jpg",
    svgBody: S(1080, 1920,
      rect(0, 0, 1080, 420, "#050810", 0, ' opacity="0.45"') +
      rect(0, 1120, 1080, 800, "url(#sheet)") +
      badge(72, 170, "AMBASSADOR") + star(950, 193, 30) +
      liveDot(72, 1240) + T(102, 1250, 25, "#ffffff", "LIVE", { weight: 800, ls: 3 }) +
      T(72, 1400, 88, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 1464, 31, "#cbd5e1", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(72, 1540, 360, 78) +
      qrFrame(856, 1690, 140) +
      urlText(72, 1846, "start", 20)),
    editableFields: std("MY AMBASSADOR REEL", "The live world, shared by a WorldEye Ambassador.", "WATCH WITH ME"),
    layers: [logo(56, 48, 170), qr(856, 1690, 140)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 204,
    tags: ["ambassador", "reel", "cover", "photo"],
  },
];

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

/**
 * Idempotent upsert of every ambassador template, keyed by slug.
 * Returns the number of templates processed.
 *
 * Design fields are refreshed on update and `active` is set true (see
 * the module header); an existing row's `featured` flag is preserved.
 */
export async function ensureAmbassadorTemplates(): Promise<number> {
  let count = 0;
  for (const t of AMBASSADOR_TEMPLATES) {
    const design = {
      title: t.title,
      format: t.format,
      width: t.width,
      height: t.height,
      svgBody: t.svgBody,
      editableFields: t.editableFields as unknown as Prisma.InputJsonValue,
      layers: t.layers as unknown as Prisma.InputJsonValue,
      tags: t.tags,
      sortOrder: t.sortOrder,
      active: true,
    };
    await db.marketingTemplate.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        category: t.category,
        kind: t.kind,
        assetUrl: t.assetUrl,
        carouselGroup: t.carouselGroup,
        slideIndex: t.slideIndex,
        featured: t.featured,
        ...design,
      },
      update: design,
    });
    count++;
  }
  return count;
}
