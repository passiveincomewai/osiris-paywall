// GET /api/affiliate/studio/campaigns/[id]/kit — download the campaign
// kit as a ZIP: the brief + posting checklist (README), ready-to-paste
// caption starter, links file, and a personalized preview render of
// every campaign template (your real referral link, discount code and
// QR baked in by the same render pipeline the Studio creator uses).
//
// The renders are preview-scale and free, exactly like the Studio's
// preview path — full-resolution exports stay in the creator, where
// the credit rules live. Nothing about the kit bypasses them.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/password-auth";
import { listCampaignsForAffiliate, campaignKeyFor } from "@/lib/studio/campaigns";
import { buildStudioContext } from "@/lib/studio/context";
import { renderTemplate, validateValues } from "@/lib/studio/render";
import { buildZip, type ZipEntry } from "@/lib/studio/zip";
import type { EditableField, TemplateLayer } from "@/lib/studio/types";
import { requireStudioAccess } from "../../../../_util";

export const runtime = "nodejs";

const enc = new TextEncoder();
const MAX_TEMPLATES = 12;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, userId, error } = await requireStudioAccess();
  if (error || !profile || !userId) {
    return error ?? NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (isRateLimited(`studio-kit:${userId}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many kit downloads — try again in a minute" }, { status: 429 });
  }

  const { id } = await params;
  const mine = await listCampaignsForAffiliate(profile.id);
  const found = mine.find((c) => c.campaign.id === id);
  if (!found) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const c = found.campaign;
  const ctx = await buildStudioContext(profile);

  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
  const captionStarter = [
    c.requiredCaptionSnippet ?? "",
    found.trackedLink,
    (c.requiredHashtags ?? []).join(" "),
  ].filter((s) => s.trim().length > 0).join("\n\n");

  const readme = [
    `${c.name} — WorldEye Campaign Kit`,
    `Runs: ${fmtDate(c.startsAt)} → ${fmtDate(c.endsAt)}`,
    `Rewards: ${c.xpReward} XP + ${c.creditReward} Studio credits`,
    "",
    `Goal: ${c.goal}`,
    "",
    c.description,
    "",
    "POSTING CHECKLIST",
    `- Post on ${c.channels?.length ? c.channels.join(", ") : "your channel"} before ${fmtDate(c.endsAt)}.`,
    ...(c.requiredCaptionSnippet ? ["- Include the required caption snippet, word for word (see caption-starter.txt)."] : []),
    ...((c.requiredHashtags ?? []).length ? ["- Include every required hashtag (see caption-starter.txt)."] : []),
    "- Link to the campaign landing page using your tracked link (see links.txt).",
    "- Add your #ad disclosure — see https://worldeye.app/affiliates/studio/compliance",
    "- After posting, return to the campaign page, paste your post URL, and claim your rewards.",
    "",
    "ABOUT THE TEMPLATE RENDERS",
    "templates/ holds a preview render of each campaign template, personalized with your",
    "referral link, discount code and QR. Open any template in the Studio creator to edit",
    "the text and export at full resolution.",
    "",
    `Generated for affiliate code ${ctx.code} — links in this kit credit your account.`,
  ].join("\n");

  const links = [
    `My tracked campaign link: ${found.trackedLink}`,
    `Campaign landing page: ${c.landingUrl}`,
    `My referral link: ${ctx.link}`,
    `My discount code: ${ctx.couponCode ?? "(activates once synced at checkout)"}`,
  ].join("\n");

  const entries: ZipEntry[] = [
    { name: "README.txt", data: enc.encode(readme) },
    { name: "caption-starter.txt", data: enc.encode(captionStarter) },
    { name: "links.txt", data: enc.encode(links) },
  ];

  // Personalized preview renders for the campaign's templates.
  const slugs = (c.templateSlugs ?? []).slice(0, MAX_TEMPLATES);
  const skipped: string[] = [];
  if (slugs.length) {
    const now = new Date();
    const templates = await db.marketingTemplate.findMany({
      where: { slug: { in: slugs }, active: true, OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
    });
    const bySlug = new Map(templates.map((t) => [t.slug, t]));
    for (const slug of slugs) {
      const t = bySlug.get(slug);
      if (!t?.svgBody || (t.category === "ambassador" && !profile.isAmbassador)) {
        skipped.push(slug);
        continue;
      }
      const fields: EditableField[] = Array.isArray(t.editableFields) ? (t.editableFields as unknown as EditableField[]) : [];
      const layers: TemplateLayer[] = Array.isArray(t.layers) ? (t.layers as unknown as TemplateLayer[]) : [];
      const validated = validateValues(fields, {});
      if ("error" in validated) { skipped.push(slug); continue; }
      try {
        const rendered = await renderTemplate({
          template: { slug: t.slug, width: t.width, height: t.height, svgBody: t.svgBody, assetUrl: t.assetUrl, updatedAt: t.updatedAt },
          fields, layers, ctx, values: validated.values, format: "png", scale: 0.5,
        });
        entries.push({ name: `templates/${t.slug}.png`, data: new Uint8Array(rendered.buffer) });
      } catch {
        skipped.push(slug);
      }
    }
  }
  if (skipped.length) {
    entries.push({
      name: "templates/NOTES.txt",
      data: enc.encode(
        `These templates couldn't be rendered into the kit: ${skipped.join(", ")}.\nOpen them in the Studio creator instead: https://worldeye.app/affiliates/studio/library`,
      ),
    });
  }

  const zip = buildZip(entries);
  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="worldeye-kit-${campaignKeyFor(c.id)}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
