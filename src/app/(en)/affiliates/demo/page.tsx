// /affiliates/demo — the demo hub: the real affiliate dashboard running
// on a clearly-labelled sample dataset, inside the demo shell (bar,
// section nav, terms modal — see affiliates/demo/layout.tsx). Public on
// purpose (no sign-in): it's the fastest way to show a prospective
// affiliate or partner exactly what the program's tooling looks like.
// Read-only; the sample figures are illustrative and are never
// presented as real earnings. The other five suite surfaces live at
// /affiliates/demo/{studio,missions,network,leaderboard,resources}.
import Link from "next/link";
import { SectionTitle } from "@/components/affiliate/ui";
import AffiliateDemoSection from "@/components/affiliate/AffiliateDemoSection";
import { DemoJoinButton } from "@/components/affiliate/DemoShell";

export const metadata = {
  title: "Live Demo — WorldEye Affiliates",
  description:
    "Explore the real WorldEye affiliate suite on a sample dataset: dashboard, Marketing Studio, missions, network, leaderboard and resources. Demo figures are illustrative.",
};

export default function AffiliateDemoPage() {
  return (
    <div className="space-y-8">
      <div className="text-center pt-2">
        <SectionTitle kicker="Live demo" title="The affiliate suite, live" />
        <p className="max-w-2xl mx-auto text-slate-300 leading-relaxed -mt-2">
          This is the actual tooling our affiliates use — same screens, same features — running on a
          sample dataset so you can explore it without an account. Every figure is illustrative and
          every person is a labelled sample. When you join (free), these screens fill with your real
          clicks, signups and commissions. Use the tabs above to tour the Studio, Missions, Network,
          Leaderboard and Resources.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <DemoJoinButton
            className="px-6 py-3 rounded-2xl font-mono font-black text-[#04121f]"
            style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 28px rgba(0,150,255,.5)" }}>
            Become an Affiliate — Free
          </DemoJoinButton>
          <Link href="/affiliates" className="px-6 py-3 rounded-2xl font-mono font-bold border border-white/20 text-slate-200 hover:bg-white/5">
            Back to the program page
          </Link>
        </div>
      </div>
      <AffiliateDemoSection />
    </div>
  );
}
