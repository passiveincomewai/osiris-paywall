// Admin: email campaigns — list + create.
// Gated by the same requireAdmin() (ADMIN_EMAILS) as the rest of /admin.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const campaigns = await db.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { recipients: true } } },
  });
  const counts = await db.campaignRecipient.groupBy({
    by: ["campaignId", "status"],
    _count: { _all: true },
  });
  const byCampaign = new Map<string, Record<string, number>>();
  for (const row of counts) {
    const entry = byCampaign.get(row.campaignId) ?? {};
    entry[row.status] = row._count._all;
    byCampaign.set(row.campaignId, entry);
  }
  return NextResponse.json({
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      fromName: c.fromName,
      fromEmail: c.fromEmail,
      status: c.status,
      dailyCap: c.dailyCap,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      total: c._count.recipients,
      counts: byCampaign.get(c.id) ?? {},
    })),
  });
}

interface CreateBody {
  name?: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string | null;
  fromName?: string;
  fromEmail?: string;
  dailyCap?: number | null;
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const campaign = await db.emailCampaign.create({
    data: {
      name,
      subject: body.subject ?? "",
      bodyText: body.bodyText ?? "",
      bodyHtml: body.bodyHtml?.trim() ? body.bodyHtml : null,
      fromName: body.fromName?.trim() || "WorldEye",
      fromEmail: body.fromEmail?.trim().toLowerCase() || "hello@outreach.worldeye.app",
      dailyCap: typeof body.dailyCap === "number" && body.dailyCap > 0 ? Math.floor(body.dailyCap) : null,
      status: "draft",
    },
  });
  await audit("campaign.create", {
    actorUserId: session?.user?.id,
    targetType: "EmailCampaign",
    targetId: campaign.id,
    details: { name: campaign.name },
  });
  return NextResponse.json({ id: campaign.id, status: campaign.status }, { status: 201 });
}
