/**
 * Test support for the geolocation suite: builds a real JPEG buffer
 * carrying a hand-assembled little-endian TIFF EXIF block, so the
 * parser is tested against the actual byte format (the same format
 * the Geo-Sleuth audit round-tripped through exif.py) rather than a
 * mock of it. Not used by production code.
 */

export interface FixtureGps {
  latRef: 'N' | 'S';
  latDms: [number, number, number];
  lngRef: 'E' | 'W';
  lngDms: [number, number, number];
  altitudeM?: number;
  directionDeg?: number;
}

export interface FixtureOptions {
  gps?: FixtureGps | null;
  make?: string;
  model?: string;
  dateTimeOriginal?: string;
}

const TYPE_ASCII = 2;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;
const TYPE_BYTE = 1;

interface Entry {
  tag: number;
  type: number;
  count: number;
  value: Buffer;
}

const ascii = (s: string): Buffer => Buffer.from(`${s}\0`, 'latin1');
const rational = (num: number, den: number): Buffer => {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(num, 0);
  b.writeUInt32LE(den, 4);
  return b;
};
const dmsRationals = (dms: [number, number, number]): Buffer =>
  Buffer.concat([rational(dms[0], 1), rational(dms[1], 1), rational(Math.round(dms[2] * 10_000), 10_000)]);
const longVal = (n: number): Buffer => {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
};

export function buildExifJpeg(opts: FixtureOptions): Buffer {
  const hasExifIfd = !!opts.dateTimeOriginal;
  const gps = opts.gps ?? null;

  const ifd0Entries: Entry[] = [];
  if (opts.make) ifd0Entries.push({ tag: 0x010f, type: TYPE_ASCII, count: opts.make.length + 1, value: ascii(opts.make) });
  if (opts.model) ifd0Entries.push({ tag: 0x0110, type: TYPE_ASCII, count: opts.model.length + 1, value: ascii(opts.model) });
  // Pointer entries are appended with placeholder values and patched
  // once the IFD offsets are known (they are the last two entries).
  const exifPtrIndex = hasExifIfd ? ifd0Entries.length : -1;
  if (hasExifIfd) ifd0Entries.push({ tag: 0x8769, type: TYPE_LONG, count: 1, value: longVal(0) });
  const gpsPtrIndex = gps ? ifd0Entries.length : -1;
  if (gps) ifd0Entries.push({ tag: 0x8825, type: TYPE_LONG, count: 1, value: longVal(0) });

  const exifEntries: Entry[] = hasExifIfd
    ? [{ tag: 0x9003, type: TYPE_ASCII, count: opts.dateTimeOriginal!.length + 1, value: ascii(opts.dateTimeOriginal!) }]
    : [];

  const gpsEntries: Entry[] = [];
  if (gps) {
    gpsEntries.push({ tag: 1, type: TYPE_ASCII, count: 2, value: ascii(gps.latRef) });
    gpsEntries.push({ tag: 2, type: TYPE_RATIONAL, count: 3, value: dmsRationals(gps.latDms) });
    gpsEntries.push({ tag: 3, type: TYPE_ASCII, count: 2, value: ascii(gps.lngRef) });
    gpsEntries.push({ tag: 4, type: TYPE_RATIONAL, count: 3, value: dmsRationals(gps.lngDms) });
    if (gps.altitudeM !== undefined) {
      gpsEntries.push({ tag: 5, type: TYPE_BYTE, count: 1, value: Buffer.from([0]) });
      gpsEntries.push({ tag: 6, type: TYPE_RATIONAL, count: 1, value: rational(Math.round(gps.altitudeM * 100), 100) });
    }
    if (gps.directionDeg !== undefined) {
      gpsEntries.push({ tag: 17, type: TYPE_RATIONAL, count: 1, value: rational(Math.round(gps.directionDeg * 100), 100) });
    }
  }

  const ifdSize = (n: number) => 2 + n * 12 + 4;
  const ifd0Off = 8;
  const exifIfdOff = ifd0Off + ifdSize(ifd0Entries.length);
  const gpsIfdOff = exifIfdOff + (hasExifIfd ? ifdSize(exifEntries.length) : 0);
  let dataOff = gpsIfdOff + (gps ? ifdSize(gpsEntries.length) : 0);
  if (dataOff % 2) dataOff += 1;

  if (exifPtrIndex >= 0) ifd0Entries[exifPtrIndex].value = longVal(exifIfdOff);
  if (gpsPtrIndex >= 0) ifd0Entries[gpsPtrIndex].value = longVal(gpsIfdOff);

  const tiff = Buffer.alloc(dataOff + 4096);
  tiff.write('II', 0, 'latin1');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(ifd0Off, 4);

  let cursor = dataOff;
  const writeIfd = (off: number, entries: Entry[]) => {
    tiff.writeUInt16LE(entries.length, off);
    entries.forEach((e, i) => {
      const at = off + 2 + i * 12;
      tiff.writeUInt16LE(e.tag, at);
      tiff.writeUInt16LE(e.type, at + 2);
      tiff.writeUInt32LE(e.count, at + 4);
      if (e.value.length <= 4) {
        e.value.copy(tiff, at + 8);
      } else {
        if (cursor % 2) cursor += 1;
        tiff.writeUInt32LE(cursor, at + 8);
        e.value.copy(tiff, cursor);
        cursor += e.value.length;
      }
    });
    tiff.writeUInt32LE(0, off + 2 + entries.length * 12);
  };
  writeIfd(ifd0Off, ifd0Entries);
  if (hasExifIfd) writeIfd(exifIfdOff, exifEntries);
  if (gps) writeIfd(gpsIfdOff, gpsEntries);

  const tiffBuf = tiff.subarray(0, cursor);
  const app1Len = 2 + 6 + tiffBuf.length;
  const jpeg = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff]),
    Buffer.from('Exif\0\0', 'latin1'),
    tiffBuf,
    Buffer.from([0xff, 0xd9]),
  ]);
  return jpeg;
}

/** A JPEG with no EXIF at all (SOI + EOI only — the parser must cope). */
export const BARE_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

/** The audit's synthetic Eiffel control point, as a GPS fixture. */
export const EIFFEL_GPS: FixtureGps = {
  latRef: 'N',
  latDms: [48, 51, 30.21],
  lngRef: 'E',
  lngDms: [2, 17, 40.24],
  altitudeM: 35,
  directionDeg: 270,
};
