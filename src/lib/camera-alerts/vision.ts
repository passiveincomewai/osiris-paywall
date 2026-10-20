/**
 * VIP camera alerts — the vision check: one still image + the member's
 * own condition words → a verdict.
 *
 * The call follows the site-key conventions of lib/oi/server-key.ts and
 * lib/ai-engine.ts: the site's OPENAI_API_KEY, the model from
 * OPENAI_MODEL or the OpenAI house default (gpt-5-mini), Chat
 * Completions with the picture as a data-URI image_url (the same wire
 * shape lib/oi/providers.ts builds). The checker depends on the
 * VisionChecker interface only — tests inject a fake; no test ever
 * spends a real AI call.
 *
 * The model is asked for strict JSON and nothing else:
 *   {"matches": true|false|null, "observation": "one short sentence"}
 * matches=null means "this image can't be judged" and maps to the
 * 'unknown' verdict, which never alerts. Anything unparseable also
 * lands on 'unknown' — a confused model must never cry wolf.
 */
import { siteAiKey, siteAiModel } from "@/lib/oi/server-key";
import type { AlertVerdict } from "./logic";

export interface VisionInput {
  /** Base64 JPEG of the camera's latest still (frameForModel's output). */
  imageBase64: string;
  mime: string;
  cameraName: string;
  /** The member's condition, verbatim: "snow on the road". */
  condition: string;
}

export interface VisionResult {
  verdict: AlertVerdict;
  /** What the model says it sees — an observation, never a certainty. */
  observation: string;
}

export type VisionChecker = (input: VisionInput) => Promise<VisionResult>;

const SYSTEM = [
  "You check one still image from a public camera against a watch condition a person wrote.",
  'Answer with ONLY a JSON object: {"matches": true, "observation": "..."} — no other text.',
  "matches is true only when the image clearly shows the condition.",
  "matches is false when the scene is readable and the condition is not there.",
  "matches is null when the image cannot be judged (too dark, blurry, blocked, not a real scene).",
  "The observation is ONE short sentence describing only what is actually visible in the image.",
].join(" ");

const isReasoningModel = (model: string): boolean => /^(?:o\d|gpt-5)/i.test(model);

/** Parse the model's reply defensively; anything off-spec is 'unknown'. */
export function parseVisionReply(text: string): VisionResult {
  const unknown: VisionResult = { verdict: "unknown", observation: "The check couldn't read the image." };
  if (!text) return unknown;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return unknown;
  let parsed: { matches?: unknown; observation?: unknown };
  try {
    parsed = JSON.parse(text.slice(start, end + 1)) as { matches?: unknown; observation?: unknown };
  } catch {
    return unknown;
  }
  const observation =
    typeof parsed.observation === "string" && parsed.observation.trim()
      ? parsed.observation.trim().slice(0, 300)
      : "The check reported no detail.";
  if (parsed.matches === true) return { verdict: "matches", observation };
  if (parsed.matches === false) return { verdict: "clear", observation };
  return { verdict: "unknown", observation };
}

/**
 * The production checker, on the site's own OpenAI key. Throws on
 * transport/config failure — the caller maps a throw to 'unknown',
 * so a dead AI path quietly skips a round instead of alerting wrong.
 */
export const openAiVisionChecker: VisionChecker = async (input) => {
  const key = siteAiKey();
  if (!key) throw new Error("OPENAI_NOT_CONFIGURED: the site has no OpenAI key");
  const model = siteAiModel();
  const reasoning = isReasoningModel(model);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Camera: ${input.cameraName}\nWatch condition: "${input.condition}"\nDoes this image show it?`,
            },
            { type: "image_url", image_url: { url: `data:${input.mime};base64,${input.imageBase64}` } },
          ],
        },
      ],
      // Reasoning models spend completion tokens thinking first and
      // refuse temperature — the same handling as lib/ai-engine.ts.
      ...(reasoning
        ? { max_completion_tokens: 3000, reasoning_effort: "low" }
        : { max_tokens: 300, temperature: 0 }),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OPENAI_${res.status}: ${detail.slice(0, 200)}`);
  }
  const body = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: unknown } }[];
  } | null;
  const content = body?.choices?.[0]?.message?.content;
  return parseVisionReply(typeof content === "string" ? content : "");
};
