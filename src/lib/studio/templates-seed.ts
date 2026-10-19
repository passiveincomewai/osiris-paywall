/**
 * Marketing Studio — Phase 1 seed template library.
 *
 * ~43 parameterized SVG designs (58 rows including carousel slides).
 * A server renderer token-replaces {{TOKENS}} into `svgBody`, rasterizes
 * with sharp, then composites the QR / logo layers listed in `layers`.
 *
 * Copy rules (verified product facts only):
 *  - "76,000+ live cameras in 105 countries" — never the stale 40,207 figure.
 *  - Features: live flights, satellites, weather radar, earthquakes,
 *    wildfires, camera recording, OSINT toolkit (Pro), AI analyst (Pro).
 *  - No income promises. Discount templates (category "discount") render
 *    the affiliate's REAL tiered code via {{COUPON_CODE}} / {{DISCOUNT_PCT}}
 *    — the coupon layer and tokens resolve only when a Stripe-synced code
 *    exists (src/lib/affiliate/discount.ts), never an invented one.
 *
 * Seeding is idempotent and slug-keyed (the ensureChallenges() pattern):
 * re-running refreshes design fields but never overwrites an admin's
 * `active` / `featured` flags on existing rows.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { EditableField, TemplateLayer } from "./types";

export interface SeedTemplate {
  slug: string;
  title: string;
  category: string;
  kind: string;
  format: string;
  width: number;
  height: number;
  svgBody: string;
  assetUrl: string | null;
  editableFields: EditableField[];
  layers: TemplateLayer[];
  carouselGroup: string | null;
  slideIndex: number | null;
  featured: boolean;
  sortOrder: number;
  tags: string[];
}

/* ------------------------------------------------------------------ */
/* Field factories                                                     */
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
const accent = (def = "#0096FF"): EditableField => ({
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

/* ------------------------------------------------------------------ */
/* Layer factories                                                     */
/* ------------------------------------------------------------------ */

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
/** "USE CODE" pill — rendered only when the affiliate has a synced code. */
const coupon = (x: number, y: number, width: number, height: number): TemplateLayer => ({
  type: "coupon",
  x,
  y,
  width,
  height,
});

/* ------------------------------------------------------------------ */
/* SVG primitives                                                      */
/* ------------------------------------------------------------------ */

const SANS = "'Inter','Liberation Sans','DejaVu Sans',sans-serif";
const MONO = "'JetBrains Mono','DejaVu Sans Mono',monospace";

type TOpts = {
  anchor?: string;
  weight?: number;
  family?: string;
  ls?: number;
  opacity?: number;
  style?: string;
};
/** One <text> element. `fill` may be a token such as {{ACCENT}}. */
const T = (x: number, y: number, size: number, fill: string, text: string, o: TOpts = {}): string =>
  '<text x="' + x + '" y="' + y + '" font-family="' + (o.family ?? SANS) + '" font-size="' + size +
  '" font-weight="' + (o.weight ?? 700) + '" fill="' + fill + '"' +
  (o.anchor ? ' text-anchor="' + o.anchor + '"' : "") +
  (o.ls ? ' letter-spacing="' + o.ls + '"' : "") +
  (o.opacity !== undefined ? ' opacity="' + o.opacity + '"' : "") +
  (o.style ? ' style="' + o.style + '"' : "") +
  ">" + text + "</text>";

const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0, extra = ""): string =>
  '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '"' + extra + "/>";

const S = (w: number, h: number, body: string): string =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' +
  "<defs>" +
  '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#0a1a33"/><stop offset="1" stop-color="#050810"/></linearGradient>' +
  '<linearGradient id="sheet" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#050810" stop-opacity="0"/><stop offset="0.35" stop-color="#050810" stop-opacity="0.88"/>' +
  '<stop offset="1" stop-color="#050810"/></linearGradient>' +
  '<radialGradient id="glow"><stop offset="0" stop-color="{{ACCENT}}" stop-opacity="0.45"/>' +
  '<stop offset="1" stop-color="{{ACCENT}}" stop-opacity="0"/></radialGradient>' +
  '<linearGradient id="pill" x1="0" y1="0" x2="1" y2="0">' +
  '<stop offset="0" stop-color="{{ACCENT}}"/><stop offset="1" stop-color="#38bdf8"/></linearGradient>' +
  "</defs>" + body + "</svg>";

const bgRect = (w: number, h: number): string => rect(0, 0, w, h, "url(#bg)");
const glow = (cx: number, cy: number, r: number): string =>
  '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#glow)"/>';

/** Stylised eye mark: outer ring, accent iris, dark pupil, highlight. */
const eye = (cx: number, cy: number, r: number): string =>
  '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="' + Math.max(3, r * 0.09) + '"/>' +
  '<circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.58 + '" fill="{{ACCENT}}"/>' +
  '<circle cx="' + cx + '" cy="' + cy + '" r="' + r * 0.27 + '" fill="#050810"/>' +
  '<circle cx="' + (cx + r * 0.2) + '" cy="' + (cy - r * 0.22) + '" r="' + r * 0.1 + '" fill="#ffffff"/>';

/** Concentric globe rings with two orbit dots. */
const rings = (cx: number, cy: number, r: number): string => {
  let s = "";
  for (const f of [1, 0.78, 0.56, 0.34]) {
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r * f + '" fill="none" stroke="#ffffff" stroke-opacity="' + (f === 1 ? 0.16 : 0.1) + '" stroke-width="2"/>';
  }
  s += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r * 1.18 + '" ry="' + r * 0.42 + '" fill="none" stroke="{{ACCENT}}" stroke-opacity="0.5" stroke-width="2" transform="rotate(-18 ' + cx + " " + cy + ')"/>';
  s += '<circle cx="' + (cx + r * 0.78) + '" cy="' + (cy - r * 0.62) + '" r="7" fill="{{ACCENT}}"/>';
  s += '<circle cx="' + (cx - r * 0.9) + '" cy="' + (cy + r * 0.4) + '" r="5" fill="#38bdf8"/>';
  return s;
};

const dotsGrid = (x: number, y: number, cols: number, rows: number, gap = 26, r = 3): string => {
  let s = "";
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++)
      s += '<circle cx="' + (x + i * gap) + '" cy="' + (y + j * gap) + '" r="' + r + '" fill="#ffffff" opacity="0.14"/>';
  return s;
};

/** Drawn brand lockup (used on pure-vector templates; photo templates use a logo layer). */
const brand = (x: number, y: number, size = 30): string =>
  eye(x + size * 0.62, y, size * 0.62) +
  T(x + size * 1.55, y + size * 0.36, size, "#ffffff", "WORLDEYE", { weight: 800, ls: 4 });

const urlText = (x: number, y: number, anchor = "start", size = 21): string =>
  T(x, y, size, "#94a3b8", "{{REF_URL}}", { family: MONO, weight: 400, anchor });

const ctaPill = (x: number, y: number, w: number, h: number, size?: number): string =>
  rect(x, y, w, h, "url(#pill)", h / 2) +
  T(x + w / 2, y + h / 2 + (size ?? h * 0.36) * 0.36, size ?? h * 0.36, "#ffffff", "{{CTA}}", { anchor: "middle", weight: 800, ls: 1 });

/** Subtle frame showing where the composited QR will land, plus a caption. */
const qrFrame = (x: number, y: number, size: number, caption = true): string =>
  rect(x - 10, y - 10, size + 20, size + 20, "#ffffff", 18, ' fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.22"') +
  (caption ? T(x + size / 2, y + size + 42, 19, "#94a3b8", "SCAN TO VISIT", { anchor: "middle", weight: 600, ls: 3 }) : "");

const glassPanel = (x: number, y: number, w: number, h: number, rx = 28): string =>
  rect(x, y, w, h, "#ffffff", rx, ' fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.12"');

const badge = (x: number, y: number, label: string, fill = "{{ACCENT}}"): string => {
  const w = label.length * 15 + 44;
  return rect(x, y, w, 46, fill, 23) + T(x + w / 2, y + 31, 21, "#ffffff", label, { anchor: "middle", weight: 800, ls: 3 });
};

const liveDot = (x: number, y: number, r = 10): string =>
  '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#ef4444"/>' +
  '<circle cx="' + x + '" cy="' + y + '" r="' + r * 2 + '" fill="none" stroke="#ef4444" stroke-opacity="0.5" stroke-width="2"/>';

/** Carousel progress dots; `active` is the 0-based slide position. */
const progressDots = (cx: number, y: number, total: number, active: number): string => {
  let s = "";
  const gap = 30;
  const x0 = cx - ((total - 1) * gap) / 2;
  for (let i = 0; i < total; i++)
    s += '<circle cx="' + (x0 + i * gap) + '" cy="' + y + '" r="' + (i === active ? 9 : 6) + '" fill="' + (i === active ? "{{ACCENT}}" : "#ffffff") + '" opacity="' + (i === active ? 1 : 0.35) + '"/>';
  return s;
};

/** Simple feature row: small glyph disc + label (+ optional note). */
const featureRow = (x: number, y: number, glyph: string, label: string, note = "", labelSize = 34): string =>
  '<circle cx="' + (x + 26) + '" cy="' + (y - labelSize * 0.32) + '" r="26" fill="{{ACCENT}}" fill-opacity="0.16" stroke="{{ACCENT}}" stroke-opacity="0.55"/>' +
  T(x + 26, y - labelSize * 0.32 + labelSize * 0.24, 24, "{{ACCENT}}", glyph, { anchor: "middle", weight: 800 }) +
  T(x + 76, y, labelSize, "#ffffff", label, { weight: 700 }) +
  (note ? T(x + 76, y + labelSize + 14, 24, "#94a3b8", note, { weight: 400 }) : "");

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

export const SEED_TEMPLATES: SeedTemplate[] = [
  /* ================= FEED (8) ================= */
  {
    slug: "feed-globe-hero",
    title: "Feed — Globe Hero (photo)",
    category: "feed",
    kind: "svg",
    format: "feed_1x1",
    width: 1080,
    height: 1080,
    assetUrl: "/og-image.png",
    svgBody: S(1080, 1080,
      rect(0, 480, 1080, 600, "url(#sheet)") +
      rings(905, 205, 130) +
      liveDot(64, 618) + T(92, 628, 24, "#ffffff", "LIVE NOW", { weight: 800, ls: 3 }) +
      T(64, 726, 88, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 782, 31, "#cbd5e1", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(64, 842, 340, 72) +
      qrFrame(892, 836, 120) +
      urlText(64, 1052, "start", 19)),
    editableFields: std("THE WORLD IS LIVE", "Live cameras, flights, weather and more on one map.", "EXPLORE LIVE"),
    layers: [logo(48, 40, 170), qr(892, 836, 120)],
    carouselGroup: null,
    slideIndex: null,
    featured: true,
    sortOrder: 1,
    tags: ["feed", "photo", "globe", "hero"],
  },
  {
    slug: "feed-cameras-stat",
    title: "Feed — 76,000+ Cameras Stat",
    category: "feed",
    kind: "svg",
    format: "feed_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(540, 430, 430) + rings(540, 430, 300) + dotsGrid(72, 72, 5, 3) +
      brand(64, 84) +
      T(540, 408, 196, "{{ACCENT}}", "76,000+", { anchor: "middle", weight: 800 }) +
      T(540, 478, 34, "#ffffff", "LIVE CAMERAS STREAMING NOW", { anchor: "middle", weight: 700, ls: 4 }) +
      T(540, 620, 62, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 676, 30, "#94a3b8", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      ctaPill(370, 730, 340, 72) +
      qrFrame(892, 880, 120) +
      urlText(64, 1014, "start", 19)),
    editableFields: std("EVERY CAMERA. ONE MAP.", "76,000+ live cameras in 105 countries, on one map.", "WATCH LIVE"),
    layers: [qr(892, 880, 120)],
    carouselGroup: null,
    slideIndex: null,
    featured: true,
    sortOrder: 2,
    tags: ["feed", "stat", "cameras"],
  },
  {
    slug: "feed-recording-feature",
    title: "Feed — Recording Feature (4:5)",
    category: "feed",
    kind: "svg",
    format: "feed_4x5",
    width: 1080,
    height: 1350,
    assetUrl: null,
    svgBody: S(1080, 1350,
      bgRect(1080, 1350) + glow(820, 300, 340) +
      brand(64, 84) +
      T(64, 252, 74, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 308, 30, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(64, 380, 952, 560, 32) +
      liveDot(124, 448) + T(154, 458, 26, "#ffffff", "REC", { weight: 800, ls: 3 }) +
      T(952, 458, 24, "#94a3b8", "00:42:17", { family: MONO, weight: 400, anchor: "end" }) +
      rect(112, 510, 856, 300, "#0a1a33", 20) + rings(540, 660, 118) + eye(540, 660, 54) +
      rect(112, 852, 856, 14, "#ffffff", 7, ' fill-opacity="0.15"') +
      rect(112, 852, 380, 14, "{{ACCENT}}", 7) +
      '<circle cx="492" cy="859" r="16" fill="#ffffff"/>' +
      featureRow(64, 1052, "1", "Press record on any live camera") +
      featureRow(64, 1140, "2", "Save the moment as a clip") +
      ctaPill(64, 1210, 320, 68) +
      qrFrame(904, 1172, 112)),
    editableFields: std("RECORD ANY MOMENT", "See something happen live? Capture it.", "TRY RECORDING"),
    layers: [qr(904, 1172, 112)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 3,
    tags: ["feed", "recording", "feature"],
  },
  {
    slug: "feed-dark-grid",
    title: "Feed — Feature Grid (4:5)",
    category: "feed",
    kind: "svg",
    format: "feed_4x5",
    width: 1080,
    height: 1350,
    assetUrl: null,
    svgBody: S(1080, 1350,
      bgRect(1080, 1350) + dotsGrid(880, 90, 5, 4) +
      brand(64, 84) +
      T(64, 246, 70, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 300, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(64, 356, 952, 660, 32) +
      featureRow(112, 452, "C", "Live Cameras", "76,000+ feeds in 105 countries", 36) +
      featureRow(112, 580, "F", "Live Flights", "Aircraft tracked in real time", 36) +
      featureRow(112, 708, "S", "Satellites", "Orbits rendered live overhead", 36) +
      featureRow(112, 836, "W", "Weather Radar", "Storms, fronts and live radar", 36) +
      featureRow(584, 452, "Q", "Earthquakes", "Global seismic activity as it hits", 36) +
      featureRow(584, 580, "F", "Wildfires", "Active fire detection worldwide", 36) +
      featureRow(584, 708, "R", "Recording", "Capture any camera moment", 36) +
      featureRow(584, 836, "O", "OSINT Toolkit", "Pro analysis tools built in", 36) +
      '<line x1="540" y1="404" x2="540" y2="968" stroke="#ffffff" stroke-opacity="0.08"/>' +
      ctaPill(64, 1090, 340, 72) +
      qrFrame(892, 1066, 120) +
      urlText(64, 1300, "start", 19)),
    editableFields: std("EVERYTHING. LIVE. ONE MAP.", "Eight live layers on a single real-time globe.", "OPEN THE MAP"),
    layers: [qr(892, 1066, 120)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 4,
    tags: ["feed", "features", "grid"],
  },
  {
    slug: "feed-minimal-quote",
    title: "Feed — Minimal Statement",
    category: "feed",
    kind: "svg",
    format: "feed_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(540, 330, 300) +
      eye(540, 318, 92) +
      T(540, 560, 66, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 622, 29, "#94a3b8", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      '<line x1="440" y1="690" x2="640" y2="690" stroke="{{ACCENT}}" stroke-width="3"/>' +
      qrFrame(480, 770, 120) +
      T(540, 972, 21, "#94a3b8", "{{REF_URL}}", { family: MONO, weight: 400, anchor: "middle" }) +
      T(540, 1032, 20, "#64748b", "WORLDEYE.APP", { anchor: "middle", weight: 700, ls: 5 })),
    editableFields: std("SEE IT AS IT HAPPENS.", "No edits. No delays. Just the world, live.", "SEE IT LIVE"),
    layers: [qr(480, 770, 120)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 5,
    tags: ["feed", "minimal", "quote"],
  },
  {
    slug: "feed-split-photo",
    title: "Feed — Split Photo (radar)",
    category: "feed",
    kind: "svg",
    format: "feed_1x1",
    width: 1080,
    height: 1080,
    assetUrl: "/radar-scan.jpg",
    svgBody: S(1080, 1080,
      rect(0, 0, 580, 1080, "#050810") +
      rect(0, 0, 580, 1080, "url(#bg)", 0, ' opacity="0.92"') +
      rect(566, 0, 14, 1080, "{{ACCENT}}") +
      brand(56, 92, 26) +
      T(56, 330, 72, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(56, 392, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      T(56, 560, 92, "{{ACCENT}}", "76,000+", { weight: 800 }) +
      T(56, 606, 24, "#cbd5e1", "LIVE CAMERAS · 105 COUNTRIES", { weight: 700, ls: 2 }) +
      ctaPill(56, 700, 320, 70) +
      qrFrame(56, 836, 116) +
      urlText(56, 1046, "start", 18)),
    editableFields: std("WATCH IT LIVE", "Real cameras. Real time. Zero replay.", "WATCH NOW"),
    layers: [logo(796, 40, 150), qr(56, 836, 116)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 6,
    tags: ["feed", "photo", "split", "radar"],
  },
  {
    slug: "feed-premium-pro",
    title: "Feed — Pro Upsell (4:5)",
    category: "feed",
    kind: "svg",
    format: "feed_4x5",
    width: 1080,
    height: 1350,
    assetUrl: null,
    svgBody: S(1080, 1350,
      bgRect(1080, 1350) + glow(540, 260, 420) + rings(880, 180, 120) +
      brand(64, 84) + badge(872, 60, "PRO") +
      T(64, 268, 76, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 326, 30, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(64, 396, 952, 520, 32) +
      featureRow(112, 500, "O", "OSINT Toolkit", "Intel layers and analysis tools", 36) +
      featureRow(112, 632, "A", "AI Analyst", "Ask the globe questions, get briefs", 36) +
      featureRow(112, 764, "S", "Satellite Map View", "High-detail satellite basemap", 36) +
      featureRow(112, 884, "R", "Camera Recording", "Capture and keep live moments", 36) +
      ctaPill(64, 990, 360, 74) +
      qrFrame(892, 966, 120) +
      urlText(64, 1300, "start", 19) +
      T(64, 1246, 22, "#64748b", "FREE TO START · NO SIGNUP TO EXPLORE THE MAP", { weight: 600, ls: 2 })),
    editableFields: std("GO DEEPER WITH PRO", "Unlock the full intelligence toolkit.", "UPGRADE TO PRO"),
    layers: [qr(892, 966, 120)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 7,
    tags: ["feed", "pro", "upsell"],
  },
  {
    slug: "feed-eye-statement",
    title: "Feed — Eye Logo Statement",
    category: "feed",
    kind: "svg",
    format: "feed_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(540, 400, 460) + rings(540, 400, 330) +
      eye(540, 400, 150) +
      T(540, 726, 64, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 784, 29, "#94a3b8", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      ctaPill(380, 836, 320, 70) +
      qrFrame(904, 884, 112) +
      urlText(64, 1018, "start", 19) +
      dotsGrid(72, 880, 4, 4)),
    editableFields: std("ONE EYE ON THE WORLD", "76,000+ cameras. One live globe.", "OPEN WORLDEYE"),
    layers: [qr(904, 884, 112)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 8,
    tags: ["feed", "logo", "brand"],
  },

  /* ================= STORIES (8) — 1080x1920 ================= */
  {
    slug: "story-full-bleed",
    title: "Story — Full-Bleed Photo",
    category: "story",
    kind: "svg",
    format: "story_9x16",
    width: 1080,
    height: 1920,
    assetUrl: "/worldeye-cinematic-poster.jpg",
    svgBody: S(1080, 1920,
      rect(0, 0, 1080, 260, "#050810", 0, ' opacity="0.35"') +
      rect(0, 1180, 1080, 740, "url(#sheet)") +
      liveDot(72, 1330) + T(102, 1340, 26, "#ffffff", "HAPPENING NOW", { weight: 800, ls: 3 }) +
      T(72, 1446, 92, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 1510, 32, "#cbd5e1", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(72, 1570, 360, 78) +
      qrFrame(856, 1690, 140) +
      urlText(72, 1846, "start", 20)),
    editableFields: std("THE WORLD IS LIVE", "Cameras, flights and weather — right now.", "EXPLORE LIVE"),
    layers: [logo(56, 48, 180), qr(856, 1690, 140)],
    carouselGroup: null,
    slideIndex: null,
    featured: true,
    sortOrder: 9,
    tags: ["story", "photo", "full-bleed"],
  },
  {
    slug: "story-stat-stack",
    title: "Story — Stat Stack",
    category: "story",
    kind: "svg",
    format: "story_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) + glow(540, 300, 420) +
      brand(72, 110) +
      T(72, 330, 76, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 388, 30, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(72, 480, 936, 250, 30) +
      T(120, 640, 108, "{{ACCENT}}", "76,000+", { weight: 800 }) +
      T(560, 592, 32, "#ffffff", "LIVE CAMERAS", { weight: 700, ls: 2 }) +
      T(560, 640, 26, "#94a3b8", "streaming right now", { weight: 400 }) +
      glassPanel(72, 770, 936, 250, 30) +
      T(120, 930, 108, "{{ACCENT}}", "105", { weight: 800 }) +
      T(560, 882, 32, "#ffffff", "COUNTRIES", { weight: 700, ls: 2 }) +
      T(560, 930, 26, "#94a3b8", "covered on one globe", { weight: 400 }) +
      glassPanel(72, 1060, 936, 250, 30) +
      T(120, 1220, 108, "{{ACCENT}}", "24/7", { weight: 800 }) +
      T(560, 1172, 32, "#ffffff", "ALWAYS LIVE", { weight: 700, ls: 2 }) +
      T(560, 1220, 26, "#94a3b8", "flights, weather, quakes, fires", { weight: 400 }) +
      ctaPill(72, 1420, 380, 80) +
      qrFrame(848, 1560, 150) +
      urlText(72, 1852, "start", 20)),
    editableFields: std("ONE LIVE PLANET", "Every feed below is real, and it is live.", "SEE IT LIVE"),
    layers: [qr(848, 1560, 150)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 10,
    tags: ["story", "stat", "stack"],
  },
  {
    slug: "story-feature-countdown",
    title: "Story — Feature Countdown",
    category: "story",
    kind: "svg",
    format: "story_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) + dotsGrid(880, 120, 5, 5) +
      brand(72, 110) +
      T(72, 320, 72, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 376, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      featureRow(72, 520, "5", "Wildfires, tracked live", "", 38) +
      featureRow(72, 660, "4", "Earthquakes as they hit", "", 38) +
      featureRow(72, 800, "3", "Weather radar, worldwide", "", 38) +
      featureRow(72, 940, "2", "Every flight, in real time", "", 38) +
      featureRow(72, 1080, "1", "76,000+ live cameras", "", 38) +
      '<line x1="72" y1="1180" x2="1008" y2="1180" stroke="#ffffff" stroke-opacity="0.12"/>' +
      T(72, 1300, 40, "#ffffff", "ALL ON ONE MAP.", { weight: 800 }) +
      ctaPill(72, 1360, 360, 78) +
      qrFrame(848, 1560, 150) +
      urlText(72, 1852, "start", 20)),
    editableFields: std("5 LAYERS. ONE GLOBE.", "Counting down what WorldEye shows live.", "COUNT ME IN"),
    layers: [qr(848, 1560, 150)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 11,
    tags: ["story", "countdown", "features"],
  },
  {
    slug: "story-question-hook",
    title: "Story — Question Hook",
    category: "story",
    kind: "svg",
    format: "story_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) + glow(540, 880, 480) + rings(540, 880, 330) +
      brand(72, 110) +
      T(540, 330, 84, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 396, 31, "#94a3b8", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      eye(540, 880, 120) +
      T(540, 1330, 30, "#cbd5e1", "TAP THE LINK AND LOOK FOR YOURSELF", { anchor: "middle", weight: 700, ls: 2 }) +
      qrFrame(465, 1420, 150) +
      T(540, 1700, 21, "#94a3b8", "{{REF_URL}}", { family: MONO, weight: 400, anchor: "middle" }) +
      ctaPill(360, 1760, 360, 76)),
    editableFields: std("WHAT IS HAPPENING NOW?", "Somewhere on Earth, something is. Watch it live.", "LOOK NOW"),
    layers: [qr(465, 1420, 150)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 12,
    tags: ["story", "question", "hook"],
  },
  {
    slug: "story-premium-intro",
    title: "Story — Pro Intro",
    category: "story",
    kind: "svg",
    format: "story_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) + glow(860, 240, 380) + rings(880, 220, 130) +
      brand(72, 110) + badge(72, 210, "WORLDEYE PRO") +
      T(72, 380, 80, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 440, 30, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(72, 540, 936, 560, 30) +
      featureRow(120, 664, "O", "OSINT toolkit", "", 36) +
      featureRow(120, 796, "A", "AI analyst briefs", "", 36) +
      featureRow(120, 928, "S", "Satellite map view", "", 36) +
      featureRow(120, 1044, "R", "Camera recording", "", 36) +
      T(72, 1230, 28, "#cbd5e1", "THE FREE MAP STAYS FREE. PRO GOES DEEPER.", { weight: 700, ls: 1 }) +
      ctaPill(72, 1300, 380, 80) +
      qrFrame(848, 1560, 150) +
      urlText(72, 1852, "start", 20)),
    editableFields: std("GO BEYOND THE MAP", "Pro unlocks the intelligence toolkit.", "UPGRADE TO PRO"),
    layers: [qr(848, 1560, 150)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 13,
    tags: ["story", "pro", "upsell"],
  },
  {
    slug: "story-recording-intro",
    title: "Story — Recording Intro",
    category: "story",
    kind: "svg",
    format: "story_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) +
      brand(72, 110) +
      glassPanel(72, 240, 936, 620, 32) +
      liveDot(140, 330) + T(172, 340, 28, "#ffffff", "REC", { weight: 800, ls: 3 }) +
      T(936, 340, 26, "#94a3b8", "00:07:42", { family: MONO, weight: 400, anchor: "end" }) +
      rings(540, 560, 170) + eye(540, 560, 76) +
      rect(140, 776, 800, 14, "#ffffff", 7, ' fill-opacity="0.15"') +
      rect(140, 776, 460, 14, "#ef4444", 7) +
      T(72, 1010, 78, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 1072, 30, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      featureRow(72, 1220, "1", "Spot it live") +
      featureRow(72, 1330, "2", "Hit record") +
      featureRow(72, 1440, "3", "Keep the clip") +
      qrFrame(848, 1560, 150) +
      urlText(72, 1852, "start", 20)),
    editableFields: std("NEVER MISS A MOMENT", "WorldEye cameras can be recorded live.", "TRY RECORDING"),
    layers: [qr(848, 1560, 150)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 14,
    tags: ["story", "recording"],
  },
  {
    slug: "story-breaking-live",
    title: "Story — Breaking Live",
    category: "story",
    kind: "svg",
    format: "story_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) +
      rect(0, 190, 1080, 120, "#ef4444") +
      liveDot(72, 250, 13) + T(104, 264, 40, "#ffffff", "LIVE", { weight: 800, ls: 6 }) +
      T(1008, 264, 30, "#ffffff", "WORLDEYE", { weight: 800, ls: 3, anchor: "end" }) +
      T(72, 520, 86, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 584, 31, "#cbd5e1", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(72, 680, 936, 430, 28) +
      rings(540, 895, 150) + eye(540, 895, 66) +
      rect(0, 1240, 1080, 74, "#ffffff", 0, ' fill-opacity="0.07"') +
      T(72, 1290, 25, "#ffffff", "CAMERAS · FLIGHTS · WEATHER · QUAKES · FIRES — ALL LIVE", { weight: 700, ls: 1 }) +
      ctaPill(72, 1400, 380, 80) +
      qrFrame(848, 1560, 150) +
      urlText(72, 1852, "start", 20)),
    editableFields: std("IT IS HAPPENING NOW", "Do not wait for the recap. Watch it unfold.", "WATCH IT LIVE"),
    layers: [qr(848, 1560, 150)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 15,
    tags: ["story", "breaking", "live"],
  },
  {
    slug: "story-minimal-cta",
    title: "Story — Minimal CTA (link-sticker safe)",
    category: "story",
    kind: "svg",
    format: "story_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) + glow(540, 360, 360) +
      eye(540, 330, 84) +
      T(540, 540, 68, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 602, 29, "#94a3b8", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      // Centre band (y 700-1250) intentionally left clear for a link sticker.
      qrFrame(465, 1480, 150) +
      T(540, 1762, 21, "#94a3b8", "{{REF_URL}}", { family: MONO, weight: 400, anchor: "middle" }) +
      T(540, 1852, 20, "#64748b", "WORLDEYE · 76,000+ LIVE CAMERAS", { anchor: "middle", weight: 700, ls: 3 })),
    editableFields: std("THE WORLD, LIVE.", "One tap. One globe. Everything live.", "OPEN THE MAP"),
    layers: [qr(465, 1480, 150)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 16,
    tags: ["story", "minimal", "cta", "link-sticker"],
  },

  /* ================= REEL COVERS (3) — 1080x1920 ================= */
  {
    slug: "reel-cover-watch-live",
    title: "Reel Cover — Watch the World Live",
    category: "reel",
    kind: "svg",
    format: "reel_9x16",
    width: 1080,
    height: 1920,
    assetUrl: "/worldeye-cinematic-poster.jpg",
    svgBody: S(1080, 1920,
      rect(0, 0, 1080, 420, "#050810", 0, ' opacity="0.45"') +
      rect(0, 1150, 1080, 770, "url(#sheet)") +
      badge(72, 180, "REEL") + liveDot(880, 203) + T(908, 213, 24, "#ffffff", "LIVE", { weight: 800, ls: 3 }) +
      T(72, 1420, 88, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 1484, 31, "#cbd5e1", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(72, 1560, 340, 76) +
      qrFrame(856, 1690, 140) +
      urlText(72, 1846, "start", 20)),
    editableFields: std("WATCH THE WORLD LIVE", "76,000+ cameras on one live globe.", "WATCH NOW"),
    layers: [logo(56, 48, 170), qr(856, 1690, 140)],
    carouselGroup: null,
    slideIndex: null,
    featured: true,
    sortOrder: 17,
    tags: ["reel", "cover", "photo"],
  },
  {
    slug: "reel-cover-cameras",
    title: "Reel Cover — 76,000 Cameras",
    category: "reel",
    kind: "svg",
    format: "reel_9x16",
    width: 1080,
    height: 1920,
    assetUrl: "/radar-scan.jpg",
    svgBody: S(1080, 1920,
      rect(0, 1080, 1080, 840, "url(#sheet)") +
      rings(880, 240, 120) +
      T(72, 1330, 80, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 1394, 31, "#cbd5e1", "{{SUBHEAD}}", { weight: 400 }) +
      T(72, 1560, 150, "{{ACCENT}}", "76,000+", { weight: 800 }) +
      T(72, 1624, 26, "#ffffff", "CAMERAS · 105 COUNTRIES · LIVE", { weight: 700, ls: 2 }) +
      qrFrame(856, 1690, 140) +
      urlText(72, 1846, "start", 20)),
    editableFields: std("76,000 CAMERAS. ONE MAP.", "Every feed is live. Pick one and look.", "OPEN THE MAP"),
    layers: [logo(56, 48, 170), qr(856, 1690, 140)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 18,
    tags: ["reel", "cover", "cameras", "stat"],
  },
  {
    slug: "reel-cover-flights",
    title: "Reel Cover — Every Flight Live",
    category: "reel",
    kind: "svg",
    format: "reel_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) + glow(540, 760, 520) +
      '<path d="M -60 980 Q 540 380 1140 900" fill="none" stroke="{{ACCENT}}" stroke-opacity="0.65" stroke-width="3" stroke-dasharray="10 12"/>' +
      '<path d="M -60 1180 Q 420 620 1140 1120" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2" stroke-dasharray="8 12"/>' +
      '<circle cx="742" cy="598" r="12" fill="#ffffff"/><circle cx="742" cy="598" r="26" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="2"/>' +
      '<circle cx="238" cy="822" r="8" fill="{{ACCENT}}"/><circle cx="950" cy="1010" r="8" fill="#38bdf8"/>' +
      brand(72, 110) +
      T(72, 340, 84, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 404, 31, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      T(72, 1560, 30, "#cbd5e1", "PLUS CAMERAS, SATELLITES AND WEATHER", { weight: 700, ls: 2 }) +
      ctaPill(72, 1620, 340, 76) +
      qrFrame(856, 1690, 140)),
    editableFields: std("EVERY FLIGHT. LIVE.", "Track any aircraft on the live globe.", "TRACK A FLIGHT"),
    layers: [qr(856, 1690, 140)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 19,
    tags: ["reel", "cover", "flights"],
  },

  /* ================= TIKTOK (2) + SHORTS (2) — 1080x1920 ================= */
  {
    slug: "tiktok-globe-hook",
    title: "TikTok — Globe Hook (safe margins)",
    category: "tiktok",
    kind: "svg",
    format: "tiktok_9x16",
    width: 1080,
    height: 1920,
    assetUrl: "/radar-scan.png",
    svgBody: S(1080, 1920,
      rect(0, 0, 1080, 1920, "#050810", 0, ' opacity="0.55"') +
      rect(0, 1080, 1080, 840, "url(#sheet)") +
      rings(300, 760, 210) + eye(300, 760, 88) +
      // Text kept left of the right rail (x < 880) and above the bottom 300px.
      T(64, 1240, 78, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 1302, 30, "#cbd5e1", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(64, 1360, 330, 74) +
      qrFrame(64, 1470, 130) +
      urlText(230, 1546, "start", 19)),
    editableFields: std("POV: THE WHOLE PLANET", "76,000+ live cameras. One map. Go look.", "OPEN WORLDEYE"),
    layers: [logo(56, 48, 160), qr(64, 1470, 130)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 20,
    tags: ["tiktok", "hook", "photo"],
  },
  {
    slug: "tiktok-stat-pop",
    title: "TikTok — Stat Pop (safe margins)",
    category: "tiktok",
    kind: "svg",
    format: "tiktok_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) + glow(430, 560, 460) + rings(430, 560, 300) +
      brand(64, 110, 28) +
      T(64, 420, 170, "{{ACCENT}}", "76,000+", { weight: 800 }) +
      T(64, 486, 34, "#ffffff", "LIVE CAMERAS. RIGHT NOW.", { weight: 700, ls: 2 }) +
      T(64, 700, 72, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 762, 30, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(64, 900, 760, 300, 28) +
      featureRow(112, 1010, "F", "Flights, live", "", 32) +
      featureRow(112, 1120, "W", "Weather, quakes, fires", "", 32) +
      qrFrame(64, 1420, 130) +
      ctaPill(250, 1448, 330, 74) +
      urlText(64, 1602, "start", 19)),
    editableFields: std("ALL ON ONE MAP", "Free to explore. No signup to look.", "SEE IT LIVE"),
    layers: [qr(64, 1420, 130)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 21,
    tags: ["tiktok", "stat"],
  },
  {
    slug: "short-live-hook",
    title: "Shorts — Bottom-Sheet Hook",
    category: "short",
    kind: "svg",
    format: "short_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) + glow(540, 620, 500) + rings(540, 620, 320) + eye(540, 620, 130) +
      brand(72, 110) +
      liveDot(72, 300) + T(102, 310, 25, "#ffffff", "STREAMING NOW", { weight: 800, ls: 3 }) +
      rect(0, 1120, 1080, 520, "#0a1a33") +
      rect(0, 1120, 1080, 6, "{{ACCENT}}") +
      T(72, 1266, 76, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 1326, 30, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(72, 1390, 340, 74) +
      qrFrame(880, 1396, 128) +
      urlText(72, 1560, "start", 19)),
    editableFields: std("WATCH THE WORLD LIVE", "Cameras, flights and weather in real time.", "WATCH LIVE"),
    layers: [qr(880, 1396, 128)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 22,
    tags: ["short", "hook", "sheet"],
  },
  {
    slug: "short-feature-snap",
    title: "Shorts — Feature Snap",
    category: "short",
    kind: "svg",
    format: "short_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) + dotsGrid(850, 130, 5, 4) +
      brand(72, 110) +
      T(72, 330, 74, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 390, 30, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(72, 500, 440, 300, 26) + T(292, 630, 40, "#ffffff", "CAMERAS", { anchor: "middle", weight: 800 }) + T(292, 690, 44, "{{ACCENT}}", "76,000+", { anchor: "middle", weight: 800 }) +
      glassPanel(568, 500, 440, 300, 26) + T(788, 630, 40, "#ffffff", "FLIGHTS", { anchor: "middle", weight: 800 }) + T(788, 690, 44, "{{ACCENT}}", "LIVE", { anchor: "middle", weight: 800 }) +
      glassPanel(72, 840, 440, 300, 26) + T(292, 970, 40, "#ffffff", "WEATHER", { anchor: "middle", weight: 800 }) + T(292, 1030, 44, "{{ACCENT}}", "RADAR", { anchor: "middle", weight: 800 }) +
      glassPanel(568, 840, 440, 300, 26) + T(788, 970, 40, "#ffffff", "QUAKES", { anchor: "middle", weight: 800 }) + T(788, 1030, 44, "{{ACCENT}}", "GLOBAL", { anchor: "middle", weight: 800 }) +
      qrFrame(72, 1420, 130) +
      ctaPill(268, 1448, 340, 74) +
      urlText(72, 1602, "start", 19)),
    editableFields: std("FOUR FEEDS. ONE APP.", "A fast tour of what is live on WorldEye.", "OPEN THE MAP"),
    layers: [qr(72, 1420, 130)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 23,
    tags: ["short", "features", "grid"],
  },

  /* ================= CAROUSEL A — "discover-3" (3 slides) ================= */
  {
    slug: "carousel-discover-3-1",
    title: "Carousel · Discover — 1 · Hook",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(540, 430, 440) + rings(540, 430, 290) + eye(540, 430, 118) +
      T(540, 830, 68, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 888, 29, "#94a3b8", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      T(880, 1000, 26, "{{ACCENT}}", "SWIPE", { weight: 800, ls: 3 }) +
      '<path d="M 960 986 L 1004 986 M 990 972 L 1006 986 L 990 1000" fill="none" stroke="{{ACCENT}}" stroke-width="4"/>' +
      progressDots(540, 986, 3, 0)),
    editableFields: [headline("THE WORLD IS LIVE."), subhead("And you can watch it. Here is how."), accent()],
    layers: [],
    carouselGroup: "discover-3",
    slideIndex: 0,
    featured: true,
    sortOrder: 24,
    tags: ["carousel", "discover", "hook"],
  },
  {
    slug: "carousel-discover-3-2",
    title: "Carousel · Discover — 2 · What It Is",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + brand(64, 84) +
      T(64, 268, 66, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 324, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      featureRow(64, 470, "C", "76,000+ live cameras", "105 countries, streaming now") +
      featureRow(64, 610, "F", "Flights and satellites", "Tracked in real time overhead") +
      featureRow(64, 750, "W", "Weather, quakes, fires", "Live hazard layers worldwide") +
      featureRow(64, 890, "R", "Record any moment", "Capture cameras as clips") +
      progressDots(540, 1006, 3, 1)),
    editableFields: [headline("ONE LIVE MAP"), subhead("WorldEye puts the live planet on one globe."), accent()],
    layers: [],
    carouselGroup: "discover-3",
    slideIndex: 1,
    featured: false,
    sortOrder: 25,
    tags: ["carousel", "discover", "features"],
  },
  {
    slug: "carousel-discover-3-3",
    title: "Carousel · Discover — 3 · CTA",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(360, 480, 380) + rings(330, 460, 240) + eye(330, 460, 96) +
      T(620, 380, 64, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(620, 436, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(620, 486, 330, 72) +
      qrFrame(648, 620, 170) +
      urlText(620, 906, "start", 19) +
      progressDots(540, 1006, 3, 2)),
    editableFields: std("START EXPLORING", "Free to open. No signup to look around.", "OPEN WORLDEYE"),
    layers: [qr(648, 620, 170)],
    carouselGroup: "discover-3",
    slideIndex: 2,
    featured: false,
    sortOrder: 26,
    tags: ["carousel", "discover", "cta", "qr"],
  },

  /* ================= CAROUSEL B — "one-dashboard-5" (5 slides) ================= */
  {
    slug: "carousel-one-dashboard-5-1",
    title: "Carousel · One Dashboard — 1 · Problem",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) +
      rect(120, 180, 150, 150, "#ffffff", 32, ' fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.15"') +
      rect(330, 130, 150, 150, "#ffffff", 32, ' fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.12"') +
      rect(560, 190, 150, 150, "#ffffff", 32, ' fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.15"') +
      rect(790, 120, 150, 150, "#ffffff", 32, ' fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.12"') +
      rect(220, 400, 150, 150, "#ffffff", 32, ' fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.12"') +
      rect(680, 420, 150, 150, "#ffffff", 32, ' fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.15"') +
      T(120, 300, 44, "#64748b", "?", { anchor: "middle", weight: 800 }) +
      T(405, 250, 44, "#64748b", "?", { anchor: "middle", weight: 800 }) +
      T(635, 310, 44, "#64748b", "?", { anchor: "middle", weight: 800 }) +
      T(865, 240, 44, "#64748b", "?", { anchor: "middle", weight: 800 }) +
      T(540, 760, 76, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 822, 29, "#94a3b8", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      progressDots(540, 1006, 5, 0)),
    editableFields: [headline("TOO MANY APPS."), subhead("News here. Flights there. Weather somewhere else."), accent()],
    layers: [],
    carouselGroup: "one-dashboard-5",
    slideIndex: 0,
    featured: false,
    sortOrder: 27,
    tags: ["carousel", "dashboard", "problem"],
  },
  {
    slug: "carousel-one-dashboard-5-2",
    title: "Carousel · One Dashboard — 2 · Problem Detail",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + brand(64, 84) +
      T(64, 268, 64, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 324, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      featureRow(64, 480, "1", "A news app for headlines") +
      featureRow(64, 612, "2", "A flight app for tracking") +
      featureRow(64, 744, "3", "A weather app for storms") +
      featureRow(64, 876, "4", "Random sites for cameras") +
      progressDots(540, 1006, 5, 1)),
    editableFields: [headline("TABS EVERYWHERE"), subhead("Four places to check one live world."), accent()],
    layers: [],
    carouselGroup: "one-dashboard-5",
    slideIndex: 1,
    featured: false,
    sortOrder: 28,
    tags: ["carousel", "dashboard", "problem"],
  },
  {
    slug: "carousel-one-dashboard-5-3",
    title: "Carousel · One Dashboard — 3 · The Dashboard",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(540, 520, 420) +
      T(540, 216, 66, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 272, 29, "#94a3b8", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      glassPanel(140, 340, 800, 480, 30) +
      rings(400, 580, 150) + eye(400, 580, 62) +
      rect(600, 420, 280, 84, "#ffffff", 16, ' fill-opacity="0.07"') +
      rect(600, 530, 280, 84, "#ffffff", 16, ' fill-opacity="0.07"') +
      rect(600, 640, 280, 84, "#ffffff", 16, ' fill-opacity="0.07"') +
      T(740, 474, 26, "#ffffff", "CAMERAS", { anchor: "middle", weight: 700 }) +
      T(740, 584, 26, "#ffffff", "FLIGHTS", { anchor: "middle", weight: 700 }) +
      T(740, 694, 26, "#ffffff", "WEATHER", { anchor: "middle", weight: 700 }) +
      progressDots(540, 1006, 5, 2)),
    editableFields: [headline("ONE DASHBOARD"), subhead("WorldEye merges it all onto one live globe."), accent()],
    layers: [],
    carouselGroup: "one-dashboard-5",
    slideIndex: 2,
    featured: false,
    sortOrder: 29,
    tags: ["carousel", "dashboard", "solution"],
  },
  {
    slug: "carousel-one-dashboard-5-4",
    title: "Carousel · One Dashboard — 4 · Recording",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + brand(64, 84) +
      T(64, 268, 64, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 324, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(64, 400, 952, 420, 30) +
      liveDot(124, 476) + T(154, 486, 26, "#ffffff", "REC", { weight: 800, ls: 3 }) +
      rings(540, 620, 110) + eye(540, 620, 46) +
      rect(112, 736, 856, 12, "#ffffff", 6, ' fill-opacity="0.15"') +
      rect(112, 736, 420, 12, "#ef4444", 6) +
      T(64, 920, 30, "#cbd5e1", "STORMS · LAUNCHES · SUNSETS · BREAKING MOMENTS", { weight: 700, ls: 1 }) +
      progressDots(540, 1006, 5, 3)),
    editableFields: [headline("RECORD ANY MOMENT"), subhead("If it happens on camera, you can keep it."), accent()],
    layers: [],
    carouselGroup: "one-dashboard-5",
    slideIndex: 3,
    featured: false,
    sortOrder: 30,
    tags: ["carousel", "dashboard", "recording"],
  },
  {
    slug: "carousel-one-dashboard-5-5",
    title: "Carousel · One Dashboard — 5 · CTA",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(360, 480, 380) + rings(330, 460, 240) + eye(330, 460, 96) +
      T(620, 380, 64, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(620, 436, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(620, 486, 330, 72) +
      qrFrame(648, 620, 170) +
      urlText(620, 906, "start", 19) +
      progressDots(540, 1006, 5, 4)),
    editableFields: std("DITCH THE TABS", "One globe. Everything live. Free to open.", "OPEN WORLDEYE"),
    layers: [qr(648, 620, 170)],
    carouselGroup: "one-dashboard-5",
    slideIndex: 4,
    featured: false,
    sortOrder: 31,
    tags: ["carousel", "dashboard", "cta", "qr"],
  },

  /* ================= CAROUSEL C — "feature-tour-7" (7 slides) ================= */
  {
    slug: "carousel-feature-tour-7-1",
    title: "Carousel · Feature Tour — 1 · Cover",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(540, 420, 440) + rings(540, 420, 290) + eye(540, 420, 118) +
      badge(428, 640, "FEATURE TOUR") +
      T(540, 800, 68, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 858, 29, "#94a3b8", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      progressDots(540, 1006, 7, 0)),
    editableFields: [headline("TOUR WORLDEYE"), subhead("Seven slides. One live planet."), accent()],
    layers: [],
    carouselGroup: "feature-tour-7",
    slideIndex: 0,
    featured: false,
    sortOrder: 32,
    tags: ["carousel", "tour", "cover"],
  },
  {
    slug: "carousel-feature-tour-7-2",
    title: "Carousel · Feature Tour — 2 · Cameras",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + brand(64, 84) +
      T(64, 330, 150, "{{ACCENT}}", "76,000+", { weight: 800 }) +
      T(64, 396, 32, "#ffffff", "LIVE CAMERAS · 105 COUNTRIES", { weight: 700, ls: 2 }) +
      T(64, 540, 62, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 596, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      featureRow(64, 740, "C", "Cities, coasts, volcanoes, wildlife") +
      featureRow(64, 856, "R", "Record any feed as a clip") +
      progressDots(540, 1006, 7, 1)),
    editableFields: [headline("CAMERAS EVERYWHERE"), subhead("Beaches to border crossings — all streaming."), accent()],
    layers: [],
    carouselGroup: "feature-tour-7",
    slideIndex: 1,
    featured: false,
    sortOrder: 33,
    tags: ["carousel", "tour", "cameras"],
  },
  {
    slug: "carousel-feature-tour-7-3",
    title: "Carousel · Feature Tour — 3 · Flights",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) +
      '<path d="M -40 700 Q 540 240 1120 640" fill="none" stroke="{{ACCENT}}" stroke-opacity="0.6" stroke-width="3" stroke-dasharray="10 12"/>' +
      '<path d="M -40 830 Q 460 420 1120 790" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2" stroke-dasharray="8 12"/>' +
      '<circle cx="700" cy="428" r="12" fill="#ffffff"/><circle cx="700" cy="428" r="26" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="2"/>' +
      brand(64, 84) +
      T(64, 300, 66, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 356, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      featureRow(64, 880, "F", "Live positions, routes and altitude") +
      progressDots(540, 1006, 7, 2)),
    editableFields: [headline("EVERY FLIGHT, LIVE"), subhead("Aircraft tracked across the whole sky."), accent()],
    layers: [],
    carouselGroup: "feature-tour-7",
    slideIndex: 2,
    featured: false,
    sortOrder: 34,
    tags: ["carousel", "tour", "flights"],
  },
  {
    slug: "carousel-feature-tour-7-4",
    title: "Carousel · Feature Tour — 4 · Satellites",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(540, 480, 400) +
      '<circle cx="540" cy="480" r="120" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2"/>' +
      '<ellipse cx="540" cy="480" rx="330" ry="130" fill="none" stroke="{{ACCENT}}" stroke-opacity="0.6" stroke-width="2" transform="rotate(-16 540 480)"/>' +
      '<ellipse cx="540" cy="480" rx="330" ry="130" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2" transform="rotate(24 540 480)"/>' +
      '<circle cx="790" cy="392" r="10" fill="{{ACCENT}}"/><circle cx="300" cy="590" r="8" fill="#38bdf8"/>' +
      eye(540, 480, 52) +
      brand(64, 84) +
      T(64, 830, 62, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 886, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      progressDots(540, 1006, 7, 3)),
    editableFields: [headline("SATELLITES OVERHEAD"), subhead("Real orbits, rendered live above you."), accent()],
    layers: [],
    carouselGroup: "feature-tour-7",
    slideIndex: 3,
    featured: false,
    sortOrder: 35,
    tags: ["carousel", "tour", "satellites"],
  },
  {
    slug: "carousel-feature-tour-7-5",
    title: "Carousel · Feature Tour — 5 · Weather, Quakes, Fires",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + brand(64, 84) +
      T(64, 268, 62, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 324, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      featureRow(64, 480, "W", "Weather radar", "Storms and fronts in motion", 36) +
      featureRow(64, 640, "Q", "Earthquakes", "Seismic events as they register", 36) +
      featureRow(64, 800, "F", "Wildfires", "Active fire fronts worldwide", 36) +
      progressDots(540, 1006, 7, 4)),
    editableFields: [headline("A RESTLESS PLANET"), subhead("Three hazard layers, always updating."), accent()],
    layers: [],
    carouselGroup: "feature-tour-7",
    slideIndex: 4,
    featured: false,
    sortOrder: 36,
    tags: ["carousel", "tour", "weather"],
  },
  {
    slug: "carousel-feature-tour-7-6",
    title: "Carousel · Feature Tour — 6 · Recording",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + brand(64, 84) +
      T(64, 268, 64, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 324, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(64, 400, 952, 420, 30) +
      liveDot(124, 476) + T(154, 486, 26, "#ffffff", "REC", { weight: 800, ls: 3 }) +
      T(952, 486, 24, "#94a3b8", "00:12:05", { family: MONO, weight: 400, anchor: "end" }) +
      rings(540, 620, 110) + eye(540, 620, 46) +
      rect(112, 736, 856, 12, "#ffffff", 6, ' fill-opacity="0.15"') +
      rect(112, 736, 300, 12, "#ef4444", 6) +
      progressDots(540, 1006, 7, 5)),
    editableFields: [headline("RECORD THE MOMENT"), subhead("Live is fleeting. Clips are forever."), accent()],
    layers: [],
    carouselGroup: "feature-tour-7",
    slideIndex: 5,
    featured: false,
    sortOrder: 37,
    tags: ["carousel", "tour", "recording"],
  },
  {
    slug: "carousel-feature-tour-7-7",
    title: "Carousel · Feature Tour — 7 · CTA",
    category: "carousel",
    kind: "svg",
    format: "carousel_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(360, 480, 380) + rings(330, 460, 240) + eye(330, 460, 96) +
      T(620, 380, 64, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(620, 436, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(620, 486, 330, 72) +
      qrFrame(648, 620, 170) +
      urlText(620, 906, "start", 19) +
      progressDots(540, 1006, 7, 6)),
    editableFields: std("SEE IT YOURSELF", "The whole tour is live, right now, free.", "OPEN WORLDEYE"),
    layers: [qr(648, 620, 170)],
    carouselGroup: "feature-tour-7",
    slideIndex: 6,
    featured: false,
    sortOrder: 38,
    tags: ["carousel", "tour", "cta", "qr"],
  },

  /* ================= BANNERS (6) ================= */
  {
    slug: "banner-leaderboard-728x90",
    title: "Banner — Leaderboard 728×90",
    category: "banner",
    kind: "svg",
    format: "banner_728x90",
    width: 728,
    height: 90,
    assetUrl: null,
    // No QR at this size (illegible) — brand domain carries the link text; QR lives on larger formats.
    svgBody: S(728, 90,
      bgRect(728, 90) +
      eye(46, 45, 22) + T(80, 53, 20, "#ffffff", "WORLDEYE", { weight: 800, ls: 2 }) +
      T(248, 55, 26, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      ctaPill(566, 23, 140, 44, 16) +
      T(248, 78, 13, "#64748b", "WORLDEYE.APP", { family: MONO, weight: 400, ls: 1 })),
    editableFields: [headline("76,000+ CAMERAS, LIVE"), cta("WATCH NOW"), accent()],
    layers: [],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 39,
    tags: ["banner", "leaderboard", "728x90"],
  },
  {
    slug: "banner-medium-rect-300x250",
    title: "Banner — Medium Rectangle 300×250",
    category: "banner",
    kind: "svg",
    format: "banner_300x250",
    width: 300,
    height: 250,
    assetUrl: null,
    svgBody: S(300, 250,
      bgRect(300, 250) +
      brand(24, 40, 20) +
      T(24, 108, 29, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(24, 138, 16, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(24, 182, 128, 40, 15) +
      T(24, 240, 13, "#64748b", "WORLDEYE.APP", { family: MONO, weight: 400 }) +
      qrFrame(196, 146, 84, false)),
    editableFields: std("THE WORLD, LIVE", "76,000+ cameras in 105 countries.", "WATCH NOW", false),
    layers: [qr(196, 146, 84)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 40,
    tags: ["banner", "rectangle", "300x250"],
  },
  {
    slug: "banner-skyscraper-160x600",
    title: "Banner — Skyscraper 160×600",
    category: "banner",
    kind: "svg",
    format: "banner_160x600",
    width: 160,
    height: 600,
    assetUrl: null,
    svgBody: S(160, 600,
      bgRect(160, 600) + glow(80, 96, 90) +
      eye(80, 92, 40) +
      T(80, 168, 19, "#ffffff", "WORLDEYE", { anchor: "middle", weight: 800, ls: 2 }) +
      T(80, 238, 22, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(80, 322, 31, "{{ACCENT}}", "76,000+", { anchor: "middle", weight: 800 }) +
      T(80, 352, 14, "#cbd5e1", "{{SUBHEAD}}", { anchor: "middle", weight: 700, ls: 1 }) +
      ctaPill(20, 396, 120, 40, 15) +
      qrFrame(25, 462, 110, false)),
    editableFields: [headline("SEE IT LIVE"), subhead("105 COUNTRIES"), cta("WATCH"), accent()],
    layers: [qr(25, 462, 110)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 41,
    tags: ["banner", "skyscraper", "160x600"],
  },
  {
    slug: "banner-billboard-970x250",
    title: "Banner — Billboard 970×250",
    category: "banner",
    kind: "svg",
    format: "banner_970x250",
    width: 970,
    height: 250,
    assetUrl: null,
    svgBody: S(970, 250,
      bgRect(970, 250) + glow(880, 125, 190) + rings(120, 125, 74) +
      brand(196, 66, 24) +
      T(196, 128, 44, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(196, 162, 22, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(196, 182, 190, 46, 17) +
      urlText(410, 214, "start", 16) +
      qrFrame(806, 59, 120, false)),
    editableFields: std("THE WORLD IS LIVE", "76,000+ live cameras in 105 countries.", "EXPLORE LIVE"),
    layers: [qr(806, 59, 120)],
    carouselGroup: null,
    slideIndex: null,
    featured: true,
    sortOrder: 42,
    tags: ["banner", "billboard", "970x250"],
  },
  {
    slug: "banner-blog-header-1200x400",
    title: "Banner — Blog Header 1200×400",
    category: "banner",
    kind: "svg",
    format: "banner_1200x400",
    width: 1200,
    height: 400,
    assetUrl: null,
    svgBody: S(1200, 400,
      bgRect(1200, 400) + glow(720, 200, 300) + rings(730, 200, 165) + dotsGrid(64, 300, 8, 3) +
      brand(64, 72, 26) +
      T(64, 196, 54, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 240, 24, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(64, 272, 230, 54, 19) +
      urlText(330, 310, "start", 17) +
      qrFrame(1022, 138, 110, false)),
    editableFields: std("WATCH THE WORLD, LIVE", "Cameras, flights, weather and more — one map.", "OPEN THE MAP"),
    layers: [qr(1022, 138, 110)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 43,
    tags: ["banner", "blog", "header"],
  },
  {
    slug: "banner-square-ad",
    title: "Banner — Square Ad 1080×1080",
    category: "banner",
    kind: "svg",
    format: "banner_1080x1080",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(540, 520, 440) +
      rect(26, 26, 1028, 1028, "none", 24, ' stroke="{{ACCENT}}" stroke-opacity="0.55" stroke-width="3"') +
      brand(72, 96) +
      liveDot(880, 96) + T(908, 106, 24, "#ffffff", "LIVE", { weight: 800, ls: 3 }) +
      T(72, 300, 70, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(72, 356, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      T(540, 620, 170, "{{ACCENT}}", "76,000+", { anchor: "middle", weight: 800 }) +
      T(540, 684, 30, "#ffffff", "LIVE CAMERAS · 105 COUNTRIES", { anchor: "middle", weight: 700, ls: 3 }) +
      ctaPill(72, 790, 340, 72) +
      qrFrame(872, 842, 130, false) +
      urlText(72, 950, "start", 19) +
      T(72, 1000, 16, "#64748b", "{{DISCLOSURE}}", { weight: 400 })),
    editableFields: std("THE WORLD IS LIVE", "One real-time globe. Free to explore.", "EXPLORE LIVE"),
    layers: [qr(872, 842, 130)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 44,
    tags: ["banner", "square", "ad"],
  },

  /* ================= FEATURE GRAPHICS (4) — 1080x1080, pure vector ================= */
  {
    slug: "feature-osint-globe",
    title: "Feature — OSINT Globe",
    category: "feature",
    kind: "svg",
    format: "feature_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(540, 460, 430) +
      '<circle cx="540" cy="460" r="262" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2"/>' +
      '<circle cx="540" cy="460" r="262" fill="none" stroke="{{ACCENT}}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="4 14"/>' +
      '<ellipse cx="540" cy="460" rx="262" ry="104" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>' +
      '<ellipse cx="540" cy="460" rx="104" ry="262" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>' +
      '<line x1="540" y1="150" x2="540" y2="770" stroke="#ffffff" stroke-opacity="0.1"/>' +
      '<line x1="230" y1="460" x2="850" y2="460" stroke="#ffffff" stroke-opacity="0.1"/>' +
      '<circle cx="650" cy="360" r="8" fill="{{ACCENT}}"/><circle cx="430" cy="540" r="6" fill="#38bdf8"/><circle cx="590" cy="580" r="6" fill="#ffffff"/>' +
      eye(540, 460, 58) +
      brand(64, 84) + badge(836, 62, "PRO") +
      T(64, 892, 64, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 948, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      qrFrame(906, 856, 110)),
    editableFields: std("OSINT TOOLKIT", "Intel layers and analysis, built into the globe.", "GO PRO"),
    layers: [qr(906, 856, 110)],
    carouselGroup: null,
    slideIndex: null,
    featured: true,
    sortOrder: 45,
    tags: ["feature", "osint", "pro", "globe"],
  },
  {
    slug: "feature-cameras-grid",
    title: "Feature — Camera Grid",
    category: "feature",
    kind: "svg",
    format: "feature_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) +
      brand(64, 84) +
      T(64, 238, 62, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 292, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(64, 350, 296, 210, 20) + eye(212, 430, 34) + liveDot(96, 386, 6) +
      glassPanel(392, 350, 296, 210, 20) + eye(540, 430, 34) + liveDot(424, 386, 6) +
      glassPanel(720, 350, 296, 210, 20) + eye(868, 430, 34) + liveDot(752, 386, 6) +
      glassPanel(64, 592, 296, 210, 20) + eye(212, 672, 34) + liveDot(96, 628, 6) +
      glassPanel(392, 592, 296, 210, 20) + eye(540, 672, 34) + liveDot(424, 628, 6) +
      glassPanel(720, 592, 296, 210, 20) + eye(868, 672, 34) + liveDot(752, 628, 6) +
      T(64, 872, 26, "#cbd5e1", "CITIES · COASTS · HIGHWAYS · VOLCANOES · WILDLIFE", { weight: 700, ls: 1 }) +
      ctaPill(64, 906, 320, 68) +
      qrFrame(906, 884, 112, false)),
    editableFields: std("76,000+ LIVE CAMERAS", "Pick a place on Earth. Someone is streaming it.", "BROWSE CAMERAS"),
    layers: [qr(906, 884, 112)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 46,
    tags: ["feature", "cameras", "grid"],
  },
  {
    slug: "feature-recording-studio",
    title: "Feature — Recording Studio",
    category: "feature",
    kind: "svg",
    format: "feature_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) + glow(540, 300, 360) +
      brand(64, 84) +
      T(64, 252, 66, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 308, 29, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      glassPanel(64, 380, 952, 400, 30) +
      liveDot(124, 452) + T(154, 462, 26, "#ffffff", "REC", { weight: 800, ls: 3 }) +
      T(952, 462, 24, "#94a3b8", "00:42:17", { family: MONO, weight: 400, anchor: "end" }) +
      rings(540, 590, 100) + eye(540, 590, 44) +
      rect(112, 706, 856, 12, "#ffffff", 6, ' fill-opacity="0.15"') +
      rect(112, 706, 380, 12, "#ef4444", 6) +
      glassPanel(64, 824, 296, 120, 18) + T(212, 898, 24, "#ffffff", "CLIP 01", { anchor: "middle", weight: 700 }) +
      glassPanel(392, 824, 296, 120, 18) + T(540, 898, 24, "#ffffff", "CLIP 02", { anchor: "middle", weight: 700 }) +
      glassPanel(720, 824, 296, 120, 18) + T(868, 898, 24, "#ffffff", "CLIP 03", { anchor: "middle", weight: 700 }) +
      urlText(64, 1018, "start", 19)),
    editableFields: std("RECORD. CLIP. KEEP.", "Turn live moments into clips you own.", "TRY RECORDING"),
    layers: [],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 47,
    tags: ["feature", "recording"],
  },
  {
    slug: "feature-flights-satellites",
    title: "Feature — Flights + Satellites",
    category: "feature",
    kind: "svg",
    format: "feature_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) +
      '<path d="M -40 420 Q 540 120 1120 380" fill="none" stroke="{{ACCENT}}" stroke-opacity="0.6" stroke-width="3" stroke-dasharray="10 12"/>' +
      '<circle cx="690" cy="246" r="11" fill="#ffffff"/><circle cx="690" cy="246" r="24" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="2"/>' +
      '<ellipse cx="540" cy="700" rx="360" ry="140" fill="none" stroke="{{ACCENT}}" stroke-opacity="0.45" stroke-width="2" transform="rotate(-14 540 700)"/>' +
      '<ellipse cx="540" cy="700" rx="360" ry="140" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" transform="rotate(20 540 700)"/>' +
      '<circle cx="830" cy="610" r="9" fill="{{ACCENT}}"/>' +
      eye(540, 700, 56) +
      brand(64, 84) +
      T(64, 946, 60, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(64, 1000, 27, "#94a3b8", "{{SUBHEAD}}", { weight: 400 })),
    editableFields: [headline("FLIGHTS + SATELLITES"), subhead("Everything above you, tracked live."), accent(), showUrl()],
    layers: [],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 48,
    tags: ["feature", "flights", "satellites"],
  },

  /* ================= EMAIL (2) ================= */
  {
    slug: "email-header-1200x600",
    title: "Email — Header 1200×600",
    category: "email",
    kind: "svg",
    format: "email_1200x600",
    width: 1200,
    height: 600,
    assetUrl: null,
    svgBody: S(1200, 600,
      bgRect(1200, 600) + glow(600, 200, 380) + rings(110, 480, 90) + rings(1090, 120, 90) +
      T(600, 316, 56, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(600, 364, 25, "#94a3b8", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      ctaPill(450, 404, 300, 62, 21) +
      T(600, 540, 20, "#64748b", "76,000+ LIVE CAMERAS · 105 COUNTRIES · FREE TO EXPLORE", { anchor: "middle", weight: 700, ls: 2 })),
    editableFields: [headline("The world is live right now"), subhead("Open the globe and see what is happening, as it happens."), cta("OPEN WORLDEYE"), accent()],
    layers: [logo(490, 52, 220)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 49,
    tags: ["email", "header"],
  },
  {
    slug: "email-sidebar-600x900",
    title: "Email — Sidebar Promo 600×900",
    category: "email",
    kind: "svg",
    format: "email_600x900",
    width: 600,
    height: 900,
    assetUrl: null,
    svgBody: S(600, 900,
      bgRect(600, 900) + glow(300, 120, 260) +
      brand(48, 66, 24) +
      T(48, 186, 42, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(48, 226, 19, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      T(48, 336, 66, "{{ACCENT}}", "76,000+", { weight: 800 }) +
      T(48, 372, 18, "#cbd5e1", "LIVE CAMERAS · 105 COUNTRIES", { weight: 700, ls: 1 }) +
      featureRow(48, 452, "F", "Flights, live", "", 23) +
      featureRow(48, 522, "W", "Weather radar", "", 23) +
      featureRow(48, 592, "R", "Record moments", "", 23) +
      qrFrame(240, 648, 120) +
      T(300, 856, 15, "#94a3b8", "{{REF_URL}}", { family: MONO, weight: 400, anchor: "middle" })),
    editableFields: std("THE WORLD, LIVE", "Cameras, flights and weather — live.", "OPEN THE MAP"),
    layers: [qr(240, 648, 120)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 50,
    tags: ["email", "sidebar", "promo"],
  },

  /* ================= THUMBNAILS (2) — 1280x720 ================= */
  {
    slug: "thumbnail-cinematic-poster",
    title: "Thumbnail — Cinematic Poster",
    category: "thumbnail",
    kind: "svg",
    format: "thumb_1280x720",
    width: 1280,
    height: 720,
    assetUrl: "/worldeye-cinematic-poster.jpg",
    svgBody: S(1280, 720,
      rect(0, 0, 900, 720, "#050810", 0, ' opacity="0.55"') +
      rect(0, 380, 1280, 340, "url(#sheet)") +
      rect(56, 52, 150, 52, "#ef4444", 26) +
      liveDot(88, 78, 9) + T(108, 88, 24, "#ffffff", "LIVE", { weight: 800, ls: 3 }) +
      T(56, 330, 92, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(56, 392, 31, "#cbd5e1", "{{SUBHEAD}}", { weight: 400 }) +
      T(56, 660, 26, "#ffffff", "76,000+ CAMERAS · 105 COUNTRIES", { weight: 700, ls: 2 })),
    editableFields: [headline("THE WORLD IS LIVE"), subhead("Watch it happen, as it happens."), accent()],
    layers: [logo(1054, 40, 170)],
    carouselGroup: null,
    slideIndex: null,
    featured: true,
    sortOrder: 51,
    tags: ["thumbnail", "youtube", "cinematic", "photo"],
  },
  {
    slug: "thumbnail-split-stat",
    title: "Thumbnail — Split Stat",
    category: "thumbnail",
    kind: "svg",
    format: "thumb_1280x720",
    width: 1280,
    height: 720,
    assetUrl: null,
    svgBody: S(1280, 720,
      bgRect(1280, 720) + glow(980, 360, 330) + rings(980, 350, 220) +
      rect(0, 0, 700, 720, "#050810", 0, ' opacity="0.35"') +
      brand(56, 76, 26) +
      T(56, 300, 54, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(56, 352, 26, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      ctaPill(56, 420, 280, 62, 21) +
      T(742, 378, 118, "{{ACCENT}}", "76,000+", { weight: 800 }) +
      T(742, 436, 27, "#ffffff", "LIVE CAMERAS", { weight: 700, ls: 3 }) +
      urlText(56, 640, "start", 19)),
    editableFields: std("EVERY CAMERA, ONE MAP", "The whole planet, streaming live.", "WATCH LIVE"),
    layers: [],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 52,
    tags: ["thumbnail", "youtube", "stat", "split"],
  },

  /* ================= DISCOUNT (6) =================
     Tiered-code creatives. {{DISCOUNT_PCT}} and the coupon layer resolve
     from the affiliate's real, Stripe-synced discount code; the QR layer
     stays the referral link as everywhere else in the library. */
  {
    slug: "discount-story-bold",
    title: "Discount — Bold Percent (Story)",
    category: "discount",
    kind: "svg",
    format: "story_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) +
      glow(540, 820, 560) +
      rings(540, 470, 200) +
      badge(64, 216, "FIRST PAYMENT DEAL") +
      T(540, 600, 80, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 664, 30, "#cbd5e1", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      T(540, 800, 46, "#94a3b8", "USE MY CODE AND GET", { anchor: "middle", weight: 700, ls: 4 }) +
      T(540, 1010, 240, "{{ACCENT}}", "{{DISCOUNT_PCT}}%", { anchor: "middle", weight: 800 }) +
      T(540, 1096, 58, "#ffffff", "OFF YOUR FIRST PAYMENT", { anchor: "middle", weight: 800 }) +
      qrFrame(430, 1440, 220) +
      urlText(540, 1846, "middle", 21)),
    editableFields: std("THE WORLD IS LIVE", "76,000+ live cameras, flights, weather and more.", "START NOW"),
    layers: [logo(48, 64, 150), coupon(240, 1180, 600, 104), qr(430, 1440, 220)],
    carouselGroup: null,
    slideIndex: null,
    featured: true,
    sortOrder: 53,
    tags: ["discount", "story", "code", "offer"],
  },
  {
    slug: "discount-reel-cover",
    title: "Discount — Full-Price Hook (Reel Cover)",
    category: "discount",
    kind: "svg",
    format: "reel_9x16",
    width: 1080,
    height: 1920,
    assetUrl: null,
    svgBody: S(1080, 1920,
      bgRect(1080, 1920) +
      glow(540, 940, 580) +
      eye(540, 430, 115) +
      badge(64, 200, "MY VIEWER DEAL", "#f472b6") +
      T(540, 730, 38, "{{ACCENT}}", "WORLDEYE PRO", { anchor: "middle", weight: 800, ls: 6 }) +
      T(540, 856, 74, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 1052, 190, "{{ACCENT}}", "{{DISCOUNT_PCT}}% OFF", { anchor: "middle", weight: 800 }) +
      T(540, 1132, 30, "#cbd5e1", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      qrFrame(450, 1470, 180) +
      urlText(540, 1800, "middle", 21)),
    editableFields: std("STOP PAYING FULL PRICE", "My code takes it off your first payment.", "GET THE DEAL"),
    layers: [logo(48, 64, 150), coupon(270, 1210, 540, 100), qr(450, 1470, 180)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 54,
    tags: ["discount", "reel", "code", "hook"],
  },
  {
    slug: "discount-feed-punch",
    title: "Discount — Punch (Feed)",
    category: "discount",
    kind: "svg",
    format: "feed_1x1",
    width: 1080,
    height: 1080,
    assetUrl: null,
    svgBody: S(1080, 1080,
      bgRect(1080, 1080) +
      glow(320, 420, 430) +
      rings(892, 226, 118) +
      brand(64, 84, 32) +
      T(64, 322, 42, "{{ACCENT}}", "MY CODE, YOUR DEAL", { weight: 800, ls: 3 }) +
      T(64, 512, 148, "#ffffff", "{{DISCOUNT_PCT}}% OFF", { weight: 800 }) +
      T(64, 580, 34, "#ffffff", "{{HEADLINE}}", { weight: 700 }) +
      T(64, 632, 26, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      qrFrame(824, 690, 170) +
      urlText(64, 1022, "start", 19)),
    editableFields: std("First payment, sorted.", "76,000+ live cameras on one live globe.", "CLAIM THE CODE"),
    layers: [coupon(64, 700, 520, 96), qr(824, 690, 170)],
    carouselGroup: null,
    slideIndex: null,
    featured: true,
    sortOrder: 55,
    tags: ["discount", "feed", "code", "offer"],
  },
  {
    slug: "discount-feed-portrait-panel",
    title: "Discount — Glass Panel (Feed 4:5)",
    category: "discount",
    kind: "svg",
    format: "feed_4x5",
    width: 1080,
    height: 1350,
    assetUrl: null,
    svgBody: S(1080, 1350,
      bgRect(1080, 1350) +
      glow(540, 470, 480) +
      eye(540, 330, 105) +
      T(540, 620, 70, "#ffffff", "{{HEADLINE}}", { anchor: "middle", weight: 800 }) +
      T(540, 682, 29, "#cbd5e1", "{{SUBHEAD}}", { anchor: "middle", weight: 400 }) +
      glassPanel(140, 760, 800, 290, 28) +
      T(540, 862, 40, "#94a3b8", "FIRST PAYMENT", { anchor: "middle", weight: 700, ls: 5 }) +
      T(540, 982, 108, "{{ACCENT}}", "{{DISCOUNT_PCT}}% OFF", { anchor: "middle", weight: 800 }) +
      qrFrame(884, 1128, 118, false) +
      urlText(64, 1304, "start", 19)),
    editableFields: std("GET THE GLOBE FOR LESS", "Live cameras, flights, radar — one map.", "START NOW"),
    layers: [logo(48, 48, 150), coupon(240, 1108, 560, 100), qr(884, 1128, 118)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 56,
    tags: ["discount", "feed", "portrait", "code"],
  },
  {
    slug: "discount-banner-billboard",
    title: "Discount — Billboard (Banner)",
    category: "discount",
    kind: "svg",
    format: "banner_970x250",
    width: 970,
    height: 250,
    assetUrl: null,
    svgBody: S(970, 250,
      bgRect(970, 250) +
      glow(700, 125, 230) +
      brand(30, 108, 28) +
      T(272, 104, 27, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(272, 138, 18, "#94a3b8", "{{SUBHEAD}}", { weight: 400 }) +
      T(272, 206, 46, "{{ACCENT}}", "{{DISCOUNT_PCT}}% OFF", { weight: 800 }) +
      urlText(30, 232, "start", 16)),
    editableFields: std("SEE THE WORLD LIVE", "76,000+ cameras on one globe.", "START NOW", false),
    layers: [coupon(520, 140, 290, 62), qr(838, 60, 120)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 57,
    tags: ["discount", "banner", "billboard", "code"],
  },
  {
    slug: "discount-email-header",
    title: "Discount — Email Header",
    category: "discount",
    kind: "svg",
    format: "email_1200x600",
    width: 1200,
    height: 600,
    assetUrl: null,
    svgBody: S(1200, 600,
      bgRect(1200, 600) +
      glow(960, 300, 340) +
      rings(990, 290, 140) +
      brand(56, 96, 34) +
      T(56, 238, 48, "#ffffff", "{{HEADLINE}}", { weight: 800 }) +
      T(56, 288, 22, "#cbd5e1", "{{SUBHEAD}}", { weight: 400 }) +
      T(56, 402, 84, "{{ACCENT}}", "{{DISCOUNT_PCT}}% OFF", { weight: 800 }) +
      T(492, 402, 30, "#ffffff", "YOUR FIRST PAYMENT", { weight: 700 }) +
      ctaPill(600, 446, 280, 62, 21) +
      qrFrame(1014, 428, 118, false) +
      urlText(56, 562, "start", 19)),
    editableFields: std("YOUR FIRST MONTH, ON A DEAL", "76,000+ live cameras, flights and weather — one live globe.", "START NOW"),
    layers: [coupon(56, 440, 440, 88), qr(1014, 428, 118)],
    carouselGroup: null,
    slideIndex: null,
    featured: false,
    sortOrder: 58,
    tags: ["discount", "email", "header", "code"],
  },
];

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

/**
 * Idempotent upsert of every seed template, keyed by slug.
 * Returns the number of templates processed.
 *
 * On update only the design fields are refreshed (svgBody, editableFields,
 * layers, dimensions, title, format, tags, sortOrder) — an admin's
 * `active` / `featured` flags and scheduling are never overwritten.
 */
export async function seedStudioTemplates(): Promise<number> {
  let count = 0;
  for (const t of SEED_TEMPLATES) {
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

/** Seed only when the table is empty (first-run / admin bootstrap). */
export async function ensureStudioTemplates(): Promise<void> {
  const existing = await db.marketingTemplate.count();
  if (existing === 0) {
    await seedStudioTemplates();
  }
}
