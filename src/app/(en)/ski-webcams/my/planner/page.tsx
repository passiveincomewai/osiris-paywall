import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Sunrise } from "lucide-react";
import { auth } from "@/auth";
import SiteFooter from "@/components/SiteFooter";
import PowderPassPromo from "@/components/PowderPassPromo";
import SkiFirstChairPlanner from "@/components/SkiFirstChairPlanner";
import { powderPassEnabled } from "@/lib/ski/access";
import { resolveSkiAccess } from "@/lib/ski/access-server";
import { listFollowedSlugs } from "@/lib/ski/follows";
import { getSkiResort } from "@/lib/ski-resorts";

export const metadata: Metadata = {
  title: "First-Chair Planner — Leave-By Time From Sunrise + Drive",
  description:
    "Powder Pass members: pick a followed resort and a saved route, and get a leave-by time from sunrise and your real drive time.",
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-white/45 mb-10">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/ski-webcams" className="hover:text-white transition">Ski webcams</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/ski-webcams/my" className="hover:text-white transition">My Powder</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-white/80">First-chair planner</span>
        </nav>
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Sunrise className="w-3.5 h-3.5" /> FIRST-CHAIR PLANNER
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            When do you need to leave?
          </h1>
          <p className="mt-4 text-white/55 leading-relaxed">
            Pick a resort you follow and a route you saved, choose to arrive
            by sunrise or at a time of your own, and the planner subtracts
            your real drive time and your prep buffer to give you a leave-by
            time — with the arithmetic shown. Sunrise is modelled
            (Open-Meteo) and labelled with its fetch time. Lift-open times
            aren&apos;t included — no verified source publishes them.
          </p>
        </div>
        {children}
      </div>
      <SiteFooter />
    </main>
  );
}

export default async function FirstChairPlannerPage() {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            The first-chair planner builds a leave-by time from the resorts
            you follow and the routes you save. Sign in to see yours.
          </p>
          <Link
            href="/signin"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Sign in
          </Link>
        </div>
      </Shell>
    );
  }

  const hasAccess = await resolveSkiAccess(userId).catch(() => false);
  if (!hasAccess) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            The first-chair planner is a Powder Pass feature. Powder Pass is
            WorldEye&apos;s ski-only membership, and VIP Pro annual already
            includes it — Weekly and Monthly Pro do not.
          </p>
        </div>
        {powderPassEnabled(process.env) && (
          <div className="max-w-4xl mx-auto">
            <PowderPassPromo />
          </div>
        )}
      </Shell>
    );
  }

  /* Followed resorts are the planner's resort choices. Saved routes
     are browser-local, so the plan itself is composed by the client
     component below; the server only supplies follows. */
  const slugs = await listFollowedSlugs(userId).catch(() => [] as string[]);
  const followed = slugs
    .map((s) => getSkiResort(s))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ slug: r.slug, name: r.name, lat: r.lat, lng: r.lng }));

  return (
    <Shell>
      <SkiFirstChairPlanner followed={followed} />
      <p className="mt-10 text-center text-sm text-white/45">
        Back to{" "}
        <Link href="/ski-webcams/my" className="font-semibold text-[#00E5FF] hover:underline">
          My Powder
        </Link>{" "}
        ·{" "}
        <Link href="/ski-webcams" className="font-semibold text-[#00E5FF] hover:underline">
          Browse all ski resorts
        </Link>
      </p>
    </Shell>
  );
}
