import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { shareQrDataUrl, SHARE_QR_PNG_WIDTH } from './qr';
import { buildEntityShareUrl, flightShareId } from './links';
import { buildViewShareUrl } from './view';
import { cameraShareId } from '../camera-share';

const BASE = 'https://worldeye.app';

/**
 * Decode a QR PNG data URL back to its payload with an independent
 * reader (sharp raw pixels + jsQR, the studio pipeline's pattern) —
 * the proof that what a phone scans is the exact string the share
 * surface displays and copies.
 */
async function decodePayload(dataUrl: string): Promise<string> {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  if (!code) throw new Error('generated PNG did not decode as a QR code');
  return code.data;
}

describe('shareQrDataUrl', () => {
  it('returns a 512px PNG data URL', async () => {
    const dataUrl = await shareQrDataUrl(`${BASE}/?camera=demo`);
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    const meta = await sharp(Buffer.from(dataUrl.split(',')[1], 'base64')).metadata();
    expect(meta.width).toBe(SHARE_QR_PNG_WIDTH);
    expect(meta.height).toBe(SHARE_QR_PNG_WIDTH);
  });

  it('fails closed on an empty payload instead of encoding nothing', async () => {
    await expect(shareQrDataUrl('')).rejects.toThrow(/empty payload/);
    await expect(shareQrDataUrl('   ')).rejects.toThrow(/empty payload/);
  });
});

describe('QR payload === the canonical share URL, per surface', () => {
  it('camera share: the CameraViewer link (visitor code riding /ref)', async () => {
    // Built exactly as CameraViewer builds shareUrlText.
    const id = cameraShareId({ id: 'us-ca-los-angeles-1' });
    const url = buildEntityShareUrl({ kind: 'camera', id: id! }, 'someuser', BASE);
    expect(url).toBe('https://worldeye.app/ref/someuser?camera=us-ca-los-angeles-1');
    expect(await decodePayload(await shareQrDataUrl(url))).toBe(url);
  });

  it('camera share without a code is the bare deep link', async () => {
    const url = buildEntityShareUrl({ kind: 'camera', id: 'cam-42' }, null, BASE);
    expect(url).toBe('https://worldeye.app/?camera=cam-42');
    expect(await decodePayload(await shareQrDataUrl(url))).toBe(url);
  });

  it('flight share: the FlightWatchPanel link (icao24 from the watched flight)', async () => {
    // Built exactly as FlightWatchPanel's QR toggle builds qrUrl.
    const id = flightShareId({ icao24: 'A1B2C3' });
    const url = buildEntityShareUrl({ kind: 'flight', id: id! }, 'someuser', BASE);
    expect(url).toBe('https://worldeye.app/ref/someuser?flight=a1b2c3');
    expect(await decodePayload(await shareQrDataUrl(url))).toBe(url);
  });

  it('map view share: the SharePanel link (lat/lon/zoom/layers)', async () => {
    // Built exactly as SharePanel's generateShareUrl builds shareUrl.
    const url = buildViewShareUrl(
      { lat: 33.749, lng: -84.388, zoom: 8, layers: ['cameras', 'flights'] },
      BASE,
    );
    expect(await decodePayload(await shareQrDataUrl(url))).toBe(url);
  });

  it('round-trips a long attributed URL byte for byte', async () => {
    const url =
      'https://worldeye.app/ref/someuser?camera=jp-tokyo-shibuya-crossing-live-1080p';
    expect(await decodePayload(await shareQrDataUrl(url))).toBe(url);
  });
});
