// Admin: one email campaign — read, edit, status transitions, delete.
// Status flow: draft → sending ⇄ paused; stopped from anything not
// completed; a stopped campaign may be restarted (→ sending). The tick
// engine moves sending → completed on its own when no pending
// recipients remain, so "completed" is never settable by hand.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

async function gate() {
  return requireAdmin();
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await gate();
  } catch (e) {
    return forbidden(e);
  }
  const campaign = await db.emailCampaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const grouped = await db.campaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId: id },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    total += row._count._all;
  }
  return NextResponse.json({ campaign, counts, total });
}

const EDITABLE = ["name", "subject", "bodyText", "bodyHtml", "fromName", "fromEmail", "dailyCap"] as const;

interface PatchBody {
  name?: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string | null;
  fromName?: string;
  fromEmail?: string;
  dailyCap?: number | null;
  status?: string;
}

const TRANSITIONS: Record<string, string[]> = {
  sending: ["draft", "paused", "stopped"],
  paused: ["sending"],
  stopped: ["draft", "sending", "paused"],
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try {
    session = await gate();
  } catch (e) {
    return forbidden(e);
  }
  const existing = await db.emailCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const data: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const allowedFrom = TRANSITIONS[body.status];
    if (!allowedFrom) {
      return NextResponse.json({ error: `status cannot be set to ${body.status}` }, { status: 400 });
    }
    if (!allowedFrom.includes(existing.status)) {
      return NextResponse.json(
        { error: `cannot move a ${existing.status} campaign to ${body.status}` },
        { status: 400 },
      );
    }
    data.status = body.status;
  }

  for (const key of EDITABLE) {
    if (body[key] === undefined) continue;
    if (key === "dailyCap") {
      data.dailyCap =
        typeof body.dailyCap === "number" && body.dailyCap > 0 ? Math.floor(body.dailyCap) : null;
    } else if (key === "bodyHtml") {
      data.bodyHtml = body.bodyHtml?.trim() ? body.bodyHtml : null;
    } else if (key === "name") {
      const name = (body.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      data.name = name;
    } else if (key === "fromEmail") {
      data.fromEmail = (body.fromEmail ?? "").trim().toLowerCase() || existing.fromEmail;
    } else {
      data[key] = body[key];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const updated = await db.emailCampaign.update({ where: { id }, data });
  await audit("campaign.update", {
    actorUserId: session?.user?.id,
    targetType: "EmailCampaign",
    targetId: id,
    details: { fields: Object.keys(data), statusFrom: existing.status, statusTo: updated.status },
  });
  return NextResponse.json({ id: updated.id, status: updated.status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try {
    session = await gate();
  } catch (e) {
    return forbidden(e);
  }
  const existing = await db.emailCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  await db.emailCampaign.delete({ where: { id } });
  await audit("campaign.delete", {
    actorUserId: session?.user?.id,
    targetType: "EmailCampaign",
    targetId: id,
    details: { name: existing.name, status: existing.status },
  });
  return NextResponse.json({ ok: true, id });
}
