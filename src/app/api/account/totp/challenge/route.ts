// POST /api/account/totp/challenge — the step-up check after sign-in.
// On success it mints the HMAC proof cookie; the client then calls
// session update(), and the jwt callback flips totpVerified only when
// this proof validates (see src/auth.ts). A client can never mint the
// proof itself.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { verifyChallenge } from "@/lib/account/totp-service";
import { TOTP_PROOF_COOKIE, mintTotpProof } from "@/lib/account/totp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const ok = await verifyChallenge(userId, String(body.code ?? "")).catch(() => false);
  if (!ok) {
    return NextResponse.json({ error: "That code didn't match — try again." }, { status: 400 });
  }
  (await cookies()).set(TOTP_PROOF_COOKIE, mintTotpProof(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 3600,
  });
  return NextResponse.json({ ok: true });
}
