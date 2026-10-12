// GET  /api/affiliate/studio/ambassador — { isAmbassador, application }
// POST /api/affiliate/studio/ambassador — validate + submit an
// application → { application }. One pending application per profile.
import { NextResponse } from "next/server";
import { latestApplication, submitApplication } from "@/lib/studio/ambassador";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const application = await latestApplication(profile.id);
  return NextResponse.json({ isAmbassador: profile.isAmbassador, application });
}

export async function POST(req: Request) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    const application = await submitApplication(profile, body);
    return NextResponse.json({ application }, { status: 201 });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 400;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not submit application" },
      { status },
    );
  }
}
