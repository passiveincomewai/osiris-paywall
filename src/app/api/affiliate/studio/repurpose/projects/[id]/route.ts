// GET/PATCH/DELETE /api/affiliate/studio/repurpose/projects/[id]
// One project + its variations. All reads/writes are profile-scoped.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  MAX_TITLE_LEN,
  MAX_TRANSCRIPT_LEN,
  serializeProject,
  serializeVariation,
} from "@/lib/studio/repurpose-server";
import type { SourceAnalysis } from "@/lib/studio/repurpose";
import { requireStudioAccess } from "../../../../_util";

export const runtime = "nodejs";

async function loadOwnProject(profileId: string, id: string) {
  return db.studioProject.findFirst({ where: { id, profileId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const { id } = await params;
  const project = await loadOwnProject(profile.id, id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const variations = await db.studioVariation.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    project: { ...serializeProject(project, variations.length), transcript: project.transcript },
    variations: variations.map(serializeVariation),
  });
}

const FOLDERS = ["drafts", "published", "scheduled", "high_performing", "templates", "uploads", "graphics", "archived"];
const VOICES = ["professional", "casual", "exciting", "educational", "cinematic", "technical", "minimalist"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const { id } = await params;
  const project = await loadOwnProject(profile.id, id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, MAX_TITLE_LEN);
  if (typeof body.sourceRef === "string") data.sourceRef = body.sourceRef.slice(0, 2000);
  if (typeof body.sourceName === "string") data.sourceName = body.sourceName.slice(0, 200);
  if (body.ownershipConfirmed === true) data.ownershipConfirmed = true;
  if (typeof body.transcript === "string") data.transcript = body.transcript.slice(0, MAX_TRANSCRIPT_LEN);
  if (body.analysis && typeof body.analysis === "object") {
    // Store only plausible measured analysis; the summary builder reads
    // the measured flags, so a spoofed blob can only ever describe the
    // affiliate's own video back to themselves.
    const a = body.analysis as Partial<SourceAnalysis>;
    if (
      typeof a.durationSec === "number" && a.durationSec > 0 && a.durationSec <= 60 * 60 &&
      Array.isArray(a.windows) && a.windows.length <= 600 &&
      Array.isArray(a.sceneCuts) && a.sceneCuts.length <= 2000
    ) {
      data.analysis = a;
      data.durationSec = a.durationSec;
      if (typeof a.width === "number") data.width = Math.floor(a.width);
      if (typeof a.height === "number") data.height = Math.floor(a.height);
    } else {
      return NextResponse.json({ error: "That analysis doesn't look like a measured video analysis." }, { status: 400 });
    }
  }
  if (typeof body.status === "string" && ["draft", "ready", "archived"].includes(body.status)) data.status = body.status;
  if (typeof body.folder === "string" && FOLDERS.includes(body.folder)) data.folder = body.folder;
  if (typeof body.brandVoice === "string" && VOICES.includes(body.brandVoice)) data.brandVoice = body.brandVoice;
  if (typeof body.campaignTag === "string") data.campaignTag = body.campaignTag.slice(0, 60) || null;

  const updated = await db.studioProject.update({ where: { id: project.id }, data });
  return NextResponse.json({ project: serializeProject(updated) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const { id } = await params;
  const project = await loadOwnProject(profile.id, id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  await db.studioProject.delete({ where: { id: project.id } });
  return NextResponse.json({ ok: true });
}
