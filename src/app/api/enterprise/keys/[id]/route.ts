import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gateEnterprise } from "@/lib/enterprise/http";

export const runtime = "nodejs";

/** Revoke one of the customer's own API keys (it stops working at once). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const key = await db.enterpriseApiKey.findFirst({ where: { id, userId: gate.userId } });
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!key.revokedAt) {
    await db.enterpriseApiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
