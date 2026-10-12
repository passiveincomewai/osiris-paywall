// ── Studio render pipeline ─────────────────────────────────────────────
// Tokenized SVG template + validated field values + the affiliate's real
// context → rasterized, composited (QR / logo / coupon layers), and
// exported as PNG/JPEG/WebP. Every substituted value is XML-escaped
// first, so user text can never inject markup into the SVG. Any render
// carrying a QR layer is validated by decoding the finished master back
// and asserting it equals the exact referral link — fail closed.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { EditableField, StudioContext, StudioFormat, TemplateLayer } from "./types";
import { ensureStudioFonts } from "./fonts";
import { qrPngBuffer, decodeQr } from "./qr";

export class QrValidationError extends Error {
  constructor(message = "QR validation failed: rendered code does not decode to the referral link") {
    super(message);
    this.name = "QrValidationError";
  }
}

export const DISCLOSURE_TEXT = "Affiliate link — I may earn a commission if you join.";

// ── Validation ─────────────────────────────────────────────────────────

export function validateValues(
  fields: EditableField[],
  raw: Record<string, unknown>,
): { values: Record<string, string> } | { error: string } {
  const known = new Set(fields.map((f) => f.key));
  for (const key of Object.keys(raw ?? {})) {
    if (!known.has(key)) return { error: `Unknown field: ${key}` };
  }

  const values: Record<string, string> = {};
  for (const field of fields) {
    const rawVal = (raw ?? {})[field.key];

    if (rawVal === undefined || rawVal === null) {
      const d = field.default;
      values[field.key] =
        d === undefined ? "" : typeof d === "boolean" ? (field.type === "toggle" ? (d ? "1" : "") : String(d)) : d;
    } else if (field.type === "text" || field.type === "textarea") {
      if (typeof rawVal !== "string") return { error: `Field "${field.key}" must be text` };
      const trimmed = rawVal.trim();
      const maxLen = field.maxLen ?? (field.type === "textarea" ? 300 : 120);
      if (trimmed.length > maxLen) return { error: `Field "${field.key}" exceeds ${maxLen} characters` };
      values[field.key] = trimmed;
    } else if (field.type === "color") {
      if (typeof rawVal !== "string" || !/^#[0-9a-fA-F]{6}$/.test(rawVal.trim())) {
        return { error: `Field "${field.key}" must be a #rrggbb color` };
      }
      values[field.key] = rawVal.trim();
    } else if (field.type === "toggle") {
      if (rawVal === true || rawVal === "on" || rawVal === "true" || rawVal === "1" || rawVal === 1) {
        values[field.key] = "1";
      } else if (rawVal === false || rawVal === "off" || rawVal === "false" || rawVal === "0" || rawVal === "" || rawVal === 0) {
        values[field.key] = "";
      } else {
        return { error: `Field "${field.key}" must be a toggle (on/off)` };
      }
    }

    if (field.required && !values[field.key]) {
      return { error: `Field "${field.key}" is required` };
    }
  }
  return { values };
}

// ── Helpers ────────────────────────────────────────────────────────────

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function computeRenderHash(
  templateUpdatedAtISO: string,
  values: Record<string, string>,
  code: string,
): string {
  const payload = `${templateUpdatedAtISO}|${JSON.stringify(values, Object.keys(values).sort())}|${code}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/** Resolve a template assetUrl to a file under public/, or null. */
function publicFilePath(assetUrl: string): string | null {
  // Path-traversal guard: only site-rooted paths, never "..".
  if (!assetUrl.startsWith("/") || assetUrl.includes("..")) return null;
  const full = path.join(process.cwd(), "public", assetUrl);
  const publicRoot = path.join(process.cwd(), "public");
  if (!full.startsWith(publicRoot + path.sep)) return null;
  return fs.existsSync(full) ? full : null;
}

function substituteTokens(
  svgBody: string,
  fields: EditableField[],
  values: Record<string, string>,
  ctx: StudioContext,
): string {
  const tokens: Record<string, string> = {
    REF_URL: ctx.link,
    REF_CODE: ctx.code,
    CODE: ctx.code,
    DISPLAY_NAME: ctx.displayName,
    RANK_NAME: ctx.rankName,
    COMMISSION_PCT: String(ctx.commissionPct),
    COUPON_CODE: ctx.couponCode ?? "",
    DISCOUNT_PCT: ctx.discountPct != null ? String(ctx.discountPct) : "",
    DISCLOSURE: DISCLOSURE_TEXT,
  };
  for (const field of fields) {
    tokens[field.key.toUpperCase()] = values[field.key] ?? field.default ?? "";
  }
  return svgBody.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_match, name: string) => {
    const value = tokens[name.toUpperCase()];
    return value === undefined ? "" : escapeXml(value);
  });
}

// ── Render ─────────────────────────────────────────────────────────────

export interface RenderTemplateOptions {
  template: {
    slug: string;
    width: number;
    height: number;
    svgBody: string | null;
    assetUrl?: string | null;
    updatedAt?: Date | string;
  };
  fields: EditableField[];
  layers: TemplateLayer[];
  ctx: StudioContext;
  values: Record<string, string>;
  format?: StudioFormat;
  scale?: number;
}

export async function renderTemplate(opts: RenderTemplateOptions): Promise<{
  buffer: Buffer;
  format: StudioFormat;
  width: number;
  height: number;
  renderHash: string;
}> {
  const { template, fields, layers, ctx } = opts;
  const format: StudioFormat = opts.format ?? "png";
  const scale = Math.min(1, Math.max(0.2, opts.scale ?? 1));
  const { width, height } = template;

  if (!template.svgBody) throw new Error(`Template "${template.slug}" has no svgBody to render`);

  ensureStudioFonts();

  // Effective values: caller-supplied values with field defaults filling gaps.
  const effectiveValues: Record<string, string> = {};
  for (const field of fields) {
    effectiveValues[field.key] = opts.values[field.key] ?? field.default ?? "";
  }

  const updatedAtISO =
    template.updatedAt instanceof Date
      ? template.updatedAt.toISOString()
      : (template.updatedAt ?? "");
  const renderHash = computeRenderHash(updatedAtISO, effectiveValues, ctx.code);

  const svg = substituteTokens(template.svgBody, fields, effectiveValues, ctx);
  const svgRaster = await sharp(Buffer.from(svg, "utf8"))
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();

  // Optional photographic base: the SVG is designed transparent where the
  // photo shows, and is composited over the cover-fitted asset.
  let basePng: Buffer = svgRaster;
  if (template.assetUrl) {
    const assetPath = publicFilePath(template.assetUrl);
    if (assetPath) {
      const photo = await sharp(assetPath).resize(width, height, { fit: "cover" }).png().toBuffer();
      basePng = await sharp(photo)
        .composite([{ input: svgRaster, left: 0, top: 0 }])
        .png()
        .toBuffer();
    }
  }

  // Composite layers in declared order.
  type CompositeLayer = { input: Buffer; left: number; top: number };
  const composites: CompositeLayer[] = [];
  let hasQr = false;

  for (const layer of layers ?? []) {
    if (layer.type === "qr") {
      hasQr = true;
      const bg = layer.bg ?? "#ffffff";
      if (layer.pad) {
        const padSize = layer.size + layer.pad * 2;
        const padSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${padSize}" height="${padSize}"><rect x="0" y="0" width="${padSize}" height="${padSize}" rx="24" fill="${escapeXml(bg)}"/></svg>`;
        const padPng = await sharp(Buffer.from(padSvg, "utf8")).png().toBuffer();
        composites.push({ input: padPng, left: layer.x - layer.pad, top: layer.y - layer.pad });
      }
      const qrRaw = await qrPngBuffer(ctx.link, { size: layer.size, fg: layer.fg, bg: layer.bg });
      const qrMeta = await sharp(qrRaw).metadata();
      const qrPng =
        qrMeta.width === layer.size && qrMeta.height === layer.size
          ? qrRaw
          : await sharp(qrRaw)
              .resize(layer.size, layer.size, { fit: "fill", kernel: sharp.kernel.nearest })
              .png()
              .toBuffer();
      composites.push({ input: qrPng, left: layer.x, top: layer.y });

      if (layer.logo) {
        const eyePath = path.join(process.cwd(), "public", "worldeye-eye.png");
        if (fs.existsSync(eyePath)) {
          const logoWidth = Math.round(layer.size * 0.24);
          const logoPng = await sharp(eyePath).resize(logoWidth).png().toBuffer();
          const logoMeta = await sharp(logoPng).metadata();
          const logoHeight = logoMeta.height ?? logoWidth;
          composites.push({
            input: logoPng,
            left: layer.x + Math.round((layer.size - logoWidth) / 2),
            top: layer.y + Math.round((layer.size - logoHeight) / 2),
          });
        }
      }
    } else if (layer.type === "logo") {
      const logoPath = path.join(process.cwd(), "public", "worldeye-logo.png");
      if (fs.existsSync(logoPath)) {
        const logoPng = await sharp(logoPath).resize(layer.width).png().toBuffer();
        composites.push({ input: logoPng, left: layer.x, top: layer.y });
      }
      // Missing logo file: skip the layer rather than failing the render.
    } else if (layer.type === "coupon") {
      // Only when a real coupon code exists — never render a fake discount.
      if (ctx.couponCode) {
        const code = escapeXml(ctx.couponCode);
        const couponSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layer.width}" height="${layer.height}"><rect x="1" y="1" width="${layer.width - 2}" height="${layer.height - 2}" rx="${Math.round(layer.height / 2)}" fill="#0a1628" stroke="#22d3ee" stroke-width="2" stroke-dasharray="8 6"/><text x="${layer.width / 2}" y="${Math.round(layer.height * 0.4)}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="${Math.round(layer.height * 0.22)}" fill="#94a3b8">USE CODE</text><text x="${layer.width / 2}" y="${Math.round(layer.height * 0.78)}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-weight="700" font-size="${Math.round(layer.height * 0.36)}" fill="#ffffff">${code}</text></svg>`;
        const couponPng = await sharp(Buffer.from(couponSvg, "utf8")).png().toBuffer();
        composites.push({ input: couponPng, left: layer.x, top: layer.y });
      }
    }
  }

  const masterPng =
    composites.length > 0
      ? await sharp(basePng).composite(composites).png().toBuffer()
      : basePng;

  // QR validation — fail closed. The finished master must decode back to
  // the exact referral link, logo occlusion and all.
  if (hasQr) {
    const decoded = await decodeQr(masterPng);
    if (decoded !== ctx.link) {
      throw new QrValidationError(
        `QR validation failed for template "${template.slug}": decoded ${JSON.stringify(decoded)} !== link`,
      );
    }
  }

  // Final output: optional downscale, then format conversion.
  let out = sharp(masterPng);
  if (scale !== 1) {
    out = out.resize(Math.round(width * scale), Math.round(height * scale));
  }
  let buffer: Buffer;
  if (format === "jpeg") buffer = await out.jpeg({ quality: 90 }).toBuffer();
  else if (format === "webp") buffer = await out.webp({ quality: 90 }).toBuffer();
  else buffer = await out.png().toBuffer();

  const meta = await sharp(buffer).metadata();
  return {
    buffer,
    format,
    width: meta.width ?? Math.round(width * scale),
    height: meta.height ?? Math.round(height * scale),
    renderHash,
  };
}
