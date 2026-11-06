"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { CopyButton, SectionTitle } from "@/components/affiliate/ui";
import { BANNER_DESIGNS } from "@/lib/affiliate/banners";
import { BannerArt, bannerEmbedHtml, downloadBannerPng, downloadBannerSvg } from "@/components/affiliate/BannerArt";
import { CAPTION_TEMPLATES, EMAIL_TEMPLATES, SCRIPT_TEMPLATES } from "@/lib/affiliate/templates";
import TemplateCard, { type UsageState } from "./TemplateCard";
import VideoStylesLab from "./VideoStylesLab";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const DISCLOSURE_NOTE =
  "Disclosure rule: every post, video, or email containing your referral link must clearly say it's an ad " +
  "(#ad) and that you earn a commission if someone subscribes. It's the law in most places — and it builds trust.";

type Challenge = { id: string; metric: string; completedAt: string | null };

interface DashboardTotals {
  clicks: number;
  directReferrals: number;
  convertedReferrals: number;
  conversionPct: number;
  lifetimeCents: number;
  availableCents: number;
  pendingCents: number;
  paidOutCents: number;
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ResourcesClient({ demo }: { demo?: { link: string; code: string } } = {}) {
  const isDemo = !!demo;
  const [link, setLink] = useState<string | null>(demo?.link ?? null);
  const [qr, setQr] = useState<string | null>(null);
  const [tutorial, setTutorial] = useState<Challenge | null>(null);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [usageMap, setUsageMap] = useState<Record<string, UsageState>>({});
  const [totals, setTotals] = useState<DashboardTotals | null>(null);

  useEffect(() => {
    if (isDemo) {
      // Demo: the referral link is the sample DEMO link; the QR comes
      // from the same public QR endpoint a live account uses. No account
      // data is fetched and the tutorial mission stays untouched.
      (async () => {
        try {
          const q = await fetch(`/api/affiliate/qr?code=${encodeURIComponent(demo!.code)}`, { cache: "no-store" });
          if (q.ok) {
            const qj = await q.json();
            if (qj?.qr) setQr(qj.qr);
          }
        } catch { /* non-fatal */ }
      })();
      return;
    }
    (async () => {
      try {
        const r = await fetch("/api/affiliate/me", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        const code: string | undefined = j?.profile?.customCode ?? j?.profile?.referralCode;
        if (j?.referralLink) setLink(j.referralLink);
        if (code) {
          const q = await fetch(`/api/affiliate/qr?code=${encodeURIComponent(code)}`, { cache: "no-store" });
          if (q.ok) {
            const qj = await q.json();
            if (qj?.qr) setQr(qj.qr);
          }
        }
      } catch { /* non-fatal */ }
    })();
    (async () => {
      try {
        const r = await fetch("/api/affiliate/challenges", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        const list: Challenge[] = Array.isArray(j.challenges) ? j.challenges : [];
        const t = list.find((c) => c.metric === "tutorial" && !c.completedAt) ?? null;
        setTutorial(t);
        if (!t && list.some((c) => c.metric === "tutorial" && c.completedAt)) setTutorialDone(true);
      } catch { /* non-fatal */ }
    })();
    (async () => {
      try {
        const r = await fetch("/api/affiliate/resources/usage", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        const map: Record<string, UsageState> = {};
        for (const row of Array.isArray(j.usage) ? j.usage : []) {
          map[`${row.templateKind}:${row.templateId}`] = { usedAt: row.usedAt, postedAt: row.postedAt };
        }
        setUsageMap(map);
      } catch { /* non-fatal */ }
    })();
    (async () => {
      try {
        const r = await fetch("/api/affiliate/dashboard", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (j?.totals) setTotals(j.totals as DashboardTotals);
      } catch { /* non-fatal */ }
    })();
  }, []);

  const withLink = (s: string) => (link ? s.split("{LINK}").join(link) : s);

  const toggleUsage = async (
    kind: "caption" | "email" | "script",
    id: string,
    patch: { used?: boolean; posted?: boolean },
  ) => {
    if (isDemo) return; // demo is read-only: usage marking is an account action
    try {
      const r = await fetch("/api/affiliate/resources/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKind: kind, templateId: id, ...patch }),
      });
      if (!r.ok) return;
      const j = await r.json();
      if (j?.usage) {
        setUsageMap((m) => ({
          ...m,
          [`${kind}:${id}`]: { usedAt: j.usage.usedAt, postedAt: j.usage.postedAt },
        }));
      }
    } catch { /* non-fatal */ }
  };

  const completeTutorial = async () => {
    if (isDemo || !tutorial) return;
    try {
      const r = await fetch("/api/affiliate/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: tutorial.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.completed) {
        setTutorialDone(true);
        setTutorial(null);
      }
    } catch { /* non-fatal */ }
  };

  const usedCount = Object.values(usageMap).filter((u) => u.usedAt).length;
  const postedCount = Object.values(usageMap).filter((u) => u.postedAt).length;

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <img src="/affiliate-icons/s1-affiliate-resources.png" alt="Affiliate resources" className="w-14 h-14 object-contain shrink-0"
          style={{ filter: "drop-shadow(0 0 16px rgba(56,189,248,.45))" }} />
        <div>
          <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase">Resources</div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Promo toolkit</h1>
        </div>
      </div>
      {/* 1 — Your assets */}
      <section>
        <SectionTitle kicker="Assets" title="Your assets" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5">
            <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-2">Referral link</div>
            {link ? (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <code className="flex-1 truncate rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 font-mono text-sm text-cyan-300">{link}</code>
                <CopyButton text={link} />
              </div>
            ) : (
              <div className="h-11 rounded-lg bg-white/[0.05] animate-pulse" />
            )}
            <p className="text-xs text-slate-500 mt-3">This link attributes signups to you for 30 days. Share it anywhere.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 flex items-center gap-5">
            {qr ? (
              <img src={qr} alt="Referral QR code" className="w-28 h-28 rounded-xl bg-white p-1.5 shrink-0" />
            ) : (
              <div className="w-28 h-28 rounded-xl bg-white/[0.05] animate-pulse shrink-0" />
            )}
            <div>
              <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-2">QR code</div>
              <p className="text-xs text-slate-500 mb-3">Print it, put it on a flyer, flash it on stream.</p>
              {qr && (
                <a href={qr} download="worldeye-referral-qr.png"
                  className="inline-block px-4 py-2 rounded-xl font-mono text-sm font-bold border border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 transition-colors">
                  Download PNG
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Banners */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <img src="/affiliate-icons/ben-tools.png" alt="Marketing tools" className="w-11 h-11 object-contain shrink-0"
            style={{ filter: "drop-shadow(0 0 14px rgba(56,189,248,.45))" }} />
          <div className="flex-1">
            <SectionTitle kicker="Creatives" title="Banner gallery"
              right={<span className="text-xs font-mono text-slate-500">real hosted artwork · copy the HTML to embed</span>} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {BANNER_DESIGNS.map((d) => (
            <div key={d.slug} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <BannerArt slug={d.slug} className="rounded-xl overflow-hidden border border-white/10" />
              <div className="mt-3">
                <div className="text-sm font-bold text-white">{d.name}</div>
                <p className="text-xs text-slate-500 mt-0.5">{d.blurb}</p>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  {d.width} × {d.height} · hosted at worldeye.app/affiliate-banners/{d.slug}.svg
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button onClick={() => downloadBannerSvg(d)}
                  className="px-4 py-2 rounded-xl font-mono text-sm font-bold border border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 transition-colors">
                  SVG
                </button>
                <button onClick={() => downloadBannerPng(d)}
                  className="px-4 py-2 rounded-xl font-mono text-sm font-bold border border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 transition-colors">
                  PNG
                </button>
                <CopyButton text={bannerEmbedHtml(d, link ?? "{YOUR_LINK}")} label="Copy HTML" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          The embed snippet wraps your referral link around the hosted artwork — the image itself is the same
          design you see here, served from WorldEye&apos;s own domain.
        </p>
      </section>

      {/* 3 — Captions */}
      <section>
        <SectionTitle kicker="Copy-paste" title="Caption templates"
          right={<span className="text-xs font-mono text-amber-300/80">revision tools are rules-based — not AI</span>} />
        <div className="grid md:grid-cols-2 gap-4">
          {CAPTION_TEMPLATES.map((t) => (
            <TemplateCard key={t.id} template={t} usage={usageMap[`caption:${t.id}`]}
              onToggleUsage={toggleUsage} withLink={withLink} />
          ))}
        </div>
      </section>

      {/* 4 — Video scripts */}
      <section>
        <SectionTitle kicker="Reels / TikTok" title="Video scripts"
          right={<span className="text-xs font-mono text-amber-300/80">revision tools are rules-based — not AI</span>} />
        <div className="grid md:grid-cols-2 gap-4">
          {SCRIPT_TEMPLATES.map((t) => (
            <TemplateCard key={t.id} template={t} usage={usageMap[`script:${t.id}`]}
              onToggleUsage={toggleUsage} withLink={withLink} />
          ))}
        </div>
      </section>

      {/* 5 — Emails */}
      <section>
        <SectionTitle kicker="Outreach" title="Email templates"
          right={<span className="text-xs font-mono text-amber-300/80">revision tools are rules-based — not AI</span>} />
        <div className="grid md:grid-cols-2 gap-4">
          {EMAIL_TEMPLATES.map((t) => (
            <TemplateCard key={t.id} template={t} usage={usageMap[`email:${t.id}`]}
              onToggleUsage={toggleUsage} withLink={withLink} />
          ))}
        </div>
      </section>

      {/* 6 — Video styles lab */}
      <VideoStylesLab withLink={withLink} />

      {/* 7 — Your numbers */}
      <section>
        <SectionTitle kicker="Performance" title="Your numbers" />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
          {totals ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Referral clicks", value: totals.clicks.toLocaleString("en-US") },
                  { label: "Signups", value: totals.directReferrals.toLocaleString("en-US") },
                  { label: "Converted", value: totals.convertedReferrals.toLocaleString("en-US") },
                  { label: "Conversion", value: `${totals.conversionPct}%` },
                  { label: "Lifetime earnings", value: money(totals.lifetimeCents) },
                  { label: "Available", value: money(totals.availableCents) },
                  { label: "Pending", value: money(totals.pendingCents) },
                  { label: "Paid out", value: money(totals.paidOutCents) },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="text-lg font-bold text-white">{s.value}</div>
                    <div className="text-[11px] font-mono tracking-[0.15em] text-slate-500 uppercase mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Templates you&apos;ve marked: {usedCount} used · {postedCount} posted. These totals are your
                account-level numbers from the affiliate dashboard. Per-template conversions aren&apos;t
                tracked anywhere in the system, so no template here is credited with signups it can&apos;t prove.
              </p>
            </>
          ) : (
            <div className="h-24 rounded-lg bg-white/[0.05] animate-pulse" />
          )}
        </div>
      </section>

      {/* 8 — Tutorial checklist */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <img src="/affiliate-icons/ben-support.png" alt="Dedicated support" className="w-11 h-11 object-contain shrink-0"
            style={{ filter: "drop-shadow(0 0 14px rgba(34,211,238,.45))" }} />
          <div className="flex-1"><SectionTitle kicker="Start here" title="Promo tutorial" /></div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 md:p-6">
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-mono font-bold text-sm border border-cyan-400/50 text-cyan-300">1</span>
              <div>
                <div className="text-white font-semibold">Learn the disclosure rule</div>
                <p className="text-sm text-slate-400 mt-1">{DISCLOSURE_NOTE}</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-mono font-bold text-sm border border-cyan-400/50 text-cyan-300">2</span>
              <div className="flex-1">
                <div className="text-white font-semibold">Copy your referral link</div>
                <p className="text-sm text-slate-400 mt-1 mb-3">Grab it from “Your assets” above — it tracks signups for 30 days.</p>
                {link && <CopyButton text={link} label="Copy my link" />}
              </div>
            </li>
            <li className="flex gap-4">
              <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-mono font-bold text-sm border border-cyan-400/50 text-cyan-300">3</span>
              <div className="flex-1">
                <div className="text-white font-semibold">Post your first caption</div>
                <p className="text-sm text-slate-400 mt-1 mb-3">Pick a caption template above, paste your link in, and post it with #ad.</p>
                {tutorialDone ? (
                  <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-mono font-bold border border-emerald-400/50 text-emerald-300 bg-emerald-400/10">
                    <Check className="w-4 h-4 mr-1.5" strokeWidth={3} /> Tutorial complete — XP awarded
                  </span>
                ) : tutorial ? (
                  <button onClick={completeTutorial}
                    className="px-5 py-2 rounded-xl font-mono text-sm font-bold text-[#04121f]"
                    style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" }}>
                    Mark complete
                  </button>
                ) : null}
              </div>
            </li>
          </ol>
        </div>
      </section>

      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-5">
        <div className="text-sm font-bold text-amber-300 mb-1">Truthful claims only</div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Stick to what&apos;s real: 74,229 live cameras, a free globe with no signup, paid plans unlock the AI analyst,
          live traffic and advanced search filters, Pro adds the OSINT toolkit, and Ultra adds the premium intel feeds — the satellite view is free for everyone. Plans run weekly or monthly, or VIP Pro (Pro billed yearly). Never promise
          income, never imply recruitment alone earns anything, and always disclose your affiliate link with #ad.
        </p>
      </div>
    </div>
  );
}
