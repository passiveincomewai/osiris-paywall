/**
 * Shared helpers for the enterprise dashboard API routes: the tier gate
 * (401 signed out, 403 not enterprise — with a machine-readable error the
 * dashboard renders as its locked state) and owner-scoped collection
 * lookup (another customer's collection is a 404, never a leak).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enterpriseAccess } from "./access";
import type { CollectionRow } from "./service";

export const MAX_COLLECTIONS_PER_USER = 25;
export const MAX_ITEMS_PER_COLLECTION = 500;

export async function gateEnterprise(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const a = await enterpriseAccess();
  if (!a.ok) {
    return { ok: false, response: NextResponse.json({ error: "signin" }, { status: 401 }) };
  }
  if (!a.enterprise) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "enterprise", message: "This feature needs an Enterprise subscription." },
        { status: 403 },
      ),
    };
  }
  return { ok: true, userId: a.userId };
}

export async function ownedCollection(
  userId: string,
  id: string,
): Promise<CollectionRow | null> {
  return db.cameraCollection.findFirst({ where: { id, userId } });
}

export function originOf(req: Request): string {
  return new URL(req.url).origin;
}
