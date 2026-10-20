import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gateEnterprise, ownedCollection, originOf } from "@/lib/enterprise/http";
import { generateFeedToken, hashSecret } from "@/lib/enterprise/tokens";

export const runtime = "nodejs";

/**
 * Generate (or regenerate) the collection's private feed token. The
 * plaintext is returned ONCE, here — only its SHA-256 hash is stored —
 * and regenerating kills the previous token everywhere (feed + embed),
 * which is what makes regeneration the revocation.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const collection = await ownedCollection(gate.userId, id);
  if (!collection) return NextResponse.json({ error: "not found" }, { status: 404 });
  const token = generateFeedToken();
  await db.cameraCollection.update({
    where: { id },
    data: { feedTokenHash: hashSecret(token) },
  });
  const origin = originOf(req);
  return NextResponse.json({
    token,
    feedUrl: `${origin}/api/feed/${token}`,
    embedUrl: `${origin}/embed/${token}`,
    embedSnippet: `<iframe src="${origin}/embed/${token}" width="100%" height="480" style="border:0" loading="lazy" title="WorldEye live cameras"></iframe>`,
  });
}

/** Turn the feed link off entirely (token forgotten, feed + embed 404). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const collection = await ownedCollection(gate.userId, id);
  if (!collection) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.cameraCollection.update({ where: { id }, data: { feedTokenHash: null } });
  return NextResponse.json({ ok: true });
}
