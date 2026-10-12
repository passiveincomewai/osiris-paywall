/**
 * Marketing Studio — Video Studio pure drawing helpers.
 *
 * Everything in this module is DOM-free and unit-testable: the browser
 * client (VideoStudioClient) owns the <video>/<canvas>/MediaRecorder
 * plumbing and calls these helpers for cover-fit math, hook text
 * wrapping, end-card layout, canvas sizing, and recorder format picks.
 *
 * Export shape: the source video plays through with the hook text burned
 * into the first HOOK_SECONDS, then a static END_CARD_SECONDS end card
 * (logo, CTA, referral link, optional discount line, QR) is appended
 * while the recorder keeps running.
 */

export const HOOK_SECONDS = 5;
export const END_CARD_SECONDS = 3;

/** Recorder mime candidates, best first. Safari 14.1+ can do mp4. */
export const MIME_CANDIDATES = [
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
] as const;

/* ------------------------------------------------------------------ */
/* Cover-fit                                                           */
/* ------------------------------------------------------------------ */

export interface CoverFit {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/**
 * Scale a source frame so it fully covers the destination canvas
 * (center-cropped overflow), returning drawImage destination rect.
 */
export function coverFit(srcW: number, srcH: number, dstW: number, dstH: number): CoverFit {
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
    return { dx: 0, dy: 0, dw: Math.max(0, dstW), dh: Math.max(0, dstH) };
  }
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  return { dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh };
}

/* ------------------------------------------------------------------ */
/* Canvas sizing                                                       */
/* ------------------------------------------------------------------ */

/**
 * Output canvas size for a template: native dimensions, capped for
 * recorder performance — vertical video at 720x1280, landscape at
 * 1280x720. Aspect ratio is preserved (uniform scale, floored to even
 * dimensions, which several encoders require).
 */
export function canvasSizeFor(width: number, height: number): { width: number; height: number } {
  const w = width > 0 ? width : 720;
  const h = height > 0 ? height : 1280;
  const vertical = h >= w;
  const maxW = vertical ? 720 : 1280;
  const maxH = vertical ? 1280 : 720;
  const scale = Math.min(1, maxW / w, maxH / h);
  const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
  return { width: even(w * scale), height: even(h * scale) };
}

/* ------------------------------------------------------------------ */
/* Text wrapping                                                       */
/* ------------------------------------------------------------------ */

/**
 * Greedy word-wrap to a maximum character count per line.
 *
 * NOTE: this is a character-count approximation, not a canvas measureText
 * pass — proportional fonts vary, so callers should keep maxChars
 * conservative for the chosen font size. Words longer than maxChars are
 * hard-split so a line never exceeds the limit.
 */
export function wrapText(text: string, maxChars: number): string[] {
  const limit = Math.max(1, Math.floor(maxChars));
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const lines: string[] = [];
  let current = "";
  const push = () => {
    if (current) lines.push(current);
    current = "";
  };
  for (const rawWord of clean.split(" ")) {
    let word = rawWord;
    while (word.length > limit) {
      push();
      lines.push(word.slice(0, limit));
      word = word.slice(limit);
    }
    if (!word) continue;
    if (!current) current = word;
    else if (current.length + 1 + word.length <= limit) current += " " + word;
    else {
      push();
      current = word;
    }
  }
  push();
  return lines;
}

/** Hook font size in px: ~5.5% of canvas width (spec'd overlay size). */
export function hookFontPx(canvasW: number): number {
  return Math.round(canvasW * 0.055);
}

/**
 * Max characters per hook line for the standard hook font, using a
 * conservative average glyph width (~0.58em for 800-weight sans).
 */
export function hookMaxChars(canvasW: number): number {
  const fontPx = hookFontPx(canvasW);
  const usable = canvasW * 0.88; // 6% margins each side
  return Math.max(8, Math.floor(usable / (fontPx * 0.58)));
}

/* ------------------------------------------------------------------ */
/* End-card layout                                                     */
/* ------------------------------------------------------------------ */

export interface EndCardLayout {
  bg: string;
  /** Centered eye logo box. */
  logo: { x: number; y: number; size: number };
  /** CTA headline baseline y + font px. */
  headline: { y: number; fontPx: number };
  /** Referral link baseline y + font px. */
  link: { y: number; fontPx: number };
  /** Discount line baseline y + font px (drawn only when a code exists). */
  discount: { y: number; fontPx: number };
  /** QR box (square), drawn on white padding by the caller. */
  qr: { x: number; y: number; size: number; pad: number };
}

/**
 * End-card layout for a canvas of W×H. Pure numbers — the client draws.
 * Composition (top→bottom): eye logo, CTA headline, referral link,
 * optional discount line, QR block in the lower area.
 */
export function endCardLayout(canvasW: number, canvasH: number): EndCardLayout {
  const cx = canvasW / 2;
  const logoSize = Math.round(canvasW * 0.22);
  const logoY = Math.round(canvasH * 0.14);
  const headlineY = logoY + logoSize + Math.round(canvasH * 0.09);
  const linkY = headlineY + Math.round(canvasH * 0.055);
  const discountY = linkY + Math.round(canvasH * 0.05);
  const qrSize = Math.round(canvasW * 0.28);
  const qrY = Math.round(canvasH * 0.68);
  return {
    bg: "#050810",
    logo: { x: Math.round(cx - logoSize / 2), y: logoY, size: logoSize },
    headline: { y: headlineY, fontPx: Math.round(canvasW * 0.062) },
    link: { y: linkY, fontPx: Math.round(canvasW * 0.036) },
    discount: { y: discountY, fontPx: Math.round(canvasW * 0.042) },
    qr: { x: Math.round(cx - qrSize / 2), y: qrY, size: qrSize, pad: Math.round(qrSize * 0.08) },
  };
}

/* ------------------------------------------------------------------ */
/* Recorder format                                                     */
/* ------------------------------------------------------------------ */

/** First supported mime type from MIME_CANDIDATES, or null. */
export function pickMimeType(isSupported: (t: string) => boolean): string | null {
  for (const t of MIME_CANDIDATES) {
    try {
      if (isSupported(t)) return t;
    } catch {
      // A throwing isTypeSupported counts as unsupported; keep walking.
    }
  }
  return null;
}

/** Download extension for a recorder mime type. */
export function extensionForMime(mime: string | null | undefined): "mp4" | "webm" {
  return mime && mime.toLowerCase().includes("mp4") ? "mp4" : "webm";
}

/** Display form of a referral link: scheme stripped. */
export function displayLink(link: string): string {
  return link.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
