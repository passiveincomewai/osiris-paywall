// Creator free-Pro applications.
// POST /api/affiliate/creator-apply — submit (or update) an application.
// GET  /api/affiliate/creator-apply — the caller's latest application.
// Follower counts are stored as claimed; verification happens at admin
// review (src/app/api/admin/creators/[id]). Approval grants comp Pro via
// src/lib/pro/comp.ts.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/password-auth";
import { validateCreatorApplication } from "@/lib/pro/creator";

export const runtime = "nodejs";

function serialize(app: {
  id: string; platform: string; handle: string; profileUrl: string;
  followers: number; status: string; createdAt: Date; reviewedAt: Date | null;
}) {
  return {
    id: app.id,
    platform: app.platform,
    handle: app.handle,
    profileUrl: app.profileUrl,
    followers: app.followers,
    status: app.status,
    createdAt: app.createdAt.toISOString(),
    reviewedAt: app.reviewedAt?.toISOString() ?? null,
  };
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const app = await db.creatorApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ application: app ? serialize(app) : null });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  if (isRateLimited(`creator-apply:${userId}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts — try again later" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const v = validateCreatorApplication(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  // One pending application per user: a re-submit edits the pending one
  // instead of stacking duplicates in the admin queue.
  const pending = await db.creatorApplication.findFirst({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  const app = pending
    ? await db.creatorApplication.update({ where: { id: pending.id }, data: v.value })
    : await db.creatorApplication.create({ data: { userId, ...v.value } });

  return NextResponse.json({ application: serialize(app), updated: !!pending });
}
