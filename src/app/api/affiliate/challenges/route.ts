// GET /api/affiliate/challenges — live challenges + progress.
// POST /api/affiliate/challenges — complete a tutorial-type challenge.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshChallengeProgress, completeTutorialChallenge } from "@/lib/affiliate/challenges";
import { requireAffiliate, activeOnly } from "../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const now = new Date();
  const challenges = await db.challenge.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: [{ kind: "asc" }, { endsAt: "asc" }],
    include: { progress: { where: { affiliateProfileId: profile.id } } },
  });
  return NextResponse.json({
    challenges: challenges.map((c) => ({
      id: c.id, slug: c.slug, kind: c.kind, title: c.title, description: c.description,
      xpReward: c.xpReward, metric: c.metric, target: c.target, endsAt: c.endsAt,
      progress: c.progress[0]?.progress ?? 0, completedAt: c.progress[0]?.completedAt ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const blocked = activeOnly(profile);
  if (blocked) return blocked;
  // Refresh metric-based progress first so the UI is current.
  await refreshChallengeProgress(profile.id).catch(() => {});
  const { challengeId } = (await req.json().catch(() => ({}))) as { challengeId?: string };
  if (!challengeId) return NextResponse.json({ error: "challengeId required" }, { status: 400 });
  const ok = await completeTutorialChallenge(profile.id, challengeId);
  return NextResponse.json({ completed: ok });
}
