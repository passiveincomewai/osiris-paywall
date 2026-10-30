import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveSkiAccess } from "@/lib/ski/access-server";
import {
  InvalidResortSlugError,
  followResort,
  listFollowedSlugs,
  unfollowResort,
} from "@/lib/ski/follows";

export const runtime = "nodejs";

/**
 * Powder Pass favourite resorts.
 *
 *   GET    /api/ski/follows                  → { follows: string[] }
 *   POST   /api/ski/follows { resortSlug }   → follow (idempotent)
 *   DELETE /api/ski/follows { resortSlug }   → unfollow (idempotent)
 *
 * Every verb requires a signed-in session (401 without one) AND ski
 * access — a Powder Pass subscription or VIP (403 without it, resolved
 * through lib/ski/access-server, the same resolver every ski API
 * uses). Slugs are validated against SKI_RESORTS in lib/ski/follows;
 * an unknown slug is a 400, never a stored row.
 */
async function gate(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "signin_required", message: "Sign in to manage your followed resorts." },
        { status: 401 },
      ),
    };
  }
  const hasAccess = await resolveSkiAccess(userId).catch(() => false);
  if (!hasAccess) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "powder_pass_required",
          message:
            "Following resorts is a Powder Pass feature — Powder Pass members and VIP Pro annual members can follow resorts.",
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true, userId };
}

function invalidSlug(err: unknown): NextResponse {
  return NextResponse.json(
    { error: "invalid_resort_slug", message: (err as Error).message },
    { status: 400 },
  );
}

export async function GET() {
  const g = await gate();
  if (!g.ok) return g.response;
  const follows = await listFollowedSlugs(g.userId);
  return NextResponse.json({ follows });
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if (!g.ok) return g.response;
  const body = await req.json().catch(() => ({}));
  try {
    const row = await followResort(g.userId, body?.resortSlug);
    return NextResponse.json({ following: true, resortSlug: row.resortSlug });
  } catch (err) {
    if (err instanceof InvalidResortSlugError) return invalidSlug(err);
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const g = await gate();
  if (!g.ok) return g.response;
  const body = await req.json().catch(() => ({}));
  try {
    await unfollowResort(g.userId, body?.resortSlug);
    return NextResponse.json({ following: false, resortSlug: body?.resortSlug });
  } catch (err) {
    if (err instanceof InvalidResortSlugError) return invalidSlug(err);
    throw err;
  }
}
