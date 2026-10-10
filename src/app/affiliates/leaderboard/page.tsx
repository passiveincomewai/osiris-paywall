import LeaderboardClient from "./LeaderboardClient";

export const metadata = {
  title: "Affiliate Leaderboard — WorldEye Affiliates",
  description: "Top WorldEye affiliates by paying referrals, revenue, XP, and network growth. Rankings from verified sales only.",
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
    </div>
  );
}
