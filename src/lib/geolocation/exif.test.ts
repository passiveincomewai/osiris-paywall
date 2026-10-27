import { describe, it, expect } from 'vitest';
import { isJpeg, parseExif, sniffImageKind } from './exif';
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
