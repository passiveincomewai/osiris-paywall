// ── Share QR codes ───────────────────────────────────────────────────
// A QR code for a share surface encodes the surface's own share link —
// the exact canonical URL its copy / share-sheet actions produce,
// byte for byte. There is no QR-specific URL format and no extra
// redirect hop: a phone that scans the code lands where the copied
// link lands, /ref/<code> attribution included when the link carries
// one. This module is the single place share QRs are rendered, so the
// payload can never drift from the link it sits beside.

import QRCode from "qrcode";

/** Pixel width of the generated PNG; the on-screen code is CSS-sized
 *  down from this, and the same data URL backs the PNG download, so
 *  the saved file stays print-crisp. */
export const SHARE_QR_PNG_WIDTH = 512;

/** Palette shared with the affiliate QR (app/api/affiliate/qr):
 *  deep navy modules on white. */
export const SHARE_QR_OPTIONS = {
  width: SHARE_QR_PNG_WIDTH,
  margin: 2,
  color: { dark: "#0a1628", light: "#ffffff" },
} as const;

/**
 * PNG data URL of a QR code whose payload is `url`, unchanged.
 * Throws on an empty payload — callers fail closed and render no
 * code rather than a code that encodes nothing.
 */
export async function shareQrDataUrl(url: string): Promise<string> {
  if (!url || !url.trim()) throw new Error("shareQrDataUrl: empty payload");
  return QRCode.toDataURL(url, { ...SHARE_QR_OPTIONS });
}
