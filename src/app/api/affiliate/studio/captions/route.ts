// POST /api/affiliate/studio/captions — deterministic caption generation
// (no AI), with optional save of one variant as a StudioCreation.
// Body: { platform, style, feature, save?, saveIndex? }.
// The generator itself is strict-typed; this route normalizes the display
// labels the Studio UI sends ("Instagram", "Direct response", "Live
// globe", "Weather & quakes", "OSINT toolkit") onto the union keys before
// validating — anything unrecognized is a 400.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildStudioContext } from "@/lib/studio/context";
import {
  CAPTION_FEATURES,
  CAPTION_PLATFORMS,
  CAPTION_STYLES,
  generateCaptions,
  type CaptionRequest,
} from "@/lib/studio/captions";
import { computeRenderHash } from "@/lib/studio/render";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

type Platform = CaptionRequest["platform"];
type Style = CaptionRequest["style"];
type Feature = CaptionRequest["feature"];

const PLATFORM_ALIASES: Record<string, Platform> = {
  instagram: "instagram",
  tiktok: "tiktok",
  "tik tok": "tiktok",
  x: "x",
  twitter: "x",
  facebook: "facebook",
  youtube: "youtube",
  linkedin: "linkedin",
  pinterest: "pinterest",
};

const STYLE_ALIASES: Record<string, Style> = {
  viral: "viral",
  professional: "professional",
  funny: "funny",
  educational: "educational",
  storytelling: "storytelling",
  curiosity: "curiosity",
  direct: "direct",
  "direct response": "direct",
};

const FEATURE_ALIASES: Record<string, Feature> = {
  globe: "globe",
  "live globe": "globe",
  cameras: "cameras",
  recording: "recording",
  flights: "flights",
  weather: "weather",
  "weather & quakes": "weather",
  "weather and quakes": "weather",
  osint: "osint",
  "osint toolkit": "osint",
  premium: "premium",
};

function normalizeToken(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

export async function POST(req: Request) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    platform?: unknown;
    style?: unknown;
    feature?: unknown;
    save?: unknown;
    saveIndex?: unknown;
  };

  const platform = PLATFORM_ALIASES[normalizeToken(body.platform)];
  if (!platform) {
    return NextResponse.json(
      { error: `platform must be one of ${CAPTION_PLATFORMS.join(", ")}` },
      { status: 400 },
    );
  }
  const style = STYLE_ALIASES[normalizeToken(body.style)];
  if (!style) {
    return NextResponse.json(
      { error: `style must be one of ${CAPTION_STYLES.join(", ")}` },
      { status: 400 },
    );
  }
  const feature = FEATURE_ALIASES[normalizeToken(body.feature)];
  if (!feature) {
    return NextResponse.json(
      { error: `feature must be one of ${CAPTION_FEATURES.join(", ")}` },
      { status: 400 },
    );
  }

  const ctx = await buildStudioContext(profile);
  const captions = generateCaptions(ctx, { platform, style, feature });

  let savedId: string | undefined;
  if (body.save === true) {
    let saveIndex = 0;
    if (body.saveIndex !== undefined) {
      if (
        typeof body.saveIndex !== "number" ||
        !Number.isInteger(body.saveIndex) ||
        body.saveIndex < 0 ||
        body.saveIndex >= captions.length
      ) {
        return NextResponse.json(
          { error: `saveIndex must be an integer between 0 and ${captions.length - 1}` },
          { status: 400 },
        );
      }
      saveIndex = body.saveIndex;
    }
    const text = captions[saveIndex]!;
    const row = await db.studioCreation.create({
      data: {
        affiliateProfileId: profile.id,
        templateId: null,
        title: `Caption — ${platform}/${feature}`,
        kind: "caption",
        params: { text, platform, style, feature },
        renderHash: computeRenderHash("caption", { text }, ctx.code),
      },
    });
    savedId = row.id;
  }

  return NextResponse.json(savedId ? { captions, savedId } : { captions });
}
