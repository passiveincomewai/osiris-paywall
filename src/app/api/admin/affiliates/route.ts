// Admin: affiliate list — searchable, sortable, with per-affiliate
// aggregates + program summary (see src/lib/affiliate/admin-detail.ts).
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/affiliate/admin";
import { listAffiliatesAdmin, type AffiliateSort } from "@/lib/affiliate/admin-detail";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try { await requireAdmin(); } catch (e: unknown) {
    return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
  }
  const { searchParams } = new URL(req.url);
  const sortParam = searchParams.get("sort");
  const sort: AffiliateSort =
    sortParam === "earnings" || sortParam === "signups" || sortParam === "xp" || sortParam === "joined"
      ? sortParam
      : "joined";
  const result = await listAffiliatesAdmin({
    q: searchParams.get("q") ?? "",
    status: searchParams.get("status") ?? undefined,
    sort,
    take: Number(searchParams.get("take") ?? 50),
  });
  return NextResponse.json(result);
}
