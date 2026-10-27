import { NextResponse } from "next/server";
import { loadCatalogue } from "@/lib/ambient/catalogue";
import { selectAmbientScenes } from "@/lib/ambient/feed";
import { isMoodSlug, MOODS, type MoodSlug } from "@/lib/ambient/moods";
import { SKI_TOWNS } from "@/lib/ambient/ski-towns";

/**
 * GET /api/ambient/feed?mood=<slug>&count=<n>
 *
 * One mood's shuffled Ambient playlist. The response carries each
 * camera's SOURCE stream URL (resolved by lib/camera-preview, the
 * viewer's own resolver): the /ambient player loads HLS directly
 * from the third-party source in the browser, so playback costs
 * WorldEye no streaming bandwidth — this route only ever serves the
 * small JSON playlist.
 *
 * Moods are curated scene collections derived from catalogue
 * metadata (see lib/ambient/moods for the honest derivation rules);
 * night-views is computed from coordinates + the solar position.
 * Random per call; short CDN cache so a burst of viewers shares one
 * catalogue scan without freezing the shuffle for long.
 */
export const maxDuration = 60;

const DEFAULT_COUNT = 24;
const MAX_COUNT = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const moodParam = url.searchParams.get("mood");
  const mood: MoodSlug = isMoodSlug(moodParam) ? moodParam : "all";
  const countRaw = Number(url.searchParams.get("count"));
  const count =
    Number.isFinite(countRaw) && countRaw > 0
      ? Math.min(MAX_COUNT, Math.floor(countRaw))
      : DEFAULT_COUNT;

  const cameras = await loadCatalogue();
  const scenes = selectAmbientScenes({
    cameras,
    mood,
    count,
    ctx: { skiTowns: SKI_TOWNS, now: new Date() },
  });

  return NextResponse.json(
    {
      mood,
      moods: MOODS.map((m) => ({ slug: m.slug, label: m.label })),
      cameras: scenes,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}
