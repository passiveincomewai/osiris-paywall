// WorldEye Affiliates — public landing page (server component, no auth).
import Link from "next/link";
import { RankBadge, SectionTitle, Pill, StatCard, XpBar } from "@/components/affiliate/ui";
import AffiliatePersonal from "@/components/affiliate/AffiliatePersonal";
import ShareLinkBlock from "@/components/share/ShareLinkBlock";
import EarningsCalculator from "@/components/affiliate/EarningsCalculator";
import CreatorApply from "@/components/affiliate/CreatorApply";

const CTA = "/api/auth/signin?callbackUrl=/affiliates/dashboard";

const TIERS: { name: string; xp: string; rate: string; code: string; badge: string; color: string; perk?: string }[] = [
  { name: "Explorer",  xp: "0 XP",       rate: "15%", code: "5% off", badge: "🧭", color: "#38bdf8" },
  { name: "Scout",     xp: "1,000 XP",    rate: "18%", code: "10% off", badge: "🔭", color: "#22d3ee" },
  { name: "Analyst",   xp: "3,000 XP",    rate: "21%", code: "15% off", badge: "📡", color: "#818cf8" },
  { name: "Commander", xp: "7,500 XP",    rate: "24%", code: "20% off", badge: "🎖️", color: "#c084fc" },
  { name: "Elite",     xp: "15,000 XP",   rate: "27%", code: "25% off", badge: "💠", color: "#f472b6" },
  { name: "Visionary", xp: "30,000 XP",   rate: "30%", code: "30% off", badge: "👁️", color: "#fbbf24", perk: "👁️ Free WorldEye Pro included at this rank" },
];

const FAQS = [
  {
    q: "Is it really free?",
    a: "Yes. Joining the WorldEye affiliate program costs nothing and is open to anyone legally eligible to participate — you do not need to be a WorldEye subscriber to join or earn.",
  },
  {
    q: "When do I get paid?",
    a: "Commissions sit in a pending state for a 30-day holding period after the underlying subscription payment clears, then become available in your payout balance. Once your available balance reaches the $25 minimum, you can request a payout, which is reviewed and processed by our team.",
  },
  {
    q: "Do I need to buy WorldEye Pro to participate?",
    a: "No. There is no purchase requirement, no signup fee, and no sales quota. Affiliates are never required to buy anything to join or stay in the program.",
  },
  {
    q: "Is income guaranteed?",
    a: "No. Commissions are earned only from legitimate, paid WorldEye subscriptions — never from recruitment alone. Your earnings depend entirely on real customers subscribing through your referral link.",
  },
  {
    q: "How do the discount codes work?",
    a: "Every rank carries a personal discount code — 5% off for your audience at Explorer, rising to 30% off at Visionary. A sale made with your code counts as your referral even if the buyer never clicked your link, so codes work in videos, podcasts and print where links don't.",
  },
  {
    q: "What happens if someone I referred cancels?",
    a: "You earn on every qualifying renewal while they stay subscribed — so a cancellation simply means the renewals (and the commissions on them) stop there.",
  },
  {
    q: "Can I promote WorldEye anywhere?",
    a: "Share your link and code wherever you have a genuine audience — social posts, videos, streams, newsletters, communities. What you can't do is manufacture activity: fake clicks, self-referrals and duplicate accounts are checked for and earn nothing, and abuse can end a comp or an account.",
  },
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 md:p-6 relative overflow-hidden ${className}`}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)" }}>
      {children}
    </div>
  );
}

export default function AffiliatesLanding() {
  return (
    <div className="space-y-16 md:space-y-24">
      {/* ── 0. PERSONAL (signed-in visitors) ──────────────────── */}
      <AffiliatePersonal />

      {/* ── 0b. YOUR SHARE LINK (everyone — no account needed) ── */}
      <ShareLinkBlock />

      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section className="relative text-center pt-6 md:pt-12">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[560px] h-[280px] rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: "radial-gradient(ellipse,#0096FF,transparent)" }} />
        <Pill color="#22d3ee">FREE TO JOIN — NO PURCHASE NECESSARY</Pill>
        <h1 className="mt-5 text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.05]">
          TURN YOUR NETWORK<br />
          INTO <span className="text-transparent bg-clip-text"
            style={{ backgroundImage: "linear-gradient(135deg,#38bdf8,#0096FF 45%,#22d3ee)" }}>
            RECURRING INCOME.
          </span>
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-slate-300 text-base md:text-lg leading-relaxed">
          Join WorldEye&apos;s free affiliate program. Earn 15%–30% in recurring direct commissions,
          unlock higher rewards, and earn additional commissions from qualifying subscription sales
          throughout your referral network.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={CTA}
            className="px-8 py-4 rounded-2xl text-lg font-mono font-black text-[#04121f] transition-transform hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 32px rgba(0,150,255,.55)" }}>
            Become an Affiliate — Free
          </Link>
          <Link href="#how" className="px-8 py-4 rounded-2xl text-lg font-mono font-bold border border-white/20 text-slate-200 hover:bg-white/5 transition-colors">
            How it works
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
          <StatCard label="Direct commission" value="15–30%" sub="recurring, by rank" accent="#38bdf8" />
          <StatCard label="Network depth" value="3 levels" sub="you + 2 override tiers" accent="#22d3ee" />
          <StatCard label="Attribution" value="30 days" sub="cookie window" accent="#818cf8" />
          <StatCard label="Min. payout" value="$25" sub="30-day holding period" accent="#c084fc" />
        </div>
      </section>

      {/* ── 2. HOW IT WORKS ─────────────────────────────────── */}
      <section id="how">
        <SectionTitle kicker="Protocol" title="How it works" />
        <img src="/affiliate-icons/steps-strip.png" alt="Join, share, earn, level up"
          className="w-full h-auto rounded-2xl border border-white/10 mb-4" />
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: "01", t: "Share your link", d: "Get your unique referral URL — worldeye.app/ref/YOURCODE — plus QR codes and ready-made share kits for every platform.", c: "#38bdf8", icon: "/affiliate-icons/join.png" },
            { n: "02", t: "They subscribe to Pro", d: "Anyone who signs up through your link is attributed to you for 30 days. When they buy WorldEye Pro, you earn.", c: "#22d3ee", icon: "/affiliate-icons/commission.png" },
            { n: "03", t: "Earn every billing cycle", d: "Commissions don't stop at the first payment — you earn on every qualifying renewal for as long as they stay subscribed.", c: "#818cf8", icon: "/affiliate-icons/earnings.png" },
          ].map((s) => (
            <Card key={s.n}>
              <div className="flex items-start justify-between">
                <div className="font-mono text-4xl font-black" style={{ color: s.c, textShadow: `0 0 20px ${s.c}66` }}>{s.n}</div>
                <img src={s.icon} alt="" className="w-16 h-16 object-contain -mt-1"
                  style={{ filter: `drop-shadow(0 0 14px ${s.c}55)` }} />
              </div>
              <div className="mt-3 text-lg font-bold text-white">{s.t}</div>
              <div className="mt-2 text-sm text-slate-400 leading-relaxed">{s.d}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 3. COMMISSION TIERS ─────────────────────────────── */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <img src="/affiliate-icons/ranks.png" alt="Rank tiers" className="w-14 h-14 md:w-16 md:h-16 object-contain shrink-0"
            style={{ filter: "drop-shadow(0 0 16px rgba(192,132,252,.45))" }} />
          <SectionTitle kicker="Ranks" title="Six ranks. Bigger network, bigger cut." />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIERS.map((t) => (
            <Card key={t.name}>
              <RankBadge name={t.name} badge={t.badge} color={t.color} glow={t.color + "55"} />
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-[10px] font-mono tracking-[0.2em] text-slate-500 uppercase">Required</div>
                  <div className="text-white font-mono font-bold">{t.xp}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono tracking-[0.2em] text-slate-500 uppercase">Commission</div>
                  <div className="text-3xl font-black font-mono" style={{ color: t.color }}>{t.rate}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-[10px] font-mono tracking-[0.2em] text-slate-500 uppercase">Your code</span>
                <span className="text-sm font-mono font-bold text-emerald-300">{t.code} <span className="text-slate-400 font-normal">for your audience</span></span>
              </div>
              {t.perk && (
                <div className="mt-3 rounded-xl border px-3 py-2 text-xs font-mono font-bold"
                  style={{ borderColor: t.color + "55", background: t.color + "14", color: t.color }}>
                  {t.perk}
                </div>
              )}
            </Card>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-400 font-mono">
          <span className="text-cyan-300">//</span> Earn XP from real activity to climb ranks. Commissions recur on
          qualifying subscription <span className="text-white">renewals</span> — not just the first purchase.
          Every rank also carries a personal discount code for your audience (5% at Explorer, up to 30% at Visionary),
          and sales made with your code count as your referrals even without your link.
          Reach <span className="text-[#fbbf24]">Visionary</span> and WorldEye Pro itself is free while you hold the rank.
        </p>
      </section>

      {/* ── 3a. WHO IT'S FOR ───────────────────────────────── */}
      <section>
        <SectionTitle kicker="Fit" title="Who this program is for" />
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { t: "Creators & streamers", d: "You already show maps, cameras, flights or storms to an audience. WorldEye is content that films itself — and with 25,000+ followers you can apply for free Pro below, then earn 15–30% on every subscriber your link brings in." },
            { t: "Community owners", d: "Discord servers, subreddits, weather and aviation groups, OSINT communities. Your members are exactly the people who keep a live globe open all day — give them your code and earn on the Pro upgrades." },
            { t: "Writers & newsletter authors", d: "A link in a tools roundup or a tracking guide keeps paying: commissions recur on renewals, not just the first purchase, and your discount code works for readers who subscribe later from a different device." },
            { t: "Anyone with an audience of one", d: "No following required. Start with the first-3-invites milestone: three friends through your link, and the moment one subscribes, your first commission and +500 XP land. Ranks climb from real activity, not from buying in." },
          ].map((c) => (
            <Card key={c.t}>
              <div className="text-lg font-bold text-white">{c.t}</div>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{c.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 3b. CREATORS: FREE PRO ──────────────────────────── */}
      <section id="creators">
        <SectionTitle kicker="Creators" title="Free Pro for creators" />
        <CreatorApply />
      </section>

      {/* ── 4. THREE-LEVEL NETWORK ──────────────────────────── */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <img src="/affiliate-icons/network.png" alt="Referral network" className="w-14 h-14 md:w-16 md:h-16 object-contain shrink-0"
            style={{ filter: "drop-shadow(0 0 16px rgba(34,211,238,.45))" }} />
          <SectionTitle kicker="Network" title="Three-level network earnings" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <div className="font-mono text-xs tracking-[0.25em] text-[#38bdf8] uppercase">Level 1 — Direct</div>
            <div className="mt-2 text-3xl font-black text-white font-mono">15–30%</div>
            <div className="mt-2 text-sm text-slate-400">Your rank&apos;s commission rate on every subscription bought through your affiliate link.</div>
          </Card>
          <Card>
            <div className="font-mono text-xs tracking-[0.25em] text-[#22d3ee] uppercase">Level 2 — Override</div>
            <div className="mt-2 text-3xl font-black text-white font-mono">+5%</div>
            <div className="mt-2 text-sm text-slate-400">An extra override on subscription sales from affiliates you directly recruited.</div>
          </Card>
          <Card>
            <div className="font-mono text-xs tracking-[0.25em] text-[#818cf8] uppercase">Level 3 — Override</div>
            <div className="mt-2 text-3xl font-black text-white font-mono">+2%</div>
            <div className="mt-2 text-sm text-slate-400">A further override on sales from your second level&apos;s recruits.</div>
          </Card>
        </div>
        <Card className="mt-4" >
          <div className="font-mono text-xs tracking-[0.25em] text-cyan-300 uppercase mb-3">// Example</div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 font-mono text-sm">
            {["You", "Alex (affiliate you recruited)", "Sarah (subscribes → you earn 5%)", "Sarah recruits Michael (you earn 2%)"].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-slate-200">{s}</div>
                {i < arr.length - 1 && <span className="text-[#0096FF] font-black hidden md:inline">→</span>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500 font-mono">
            Overrides are paid only on legitimate paid subscriptions — never for recruitment alone.
          </p>
        </Card>
      </section>

      {/* ── 4b. EARNINGS ESTIMATOR ──────────────────────────── */}
      <section>
        <SectionTitle kicker="Estimator" title="What could your network pay?" />
        <EarningsCalculator />
      </section>

      {/* ── 4c. FIRST-3 MILESTONE ────────────────────────────── */}
      <section>
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 w-[300px] h-[150px] rounded-full blur-3xl opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(ellipse,#D4AF37,transparent)" }} />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <SectionTitle kicker="Milestone" title="Your first 3 invites" />
              <p className="mt-3 text-slate-300 leading-relaxed max-w-xl">
                Every affiliate starts the same way: <span className="text-white font-bold">invite 3 friends</span>.
                Each friend who joins through your link counts toward your tracker — and the moment one of them
                subscribes to Pro, your first <span className="text-[#22d3ee] font-bold">+500 XP</span> and recurring
                commission land in your dashboard.
              </p>
              <div className="mt-4 flex items-center gap-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="w-10 h-10 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 flex items-center justify-center font-mono font-black text-[#D4AF37]">
                    {n}
                  </div>
                ))}
                <span className="ml-2 text-sm text-slate-400 font-mono">→ first commission</span>
              </div>
            </div>
            <Link href={CTA}
              className="shrink-0 px-8 py-4 rounded-2xl text-base font-mono font-black text-[#04121f] transition-transform hover:scale-[1.03]"
              style={{ background: "linear-gradient(135deg,#e8c55a,#D4AF37)", boxShadow: "0 0 28px rgba(212,175,55,.45)" }}>
              Start inviting — Free
            </Link>
          </div>
        </Card>
      </section>

      {/* ── 5. XP / MISSIONS TEASER ─────────────────────────── */}
      <section>
        <SectionTitle kicker="Gamified" title="XP, ranks & missions" right={
          <Link href={CTA} className="text-sm font-mono text-cyan-300 hover:text-white">Start earning XP →</Link>
        } />
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <div className="font-mono text-xs tracking-[0.25em] text-cyan-300 uppercase mb-3">// Earn XP for real wins</div>
            <ul className="space-y-2 text-sm text-slate-300">
              {[["Join the program", "+100 XP"], ["Complete onboarding", "+100 XP"], ["First verified referral visit", "+25 XP"], ["First paying referral", "+500 XP"], ["Every additional paying referral", "+150 XP"], ["Weekly challenges", "+200–500 XP"]].map(([t, x]) => (
                <li key={t} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                  <span>{t}</span><span className="font-mono font-bold text-[#22d3ee] whitespace-nowrap">{x}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="font-mono text-xs tracking-[0.25em] text-cyan-300 uppercase mb-3">// Rank up</div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">Scout → Analyst</span>
              <span className="font-mono text-xs text-slate-400">1,000 / 3,000 XP</span>
            </div>
            <XpBar pct={33} color="#22d3ee" />
            <p className="mt-4 text-sm text-slate-400 leading-relaxed">
              Daily, weekly and monthly missions keep the climb interesting — streaks, achievement badges
              and rank-up celebrations when you break through. Anti-abuse checks keep the game fair:
              fake clicks and duplicate accounts earn nothing.
            </p>
          </Card>
        </div>
      </section>

      {/* ── 6. TOOLS TEASER ─────────────────────────────────── */}
      <section>
        <SectionTitle kicker="Arsenal" title="Marketing tools, done for you" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[["🖼️", "Promo banners", "Sized for every platform"], ["📱", "QR codes", "One scan to your link"], ["✍️", "Caption templates", "Instagram, TikTok, X"], ["📧", "Email scripts", "Plug-and-play outreach"]].map(([e, t, d]) => (
            <Card key={t} className="text-center">
              <div className="text-3xl">{e}</div>
              <div className="mt-2 text-white font-bold">{t}</div>
              <div className="mt-1 text-xs text-slate-400">{d}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 6b. TRACKING & PAYOUTS, IN PLAIN TERMS ──────────── */}
      <section>
        <SectionTitle kicker="Mechanics" title="How tracking & payouts actually work" />
        <Card>
          <div className="space-y-4 text-sm md:text-base text-slate-300 leading-relaxed">
            <p>
              <span className="text-white font-bold">Attribution.</span>{" "}
              When someone visits WorldEye through your link
              (worldeye.app/ref/YOURCODE), they&apos;re attributed to you for
              30 days — if they subscribe within that window, the sale is
              yours, whether they buy on the first visit or come back three
              weeks later. Your rank&apos;s discount code is a second,
              link-free path: any sale made with your code counts as your
              referral even without a click.
            </p>
            <p>
              <span className="text-white font-bold">The dashboard.</span>{" "}
              Everything is visible in your affiliate dashboard: referral
              visits, conversions, XP and rank progress, missions, your
              network levels, and every commission with its state — pending,
              available, or paid. No spreadsheets, no asking support where a
              sale went.
            </p>
            <p>
              <span className="text-white font-bold">From sale to payout.</span>{" "}
              A commission starts as <em>pending</em> for a 30-day holding
              period after the subscription payment clears — that window
              covers refunds and chargebacks, so the money you see as
              available is money that stays. Once your available balance
              reaches the $25 minimum, you request a payout from the
              dashboard; requests are reviewed and processed by our team.
              Commissions then keep recurring on every renewal for as long as
              your referrals stay subscribed.
            </p>
            <p>
              <span className="text-white font-bold">The fair-play line.</span>{" "}
              Earnings come only from legitimate, paid subscriptions — never
              from recruitment alone, and never from manufactured activity.
              Fake clicks, duplicate accounts and self-referrals are checked
              for and earn nothing. The full rules live in the{" "}
              <Link href="/affiliates/terms" className="text-cyan-300 hover:underline">program terms</Link>.
            </p>
          </div>
        </Card>
      </section>

      {/* ── 6c. YOUR FIRST REFERRALS ────────────────────────── */}
      <section>
        <SectionTitle kicker="Playbook" title="Getting your first referrals" />
        <Card>
          <div className="space-y-4 text-sm md:text-base text-slate-300 leading-relaxed">
            <p>
              <span className="text-white font-bold">Start where your audience already is.</span>{" "}
              The share block at the top of this page gives you a link and a QR
              code with no account needed; your dashboard adds ready-made
              banners, caption templates and email scripts for every major
              platform. Use them before you invent your own — they carry your
              code automatically.
            </p>
            <p>
              <span className="text-white font-bold">Show, don&apos;t pitch.</span>{" "}
              The posts that convert for a live globe are demonstrations: a
              storm rolling into a coastline on camera, a Starlink train
              crossing your city, the view from a ski resort the morning of a
              powder day. Record the thing happening, put your code on it,
              and let the map do the selling.
            </p>
            <p>
              <span className="text-white font-bold">Put the code where links can&apos;t go.</span>{" "}
              Bios, video descriptions, podcast show notes, a pinned comment —
              anywhere a viewer might subscribe later, from a different
              device, your discount code still attributes the sale to you.
              Then watch the dashboard: referral visits, XP and your first
              +500 for a paying referral tell you which channel is actually
              working.
            </p>
          </div>
        </Card>
      </section>

      {/* ── 7. FAQ ──────────────────────────────────────────── */}
      <section>
        <SectionTitle kicker="Intel" title="Frequently asked questions" />
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md overflow-hidden">
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 text-white font-bold hover:bg-white/[0.03]">
                {f.q}
                <span className="font-mono text-cyan-300 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* ── 8. FINAL CTA ────────────────────────────────────── */}
      <section>
        <Card className="text-center py-10 md:py-14 relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[200px] rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(ellipse,#22d3ee,transparent)" }} />
          <h2 className="text-3xl md:text-4xl font-black text-white">Ready to enter the grid?</h2>
          <p className="mt-3 text-slate-300 max-w-xl mx-auto">
            Free to join. Paid on real sales. Climb from Explorer to Visionary and turn your network into recurring income.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 md:gap-8">
            {[
              ["/affiliate-icons/s1-open-everyone.png", "Open to everyone"],
              ["/affiliate-icons/s1-trusted-secure.png", "Trusted & secure"],
              ["/affiliate-icons/s1-global-platform.png", "Global platform"],
            ].map(([src, label]) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <img src={src} alt={label} className="w-12 h-12 md:w-14 md:h-14 object-contain"
                  style={{ filter: "drop-shadow(0 0 12px rgba(56,189,248,.4))" }} />
                <span className="text-[11px] font-mono text-slate-400">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-7">
            <Link href={CTA}
              className="inline-block px-10 py-4 rounded-2xl text-lg font-mono font-black text-[#04121f] transition-transform hover:scale-[1.03]"
              style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 32px rgba(0,150,255,.55)" }}>
              Become an Affiliate — Free
            </Link>
          </div>
          <div className="mt-5 text-sm">
            <Link href="/affiliates/terms" className="text-slate-400 hover:text-cyan-300 font-mono underline underline-offset-4">
              Read the affiliate terms &amp; conditions
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
