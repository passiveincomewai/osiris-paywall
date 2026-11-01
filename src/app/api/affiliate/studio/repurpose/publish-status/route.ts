// GET /api/affiliate/studio/repurpose/publish-status — which direct
// publishing integrations are genuinely configured (today: none).
// The Publish & Share panel reads this so its "manual posting" state
// is driven by reality, not by a hardcoded assumption: when the owner
// completes a platform's app approval and sets the env vars, the
// status flips here first.
import { NextResponse } from "next/server";
import { publishApiStatus } from "@/lib/studio/publish-api";
import { requireStudioAccess } from "../../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { error } = await requireStudioAccess();
  if (error) return error;
  return NextResponse.json({ platforms: publishApiStatus() });
}
