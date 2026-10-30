// POST /api/transit/alert-subscriptions — subscribe an email address
// to one transit route's service-alert emails.
//
// Transit alerts are free (owner order 2026-10-29): the address gets
// alert digests for the route, the first 5 free without any account,
// uncapped once the address belongs to a WorldEye account. The cap
// and sending live in the cron runner; this route only validates and
// records the subscription. Validation is the site's shared instant
// check (lib/email/validate-email) — the same gate account signup
// runs — so a junk address never becomes a subscription. One
// subscription per (email, agency, route); re-subscribing an active
// address is a no-op success, and re-subscribing after an unsubscribe
// reactivates the row (its sent-count history is kept, so the free
// tier can't be reset by unsubscribing).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateEmailAddress } from "@/lib/email/validate-email";
import { isRateLimited, clientIp } from "@/lib/password-auth";

export const runtime = "nodejs";

/** Agencies with a live alert-email upstream (MBTA v3 today). */
const SUPPORTED_AGENCIES = new Set(["mbta"]);

const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(req: Request) {
  if (isRateLimited(`transit-alert-sub:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests from this network. Try again in a bit." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const agency = String(body.agency ?? "");
  const routeId = String(body.routeId ?? "").trim();
  const routeSlug = String(body.routeSlug ?? "").trim();
  const routeName = String(body.routeName ?? "").trim().slice(0, 80);

  if (!SUPPORTED_AGENCIES.has(agency)) {
    return NextResponse.json(
      { error: "Email alerts are available for MBTA routes right now." },
      { status: 400 },
    );
  }
  if (
    !routeId ||
    routeId.length > 64 ||
    !SLUG_SHAPE.test(routeSlug) ||
    routeSlug.length > 128
  ) {
    return NextResponse.json(
      { error: "That route doesn't look right — reload the page and try again." },
      { status: 400 },
    );
  }

  const validation = await validateEmailAddress(body.email, {
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
  const email = validation.email;

  const existing = await db.transitAlertSubscription.findUnique({
    where: { email_agency_routeId: { email, agency, routeId } },
  });
  if (existing) {
    if (existing.status !== "active") {
      await db.transitAlertSubscription.update({
        where: { id: existing.id },
        data: { status: "active", routeSlug, routeName: routeName || existing.routeName },
      });
      return NextResponse.json({ ok: true, resubscribed: true });
    }
    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  await db.transitAlertSubscription.create({
    data: {
      email,
      agency,
      routeId,
      routeSlug,
      routeName: routeName || routeId,
    },
  });
  return NextResponse.json({ ok: true });
}
