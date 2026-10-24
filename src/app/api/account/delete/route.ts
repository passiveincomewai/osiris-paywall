// /api/account/delete — schedule / inspect / cancel account deletion.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cancelDeletion, requestDeletion } from "@/lib/account/deletion";

export const runtime = "nodejs";

async function requireUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { deletionRequestedAt: true, deletionScheduledFor: true },
  });
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { status: true, cancelAtPeriodEnd: true, currentPeriodEnd: true },
  });
  return NextResponse.json({
    requestedAt: user?.deletionRequestedAt?.toISOString() ?? null,
    scheduledFor: user?.deletionScheduledFor?.toISOString() ?? null,
    subscription: subscription
      ? {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        }
      : null,
  });
}

export async function POST() {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const r = await requestDeletion(userId);
  return NextResponse.json({
    requestedAt: r.deletionRequestedAt?.toISOString() ?? null,
    scheduledFor: r.deletionScheduledFor?.toISOString() ?? null,
    message:
      `Your account is scheduled for deletion on ${r.deletionScheduledFor?.toLocaleDateString("en-US", { dateStyle: "long" })}. ` +
      "You can cancel any time before then, right here." +
      (r.subscriptionNote ? ` ${r.subscriptionNote}` : ""),
  });
}

export async function DELETE() {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  await cancelDeletion(userId);
  return NextResponse.json({ ok: true });
}
