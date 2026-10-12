// GET /api/admin/studio/report — Studio admin report (last 30 days).
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/affiliate/admin";
import { getStudioAdminReport } from "@/lib/studio/analytics";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json(
    { error: "Forbidden" },
    { status: (e as { status?: number }).status ?? 403 },
  );
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const report = await getStudioAdminReport();
  return NextResponse.json(report);
}
