// Admin: affiliate list (search) + status changes.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try { await requireAdmin(); } catch (e: unknown) {
    return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status");
  const take = Math.min(100, Number(searchParams.get("take") ?? 50));

  const where = {
    ...(status ? { status: status as "pending" | "active" | "suspended" | "banned" } : {}),
    ...(q ? { OR: [
      { user: { email: { contains: q, mode: "insensitive" as const } } },
      { user: { name: { contains: q, mode: "insensitive" as const } } },
      { referralCode: { contains: q.toLowerCase() } },
      { customCode: { contains: q.toLowerCase() } },
    ] } : {}),
  };
  const [total, rows] = await Promise.all([
    db.affiliateProfile.count({ where }),
    db.affiliateProfile.findMany({
      where,
      include: { user: { select: { email: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take,
    }),
  ]);
  const ids = rows.map((r) => r.id);
  const commSums = await db.commission.groupBy({
    by: ["affiliateProfileId"],
    where: { affiliateProfileId: { in: ids }, status: { not: "reversed" } },
    _sum: { amountCents: true },
  });
  const sums = new Map(commSums.map((c) => [c.affiliateProfileId, c._sum.amountCents ?? 0]));
  return NextResponse.json({
    total,
    affiliates: rows.map((r) => ({
      id: r.id, email: r.user.email, name: r.user.name, image: r.user.image,
      referralCode: r.referralCode, customCode: r.customCode, status: r.status,
      xp: r.xp, createdAt: r.createdAt, lifetimeCents: sums.get(r.id) ?? 0,
    })),
  });
}
