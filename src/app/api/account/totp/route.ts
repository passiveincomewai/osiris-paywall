// /api/account/totp — 2FA management (setup / enable / regenerate / disable / status).
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { beginTotpSetup, disableTotp, enableTotp, getTotpStatus, regenerateBackupCodes } from "@/lib/account/totp-service";

export const runtime = "nodejs";

async function requireUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json(await getTotpStatus(userId));
}

export async function POST(req: Request) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; code?: string };
  const code = String(body.code ?? "");

  try {
    switch (body.action) {
      case "setup": {
        const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
        const { secret, otpauthUrl } = await beginTotpSetup(userId, user?.email ?? "WorldEye account");
        return NextResponse.json({ secret, otpauthUrl });
      }
      case "enable": {
        const r = await enableTotp(userId, code);
        if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
        return NextResponse.json({ backupCodes: r.backupCodes });
      }
      case "regenerate": {
        const r = await regenerateBackupCodes(userId, code);
        if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
        return NextResponse.json({ backupCodes: r.backupCodes });
      }
      case "disable": {
        const r = await disableTotp(userId, code);
        if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[totp] action failed:", err);
    return NextResponse.json({ error: "Two-factor setup isn't available right now." }, { status: 500 });
  }
}
