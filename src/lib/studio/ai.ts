// ── Studio AI (Phase 3): Cosmo-fulfilled generation jobs ─────────────────
// There is deliberately NO synchronous AI API behind the Studio's AI
// suite. Affiliates submit a request, credits are charged up front (the
// Phase 2 charge invariants), and the job waits in a queue. Cosmo —
// WorldEye's AI agent, running outside the app — fulfills queued jobs
// through the token-guarded internal endpoints and the result lands back
// on the job + a StudioCreation in the affiliate's My Creations.
//
// Honesty rules baked in here:
//  - The UI copy says "made to order by Cosmo", never "instant AI".
//  - A job still queued after AI_JOB_STALE_MS auto-refunds.
//  - No paid AI provider is ever called from this codebase.
import { db } from "@/lib/db";
import {
  AI_KINDS,
  AI_KIND_META,
  AI_PLATFORMS,
  isAiKind,
  type AiKind,
  type AiPlatform,
  type StudioCreditConfig,
} from "./credits-config";

export { AI_PLATFORMS, AI_TONES } from "./credits-config";
export type { AiPlatform } from "./credits-config";
import {
  settleGenerationJob,
  type GenerationJobRow,
} from "./credits";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

// ── Constants ─────────────────────────────────────────────────────────────

/** A queued AI job that nobody fulfilled within 7 days auto-refunds. */
export const AI_JOB_STALE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Stored AI images are capped at ≈2.5MB. The fulfiller should downscale
 * to ≤1600px on the long edge and prefer JPEG (q≈80) or WebP before
 * uploading — a 1600px JPEG of marketing art lands well under the cap.
 * Postgres bytes at this size avoid needing blob storage for Phase 3.
 */
export const AI_IMAGE_MAX_BYTES = 2_500_000;

/** Max length of a stored text result. */
export const AI_RESULT_TEXT_MAX = 20_000;

// ── Pure: request validation + the fulfillment spec ───────────────────────

export interface AiRequestInput {
  subject: string;
  platform: string;
  tone?: string;
}

export interface AiJobParams {
  subject: string;
  platform: AiPlatform;
  tone: string;
  deliverable: string;
  resultType: "text" | "image";
  referralLink: string;
  discountCode: string | null;
  spec: string;
}

const SUBJECT_MAX = 500;
const TONE_MAX = 80;

/**
 * The instruction block Cosmo fulfills against. It travels inside the
 * job params so the queue is self-describing: whoever (or whatever)
 * picks the job up knows exactly what "done" means, including the
 * standing house rules — verified claims only (74,229 cameras), and
 * for Instagram captions the CTA-at-top + exactly-5-hashtags rule.
 */
function buildSpec(
  kind: AiKind,
  input: { subject: string; platform: AiPlatform; tone: string },
  referralLink: string,
  discountCode: string | null,
): string {
  const meta = AI_KIND_META[kind];
  const lines = [
    `You are Cosmo, WorldEye's AI, fulfilling a made-to-order content request for a WorldEye affiliate.`,
    `Deliverable: ${meta.deliverable}.`,
    `Platform: ${input.platform}. Tone: ${input.tone}.`,
    `Subject from the affiliate: ${input.subject}`,
    `The affiliate's referral link is ${referralLink} — include it exactly, never shorten or alter it.`,
    discountCode
      ? `The affiliate's discount code is ${discountCode} — it is real and Stripe-confirmed; you may mention it.`
      : `The affiliate has no discount code — do NOT invent one or promise any discount.`,
    `Only use verified WorldEye claims: 74,229 live public cameras on one 3D globe, live flights, satellites, weather radar, earthquakes and wildfires, free to explore at worldeye.app. Never state a different camera count.`,
    `Include a plain affiliate disclosure (e.g. "I may earn a commission if you subscribe through my link") where the format calls for one.`,
  ];
  if (kind === "ai_caption" && input.platform === "Instagram") {
    lines.push(
      `INSTAGRAM HOUSE RULE (mandatory): every caption opens with the call-to-action including the referral link at the very TOP, then the body, then the disclosure as plain text, then EXACTLY 5 hashtags — no more, no fewer.`,
    );
  }
  if (kind === "ai_hooks") {
    lines.push(`Return exactly 10 hooks, one per line, each under 12 words, no numbering.`);
  }
  if (kind === "ai_script") {
    lines.push(
      `Format: HOOK (0-3s), then timed beats with on-screen text and spoken line for each, then the closing CTA (last 3s) showing the referral link. Total runtime 30 seconds.`,
    );
  }
  if (kind === "ai_video_ideas") {
    lines.push(`Return exactly 5 concepts, each with: title, opening hook, a 3-5 shot outline, and the CTA.`);
  }
  if (kind === "ai_caption") {
    lines.push(`Return exactly 5 captions, separated by a line containing only ---.`);
  }
  if (meta.result === "image") {
    lines.push(
      `Deliver ONE image via resultImageBase64 (≤1600px long edge, JPEG or WebP preferred, under 2.5MB). No text baked into the image may include the referral URL — URLs are never rendered inside images.`,
    );
    if (kind === "ai_background") {
      lines.push(`The background must contain NO text, NO logos, and leave calm negative space for text overlays.`);
    }
  }
  return lines.join("\n");
}

export function buildAiJobParams(
  kind: AiKind,
  input: AiRequestInput,
  ctx: { referralLink: string; discountCode: string | null },
): { ok: true; params: AiJobParams } | { ok: false; error: string } {
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  if (!subject) return { ok: false, error: "subject is required" };
  if (subject.length > SUBJECT_MAX) {
    return { ok: false, error: `subject must be ${SUBJECT_MAX} characters or fewer` };
  }
  if (!(AI_PLATFORMS as readonly string[]).includes(input.platform)) {
    return { ok: false, error: `platform must be one of ${AI_PLATFORMS.join(", ")}` };
  }
  const platform = input.platform as AiPlatform;
  const tone =
    typeof input.tone === "string" && input.tone.trim()
      ? input.tone.trim().slice(0, TONE_MAX)
      : "Bold & punchy";
  const meta = AI_KIND_META[kind];
  return {
    ok: true,
    params: {
      subject,
      platform,
      tone,
      deliverable: meta.deliverable,
      resultType: meta.result,
      referralLink: ctx.referralLink,
      discountCode: ctx.discountCode,
      spec: buildSpec(kind, { subject, platform, tone }, ctx.referralLink, ctx.discountCode),
    },
  };
}

// ── Pure: monthly AI usage + budget/cap decisions ─────────────────────────

/**
 * Net AI credits charged in the calendar month of `now`: jobs created
 * this month whose charge was not given back (refunded/failed jobs free
 * their capacity — the work never happened).
 */
export function sumAiMonthCredits(
  jobs: { kind: string; creditCost: number; status: string; createdAt: Date }[],
  now: Date,
): number {
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const nextMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  let total = 0;
  for (const job of jobs) {
    if (!isAiKind(job.kind)) continue;
    if (job.status === "refunded" || job.status === "failed") continue;
    const t = job.createdAt.getTime();
    if (t >= monthStart && t < nextMonthStart) total += job.creditCost;
  }
  return total;
}

export type AiChargeCheck =
  | { ok: true }
  | { ok: false; error: "ai_budget_exhausted" | "ai_user_cap" };

/**
 * Pure gate for a new AI charge. Global budget first (Cosmo's monthly
 * capacity, in USD at the credit anchor), then the per-user cap.
 * Charges landing exactly ON the budget/cap are allowed (≤, not <).
 * Money comparison is done in integer cents to avoid float drift.
 */
export function evaluateAiCharge(args: {
  globalMonthCredits: number;
  userMonthCredits: number;
  cost: number;
  config: StudioCreditConfig;
}): AiChargeCheck {
  const { globalMonthCredits, userMonthCredits, cost, config } = args;
  const projectedUsdCents = Math.round((globalMonthCredits + cost) * config.creditUsd * 100);
  const budgetCents = Math.round(config.monthlyAiBudgetUsd * 100);
  if (projectedUsdCents > budgetCents) {
    return { ok: false, error: "ai_budget_exhausted" };
  }
  if (userMonthCredits + cost > config.aiUserMonthlyCapCredits) {
    return { ok: false, error: "ai_user_cap" };
  }
  return { ok: true };
}

// ── Pure: staleness ───────────────────────────────────────────────────────

/** A job is stale only while still queued — done/refunded jobs are final. */
export function isStaleAiJob(
  job: { status: string; createdAt: Date },
  now: Date,
): boolean {
  return job.status === "queued" && now.getTime() - job.createdAt.getTime() > AI_JOB_STALE_MS;
}

// ── Pure: internal-endpoint bearer guard ──────────────────────────────────

/**
 * Bearer check for the Cosmo fulfillment endpoints, mirroring the growth
 * analytics pattern: no configured secret ⇒ the endpoints act as if they
 * do not exist (the routes return 404 before ever calling this).
 */
export function bearerMatches(secret: string | undefined, header: string | null): boolean {
  if (!secret) return false;
  return header === `Bearer ${secret}`;
}

export function studioAiConfigured(): boolean {
  return !!process.env.STUDIO_AI_SECRET;
}

export function verifyStudioAiBearer(req: Request): boolean {
  return bearerMatches(process.env.STUDIO_AI_SECRET, req.headers.get("authorization"));
}

// ── Pure: image sniffing ──────────────────────────────────────────────────

/** Detect the image format from magic bytes; never trust a claimed mime. */
export function sniffImageMime(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

// ── DB: monthly usage ─────────────────────────────────────────────────────

export interface AiMonthUsage {
  globalCredits: number;
  userCredits: number;
}

export async function getAiMonthUsage(
  profileId: string | null,
  now: Date = new Date(),
): Promise<AiMonthUsage> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const jobs = (await dbAny.generationJob.findMany({
    where: {
      kind: { in: [...AI_KINDS] },
      createdAt: { gte: monthStart, lt: nextMonthStart },
    },
    select: { kind: true, creditCost: true, status: true, createdAt: true, profileId: true },
  })) as (GenerationJobRow & { profileId: string })[];
  return {
    globalCredits: sumAiMonthCredits(jobs, now),
    userCredits:
      profileId === null
        ? 0
        : sumAiMonthCredits(jobs.filter((j) => j.profileId === profileId), now),
  };
}

// ── DB: the fulfillment queue ─────────────────────────────────────────────

export async function listQueuedAiJobs(limit = 20): Promise<GenerationJobRow[]> {
  return (await dbAny.generationJob.findMany({
    where: { status: "queued", kind: { in: [...AI_KINDS] } },
    orderBy: { createdAt: "asc" },
    take: limit,
  })) as GenerationJobRow[];
}

// ── DB: stale-job expiry (auto-refund) ────────────────────────────────────

export const AI_EXPIRED_ERROR =
  "Not fulfilled within 7 days — credits automatically refunded.";

/**
 * Refund every AI job that has been queued longer than AI_JOB_STALE_MS.
 * Scoped to one profile when profileId is given (called on the jobs list
 * path), global when null (called by the internal queue endpoint).
 * Returns how many jobs were expired. Safe to call often: settled jobs
 * are terminal and settle is a noop for them.
 */
export async function expireStaleAiJobs(
  profileId: string | null,
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - AI_JOB_STALE_MS);
  const stale = (await dbAny.generationJob.findMany({
    where: {
      status: "queued",
      kind: { in: [...AI_KINDS] },
      createdAt: { lt: cutoff },
      ...(profileId ? { profileId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  })) as GenerationJobRow[];
  let expired = 0;
  for (const job of stale) {
    const settled = await settleGenerationJob({
      profileId: job.profileId,
      jobId: job.id,
      outcome: "failed",
      error: AI_EXPIRED_ERROR,
    });
    if (settled && settled.status === "refunded") expired += 1;
  }
  return expired;
}

// ── DB: completion (Cosmo delivers a result) ──────────────────────────────

export type CompleteAiJobResult =
  | { ok: true; status: "done"; creationId: string }
  | { ok: true; status: "already_done"; creationId: string | null }
  | { ok: false; error: string; httpStatus: number };

function creationTitleFor(job: GenerationJobRow): string {
  const params = (job.params ?? {}) as { subject?: unknown };
  const subject = typeof params.subject === "string" ? params.subject : "";
  const label = isAiKind(job.kind) ? AI_KIND_META[job.kind].label : "AI creation";
  return (subject ? `${label} — ${subject}` : label).slice(0, 120);
}

/**
 * Mark a queued AI job done and land its result in the affiliate's My
 * Creations (StudioCreation.paidJobId points back at the job). Text
 * kinds require resultText; image kinds require a real image payload
 * (magic-byte sniffed, size-capped). Completing an already-done job is
 * an idempotent success so the fulfiller can safely retry deliveries.
 */
export async function completeAiJob(args: {
  jobId: string;
  resultText?: string;
  resultImage?: Buffer;
}): Promise<CompleteAiJobResult> {
  const job = (await dbAny.generationJob.findUnique({
    where: { id: args.jobId },
  })) as GenerationJobRow | null;
  if (!job) return { ok: false, error: "job_not_found", httpStatus: 404 };
  if (!isAiKind(job.kind)) return { ok: false, error: "not_an_ai_job", httpStatus: 400 };

  if (job.status === "done") {
    const existing = (await dbAny.studioCreation.findFirst({
      where: { paidJobId: job.id },
      select: { id: true },
    })) as { id: string } | null;
    return { ok: true, status: "already_done", creationId: existing?.id ?? null };
  }
  if (job.status !== "queued") {
    return { ok: false, error: "job_not_queued", httpStatus: 409 };
  }

  const meta = AI_KIND_META[job.kind];
  const resultText =
    typeof args.resultText === "string" ? args.resultText.trim() : "";
  let imageBytes: Buffer | null = null;
  let imageMime: string | null = null;

  if (meta.result === "text") {
    if (!resultText) return { ok: false, error: "result_text_required", httpStatus: 400 };
    if (resultText.length > AI_RESULT_TEXT_MAX) {
      return { ok: false, error: "result_text_too_large", httpStatus: 413 };
    }
  } else {
    if (!args.resultImage || args.resultImage.length === 0) {
      return { ok: false, error: "result_image_required", httpStatus: 400 };
    }
    if (args.resultImage.length > AI_IMAGE_MAX_BYTES) {
      return { ok: false, error: "result_image_too_large", httpStatus: 413 };
    }
    imageMime = sniffImageMime(args.resultImage);
    if (!imageMime) return { ok: false, error: "result_image_not_an_image", httpStatus: 400 };
    imageBytes = args.resultImage;
    if (resultText.length > AI_RESULT_TEXT_MAX) {
      return { ok: false, error: "result_text_too_large", httpStatus: 413 };
    }
  }

  const now = new Date();
  const creation = (await dbAny.$transaction(async (tx: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationJob: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    studioCreation: any;
  }) => {
    await tx.generationJob.update({
      where: { id: job.id },
      data: { status: "done", completedAt: now, resultText: resultText || job.resultText },
    });
    return tx.studioCreation.create({
      data: {
        affiliateProfileId: job.profileId,
        templateId: null,
        title: creationTitleFor(job),
        kind: job.kind,
        params: job.params ?? {},
        renderHash: `ai-job:${job.id}`,
        paidJobId: job.id,
        resultText: resultText || null,
        resultImageBytes: imageBytes,
        resultImageMime: imageMime,
      },
    });
  })) as { id: string };

  return { ok: true, status: "done", creationId: creation.id };
}

// ── DB: admin stats ───────────────────────────────────────────────────────

export interface AiAdminStats {
  monthKey: string;
  monthAiCredits: number;
  monthAiUsd: number;
  budgetUsd: number;
  budgetUsedPct: number;
  userCapCredits: number;
  queueDepth: number;
  oldestQueuedAt: string | null;
  oldestQueuedAgeHours: number | null;
}

export async function getAiAdminStats(
  config: StudioCreditConfig,
  now: Date = new Date(),
): Promise<AiAdminStats> {
  const usage = await getAiMonthUsage(null, now);
  const queued = (await dbAny.generationJob.findMany({
    where: { status: "queued", kind: { in: [...AI_KINDS] } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  })) as { createdAt: Date }[];
  const oldest = queued[0]?.createdAt ?? null;
  const monthAiUsd = usage.globalCredits * config.creditUsd;
  return {
    monthKey: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
    monthAiCredits: usage.globalCredits,
    monthAiUsd,
    budgetUsd: config.monthlyAiBudgetUsd,
    budgetUsedPct:
      config.monthlyAiBudgetUsd > 0
        ? Math.min(100, Math.round((monthAiUsd / config.monthlyAiBudgetUsd) * 1000) / 10)
        : 0,
    userCapCredits: config.aiUserMonthlyCapCredits,
    queueDepth: queued.length,
    oldestQueuedAt: oldest ? oldest.toISOString() : null,
    oldestQueuedAgeHours: oldest
      ? Math.round(((now.getTime() - oldest.getTime()) / 3_600_000) * 10) / 10
      : null,
  };
}
