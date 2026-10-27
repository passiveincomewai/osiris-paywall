import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loadCatalogue } from "@/lib/ambient/catalogue";
import { selectAmbientScenes } from "@/lib/ambient/feed";
import { SKI_TOWNS } from "@/lib/ambient/ski-towns";
import {
  decryptStreamKey,
  relayTokenMatches,
} from "@/lib/ambient/stream-key-crypto";
import { isFeedEligible } from "@/lib/enterprise/rights";

/**
 * GET /api/ambient/relay/playlist — the relay program's one call.
 *
 * Auth: `Authorization: Bearer <relay token>` (the token the member
 * was shown once in /ambient/stream settings; only its SHA-256 hash
 * is stored). Returns the member's decrypted YouTube stream key and
 * a shuffled playlist of cameras the relay may restream.
 *
 * ELIGIBILITY IS THE WHOLE POINT: a camera enters this playlist only
 * if the enterprise rights registry (lib/enterprise/rights) marks its
 * source cleared for redistribution. Windy and every ineligible or
 * unreviewed source are excluded by that registry's default-deny —
 * restreaming to a public YouTube channel is redistribution in a way
 * embedding a preview on worldeye.app is not, so the relay pool is
 * the cleared pool only. Video kinds only (ffmpeg pulls streams, not
 * stills).
 */
export const maxDuration = 60;

export async function GET(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Relay token required" }, { status: 401 });
  }
  // Tokens are random 24-byte hex; the hash lookup scans candidates
  // by prefix-free comparison — with one row per user the table is
  // small, and matches are verified timing-safely per row.
  const rows = await db.ambientStreamKey.findMany({
    select: { id: true, relayTokenHash: true, keyCiphertext: true },
  });
  const row = rows.find((r) => relayTokenMatches(token, r.relayTokenHash));
  if (!row) {
    return NextResponse.json({ error: "Invalid relay token" }, { status: 401 });
  }

  let youtubeStreamKey: string;
  try {
    youtubeStreamKey = decryptStreamKey(row.keyCiphertext);
  } catch {
    return NextResponse.json(
      { error: "Stored stream key cannot be decrypted — save it again" },
      { status: 500 },
    );
  }

  const catalogue = await loadCatalogue();
  const eligible = catalogue.filter((c) => isFeedEligible(c));
  const scenes = selectAmbientScenes({
    cameras: eligible,
    mood: "all",
    count: 50,
    ctx: { skiTowns: SKI_TOWNS, now: new Date() },
    videoOnly: true,
  });

  return NextResponse.json(
    {
      stream: {
        rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
        key: youtubeStreamKey,
      },
      overlay: "Live on WorldEye · worldeye.app/ambient",
      cameras: scenes.map((s) => ({
        name: s.name,
        city: s.city,
        country: s.country,
        url: s.streamUrl,
        kind: s.streamType,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
