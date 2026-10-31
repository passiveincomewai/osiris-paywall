import LeaderboardClient from "./LeaderboardClient";

export const metadata = {
  title: "Affiliate Leaderboard — WorldEye Affiliates",
  description: "Top WorldEye affiliates by paying referrals, revenue, XP, and network growth. Rankings from verified sales only.",
  // R49 (site-audit Wave 3): the public board stays out of the index
  // while it has no established ranked entries to show — follow stays
  // on so the affiliate section's other pages keep their link equity.
  robots: { index: false, follow: true },
  // Self-canonical: without this, the page inherits the root layout's
  // canonical (the homepage) and Google treats it as a copy of /.
  alternates: { canonical: "https://worldeye.app/affiliates/leaderboard" },
};

export default function LeaderboardPage() {
  return (
    <div>
      <div className="mb-6">
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Hall of Fame</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Leaderboard</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          The best-performing WorldEye affiliates. Rankings update from verified subscription sales only —
          affiliates who opt out are hidden from public boards.
        </p>
      </div>
      <LeaderboardClient />

      {/* Server-rendered explainer: the board itself is client-rendered,
          so this section is what search engines and first paint see. */}
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <h2 className="text-lg font-bold text-white">How the leaderboard works</h2>
        <p className="text-sm text-slate-300 leading-relaxed mt-3">
          The board ranks WorldEye affiliates across five views: this month&apos;s
          paying referrals, top qualifying subscription revenue, most XP earned,
          all-time revenue leaders, and the fastest-growing networks by verified
          clicks. Rankings are computed from verified subscription sales only —
          never from signups, clicks alone, or self-referrals. Affiliates who opt
          out of public visibility are hidden from the board.
        </p>
      </section>
    </div>
  );
}
