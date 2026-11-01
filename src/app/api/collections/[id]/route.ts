import { NextRequest, NextResponse } from "next/server";
import { sharedCollectionsAccess } from "@/lib/collections/access";
import {
  CollectionError,
  deleteCollection,
  getOwnedCollection,
  updateCollection,
} from "@/lib/collections/shared";

export const runtime = "nodejs";

/**
 * One shareable collection, owner-scoped on every verb: a collection
 * that belongs to someone else answers exactly like one that doesn't
 * exist (404), so ids can't be probed across accounts.
 *
 *   GET    /api/collections/<id>  → { collection, items }
 *   PATCH  /api/collections/<id> { title?, description? } → { collection }
 *   DELETE /api/collections/<id>  → { deleted: true }
 */
async function gate() {
  const a = await sharedCollectionsAccess();
  if (!a.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "signin" }, { status: 401 }),
    };
  }
  return { ok: true as const, userId: a.userId };
}

function fail(err: unknown) {
  if (err instanceof CollectionError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: err.status },
    );
  }
  throw err;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await gate();
  if (!g.ok) return g.response;
  const { id } = await params;
  const row = await getOwnedCollection(g.userId, id);
  if (!row) {
    return NextResponse.json(
      { error: "collection_not_found", message: "Collection not found." },
      { status: 404 },
    );
  }
  const { items, ...collection } = row;
  return NextResponse.json({
    collection: { ...collection, cameraCount: items.length },
    items: items.map((i) => ({
      cameraId: i.cameraId,
      position: i.position,
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await gate();
  if (!g.ok) return g.response;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const collection = await updateCollection(g.userId, id, {
      title: body?.title,
      description: body?.description,
    });
    return NextResponse.json({ collection });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await gate();
  if (!g.ok) return g.response;
  const { id } = await params;
  try {
    await deleteCollection(g.userId, id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}
