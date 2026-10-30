import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, PiggyBank } from "lucide-react";
import { auth } from "@/auth";
import SiteFooter from "@/components/SiteFooter";
import PowderPassPromo from "@/components/PowderPassPromo";
import PassValueTracker, {
  type PassValueStateData,
} from "@/components/PassValueTracker";
import { powderPassEnabled } from "@/lib/ski/access";
import { resolveSkiAccess } from "@/lib/ski/access-server";
import { formatSkiedOn, getPassValueState } from "@/lib/ski/pass-value";
import { SKI_RESORTS } from "@/lib/ski-resorts";

export const metadata: Metadata = {
  title: "Pass-Value Tracker — What Your Ski Pass Really Costs Per Day",
  description:
    "Powder Pass members: log the days you ski against what you paid for your pass and see your true cost per day — computed only from your own numbers.",
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
          <span className="text-white/80">Pass value</span>
        </nav>
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <PiggyBank className="w-3.5 h-3.5" /> PASS-VALUE TRACKER
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            What your pass really costs per day
          </h1>
          <p className="mt-4 text-white/55 leading-relaxed">
            Enter what you paid for your pass, log each day you ski, and watch
            your cost per day fall — every figure computed from your numbers
            alone.
          </p>
        </div>
        {children}
      </div>
      <SiteFooter />
    </main>
  );
}

export default async function PassValuePage() {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  /* Anonymous → sign-in prompt (a prompt, not a redirect, so the page
     explains the tracker before asking for anything). */
  if (!userId) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            The pass-value tracker is a Powder Pass member tool: enter what
            you paid for your season pass, log the days you ski, and see your
            true cost per day — and, if you add your typical day-ticket
            price, the day your pass paid for itself. Sign in to use yours.
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

  /* Signed in without ski access → honest explanation + the promo. */
  const hasAccess = await resolveSkiAccess(userId).catch(() => false);
  if (!hasAccess) {
    return (
      <Shell>
        <div className="mt-10 max-w-2xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 text-center">
          <p className="text-white/70 leading-relaxed">
            The pass-value tracker is a Powder Pass feature. Powder Pass is
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

  /* Member → the tracker, seeded with their saved state. */
  const state = await getPassValueState(userId);
  const initial: PassValueStateData = {
    season: state.season
      ? {
          label: state.season.label,
          costCents: state.season.costCents,
          dayPriceCents: state.season.dayPriceCents,
        }
      : null,
    days: state.days.map(d => ({
      id: d.id,
      skiedOn: formatSkiedOn(d.skiedOn),
      resortSlug: d.resortSlug,
    })),
    summary: state.summary,
  };
  const resorts = SKI_RESORTS.map(r => ({ slug: r.slug, name: r.name })).sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  return (
    <Shell>
      <div className="max-w-4xl mx-auto">
        <PassValueTracker initial={initial} resorts={resorts} />
      </div>
    </Shell>
  );
}
