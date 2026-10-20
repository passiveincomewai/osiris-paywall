import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gateEnterprise } from "@/lib/enterprise/http";
import { generateApiKey, hashSecret } from "@/lib/enterprise/tokens";

export const runtime = "nodejs";

const MAX_KEYS_PER_USER = 10;

/** The customer's API keys — prefixes and usage only, never secrets. */
export async function GET() {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const keys = await db.enterpriseApiKey.findMany({
    where: { userId: gate.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      hits: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ keys });
}

/** Create an API key. The plaintext is returned ONCE, here. */
export async function POST(req: NextRequest) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim().slice(0, 60)
    : "API key";
  const live = await db.enterpriseApiKey.count({
    where: { userId: gate.userId, revokedAt: null },
  });
  if (live >= MAX_KEYS_PER_USER) {
    return NextResponse.json(
      { error: `Key limit reached (${MAX_KEYS_PER_USER} active keys). Revoke one to create another.` },
      { status: 400 },
    );
  }
  const { key, prefix } = generateApiKey();
  const row = await db.enterpriseApiKey.create({
    data: { userId: gate.userId, name, keyPrefix: prefix, keyHash: hashSecret(key) },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });
  return NextResponse.json({ key, apiKey: row }, { status: 201 });
}
