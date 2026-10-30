// /affiliates/demo/studio — the demo Marketing Studio: the REAL studio
// home (StudioHomeClient) on the demo persona. Demo-mode by design and
// independent of the live Studio's gates/public switch: no sign-in, no
// membership check — the page never calls the Studio gate. Featured
// templates are the live catalog, loaded server-side with the same
// defensive pattern as the real studio home; the persona and creations
// are labelled samples from lib/affiliate/demo-data.
import { db } from "@/lib/db";
import StudioHomeClient, {
  type StudioCreationLite,
  type StudioTemplateLite,
} from "../../studio/StudioHomeClient";
import { DemoSectionFrame } from "@/components/affiliate/DemoShell";
import {
  buildDemoStudioMe, buildDemoStudioCreations,
} from "@/lib/affiliate/demo-data";

export const metadata = {
  title: "Demo Marketing Studio — WorldEye Affiliates",
  description:
    "Tour the WorldEye affiliate Marketing Studio on sample data: templates, creations and your personalized creative home. Demo figures are illustrative.",
};

export default async function DemoStudioPage() {
  let featured: StudioTemplateLite[] = [];
  let templateCount = 0;

  try {
    // Same defensive delegate access as the live studio home: if the
    // Studio tables are unavailable the demo degrades to an empty rail.
    const dbAny = db as unknown as Record<string, unknown>;
    const templateDelegate = dbAny.marketingTemplate as
      | {
          findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
          count: () => Promise<number>;
        }
      | undefined;

    if (templateDelegate) {
      const rows = await templateDelegate.findMany({
        where: { featured: true, category: { not: "ambassador" } },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        take: 12,
        select: {
          id: true, slug: true, title: true, category: true, kind: true,
          format: true, width: true, height: true, assetUrl: true,
          editableFields: true, carouselGroup: true, slideIndex: true,
          featured: true, sortOrder: true, tags: true,
        },
      });
      featured = rows.map((r) => ({
        id: String(r.id),
        slug: String(r.slug),
        title: String(r.title),
        category: String(r.category ?? ""),
        kind: String(r.kind ?? "image"),
        format: (r.format as string | null) ?? null,
        width: Number(r.width ?? 0),
        height: Number(r.height ?? 0),
        assetUrl: (r.assetUrl as string | null) ?? null,
        editableFields: r.editableFields ?? [],
        carouselGroup: (r.carouselGroup as string | null) ?? null,
        slideIndex: (r.slideIndex as number | null) ?? null,
        featured: Boolean(r.featured),
        sortOrder: Number(r.sortOrder ?? 0),
        tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      }));
      templateCount = await templateDelegate.count();
    }
  } catch {
    featured = [];
    templateCount = 0;
  }

  const creations = buildDemoStudioCreations() as unknown as StudioCreationLite[];

  return (
    <DemoSectionFrame>
      <StudioHomeClient
        initialFeatured={featured}
        initialCreations={creations}
        initialTemplateCount={templateCount}
        demo={{
          me: buildDemoStudioMe(),
          featured,
          creations,
          templateCount,
        }}
      />
    </DemoSectionFrame>
  );
}
