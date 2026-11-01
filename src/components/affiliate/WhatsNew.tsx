// "What's new" — the affiliate-suite feature list in plain language.
// Shared by the advertise surfaces (/affiliates today; partner pages can
// render the same component). Every line names a feature that shipped
// in this dashboard — nothing aspirational.
import { SectionTitle } from "@/components/affiliate/ui";
import Link from "next/link";
import HideForAffiliates from "@/components/affiliate/HideForAffiliates";

const FEATURES: { title: string; body: string }[] = [
  { title: "Marketing Studio", body: "73 templates personalized with your real link, discount code and QR — image and video creators for Reels, TikTok, Stories and carousels, a caption generator, campaign kits, a daily content drop, and the Repurposing Machine for turning your own videos into platform-ready variations." },
  { title: "Live demo", body: "This page's new Live demo button opens the real dashboard on a sample dataset — explore everything before you join." },
  { title: "Live overview", body: "A stats header with 7/30/90-day and all-time ranges that refreshes itself — clicks, signups, new paying subscribers and earnings, always current." },
  { title: "Earnings chart, your way", body: "Earnings and clicks charted daily, weekly or monthly, so trends read the way you think about them." },
  { title: "Tracking links + UTM builder", body: "Create labeled links per channel — one for a video, one for your newsletter — each with its own clicks and signups, plus a UTM builder for campaign tags." },
  { title: "The full funnel", body: "Clicks → signups → started a plan → paying, with the conversion rate at every step, so you can see exactly where people drop off." },
  { title: "Commission ledger with plans", body: "Every commission shows its level (direct, L2, L3), the plan it came from, and its state — in the 30-day hold, available, or paid." },
  { title: "Payout center", body: "Pending vs available balances, full payout history, your payout method — and a personal threshold if you prefer fewer, larger payouts (never below the $25 minimum)." },
  { title: "Team view", body: "Your 3-level network with each person's activity and exactly what their sales earned you in overrides." },
  { title: "Rank progress & history", body: "An XP bar to your next rank, the whole ladder with the pay and unlocks at every rung, and the dates you reached each rank." },
  { title: "Retention view", body: "Which of your referred subscribers are paying, trialing, past due or churned — plus a trial→paid quality score for your traffic." },
  { title: "Creative performance", body: "What you've made in the Studio, counted per template — with honest zeros where a stat isn't tracked yet instead of made-up numbers." },
  { title: "Notification center", body: "Signups, conversions, first commissions and payout decisions land in your dashboard inbox as they happen." },
  { title: "Missions hub", body: "Daily, weekly and monthly missions wired into the XP system — complete them, climb ranks, raise your rate." },
  { title: "Leaderboard, monthly + all-time", body: "See where you stand this month and all-time, with your own position highlighted — and a privacy opt-out if you'd rather not be listed." },
  { title: "Source breakdown", body: "Where your clicks come from — platform, UTM source and campaign, device — from what your links actually capture, labelled honestly when a dimension isn't tracked." },
  { title: "One-tap share kit", body: "Share to X, WhatsApp, Telegram and more in one tap, or copy a ready-made blurb carrying your link and discount code." },
  { title: "CSV export", body: "Download your clicks, commissions and payouts as spreadsheets whenever you want your own numbers." },
  { title: "Plain-language help", body: "Every term in the panel — pending, hold, override, attribution — explained in plain words right where it's used." },
  { title: "Cinematic Director switch", body: "Affiliates can switch the globe's Cinematic Director camera tools on from the dashboard (they stay off by default) — scripted flights, presets and globe recording for your content." },
];

export default function WhatsNew() {
  return (
    <section>
      <SectionTitle kicker="Just shipped" title="What's new in the affiliate panel" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5">
            <div className="text-white font-bold">{f.title}</div>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
      <HideForAffiliates>
        <p className="mt-4 text-sm text-slate-400">
          See it all working: <Link href="/affiliates/demo" className="text-cyan-300 hover:underline font-mono">open the live demo →</Link>
        </p>
      </HideForAffiliates>
    </section>
  );
}
