// GET/POST /api/affiliate/studio/repurpose/projects — the Repurposing
// Machine's project list + creation. A project is one source video the
// affiliate owns (or an approved library asset). Ownership confirmation
// is required at creation for uploads and URL imports; renders refuse
// to charge until it is on record (spec §1/§16).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  MAX_PROJECTS_PER_PROFILE,
  MAX_TITLE_LEN,
  serializeProject,
} from "@/lib/studio/repurpose-server";
import { requireStudioAccess } from "../../../_util";

export const runtime = "nodejs";

const SOURCE_KINDS = ["upload", "library", "creation", "url"] as const;

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });

  const projects = await db.studioProject.findMany({
    where: { profileId: profile.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { _count: { select: { variations: true } } },
  });
  return NextResponse.json({
    projects: projects.map((p) => serializeProject(p, p._count.variations)),
  });
}

export async function POST(req: Request) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    title?: unknown;
    sourceKind?: unknown;
    sourceRef?: unknown;
    sourceName?: unknown;
    ownershipConfirmed?: unknown;
  };

  const title = typeof body.title === "string" ? body.title.trim().slice(0, MAX_TITLE_LEN) : "";
  if (!title) return NextResponse.json({ error: "Give the project a title." }, { status: 400 });

  const sourceKind = body.sourceKind;
  if (typeof sourceKind !== "string" || !(SOURCE_KINDS as readonly string[]).includes(sourceKind)) {
    return NextResponse.json({ error: `sourceKind must be one of ${SOURCE_KINDS.join(", ")}` }, { status: 400 });
  }

  // Uploads and URL imports are the affiliate's own media: the ownership
  // confirmation is a hard requirement, recorded on the project.
  if ((sourceKind === "upload" || sourceKind === "url") && body.ownershipConfirmed !== true) {
    return NextResponse.json(
      { error: "Confirm you own this media or have permission to edit and distribute it." },
      { status: 400 },
    );
  }

  const count = await db.studioProject.count({ where: { profileId: profile.id } });
  if (count >= MAX_PROJECTS_PER_PROFILE) {
    return NextResponse.json({ error: "Project limit reached — archive or delete an old project first." }, { status: 400 });
  }

  // Library sources must be real approved footage (a video template's
  // asset); creations must belong to the caller.
  let sourceRef = typeof body.sourceRef === "string" ? body.sourceRef.slice(0, 2000) : null;
  if (sourceKind === "library") {
    const tpl = await db.marketingTemplate.findFirst({
      where: { kind: "video", active: true, assetUrl: sourceRef ?? "" },
      select: { id: true },
    });
    if (!tpl) return NextResponse.json({ error: "That library video isn't available." }, { status: 400 });
  }
  if (sourceKind === "creation") {
    const creation = await db.studioCreation.findFirst({
      where: { id: sourceRef ?? "", affiliateProfileId: profile.id },
      select: { id: true },
    });
    if (!creation) return NextResponse.json({ error: "That creation isn't yours or doesn't exist." }, { status: 400 });
  }
  if (sourceKind === "url") {
    // Direct media URLs only; SSRF guards: https, no credentials, no
    // private/loopback hosts. The file itself is fetched by the browser.
    try {
      const u = new URL(sourceRef ?? "");
      const host = u.hostname.toLowerCase();
      if (
        u.protocol !== "https:" ||
        u.username || u.password ||
        host === "localhost" || host.endsWith(".local") ||
        /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host) ||
        !/\.(mp4|mov|webm)(\?.*)?$/i.test(u.pathname + u.search)
      ) throw new Error("bad url");
    } catch {
      return NextResponse.json({ error: "Paste a direct https link to an MP4, MOV or WebM file you own." }, { status: 400 });
    }
  }

  const project = await db.studioProject.create({
    data: {
      profileId: profile.id,
      title,
      sourceKind,
      sourceRef,
      sourceName: typeof body.sourceName === "string" ? body.sourceName.slice(0, 200) : null,
      ownershipConfirmed: sourceKind === "library" || sourceKind === "creation" ? true : body.ownershipConfirmed === true,
    },
  });
  return NextResponse.json({ project: serializeProject(project, 0) });
}
