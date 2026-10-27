import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/ssrf-guard';
import { siteAiKey } from '@/lib/oi/server-key';
import { sniffImageKind } from '@/lib/geolocation/exif';
import { analyzePhoto, nominatimDeps, type AnalyzeDeps } from '@/lib/geolocation/analyze';
import { openAiClueExtractor } from '@/lib/geolocation/clues';
import {
  consumeIpQuota,
  consumeVisionBudget,
  geolocationEnabled,
  visionConfigured,
} from '@/lib/geolocation/limits';

/**
 * Photo Geolocation (Beta) — POST one photo, get evidence-ranked
 * location candidates.
 *
 * The image is processed in memory and discarded with the request: it
 * is never written to disk, a database, or any third-party service.
 * The only outbound calls are the site's own OpenAI key (one clue
 * pass, when configured and in budget) and OpenStreetMap/Nominatim
 * place lookups through the app's budgeted door (lib/nominatim).
 * There is deliberately NO reverse image search — the photo never
 * leaves this pipeline (owner decision; Geo-Sleuth audit §5.2).
 *
 * Controls (lib/geolocation/limits.ts): kill switch → upload
 * validation → per-IP daily quota → vision budget circuit breaker.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Above this the vision copy is downscaled (cost + model limits). */
const VISION_DOWNSCALE_OVER = 1_500_000;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Downscale big photos for the vision pass with sharp (already a site
 * dependency). EXIF orientation is baked in; the original buffer —
 * the one EXIF is parsed from — is never touched. Any sharp failure
 * falls back to the original bytes.
 */
async function prepareVisionImage(buf: Buffer, mime: string): Promise<{ buffer: Buffer; mime: string }> {
  if (buf.length <= VISION_DOWNSCALE_OVER) return { buffer: buf, mime };
  try {
    const sharp = (await import('sharp')).default;
    const out = await sharp(buf)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return { buffer: out, mime: 'image/jpeg' };
  } catch {
    return { buffer: buf, mime };
  }
}

export async function POST(req: Request) {
  if (!geolocationEnabled()) {
    return json({ error: 'Photo Geolocation (Beta) is currently switched off.' }, 503);
  }

  const declared = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES + 65_536) {
    return json({ error: 'That photo is too large — the limit is 10 MB.' }, 413);
  }

  let file: FormDataEntryValue | null = null;
  try {
    const form = await req.formData();
    file = form.get('photo');
  } catch {
    return json({ error: 'Expected a multipart upload with a "photo" file.' }, 400);
  }
  if (!file || typeof file === 'string' || !('arrayBuffer' in file)) {
    return json({ error: 'No photo was attached. Choose an image file and try again.' }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) return json({ error: 'That file is empty.' }, 400);
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return json({ error: 'That photo is too large — the limit is 10 MB.' }, 413);
  }
  const kind = sniffImageKind(buffer);
  if (!kind) {
    return json({ error: 'That does not look like a JPEG, PNG or WebP image.' }, 415);
  }

  /* Quota is spent only on uploads that passed validation. */
  const quota = consumeIpQuota(getClientIp(req));
  if (!quota.allowed) {
    return json(
      { error: `Daily limit reached: this free beta allows ${quota.limit} analyses per day. Please come back tomorrow.` },
      429,
    );
  }

  /* Vision availability is decided before any work: configured? in budget? */
  let extractClues: AnalyzeDeps['extractClues'] = null;
  let visionOffReason: string | null = null;
  if (!visionConfigured()) {
    visionOffReason = 'Visual clue analysis is switched off on this deployment, so this result uses photo metadata and place lookups only.';
  } else if (!siteAiKey()) {
    visionOffReason = 'Visual clue analysis is not configured on this deployment, so this result uses photo metadata and place lookups only.';
  } else if (!consumeVisionBudget()) {
    visionOffReason = "Today's visual-analysis budget is used up, so this result uses photo metadata and place lookups only.";
  } else {
    extractClues = openAiClueExtractor;
  }

  const deps: AnalyzeDeps = {
    ...(await nominatimDeps()),
    extractClues,
    visionOffReason,
    prepareVisionImage,
  };

  try {
    const result = await analyzePhoto({ buffer, kind }, deps);
    return json({ ...result, quota: { remaining: quota.remaining, limit: quota.limit } });
  } catch {
    return json({ error: 'The analysis failed unexpectedly. Nothing was stored; please try again.' }, 500);
  } finally {
    /* The buffer goes out of scope with the request — it was never
       written anywhere, and this endpoint keeps no copy. */
    buffer.fill(0);
  }
}
