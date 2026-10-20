// Shared route plumbing for /api/team/* and /api/invite/*.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { TeamError } from "./permissions";

export async function requireUserId(): Promise<string> {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new TeamError(401, "Sign in required");
  return userId;
}

export async function sessionUser(): Promise<{ id: string; name?: string | null; email?: string | null } | null> {
  const session = await auth().catch(() => null);
  const u = session?.user as { id?: string; name?: string | null; email?: string | null } | undefined;
  if (!u?.id) return null;
  return { id: u.id, name: u.name ?? null, email: u.email ?? null };
}

export function teamErrorResponse(err: unknown): NextResponse {
  if (err instanceof TeamError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[team-api]", err);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
