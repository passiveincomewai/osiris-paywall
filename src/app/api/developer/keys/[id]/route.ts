import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publicApiEnabled } from "@/lib/developer/flag";
import { revokePublicKey } from "@/lib/developer/keys";

export const runtime = "nodejs";

/** Revoke one of the signed-in user's own public API keys. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!publicApiEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "signin" }, { status: 401 });
  const { id } = await params;
  const revoked = await revokePublicKey(userId, id);
  if (!revoked) return NextResponse.json({ error: "Key not found." }, { status: 404 });
  return NextResponse.json({ revoked: true });
}
