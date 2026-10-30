// /api/ski/trip-reminders — ski trip booking reminders (P9a).
//
// A signed-in user picks a resort from the live ski directory, trip
// dates and an email address; the cron runner emails two book-ahead
// nudges (45 days and 14 days before arrival). Reminders only — no
// booking engine, no affiliate links, no prices.
//
//   GET    → the caller's account email + their reminders
//   POST   → create (or reactivate) a reminder
//   DELETE → delete one of the caller's reminders (?id=…)
//
// Validation: the resort must exist in the directory and have its own
// page (folded resorts 404 there, so they are refused here too); the
// dates go through the shared pure checks in lib/ski/trip-reminders
// (past dates rejected plainly); a non-account email goes through the
// site's shared instant validator, the same gate signup runs.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { validateEmailAddress } from "@/lib/email/validate-email";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import { getSkiResort } from "@/lib/ski-resorts";
import { isFoldedResort } from "@/lib/indexation-gates";
import { isValidTripDate, tripDateError } from "@/lib/ski/trip-reminders";

export const runtime = "nodejs";

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

async function requireUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireUser();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const rows = await db.skiTripReminder.findMany({
    where: { userId },
    orderBy: { tripStart: "asc" },
  });
  return NextResponse.json({
    email: user?.email ?? null,
    reminders: rows.map((r) => ({
      id: r.id,
      resortSlug: r.resortSlug,
      resortName: r.resortName,
      email: r.email,
      tripStart: dateOnly(r.tripStart),
      tripEnd: r.tripEnd ? dateOnly(r.tripEnd) : null,
      status: r.status,
      sent45: r.sent45At !== null,
      sent14: r.sent14At !== null,
    })),
  });
}

export async function POST(req: Request) {
  const userId = await requireUser();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (isRateLimited(`ski-reminder:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests from this network. Try again in a bit." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const resortSlug = String(body.resortSlug ?? "").trim();
  const resort = getSkiResort(resortSlug);
  if (!resort || isFoldedResort(resort.slug)) {
    return NextResponse.json(
      { error: "That resort isn't in the ski directory — pick one from the list." },
      { status: 400 },
    );
  }

  const dateError = tripDateError({
    tripStart: body.tripStart,
    tripEnd: body.tripEnd,
    now: new Date(),
  });
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
  }
  const tripStart = body.tripStart as string;
  const tripEnd =
    typeof body.tripEnd === "string" && body.tripEnd ? body.tripEnd : null;
  if (tripEnd !== null && !isValidTripDate(tripEnd)) {
    return NextResponse.json(
      { error: "The departure day needs to be a real calendar date." },
      { status: 400 },
    );
  }

  // Email: the account address by default; anything else must pass
  // the shared validator (typo suggestion + confirm, never a rewrite).
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const accountEmail = (user?.email ?? "").trim().toLowerCase();
  const requested = String(body.email ?? "").trim().toLowerCase();
  let email = accountEmail;
  if (requested && requested !== accountEmail) {
    const validation = await validateEmailAddress(requested, {
      confirmed: body.confirmed === true,
    });
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: validation.message,
          code: validation.code,
          ...(validation.suggestion ? { suggestion: validation.suggestion } : {}),
        },
        { status: validation.retryable ? 503 : 400 },
      );
    }
    email = validation.email;
  }
  if (!email) {
    return NextResponse.json(
      { error: "Your account has no email address to send reminders to." },
      { status: 400 },
    );
  }

  const start = utcMidnight(tripStart);
  const existing = await db.skiTripReminder.findUnique({
    where: {
      userId_resortSlug_tripStart: { userId, resortSlug: resort.slug, tripStart: start },
    },
  });
  if (existing) {
    if (existing.status !== "active") {
      await db.skiTripReminder.update({
        where: { id: existing.id },
        data: {
          status: "active",
          email,
          resortName: resort.name,
          tripEnd: tripEnd ? utcMidnight(tripEnd) : null,
        },
      });
      return NextResponse.json({ ok: true, resubscribed: true, id: existing.id });
    }
    return NextResponse.json({ ok: true, alreadyExists: true, id: existing.id });
  }

  const created = await db.skiTripReminder.create({
    data: {
      userId,
      email,
      resortSlug: resort.slug,
      resortName: resort.name,
      tripStart: start,
      tripEnd: tripEnd ? utcMidnight(tripEnd) : null,
    },
  });
  return NextResponse.json({ ok: true, id: created.id });
}

export async function DELETE(req: Request) {
  const userId = await requireUser();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing reminder id" }, { status: 400 });
  }
  const row = await db.skiTripReminder.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }
  await db.skiTripReminder.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
