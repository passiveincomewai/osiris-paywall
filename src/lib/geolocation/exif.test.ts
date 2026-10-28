import { describe, it, expect } from 'vitest';
import { imageDimensions, isJpeg, parseExif, sniffImageKind } from './exif';
import { BARE_JPEG, EIFFEL_GPS, buildExifJpeg } from './exif-fixtures';

describe('parseExif — GPS round-trip', () => {
  it('reads back the exact position written into the fixture', () => {
    const exif = parseExif(buildExifJpeg({ gps: EIFFEL_GPS, make: 'Canon', model: 'Canon EOS R5', dateTimeOriginal: '2026:10:26 14:03:11' }));
    expect(exif).not.toBeNull();
    // 48°51'30.21" = 48.85839166…, 2°17'40.24" = 2.29451111…
    expect(exif!.gps!.lat).toBeCloseTo(48.8583917, 6);
    expect(exif!.gps!.lng).toBeCloseTo(2.2945111, 6);
    expect(exif!.gps!.altitudeM).toBeCloseTo(35, 1);
    expect(exif!.gps!.directionDeg).toBeCloseTo(270, 1);
    expect(exif!.make).toBe('Canon');
    expect(exif!.model).toBe('Canon EOS R5');
    expect(exif!.dateTimeOriginal).toBe('2026:10:26 14:03:11');
  });

  it('applies southern and western hemisphere refs as negatives', () => {
    const exif = parseExif(buildExifJpeg({
      gps: { latRef: 'S', latDms: [33, 51, 54], lngRef: 'W', lngDms: [151, 12, 34.8] },
    }));
    // Sydney-ish: 33.865°, and a W longitude must come back negative.
    expect(exif!.gps!.lat).toBeCloseTo(-33.865, 3);
    expect(exif!.gps!.lng).toBeLessThan(0);
    expect(exif!.gps!.lng).toBeCloseTo(-151.2097, 3);
  });

  it('returns a null GPS (not a throw, not a fabrication) when the file has metadata but no GPS', () => {
    const exif = parseExif(buildExifJpeg({ make: 'Apple', model: 'iPhone 15' }));
    expect(exif).not.toBeNull();
    expect(exif!.gps).toBeNull();
    expect(exif!.make).toBe('Apple');
  });
});

describe('parseExif — hostile and stripped inputs', () => {
  it('returns null for a bare JPEG with no EXIF segment', () => {
    expect(parseExif(BARE_JPEG)).toBeNull();
  });

  it('returns null for non-JPEG bytes and empty buffers', () => {
    expect(parseExif(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBeNull();
    expect(parseExif(Buffer.alloc(0))).toBeNull();
    expect(parseExif(Buffer.from('just some text'))).toBeNull();
  });

  it('returns null for a truncated EXIF JPEG instead of throwing', () => {
    const full = buildExifJpeg({ gps: EIFFEL_GPS });
    expect(parseExif(full.subarray(0, 20))).toBeNull();
    expect(parseExif(full.subarray(0, Math.floor(full.length / 2)))).toBeNull();
  });
});

describe('imageDimensions — read from the file structure itself', () => {
  it('reads a JPEG frame header (SOF0) after another segment', () => {
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8]), // SOI
      Buffer.from([0xff, 0xe0, 0x00, 0x10]), // APP0, length 16
      Buffer.alloc(14),
      Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0x38, 0x07, 0x80, 0x03]), // SOF0: 8-bit, 1080 x 1920
      Buffer.from([0xff, 0xd9]),
    ]);
    expect(imageDimensions(jpeg)).toEqual({ width: 1920, height: 1080 });
  });

  it('reads PNG IHDR dimensions', () => {
    const png = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.writeUInt32BE(13, 8);
    png.write('IHDR', 12, 'latin1');
    png.writeUInt32BE(800, 16);
    png.writeUInt32BE(600, 20);
    expect(imageDimensions(png)).toEqual({ width: 800, height: 600 });
  });

  it('reads WebP VP8X (extended) dimensions', () => {
    const webp = Buffer.alloc(30);
    webp.write('RIFF', 0, 'latin1');
    webp.write('WEBP', 8, 'latin1');
    webp.write('VP8X', 12, 'latin1');
    // (width-1) and (height-1) as 24-bit LE at bytes 24 and 27.
    webp[24] = 0x7f; webp[25] = 0x02; webp[26] = 0x00; // 639 -> 640
    webp[27] = 0xdf; webp[28] = 0x01; webp[29] = 0x00; // 479 -> 480
    expect(imageDimensions(webp)).toEqual({ width: 640, height: 480 });
  });

  it('reads WebP VP8L (lossless) packed dimensions', () => {
    const webp = Buffer.alloc(25);
    webp.write('RIFF', 0, 'latin1');
    webp.write('WEBP', 8, 'latin1');
    webp.write('VP8L', 12, 'latin1');
    webp[20] = 0x2f;
    webp.writeUInt32LE(99 | (49 << 14), 21); // (100-1) | (50-1) << 14
    expect(imageDimensions(webp)).toEqual({ width: 100, height: 50 });
  });

  it('reads WebP VP8 (lossy) dimensions after the start code', () => {
    const webp = Buffer.alloc(30);
    webp.write('RIFF', 0, 'latin1');
    webp.write('WEBP', 8, 'latin1');
    webp.write('VP8 ', 12, 'latin1');
    webp[23] = 0x9d; webp[24] = 0x01; webp[25] = 0x2a;
    webp.writeUInt16LE(320, 26);
    webp.writeUInt16LE(240, 28);
    expect(imageDimensions(webp)).toEqual({ width: 320, height: 240 });
  });

  it('returns null — never a guess — for headerless, truncated or foreign bytes', () => {
    expect(imageDimensions(BARE_JPEG)).toBeNull(); // SOI + EOI, no frame header
    expect(imageDimensions(buildExifJpeg({}))).toBeNull(); // EXIF block but no SOF
    expect(imageDimensions(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull(); // truncated PNG
    expect(imageDimensions(Buffer.from('%PDF-1.7'))).toBeNull();
    expect(imageDimensions(Buffer.alloc(0))).toBeNull();
  });
});

describe('sniffImageKind / isJpeg', () => {
  it('trusts magic bytes, not names', () => {
    expect(sniffImageKind(buildExifJpeg({}))).toBe('jpeg');
    expect(sniffImageKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]))).toBe('png');
    expect(sniffImageKind(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]))).toBe('webp');
    expect(sniffImageKind(Buffer.from('%PDF-1.7'))).toBeNull();
    expect(isJpeg(BARE_JPEG)).toBe(true);
    expect(isJpeg(Buffer.from([0x89, 0x50]))).toBe(false);
  });
});
