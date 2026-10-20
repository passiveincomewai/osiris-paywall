import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gateEnterprise, MAX_COLLECTIONS_PER_USER } from "@/lib/enterprise/http";

export const runtime = "nodejs";

/** The signed-in enterprise customer's collections, with pick counts. */
export async function GET() {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const collections = await db.cameraCollection.findMany({
    where: { userId: gate.userId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json({
    collections: collections.map((c) => ({
      id: c.id,
      name: c.name,
      itemCount: c._count.items,
      feedActive: !!c.feedTokenHash,
      feedHits: c.feedHits,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  });
}

/** Create a named collection. */
export async function POST(req: NextRequest) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const count = await db.cameraCollection.count({ where: { userId: gate.userId } });
  if (count >= MAX_COLLECTIONS_PER_USER) {
    return NextResponse.json(
      { error: `Collection limit reached (${MAX_COLLECTIONS_PER_USER}). Delete one to create another.` },
      { status: 400 },
    );
  }
  const collection = await db.cameraCollection.create({
    data: { userId: gate.userId, name },
  });
  return NextResponse.json({ collection }, { status: 201 });
}
