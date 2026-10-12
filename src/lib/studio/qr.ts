// ── Studio QR: generation + decode-back validation helpers ─────────────
// Error-correction level H is mandatory: templates may stamp the eye
// logo over the QR center, and H tolerates ~30% occlusion while staying
// scannable. Validation decodes the rendered pixels and compares the
// text to the expected link — renders fail closed on a mismatch.
import QRCode from "qrcode";
import sharp from "sharp";
import jsQR from "jsqr";

export interface QrPngOptions {
  size: number;
  fg?: string;
  bg?: string;
}

export async function qrPngBuffer(text: string, opts: QrPngOptions): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: opts.size,
    color: { dark: opts.fg ?? "#0a1628", light: opts.bg ?? "#ffffff" },
  });
}

export async function decodeQr(pngBuffer: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(pngBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const result = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    return result?.data ?? null;
  } catch {
    return null;
  }
}
