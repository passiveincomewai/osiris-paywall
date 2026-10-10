// GET /api/affiliate/network — 3-level referral tree for the dashboard.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAffiliate } from "../_util";

export const runtime = "nodejs";

interface Node {
  id: string; name: string | null; image: string | null;
  level: number; joinedAt: string; converted: boolean;
  commissionsCents: number; children: Node[];
}

export async function GET() {
  const { profile, error } = await requireAffiliate();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const pid = profile.id;

  async function childrenOf(parentId: string, level: number): Promise<Node[]> {
    if (level > 3) return [];
    const recruits = await db.affiliateProfile.findMany({
      where: { recruitedByProfileId: parentId },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const nodes: Node[] = [];
    for (const r of recruits) {
      const [comm, kids] = await Promise.all([
        db.commission.aggregate({
          where: { affiliateProfileId: pid, referredUserId: r.userId, status: { not: "reversed" } },
          _sum: { amountCents: true },
        }),
        childrenOf(r.id, level + 1),
      ]);
      const attr = await db.referralAttribution.findUnique({ where: { referredUserId: r.userId }, select: { convertedAt: true } });
      nodes.push({
        id: r.id,
        name: r.user.name ?? "Affiliate",
        image: r.user.image,
        level,
        joinedAt: r.createdAt.toISOString(),
        converted: !!attr?.convertedAt,
        commissionsCents: comm._sum.amountCents ?? 0,
        children: kids,
      });
    }
    return nodes;
  }

  // Also include direct referred customers who never became affiliates.
  const customerAttrs = await db.referralAttribution.findMany({
    where: { affiliateProfileId: pid },
    select: { referredUserId: true, convertedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const recruitUserIds = new Set(
    (await db.affiliateProfile.findMany({ where: { recruitedByProfileId: pid }, select: { userId: true } })).map((r) => r.userId),
  );
  const customers: Node[] = [];
  for (const a of customerAttrs) {
    if (recruitUserIds.has(a.referredUserId)) continue;
    const comm = await db.commission.aggregate({
      where: { affiliateProfileId: pid, referredUserId: a.referredUserId, status: { not: "reversed" } },
      _sum: { amountCents: true },
    });
    customers.push({
      id: `customer:${a.referredUserId}`, name: "Referred customer", image: null,
      level: 1, joinedAt: a.createdAt.toISOString(), converted: !!a.convertedAt,
      commissionsCents: comm._sum.amountCents ?? 0, children: [],
    });
  }

  const tree = await childrenOf(pid, 1);
  return NextResponse.json({ tree: [...tree, ...customers] });
}
