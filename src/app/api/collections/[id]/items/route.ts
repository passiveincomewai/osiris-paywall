import { NextRequest, NextResponse } from "next/server";
import { sharedCollectionsAccess } from "@/lib/collections/access";
import {
  CollectionError,
  addCamera,
  removeCamera,
  reorderCameras,
} from "@/lib/collections/shared";

export const runtime = "nodejs";

/**
 * Membership of one shareable collection, owner-scoped like the
 * parent route (someone else's collection is a 404 on every verb).
 *
 *   POST   /api/collections/<id>/items { cameraId }     → add (idempotent)
 *   DELETE /api/collections/<id>/items { cameraId }     → remove (idempotent)
 *   PUT    /api/collections/<id>/items { cameraIds[] }  → reorder (full order)
 *
 * Adds are validated against the live catalogue in
 * lib/collections/shared — an id that isn't a real WorldEye camera
 * is a 400, never a stored row.
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await gate();
  if (!g.ok) return g.response;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const item = await addCamera(g.userId, id, body?.cameraId);
    return NextResponse.json({ item }, { status: item.alreadyPresent ? 200 : 201 });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await gate();
  if (!g.ok) return g.response;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    await removeCamera(g.userId, id, body?.cameraId);
    return NextResponse.json({ removed: true });
  } catch (err) {
    return fail(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await gate();
  if (!g.ok) return g.response;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    await reorderCameras(g.userId, id, body?.cameraIds);
    return NextResponse.json({ reordered: true });
  } catch (err) {
    return fail(err);
  }
}
