import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gateEnterprise, ownedCollection, MAX_ITEMS_PER_COLLECTION } from "@/lib/enterprise/http";
import { enterpriseCatalogueById } from "@/lib/enterprise/catalogue";
import { dashboardItems } from "@/lib/enterprise/service";
import { feedEligibility } from "@/lib/enterprise/rights";

export const runtime = "nodejs";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

/** The collection's picks with live catalogue data + rights verdicts. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const collection = await ownedCollection(gate.userId, id);
  if (!collection) return NextResponse.json({ error: "not found" }, { status: 404 });
  const items = await dashboardItems(id);
  if (!items) {
    return NextResponse.json(
      { error: "catalogue-unavailable", message: "The camera catalogue is still loading. Try again in a moment." },
      { status: 503 },
    );
  }
  return NextResponse.json({ items });
}

/**
 * Add picks: { cameraId } or { cameraIds: [...] }. A pick is stored even
 * when its source is not redistribution-cleared — the dashboard lists it
 * as excluded with the reason, and the feed/API/embed leave it out.
 * Unknown catalogue ids are skipped and reported.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const collection = await ownedCollection(gate.userId, id);
  if (!collection) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const requested: string[] = Array.isArray(body.cameraIds)
    ? body.cameraIds.filter((v: unknown): v is string => typeof v === "string")
    : typeof body.cameraId === "string"
      ? [body.cameraId]
      : [];
  const unique = [...new Set(requested.map((v) => v.trim()).filter(Boolean))].slice(0, 50);
  if (!unique.length) return NextResponse.json({ error: "cameraId required" }, { status: 400 });

  const current = await db.cameraCollectionItem.count({ where: { collectionId: id } });
  if (current + unique.length > MAX_ITEMS_PER_COLLECTION) {
    return NextResponse.json(
      { error: `A collection holds at most ${MAX_ITEMS_PER_COLLECTION} cameras.` },
      { status: 400 },
    );
  }

  const byId = await enterpriseCatalogueById();
  if (!byId) {
    return NextResponse.json(
      { error: "catalogue-unavailable", message: "The camera catalogue is still loading. Try again in a moment." },
      { status: 503 },
    );
  }

  const added: { cameraId: string; eligible: boolean; reason: string }[] = [];
  const skipped: { cameraId: string; reason: string }[] = [];
  for (const cameraId of unique) {
    const raw = byId.get(cameraId);
    if (!raw) {
      skipped.push({ cameraId, reason: "No camera with that id in the catalogue." });
      continue;
    }
    await db.cameraCollectionItem.upsert({
      where: { collectionId_cameraId: { collectionId: id, cameraId } },
      create: { collectionId: id, cameraId },
      update: {},
    });
    const verdict = feedEligibility(raw);
    added.push({ cameraId, eligible: verdict.eligible, reason: verdict.basis });
  }
  return NextResponse.json({ added, skipped });
}

/** Remove one pick: DELETE ?cameraId=<id>. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await gateEnterprise();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const collection = await ownedCollection(gate.userId, id);
  if (!collection) return NextResponse.json({ error: "not found" }, { status: 404 });
  const cameraId = new URL(req.url).searchParams.get("cameraId")?.trim();
  if (!cameraId) return NextResponse.json({ error: "cameraId required" }, { status: 400 });
  await db.cameraCollectionItem.deleteMany({ where: { collectionId: id, cameraId } });
  return NextResponse.json({ ok: true });
}
