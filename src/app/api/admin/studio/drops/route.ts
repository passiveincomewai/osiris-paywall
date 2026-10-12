// Admin: list + publish Daily Content Drops (one per UTC date).
// POST body { date: "YYYY-MM-DD", templateId?, title, note?, xpBonus? }
// upserts the drop for that date.
// Gated by the same ADMIN_EMAILS check as the rest of /admin.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { utcDateOnly, DROP_TEMPLATE_SELECT } from "@/lib/studio/drops";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

/** Parse a strict YYYY-MM-DD date into its UTC date-only Date, or null. */
function parseDateOnly(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (
    d.getUTCFullYear() !== Number(m[1]) ||
    d.getUTCMonth() !== Number(m[2]) - 1 ||
    d.getUTCDate() !== Number(m[3])
  ) {
    return null;
  }
  return utcDateOnly(d);
}

export async function GET() {
  try { await requireAdmin(); } catch (e) { return forbidden(e); }
  const drops = await db.studioDrop.findMany({
    orderBy: { date: "desc" },
    take: 60,
    include: {
      template: { select: DROP_TEMPLATE_SELECT },
      _count: { select: { claims: true } },
    },
  });
  return NextResponse.json({ drops });
}

export async function POST(req: Request) {
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }
  const actor = session?.user?.id;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const date = parseDateOnly(body.date);
  if (!date) {
    return NextResponse.json({ error: 'date must be a valid "YYYY-MM-DD" date' }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  let templateId: string | null = null;
  if (body.templateId !== undefined && body.templateId !== null && body.templateId !== "") {
    if (typeof body.templateId !== "string") {
      return NextResponse.json({ error: "templateId must be a string" }, { status: 400 });
    }
    const template = await db.marketingTemplate.findUnique({
      where: { id: body.templateId },
      select: { id: true },
    });
    if (!template) {
      return NextResponse.json({ error: "templateId not found" }, { status: 400 });
    }
    templateId = template.id;
  }

  const note =
    body.note === undefined || body.note === null
      ? null
      : typeof body.note === "string"
        ? body.note
        : undefined;
  if (note === undefined) {
    return NextResponse.json({ error: "note must be a string" }, { status: 400 });
  }

  const xpBonus = body.xpBonus === undefined ? 25 : body.xpBonus;
  if (typeof xpBonus !== "number" || !Number.isInteger(xpBonus) || xpBonus < 0 || xpBonus > 1000) {
    return NextResponse.json({ error: "xpBonus must be an integer between 0 and 1000" }, { status: 400 });
  }

  const drop = await db.studioDrop.upsert({
    where: { date },
    create: { date, templateId, title, note, xpBonus, createdBy: actor ?? null },
    update: { templateId, title, note, xpBonus },
    include: { template: { select: DROP_TEMPLATE_SELECT } },
  });

  await audit("studio.drop.upsert", {
    actorUserId: actor, targetType: "StudioDrop", targetId: drop.id,
    details: { date: date.toISOString(), title, templateId, xpBonus },
  });
  return NextResponse.json({ drop }, { status: 201 });
}
