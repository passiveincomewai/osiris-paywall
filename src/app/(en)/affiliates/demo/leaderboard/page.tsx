// /affiliates/demo/leaderboard — the real Leaderboard screen on sample
// boards. Every handle is fictional and labelled "(sample)"; no real
// affiliate appears here (the live board renders empty until real
// affiliates post verified sales — the demo never borrows real names).
import LeaderboardClient from "../../leaderboard/LeaderboardClient";
import { DemoSectionFrame } from "@/components/affiliate/DemoShell";
import { buildDemoLeaderboard } from "@/lib/affiliate/demo-data";

export const metadata = {
  title: "Demo Leaderboard — WorldEye Affiliates",
  description:
    "Tour the WorldEye affiliate leaderboard on sample data: monthly referrals, revenue, XP and growth boards. All entries are labelled samples.",
};

export default function DemoLeaderboardPage() {
  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Hall of Fame</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Leaderboard</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          The best-performing WorldEye affiliates. Rankings update from verified subscription sales only —
          affiliates who opt out are hidden from public boards. This demo board is filled with
          labelled sample affiliates so you can see how each view works.
        </p>
      </div>
      <DemoSectionFrame>
        <LeaderboardClient demo={{ boards: buildDemoLeaderboard() }} />
      </DemoSectionFrame>
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <h2 className="text-lg font-bold text-white">How the leaderboard works</h2>
        <p className="text-sm text-slate-300 leading-relaxed mt-3">
          The board ranks WorldEye affiliates across five views: this month&apos;s
          paying referrals, top qualifying subscription revenue, most XP earned,
          all-time revenue leaders, and the fastest-growing networks by verified
          clicks. Rankings are computed from verified subscription sales only —
          never from signups, clicks alone, or self-referrals. Affiliates who opt
          out of public visibility are hidden from the board. Names and figures
          on this demo page are samples, not real affiliates or earnings.
        </p>
      </section>
    </div>
  );
}
