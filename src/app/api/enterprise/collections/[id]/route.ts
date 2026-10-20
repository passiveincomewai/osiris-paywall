import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gateEnterprise, ownedCollection } from "@/lib/enterprise/http";

export const runtime = "nodejs";

/** Rename one of the customer's own collections. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const collection = await ownedCollection(gate.userId, id);
  if (!collection) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const updated = await db.cameraCollection.update({ where: { id }, data: { name } });
  return NextResponse.json({ collection: updated });
}

/** Delete a collection (its picks cascade; feed token and embed die with it). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const collection = await ownedCollection(gate.userId, id);
  if (!collection) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.cameraCollection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
