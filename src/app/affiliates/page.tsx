// WorldEye Affiliates — public landing page (server component, no auth).
import Link from "next/link";
import { RankBadge, SectionTitle, Pill, StatCard, XpBar } from "@/components/affiliate/ui";

const CTA = "/api/auth/signin?callbackUrl=/affiliates/dashboard";

const TIERS = [
  { name: "Explorer",  xp: "0 XP",       rate: "15%", badge: "🧭", color: "#38bdf8" },
  { name: "Scout",     xp: "1,000 XP",    rate: "18%", badge: "🔭", color: "#22d3ee" },
  { name: "Analyst",   xp: "3,000 XP",    rate: "21%", badge: "📡", color: "#818cf8" },
  { name: "Commander", xp: "7,500 XP",    rate: "24%", badge: "🎖️", color: "#c084fc" },
  { name: "Elite",     xp: "15,000 XP",   rate: "27%", badge: "💠", color: "#f472b6" },
  { name: "Visionary", xp: "30,000 XP",   rate: "30%", badge: "👁️", color: "#fbbf24" },
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
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: "01", t: "Share your link", d: "Get your unique referral URL — worldeye.com/ref/YOURCODE — plus QR codes and ready-made share kits for every platform.", c: "#38bdf8" },
            { n: "02", t: "They subscribe to Pro", d: "Anyone who signs up through your link is attributed to you for 30 days. When they buy WorldEye Pro, you earn.", c: "#22d3ee" },
            { n: "03", t: "Earn every billing cycle", d: "Commissions don't stop at the first payment — you earn on every qualifying renewal for as long as they stay subscribed.", c: "#818cf8" },
          ].map((s) => (
            <Card key={s.n}>
              <div className="font-mono text-4xl font-black" style={{ color: s.c, textShadow: `0 0 20px ${s.c}66` }}>{s.n}</div>
              <div className="mt-3 text-lg font-bold text-white">{s.t}</div>
              <div className="mt-2 text-sm text-slate-400 leading-relaxed">{s.d}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── 3. COMMISSION TIERS ─────────────────────────────── */}
      <section>
        <SectionTitle kicker="Ranks" title="Six ranks. Bigger network, bigger cut." />
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
            </Card>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-400 font-mono">
          <span className="text-cyan-300">//</span> Earn XP from real activity to climb ranks. Commissions recur on
          qualifying subscription <span className="text-white">renewals</span> — not just the first purchase.
        </p>
      </section>

      {/* ── 4. THREE-LEVEL NETWORK ──────────────────────────── */}
      <section>
        <SectionTitle kicker="Network" title="Three-level network earnings" />
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
