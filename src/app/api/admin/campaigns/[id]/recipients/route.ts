// Admin: a campaign's recipients — list (paginated, filterable) and
// bulk-add from pasted text or an uploaded CSV. Bulk-add accepts CSV
// with an "email" header column (all other columns land in meta) or
// free-text lines; returns added / duplicates / suppressed / invalid
// counts. Suppressed addresses are counted, never added.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { parseRecipientInput } from "@/lib/campaigns/parse";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const campaign = await db.emailCampaign.findUnique({ where: { id }, select: { id: true } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);

  const where = { campaignId: id, ...(status ? { status } : {}) };
  const [total, recipients] = await Promise.all([
    db.campaignRecipient.count({ where }),
    db.campaignRecipient.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: offset,
    }),
  ]);
  return NextResponse.json({ total, limit, offset, recipients });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const campaign = await db.emailCampaign.findUnique({ where: { id }, select: { id: true } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = body.text ?? "";
  if (!text.trim()) return NextResponse.json({ error: "no recipient input provided" }, { status: 400 });

  const parsed = parseRecipientInput(text);

  // Dedupe within the input (first occurrence wins).
  const seen = new Set<string>();
  const unique = parsed.recipients.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
  let duplicates = parsed.recipients.length - unique.length;

  // Split out suppressed addresses — counted, never added.
  const suppressedRows = unique.length
    ? await db.emailSuppression.findMany({
        where: { email: { in: unique.map((r) => r.email) } },
        select: { email: true },
      })
    : [];
  const suppressedSet = new Set(suppressedRows.map((s) => s.email));
  const addable = unique.filter((r) => !suppressedSet.has(r.email));
  const suppressed = unique.length - addable.length;

  // Split out addresses already on this campaign.
  const existingRows = addable.length
    ? await db.campaignRecipient.findMany({
        where: { campaignId: id, email: { in: addable.map((r) => r.email) } },
        select: { email: true },
      })
    : [];
  const existingSet = new Set(existingRows.map((r) => r.email));
  const fresh = addable.filter((r) => !existingSet.has(r.email));
  duplicates += addable.length - fresh.length;

  if (fresh.length) {
    await db.campaignRecipient.createMany({
      data: fresh.map((r) => ({ campaignId: id, email: r.email, meta: r.meta, status: "pending" })),
      skipDuplicates: true,
    });
  }

  const result = {
    added: fresh.length,
    duplicates,
    suppressed,
    invalid: parsed.invalid.length,
    invalidSamples: parsed.invalid.slice(0, 10),
  };
  await audit("campaign.recipients.add", {
    actorUserId: session?.user?.id,
    targetType: "EmailCampaign",
    targetId: id,
    details: result,
  });
  return NextResponse.json(result);
}
