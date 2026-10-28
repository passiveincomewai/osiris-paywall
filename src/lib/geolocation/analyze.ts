/**
 * Photo Geolocation (Beta) — the analysis pipeline.
 *
 * Bounded, synchronous-budget work that fits one API request:
 *
 *   EXIF parse (instant, deterministic)
 *   → one vision clue pass (optional; off/unconfigured/over-budget
 *     degrades the run to EXIF-only mode, stated in the result)
 *   → Nominatim lookups for the clues' named landmarks + place names
 *     read from signage (through lib/nominatim — the app's one budgeted,
 *     cached door to that service)
 *   → deterministic ranking with evidence for/against
 *   → the privacy clamp (the last thing that touches a candidate)
 *
 * Dependencies are injected so tests drive every path with fakes and no
 * test ever spends a real model call or a real Nominatim request.
 *
 * "Couldn't determine" is a required, first-class outcome: when the
 * evidence does not support a candidate, the result says so and shows
 * the clues that WERE established. Nothing here invents a location.
 */
import {
  MIME_BY_KIND,
  imageDimensions,
  parseExif,
  type ImageKind,
  type PhotoExif,
} from "./exif";
import type { ClueExtractor, PhotoClues } from "./clues";
import {
  candidatesFromRows,
  exifCandidate,
  isResidentialScene,
  rankCandidates,
  shortLabel,
  toPublicCandidate,
  MAX_USEFUL_RADIUS_M,
  type GeoCandidate,
  type NominatimRowLike,
  type PublicCandidate,
} from "./candidates";

export interface AnalyzeDeps {
  /** The vision clue extractor, or null when vision is unavailable. */
  extractClues: ClueExtractor | null;
  /** Plain-language reason vision is unavailable (shown to the user). */
  visionOffReason: string | null;
  /** Place search through the app's Nominatim door; null = lookup failed/refused. */
  searchPlaces: (query: string) => Promise<NominatimRowLike[] | null>;
  /** Short label for a coordinate (reverse lookup); null when unavailable. */
  reverseLabel: (lat: number, lng: number) => Promise<string | null>;
  /** Optional downscale before the vision call (route injects sharp). */
  prepareVisionImage?: (buf: Buffer, mime: string) => Promise<{ buffer: Buffer; mime: string }>;
}

export interface PublicExif {
  hasGps: boolean;
  make: string | null;
  model: string | null;
  dateTimeOriginal: string | null;
  /** GPS altitude in metres, when the file's GPS block carries it. */
  altitudeM: number | null;
  /** Camera heading in degrees, when the file's GPS block carries it. */
  directionDeg: number | null;
}

/**
 * Facts about the uploaded file itself, read from its own structure —
 * shown back to the uploader in the results panel. The file is never
 * stored; these are values the analysis computed from it in passing.
 */
export interface PublicImageInfo {
  format: Exclude<ImageKind, null>;
  /** Pixel dimensions from the file's own header; null when unreadable. */
  width: number | null;
  height: number | null;
  /** The upload's size in bytes, exactly as received. */
  sizeBytes: number;
}

/**
 * The outcome of looking one named clue up in OpenStreetMap — the
 * per-clue half of the evidence trail. Only landmarks and place names
 * are ever looked up; every other clue is recorded context.
 */
export interface ClueLookup {
  clue: string;
  kind: 'landmark' | 'place';
  status: 'matched' | 'no_match' | 'lookup_failed' | 'not_queried' | 'too_broad';
  /** Labels of the usable candidates this clue produced (matched only). */
  matches: string[];
}

export interface AnalysisResult {
  status: 'located' | 'undetermined';
  /** 'full' = vision clues ran; 'exif-only' = metadata + lookups only. */
  mode: 'full' | 'exif-only';
  /** Plain-language degradations that apply to this result. */
  degradedReasons: string[];
  exif: PublicExif | null;
  /** The uploaded file's own format / dimensions / size. */
  image: PublicImageInfo;
  clues: PhotoClues | null;
  /** Per-clue OpenStreetMap lookup outcomes, in the order attempted. */
  lookups: ClueLookup[];
  candidates: PublicCandidate[];
  /** Why nothing could be determined (undetermined only), or extra honesty notes. */
  notes: string[];
}

const MAX_CLUE_QUERIES = 6;

function publicExif(exif: PhotoExif | null): PublicExif | null {
  if (!exif) return null;
  if (!exif.gps && !exif.make && !exif.model && !exif.dateTimeOriginal) return null;
  return {
    hasGps: !!exif.gps,
    make: exif.make,
    model: exif.model,
    dateTimeOriginal: exif.dateTimeOriginal,
    altitudeM: exif.gps?.altitudeM ?? null,
    directionDeg: exif.gps?.directionDeg ?? null,
  };
}

export async function analyzePhoto(
  image: { buffer: Buffer; kind: Exclude<ImageKind, null> },
  deps: AnalyzeDeps,
): Promise<AnalysisResult> {
  const degradedReasons: string[] = [];
  const notes: string[] = [];

  /* 1 ─ EXIF: instant, deterministic, and the strongest evidence when present. */
  const exif = parseExif(image.buffer);

  /* 2 ─ Vision clues: one pass, clues only. Any failure degrades, never fails. */
  let clues: PhotoClues | null = null;
  let mode: AnalysisResult['mode'] = 'full';
  if (deps.extractClues) {
    try {
      const mime = MIME_BY_KIND[image.kind];
      let visionBuf: Buffer = image.buffer;
      let visionMime = mime;
      if (deps.prepareVisionImage) {
        const prepared = await deps.prepareVisionImage(image.buffer, mime).catch(() => null);
        if (prepared) {
          visionBuf = prepared.buffer;
          visionMime = prepared.mime;
        }
      }
      clues = await deps.extractClues({ imageBase64: visionBuf.toString('base64'), mime: visionMime });
      if (!clues) {
        mode = 'exif-only';
        degradedReasons.push('The visual clue pass returned nothing readable this time, so this result uses photo metadata and place lookups only.');
      }
    } catch {
      mode = 'exif-only';
      degradedReasons.push('The visual clue pass could not run, so this result uses photo metadata and place lookups only.');
    }
  } else {
    mode = 'exif-only';
    if (deps.visionOffReason) degradedReasons.push(deps.visionOffReason);
  }

  /* 3 ─ Candidates. */
  const raw: GeoCandidate[] = [];
  if (exif?.gps) {
    const label = (await deps.reverseLabel(exif.gps.lat, exif.gps.lng).catch(() => null)) ?? 'Location from photo metadata';
    raw.push(exifCandidate(exif.gps, label));
  }

  const lookups: ClueLookup[] = [];
  if (clues) {
    const allQueries: Array<{ q: string; kind: 'landmark' | 'place' }> = [
      ...clues.landmarks.map(q => ({ q, kind: 'landmark' as const })),
      ...clues.placeNames.map(q => ({ q, kind: 'place' as const })),
    ];
    const queries = allQueries.slice(0, MAX_CLUE_QUERIES);
    let lookupsFailed = false;
    for (const { q, kind } of queries) {
      const rows = await deps.searchPlaces(q).catch(() => null);
      if (rows === null) {
        lookupsFailed = true;
        lookups.push({ clue: q, kind, status: 'lookup_failed', matches: [] });
        continue;
      }
      const produced = candidatesFromRows(rows, { kind, clue: q });
      raw.push(...produced);
      const usable = produced.filter(c => c.baseRadiusM <= MAX_USEFUL_RADIUS_M);
      if (!produced.length) {
        lookups.push({ clue: q, kind, status: 'no_match', matches: [] });
      } else if (!usable.length) {
        lookups.push({ clue: q, kind, status: 'too_broad', matches: [] });
      } else {
        lookups.push({ clue: q, kind, status: 'matched', matches: usable.map(c => c.label) });
      }
    }
    /* Named clues past the lookup cap are part of the trail too —
       the visitor should see they were recorded but not queried. */
    for (const { q, kind } of allQueries.slice(MAX_CLUE_QUERIES)) {
      lookups.push({ clue: q, kind, status: 'not_queried', matches: [] });
    }
    if (lookupsFailed) {
      degradedReasons.push('Some place lookups could not be completed, so a matching place may be missing from this result.');
    }
  }

  const useful = raw.filter(c => c.baseRadiusM <= MAX_USEFUL_RADIUS_M);
  if (raw.length && !useful.length) {
    notes.push('The only matches were whole-country outlines, which are too broad to call a location.');
  }

  /* 4 ─ Rank, then clamp. The clamp is the last step, always. */
  const residential = isResidentialScene(clues);
  const ranked = rankCandidates(useful);
  const candidates = ranked.map(c => toPublicCandidate(c, { residential }));
  if (residential && candidates.length) {
    notes.push('This photo looks like a private residence or private property, so the result is shown as a general area only — no exact point is displayed.');
  }

  /* 5 ─ The honest outcome. */
  if (!candidates.length) {
    if (!exif?.gps) notes.push('The photo file carries no GPS coordinates (most messaging and social apps strip them).');
    if (clues && !clues.landmarks.length && !clues.placeNames.length) {
      notes.push('No named landmark or readable place name could be found in the scene.');
    }
    if (!clues && mode === 'exif-only') {
      notes.push('Without GPS in the file and with the visual pass unavailable, there is nothing to match against.');
    }
  }

  const dims = imageDimensions(image.buffer);
  return {
    status: candidates.length ? 'located' : 'undetermined',
    mode,
    degradedReasons,
    exif: publicExif(exif),
    image: {
      format: image.kind,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      sizeBytes: image.buffer.length,
    },
    clues,
    lookups,
    candidates,
    notes,
  };
}

/** Default Nominatim-backed deps, wired to the app's one budgeted door. */
export async function nominatimDeps(): Promise<Pick<AnalyzeDeps, 'searchPlaces' | 'reverseLabel'>> {
  const { nominatim } = await import('@/lib/nominatim');
  return {
    searchPlaces: async (q: string) => {
      const rows = await nominatim<NominatimRowLike[]>('search', {
        q,
        limit: '5',
        addressdetails: '1',
      });
      return rows ?? null;
    },
    reverseLabel: async (lat: number, lng: number) => {
      const row = await nominatim<NominatimRowLike>('reverse', {
        lat: String(lat),
        lon: String(lng),
        zoom: '14',
        addressdetails: '1',
      });
      return row ? shortLabel(row) : null;
    },
  };
}
