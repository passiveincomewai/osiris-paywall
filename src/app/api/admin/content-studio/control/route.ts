// POST /api/admin/content-studio/control — one control action per
// call: set_mode | pause_platform | resume_platform | global_pause |
// global_resume. Admins only (requireAdmin). Validation (including
// the per-platform mode ceilings) happens server-side in
// lib/content-studio/state.applyControl; every successful change is
// recorded as a ContentControlEvent and mirrored into the affiliate
// audit log. This route changes control STATE only — it can never
// trigger a publish; the engine on the VM decides what to do with
// the state, and its own claim-time checks enforce it again.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { applyControl, getControlState } from "@/lib/content-studio/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forbidden(e: unknown) {
  const status = (e as { status?: number })?.status ?? 403;
  return NextResponse.json({ error: "admin only" }, { status });
}

interface ControlBody {
  action?: string;
  platform?: string;
  mode?: string;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const body = (await req.json().catch(() => null)) as ControlBody | null;
  if (!body?.action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }
  const actor = session?.user?.email ?? null;
  const result = await applyControl({
    actor,
    action: body.action,
    platform: body.platform ?? null,
    mode: body.mode ?? null,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  await audit("content-studio.control", {
    targetType: "ContentPlatformState",
    targetId: body.platform ?? "__global__",
    details: { action: body.action, mode: body.mode ?? undefined, actor },
  });
  const control = await getControlState();
  return NextResponse.json({ ok: true, ...control });
}
