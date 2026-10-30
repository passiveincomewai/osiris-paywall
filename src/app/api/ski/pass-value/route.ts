import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveSkiAccess } from "@/lib/ski/access-server";
import {
  PassValueValidationError,
  formatSkiedOn,
  getPassValueState,
  logPassDay,
  removePassDay,
  upsertPassSeason,
  type PassValueState,
} from "@/lib/ski/pass-value";

export const runtime = "nodejs";

/**
 * Powder Pass — pass-value tracker (feature #8).
 *
 *   GET    /api/ski/pass-value                     → { season, days, summary }
 *   POST   /api/ski/pass-value { kind: "season", label, costCents, dayPriceCents? }
 *   POST   /api/ski/pass-value { kind: "day", skiedOn, resortSlug? }
 *   DELETE /api/ski/pass-value { id }              → remove one logged day
 *
 * Every verb requires a signed-in session (401 without one) AND ski
 * access — a Powder Pass subscription or VIP (403 without it, via
 * lib/ski/access-server, the same resolver every ski API uses).
 * All figures are computed ONLY from what the user entered
 * (lib/ski/pass-value): no price is ever looked up or invented.
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
        { error: "signin_required", message: "Sign in to use the pass-value tracker." },
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
            "The pass-value tracker is a Powder Pass feature — Powder Pass members and VIP Pro annual members can track their pass value.",
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true, userId };
}

function serialize(state: PassValueState) {
  return {
    season: state.season
      ? {
          label: state.season.label,
          costCents: state.season.costCents,
          dayPriceCents: state.season.dayPriceCents,
        }
      : null,
    days: state.days.map(d => ({
      id: d.id,
      skiedOn: formatSkiedOn(d.skiedOn),
      resortSlug: d.resortSlug,
    })),
    summary: state.summary,
  };
}

function invalid(err: unknown): NextResponse {
  const e = err as PassValueValidationError;
  return NextResponse.json(
    { error: "invalid_input", field: e.field ?? null, message: e.message },
    { status: 400 },
  );
}

export async function GET() {
  const g = await gate();
  if (!g.ok) return g.response;
  return NextResponse.json(serialize(await getPassValueState(g.userId)));
}

export async function POST(req: NextRequest) {
  const g = await gate();
  if (!g.ok) return g.response;
  const body = await req.json().catch(() => ({}));
  try {
    if (body?.kind === "season") {
      await upsertPassSeason(g.userId, body);
    } else if (body?.kind === "day") {
      await logPassDay(g.userId, body);
    } else {
      return NextResponse.json(
        {
          error: "invalid_input",
          field: "kind",
          message: 'POST body must carry kind: "season" or kind: "day".',
        },
        { status: 400 },
      );
    }
  } catch (err) {
    if (err instanceof PassValueValidationError) return invalid(err);
    throw err;
  }
  return NextResponse.json(serialize(await getPassValueState(g.userId)));
}

export async function DELETE(req: NextRequest) {
  const g = await gate();
  if (!g.ok) return g.response;
  const body = await req.json().catch(() => ({}));
  try {
    await removePassDay(g.userId, body?.id);
  } catch (err) {
    if (err instanceof PassValueValidationError) return invalid(err);
    throw err;
  }
  return NextResponse.json(serialize(await getPassValueState(g.userId)));
}
