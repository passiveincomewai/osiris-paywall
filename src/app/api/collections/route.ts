import { NextRequest, NextResponse } from "next/server";
import { sharedCollectionsAccess } from "@/lib/collections/access";
import {
  CollectionError,
  createCollection,
  listUserCollections,
} from "@/lib/collections/shared";

export const runtime = "nodejs";

/**
 * Shareable camera collections — the owner's list + create door.
 *
 *   GET  /api/collections        → { collections: CollectionSummary[] }
 *   POST /api/collections { title, description? } → { collection }
 *
 * Any signed-in account may use these (free included — collections
 * are a growth feature, not a plan perk). Signed out is a 401 on
 * every verb. All data rules (caps, title hygiene, slug minting)
 * live in lib/collections/shared.
 */
export async function GET() {
  const a = await sharedCollectionsAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const collections = await listUserCollections(a.userId);
  return NextResponse.json({ collections });
}

export async function POST(req: NextRequest) {
  const a = await sharedCollectionsAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const collection = await createCollection(a.userId, {
      title: body?.title,
      description: body?.description,
    });
    return NextResponse.json({ collection }, { status: 201 });
  } catch (err) {
    if (err instanceof CollectionError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status },
      );
    }
    throw err;
  }
}
