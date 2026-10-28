/**
 * Photo Geolocation (Beta) — EXIF reading, JPEG only.
 *
 * A minimal, dependency-free parser for the one metadata block this tool
 * needs: the TIFF structure inside a JPEG APP1 "Exif" segment. It reads
 * GPS coordinates (with the hemisphere refs applied), the camera make /
 * model, the capture time and the GPS image direction, and nothing else.
 *
 * Design rules, inherited from the Geo-Sleuth audit (REPORT §3/§4):
 *  - No GPS in the file is a normal outcome, not an error. Most photos
 *    shared through apps and messengers have been stripped. The parser
 *    returns nulls and never invents values.
 *  - Malformed input returns null. A parser that throws on a stranger's
 *    photo turns a beta tool into a 500.
 *  - Metadata can be edited with free tools, so callers must label
 *    anything from here "from photo metadata", never as ground truth.
 *
 * PNG/WebP carry EXIF rarely and in different containers; this parser is
 * JPEG-only by design and the rest of the pipeline degrades honestly for
 * other formats.
 */

export interface ExifGps {
  lat: number;
  lng: number;
  /** Metres above sea level, when the file carries it. */
  altitudeM: number | null;
  /** Camera heading in degrees clockwise from north, when present. */
  directionDeg: number | null;
}

export interface PhotoExif {
  gps: ExifGps | null;
  make: string | null;
  model: string | null;
  /** ISO-ish capture time exactly as stored ("2026:10:26 14:03:11"), or null. */
  dateTimeOriginal: string | null;
}

/* TIFF field type sizes, bytes. Types outside this map are skipped. */
const TYPE_SIZE: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  7: 1, // UNDEFINED
  10: 8, // SRATIONAL
};

interface TiffReader {
  buf: Buffer;
  base: number; // offset of the TIFF header inside buf
  little: boolean;
}

function u16(r: TiffReader, off: number): number {
  return r.little ? r.buf.readUInt16LE(r.base + off) : r.buf.readUInt16BE(r.base + off);
}
function u32(r: TiffReader, off: number): number {
  return r.little ? r.buf.readUInt32LE(r.base + off) : r.buf.readUInt32BE(r.base + off);
}
function i32(r: TiffReader, off: number): number {
  return r.little ? r.buf.readInt32LE(r.base + off) : r.buf.readInt32BE(r.base + off);
}

interface IfdEntry {
  type: number;
  count: number;
  /** Absolute offset (into buf) of the value bytes. */
  valueOff: number;
}

/** Read one IFD into a tag→entry map; null when the IFD is unreadable. */
function readIfd(r: TiffReader, ifdOff: number): Map<number, IfdEntry> | null {
  if (ifdOff <= 0 || r.base + ifdOff + 2 > r.buf.length) return null;
  const count = u16(r, ifdOff);
  const entries = new Map<number, IfdEntry>();
  for (let i = 0; i < count; i++) {
    const at = ifdOff + 2 + i * 12;
    if (r.base + at + 12 > r.buf.length) break;
    const tag = u16(r, at);
    const type = u16(r, at + 2);
    const num = u32(r, at + 4);
    const size = TYPE_SIZE[type];
    if (!size) continue;
    const total = size * num;
    // Values of ≤4 bytes sit inline in the entry's 4-byte value field;
    // larger ones live at the offset the field carries. An entry whose
    // value bytes fall outside the buffer is corrupt — drop just that
    // entry, so one bad tag cannot sink the GPS block beside it.
    const absOff = total <= 4 ? r.base + at + 8 : r.base + u32(r, at + 8);
    if (absOff < 0 || absOff + total > r.buf.length) continue;
    entries.set(tag, { type, count: num, valueOff: absOff - r.base });
  }
  return entries;
}

function asciiValue(r: TiffReader, e: IfdEntry): string | null {
  const len = Math.min(e.count, 256);
  if (e.valueOff + len > r.buf.length - r.base) return null;
  const raw = r.buf.subarray(r.base + e.valueOff, r.base + e.valueOff + len);
  const text = raw.toString('latin1').split('\0')[0].trim();
  return text || null;
}

function firstNumber(r: TiffReader, e: IfdEntry): number | null {
  if (e.count < 1) return null;
  switch (e.type) {
    case 3: return u16(r, e.valueOff);
    case 4: return u32(r, e.valueOff);
    case 1: return r.buf[r.base + e.valueOff] ?? null;
    case 5: {
      const num = u32(r, e.valueOff);
      const den = u32(r, e.valueOff + 4);
      return den === 0 ? null : num / den;
    }
    case 10: {
      const num = i32(r, e.valueOff);
      const den = i32(r, e.valueOff + 4);
      return den === 0 ? null : num / den;
    }
    default: return null;
  }
}

function rationals(r: TiffReader, e: IfdEntry, n: number): number[] | null {
  if (e.type !== 5 || e.count < n) return null;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const num = u32(r, e.valueOff + i * 8);
    const den = u32(r, e.valueOff + i * 8 + 4);
    if (den === 0) return null;
    out.push(num / den);
  }
  return out;
}

function dmsToDegrees(parts: number[], ref: string | null, positive: 'N' | 'E'): number | null {
  const [d, m, s] = parts;
  if (![d, m, s].every(Number.isFinite)) return null;
  const value = d + m / 60 + s / 3600;
  return ref === positive ? value : -value;
}

function parseGps(r: TiffReader, ifd0: Map<number, IfdEntry>): ExifGps | null {
  const pointer = ifd0.get(0x8825);
  if (!pointer) return null;
  const gpsOff = firstNumber(r, pointer);
  if (gpsOff === null) return null;
  const gps = readIfd(r, gpsOff);
  if (!gps) return null;

  const latRefE = gps.get(1);
  const latE = gps.get(2);
  const lngRefE = gps.get(3);
  const lngE = gps.get(4);
  if (!latE || !lngE) return null;
  const latParts = rationals(r, latE, 3);
  const lngParts = rationals(r, lngE, 3);
  if (!latParts || !lngParts) return null;
  const lat = dmsToDegrees(latParts, latRefE ? asciiValue(r, latRefE) : null, 'N');
  const lng = dmsToDegrees(lngParts, lngRefE ? asciiValue(r, lngRefE) : null, 'E');
  if (lat === null || lng === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null; // "null island" is a broken fix, not a place

  let altitudeM: number | null = null;
  const altE = gps.get(6);
  if (altE) {
    const alt = firstNumber(r, altE);
    if (alt !== null) {
      const below = gps.get(5) ? firstNumber(r, gps.get(5)!) : 0;
      altitudeM = below === 1 ? -alt : alt;
    }
  }
  const dirE = gps.get(17);
  const directionDeg = dirE ? firstNumber(r, dirE) : null;

  return { lat, lng, altitudeM, directionDeg };
}

/** Find the TIFF header offset of the first Exif APP1 segment, or -1. */
function findTiffBase(buf: Buffer): number {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return -1;
  let off = 2;
  while (off + 4 <= buf.length) {
    if (buf[off] !== 0xff) return -1;
    const marker = buf[off + 1];
    // Standalone markers with no length field (TEM, RSTn, SOI, EOI…).
    if (marker === 0xd9 || marker === 0xda) break;
    const len = buf.readUInt16BE(off + 2);
    if (len < 2 || off + 2 + len > buf.length + 2) return -1;
    if (marker === 0xe1 && len > 6 && buf.toString('latin1', off + 4, off + 9) === 'Exif\0') {
      return off + 10; // segment header (4) + "Exif\0\0" (6)
    }
    off += 2 + len;
  }
  return -1;
}

/**
 * Parse the EXIF block of a JPEG buffer. Returns null when the buffer is
 * not a JPEG or carries no Exif segment; a PhotoExif of nulls when the
 * segment exists but holds nothing we read. Never throws.
 */
export function parseExif(buf: Buffer): PhotoExif | null {
  try {
    const base = findTiffBase(buf);
    if (base < 0 || base + 8 > buf.length) return null;
    const order = buf.toString('latin1', base, base + 2);
    if (order !== 'II' && order !== 'MM') return null;
    const r: TiffReader = { buf, base, little: order === 'II' };
    if (u16(r, 2) !== 42) return null;
    const ifd0 = readIfd(r, u32(r, 4));
    if (!ifd0) return null;

    const make = ifd0.get(0x010f) ? asciiValue(r, ifd0.get(0x010f)!) : null;
    const model = ifd0.get(0x0110) ? asciiValue(r, ifd0.get(0x0110)!) : null;

    let dateTimeOriginal = ifd0.get(0x0132) ? asciiValue(r, ifd0.get(0x0132)!) : null;
    const exifPointer = ifd0.get(0x8769);
    if (exifPointer) {
      const exifOff = firstNumber(r, exifPointer);
      const exifIfd = exifOff !== null ? readIfd(r, exifOff) : null;
      const dto = exifIfd?.get(0x9003);
      if (dto) dateTimeOriginal = asciiValue(r, dto) ?? dateTimeOriginal;
    }

    return { gps: parseGps(r, ifd0), make, model, dateTimeOriginal };
  } catch {
    return null;
  }
}

/** True when the buffer starts with the JPEG SOI marker. */
export function isJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

export type ImageKind = 'jpeg' | 'png' | 'webp' | null;

/** Sniff an upload's real format from its magic bytes — never its name. */
export function sniffImageKind(buf: Buffer): ImageKind {
  if (isJpeg(buf)) return 'jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'png';
  if (
    buf.length >= 12 &&
    buf.toString('latin1', 0, 4) === 'RIFF' &&
    buf.toString('latin1', 8, 12) === 'WEBP'
  ) return 'webp';
  return null;
}

export const MIME_BY_KIND: Record<Exclude<ImageKind, null>, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/* ── Image dimensions ────────────────────────────────────────────── */

export interface ImageDimensions {
  width: number;
  height: number;
}

/* JPEG Start-Of-Frame markers (all except DHT C4, JPG C8, DAC CC). */
const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpegDimensions(buf: Buffer): ImageDimensions | null {
  let off = 2; // past SOI
  while (off + 4 <= buf.length) {
    if (buf[off] !== 0xff) return null;
    const marker = buf[off + 1];
    if (marker === 0xda || marker === 0xd9) return null; // SOS / EOI: no frame header found
    // Standalone markers carry no length field (TEM, RSTn, SOI).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      off += 2;
      continue;
    }
    const len = buf.readUInt16BE(off + 2);
    if (len < 2) return null;
    if (SOF_MARKERS.has(marker)) {
      // [FF][marker][len:2][precision:1][height:2][width:2]
      if (off + 9 > buf.length) return null;
      const height = buf.readUInt16BE(off + 5);
      const width = buf.readUInt16BE(off + 7);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    off += 2 + len;
  }
  return null;
}

function pngDimensions(buf: Buffer): ImageDimensions | null {
  // Signature (8) + IHDR length (4) + "IHDR" (4) + width (4) + height (4).
  if (buf.length < 24) return null;
  if (buf.toString('latin1', 12, 16) !== 'IHDR') return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

function webpDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 20) return null;
  const chunk = buf.toString('latin1', 12, 16);
  if (chunk === 'VP8X') {
    if (buf.length < 30) return null;
    // Extended header: 1 flag byte + 3 reserved, then (width-1) and
    // (height-1) as 24-bit little-endian.
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  if (chunk === 'VP8L') {
    // Lossless: 0x2f signature byte, then two packed 14-bit (size-1) fields.
    if (buf.length < 25 || buf[20] !== 0x2f) return null;
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ') {
    // Lossy: 3-byte frame tag, the 9d 01 2a start code, then two
    // 14-bit dimensions (top 2 bits of each pair are scale bits).
    if (buf.length < 30) return null;
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  return null;
}

/**
 * Read a photo's pixel dimensions from its file structure — JPEG frame
 * header, PNG IHDR, or WebP chunk header, sniffed from the magic bytes
 * (never the file name). These are facts about the visitor's own file,
 * shown back to them in the results panel. Returns null when the
 * structure is missing or truncated; never throws, never guesses.
 */
export function imageDimensions(buf: Buffer): ImageDimensions | null {
  try {
    switch (sniffImageKind(buf)) {
      case 'jpeg':
        return jpegDimensions(buf);
      case 'png':
        return pngDimensions(buf);
      case 'webp':
        return webpDimensions(buf);
      default:
        return null;
    }
  } catch {
    return null;
  }
}
