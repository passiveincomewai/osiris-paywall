import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import StudioHomeClient, {
  type StudioCreationLite,
  type StudioTemplateLite,
} from "./StudioHomeClient";

export const metadata = { title: "Marketing Studio — WorldEye Affiliates" };

/**
 * Marketing Studio home.
 *
 * Auth/profile handling mirrors the dashboard page: unauthenticated users are
 * redirected to sign-in, and the client resolves the affiliate profile via
 * GET /api/affiliate/me (showing the join pitch when there is no profile).
 *
 * Featured templates + recent creations are loaded server-side where the
 * Studio tables are available; any failure degrades to empty initial data and
 * the client fills in from the Studio API instead.
 */
export default async function StudioHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio");

  let initialFeatured: StudioTemplateLite[] = [];
  let initialCreations: StudioCreationLite[] = [];
  let initialTemplateCount = 0;

  try {
    // The Studio models are owned by the Studio API workstream; access them
    // defensively so this page never breaks if they are not generated yet.
    const dbAny = db as unknown as Record<string, unknown>;
    const templateDelegate = dbAny.marketingTemplate as
      | {
          findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
          count: () => Promise<number>;
        }
      | undefined;

    if (templateDelegate) {
      const rows = await templateDelegate.findMany({
        where: { featured: true },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        take: 12,
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          kind: true,
          format: true,
          width: true,
          height: true,
          assetUrl: true,
          editableFields: true,
          carouselGroup: true,
          slideIndex: true,
          featured: true,
          sortOrder: true,
          tags: true,
        },
      });
      initialFeatured = rows.map((r) => ({
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
      initialTemplateCount = await templateDelegate.count();
    }

    const userId = session.user.id;
    if (userId) {
      const profile = await db.affiliateProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      const creationDelegate = dbAny.studioCreation as
        | {
            findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
          }
        | undefined;
      if (profile && creationDelegate) {
        const rows = await creationDelegate
          .findMany({
            where: { affiliateProfileId: profile.id },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: {
              id: true,
              templateSlug: true,
              title: true,
              kind: true,
              values: true,
              createdAt: true,
            },
          })
          .catch(() => [] as Record<string, unknown>[]);
        initialCreations = rows.map((r) => ({
          id: String(r.id),
          templateSlug: (r.templateSlug as string | null) ?? null,
          title: (r.title as string | null) ?? null,
          kind: (r.kind as string | null) ?? null,
          values:
            r.values && typeof r.values === "object"
              ? (r.values as Record<string, unknown>)
              : null,
          createdAt:
            r.createdAt instanceof Date
              ? r.createdAt.toISOString()
              : String(r.createdAt ?? new Date().toISOString()),
        }));
      }
    }
  } catch {
    // Non-fatal: the client loads everything from the Studio API.
    initialFeatured = [];
    initialCreations = [];
    initialTemplateCount = 0;
  }

  return (
    <StudioHomeClient
      initialFeatured={initialFeatured}
      initialCreations={initialCreations}
      initialTemplateCount={initialTemplateCount}
    />
  );
}
