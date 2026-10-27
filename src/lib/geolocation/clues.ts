/**
 * Photo Geolocation (Beta) — the vision clue pass.
 *
 * ONE structured call to the site's OpenAI key (lib/oi/server-key.ts —
 * the same key, model and wire shape lib/camera-alerts/vision.ts uses).
 * The model reads the photo and returns CLUES ONLY: text it can read,
 * named landmarks it can identify, plate style, driving side, scene
 * type. It is never asked for, and its answer is never allowed to carry,
 * a location decision — candidate generation and ranking are
 * deterministic code downstream (lib/geolocation/candidates.ts), so
 * every result traces to evidence a human can inspect.
 *
 * The parser is a whitelist: only the schema's keys survive, each array
 * capped and cleaned. If the model smuggles in a "location" or
 * coordinates anyway, they are dropped here, unparseable replies
 * degrade to null, and a null clue set is a first-class outcome (the
 * pipeline falls back to EXIF + an honest "couldn't determine").
 *
 * Privacy rules live in the prompt AND the schema: the model must flag
 * likely private residences (the clamp in candidates.ts acts on it),
 * and it is forbidden from identifying people — there is no field for
 * a person, by design.
 */
import { siteAiKey, siteAiModel } from "@/lib/oi/server-key";

export type SceneType = 'landmark' | 'urban' | 'natural' | 'residential' | 'interior' | 'unknown';

export interface PhotoClues {
  /** Exact text read from signs, plates, storefronts — transcribed, not interpreted. */
  visibleText: string[];
  /** Languages / scripts observed in the scene, e.g. "Japanese". */
  languages: string[];
  /** Named landmarks or places visibly identifiable ("Eiffel Tower"). */
  landmarks: string[];
  /** Place names READ from signage — text evidence, not model knowledge. */
  placeNames: string[];
  /** Licence-plate format description, e.g. "white text on blue, EU band at left". */
  plateStyle: string | null;
  drivingSide: 'left' | 'right' | null;
  vegetationClimate: string | null;
  architecture: string | null;
  roadMarkings: string | null;
  sceneType: SceneType;
  /** The scene appears to be a private home / private property. Drives the privacy clamp. */
  privateResidenceLikely: boolean;
}

export const EMPTY_CLUES: PhotoClues = {
  visibleText: [],
  languages: [],
  landmarks: [],
  placeNames: [],
  plateStyle: null,
  drivingSide: null,
  vegetationClimate: null,
  architecture: null,
  roadMarkings: null,
  sceneType: 'unknown',
  privateResidenceLikely: false,
};

export type ClueExtractor = (input: { imageBase64: string; mime: string }) => Promise<PhotoClues | null>;

const SYSTEM = [
  'You extract geolocation CLUES from one photograph for a deterministic ranking system.',
  'Answer with ONLY a JSON object matching this schema — no other text, no markdown:',
  '{"visibleText": string[], "languages": string[], "landmarks": string[], "placeNames": string[],',
  '"plateStyle": string|null, "drivingSide": "left"|"right"|null, "vegetationClimate": string|null,',
  '"architecture": string|null, "roadMarkings": string|null,',
  '"sceneType": "landmark"|"urban"|"natural"|"residential"|"interior"|"unknown",',
  '"privateResidenceLikely": boolean}',
  'Rules:',
  '- Report ONLY what is visible in the image. Never guess a city, region or country.',
  '- NEVER output coordinates, a location conclusion, or "this is in …" statements anywhere.',
  '- visibleText: exact transcriptions of readable text on signs, plates, vehicles, buildings. If text is blurry or partial, leave it out rather than guessing letters.',
  '- landmarks: only named landmarks you can actually identify in the frame (a famous tower, a signed station). Generic buildings are not landmarks.',
  '- placeNames: place names READ from signage in the image, transcribed exactly.',
  '- drivingSide: from traffic direction or road layout only; null when not determinable.',
  '- sceneType "residential" and privateResidenceLikely true when the scene is a private home, garden, driveway or similar private property.',
  '- NEVER identify, name or describe individual people. Faces and people are not clues; ignore them.',
  '- Empty arrays and nulls are correct answers when nothing is visible. Do not pad.',
].join('\n');

const MAX_ITEMS = 8;
const MAX_TEXT = 120;

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const text = item.trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT);
    if (text && !out.includes(text)) out.push(text);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT);
  return text || null;
}

const SCENE_TYPES: readonly SceneType[] = ['landmark', 'urban', 'natural', 'residential', 'interior', 'unknown'];

/**
 * Whitelist-parse a model reply into PhotoClues. Any key outside the
 * schema is dropped — including a smuggled location. Unparseable input
 * returns null (no clues), never a half-trusted object.
 */
export function parseClueReply(text: string): PhotoClues | null {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const scene = typeof raw.sceneType === 'string' && (SCENE_TYPES as readonly string[]).includes(raw.sceneType)
    ? (raw.sceneType as SceneType)
    : 'unknown';
  return {
    visibleText: cleanList(raw.visibleText),
    languages: cleanList(raw.languages),
    landmarks: cleanList(raw.landmarks),
    placeNames: cleanList(raw.placeNames),
    plateStyle: cleanText(raw.plateStyle),
    drivingSide: raw.drivingSide === 'left' || raw.drivingSide === 'right' ? raw.drivingSide : null,
    vegetationClimate: cleanText(raw.vegetationClimate),
    architecture: cleanText(raw.architecture),
    roadMarkings: cleanText(raw.roadMarkings),
    sceneType: scene,
    privateResidenceLikely: raw.privateResidenceLikely === true || scene === 'residential',
  };
}

const isReasoningModel = (model: string): boolean => /^(?:o\d|gpt-5)/i.test(model);

/**
 * The production extractor on the site's own OpenAI key. Throws on
 * transport failure — the caller degrades to EXIF-only mode rather than
 * failing the whole analysis. Never log the image or the key.
 */
export const openAiClueExtractor: ClueExtractor = async ({ imageBase64, mime }) => {
  const key = siteAiKey();
  if (!key) throw new Error('OPENAI_NOT_CONFIGURED: the site has no OpenAI key');
  const model = siteAiModel();
  const reasoning = isReasoningModel(model);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the geolocation clues from this photo as JSON.' },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${imageBase64}` } },
          ],
        },
      ],
      // Reasoning models spend completion tokens thinking first and
      // refuse temperature — the same handling as lib/camera-alerts.
      ...(reasoning
        ? { max_completion_tokens: 3000, reasoning_effort: 'low' }
        : { max_tokens: 700, temperature: 0 }),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OPENAI_${res.status}: ${detail.slice(0, 200)}`);
  }
  const body = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: unknown } }[];
  } | null;
  const content = body?.choices?.[0]?.message?.content;
  return parseClueReply(typeof content === 'string' ? content : '');
};
