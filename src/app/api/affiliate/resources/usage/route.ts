// GET/POST /api/affiliate/resources/usage — per-affiliate "mark as
// used / posted" state for the resources page's copy templates.
//
// Storage: AffiliateTemplateUsage (additive table). This records ONLY
// the affiliate's own bookkeeping; per-template conversions are not
// tracked anywhere in the system and are never inferred from this.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAffiliate } from "../../_util";
import { CAPTION_TEMPLATES, EMAIL_TEMPLATES, SCRIPT_TEMPLATES } from "@/lib/affiliate/templates";

const KNOWN_IDS: Record<string, Set<string>> = {
  caption: new Set(CAPTION_TEMPLATES.map((t) => t.id)),
  email: new Set(EMAIL_TEMPLATES.map((t) => t.id)),
  script: new Set(SCRIPT_TEMPLATES.map((t) => t.id)),
};

function rowShape(r: { templateKind: string; templateId: string; usedAt: Date | null; postedAt: Date | null }) {
  return {
    templateKind: r.templateKind,
    templateId: r.templateId,
    usedAt: r.usedAt ? r.usedAt.toISOString() : null,
    postedAt: r.postedAt ? r.postedAt.toISOString() : null,
  };
}

export async function GET() {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const rows = await db.affiliateTemplateUsage.findMany({
    where: { affiliateProfileId: profile.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ usage: rows.map(rowShape) });
}

export async function POST(req: Request) {
  const { profile, error } = await requireAffiliate();
  if (error) return error;

  let body: { templateKind?: unknown; templateId?: unknown; used?: unknown; posted?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { templateKind, templateId, used, posted } = body;
  if (
    typeof templateKind !== "string" ||
    typeof templateId !== "string" ||
    !KNOWN_IDS[templateKind]?.has(templateId)
  ) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }
  if (typeof used !== "boolean" && typeof posted !== "boolean") {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const existing = await db.affiliateTemplateUsage.findUnique({
    where: {
      affiliateProfileId_templateKind_templateId: {
        affiliateProfileId: profile.id,
        templateKind,
        templateId,
      },
    },
  });

  // Marking sets the timestamp (first mark wins — repeat marks are
  // idempotent); unmarking clears it.
  const now = new Date();
  const usedAt =
    typeof used === "boolean" ? (used ? (existing?.usedAt ?? now) : null) : (existing?.usedAt ?? null);
  const postedAt =
    typeof posted === "boolean" ? (posted ? (existing?.postedAt ?? now) : null) : (existing?.postedAt ?? null);

  const row = await db.affiliateTemplateUsage.upsert({
    where: {
      affiliateProfileId_templateKind_templateId: {
        affiliateProfileId: profile.id,
        templateKind,
        templateId,
      },
    },
    create: { affiliateProfileId: profile.id, templateKind, templateId, usedAt, postedAt },
    update: { usedAt, postedAt },
  });
  return NextResponse.json({ usage: rowShape(row) });
}
