"use client";
import { useEffect, useMemo, useState } from "react";
import { CopyButton, SectionTitle } from "@/components/affiliate/ui";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const DISCLOSURE_NOTE =
  "Disclosure rule: every post, video, or email containing your referral link must clearly say it's an ad " +
  "(#ad) and that you earn a commission if someone subscribes. It's the law in most places — and it builds trust.";

const CAPTIONS: { platform: string; color: string; text: string }[] = [
  {
    platform: "Instagram",
    color: "#e879f9",
    text:
`I found a site that lets you watch 36,000+ LIVE cameras around the world 🌍
Traffic cams, beaches, city squares — all streaming free on a 3D globe.

It's called WorldEye. The free map is honestly wild — and Pro unlocks an AI analyst + satellite view.

Link in bio 👆

#ad — I earn a commission if you subscribe through my link. The free globe costs you nothing.`,
  },
  {
    platform: "TikTok",
    color: "#22d3ee",
    text:
`POV: you discover you can watch the entire planet LIVE for free 🌐

36,000+ cameras. Flights overhead. Satellites orbiting. All on one 3D globe.

WorldEye's free tier is actually insane. Link in bio if you want the Pro AI analyst.

#ad — I earn a commission on subscriptions through my link.`,
  },
  {
    platform: "X",
    color: "#94a3b8",
    text:
`WorldEye is a free 3D globe with 36,000+ live cameras, flight tracking, and satellites.

Pro (weekly, monthly, or annual) adds an AI analyst, satellite basemap, and OSINT toolkit.

Worth a look: {LINK}

#ad — I earn a commission if you subscribe.`,
  },
  {
    platform: "Email",
    color: "#fbbf24",
    text:
`Subject: Watch the planet live (free)

Hey —

Stumbled on WorldEye: a live 3D globe with 36,000+ public cameras you can watch free. Traffic, beaches, landmarks — all live.

The free map is genuinely fun. If you want more, Pro unlocks an AI analyst, satellite view, and OSINT tools, on weekly, monthly, or annual plans.

Here's my link: {LINK}

Quick note: it's my affiliate link — I earn a commission if you subscribe, at no extra cost to you.`,
  },
];

const SCRIPTS: { title: string; color: string; lines: string[] }[] = [
  {
    title: "Script 1 — “The globe zoom” (TikTok / Reels, ~30s)",
    color: "#22d3ee",
    lines: [
      "HOOK (0–3s): “This website lets you watch the entire planet… legally.” [zoom into globe]",
      "BEAT 1 (3–10s): “36,000+ live cameras. Beaches in Hawaii, streets in Tokyo — all live, right now.”",
      "BEAT 2 (10–18s): “The map is completely free. No signup, just open it.” [click a camera]",
      "BEAT 3 (18–25s): “And Pro adds an AI analyst and satellite view if you want the full setup.”",
      "CTA (25–30s): “Link in bio. #ad — I earn a commission if you subscribe.”",
    ],
  },
  {
    title: "Script 2 — “3 things” (TikTok / Reels, ~25s)",
    color: "#a78bfa",
    lines: [
      "HOOK (0–3s): “3 things you didn't know you could watch live right now.”",
      "BEAT 1: “One — live traffic cameras from 100+ countries.”",
      "BEAT 2: “Two — every flight overhead, tracked in real time.”",
      "BEAT 3: “Three — satellites orbiting above you, right now.”",
      "CTA: “All free on WorldEye. Link in bio for the Pro upgrade. #ad — I earn a commission on subscriptions.”",
    ],
  },
];

const EMAILS: { subject: string; text: string }[] = [
  {
    subject: "The free tool I keep open all day",
    text:
`Quick one —

WorldEye is a live 3D globe (free) with 36,000+ public cameras, flights, and satellites. I keep it open like a window to the world.

Pro adds an AI analyst + satellite view if you want the full intel setup. Weekly, monthly, or annual plans.

My link: {LINK}

Disclosure: affiliate link — I earn a commission if you subscribe.`,
  },
  {
    subject: "For the endlessly curious",
    text:
`If you like watching the world happen in real time, try WorldEye.

It's a free 3D globe with 36,000+ live public cameras — landmarks, highways, beaches. No signup needed for the map.

There's a Pro tier (AI analyst, satellite view, OSINT toolkit) if you want more.

My affiliate link: {LINK} — I earn a commission if you subscribe, at no extra cost to you.`,
  },
];

/* Template-mixer "AI" caption generator — honestly a template mixer, not AI. */
type Tone = "hype" | "professional" | "funny";
type Feature = "CCTV" | "flights" | "satellites" | "OSINT";

const HOOKS: Record<Tone, string[]> = {
  hype: [
    "STOP SCROLLING — you can watch the entire planet LIVE right now 👁️",
    "This is the wildest free tool on the internet and nobody talks about it",
    "POV: you just found a live window into everywhere on Earth",
  ],
  professional: [
    "WorldEye: a real-time 3D intelligence globe, free to explore",
    "For OSINT researchers and the endlessly curious — the planet, live",
    "One dashboard for live global awareness",
  ],
  funny: [
    "Google Earth but it's happening RIGHT NOW",
    "me: I'll just check one camera. also me, 4 hours later:",
    "new personality trait: watching traffic in Tokyo at 3am",
  ],
};
const BODIES: Record<Feature, string[]> = {
  CCTV: [
    "36,000+ public cameras stream live on a 3D globe — beaches, city squares, highways. The map is completely free, no signup.",
    "Traffic cams, landmarks, beaches — 36,000+ of them, live, on one free globe. I've lost hours to this.",
    "One free 3D globe, 36,000+ live public cameras. Pick a city, any city, and you're there.",
  ],
  flights: [
    "Every aircraft overhead tracked live on the same globe — plus 36,000+ public cameras. Free to explore.",
    "Watch flights move in real time across a 3D Earth, then drop into a live street camera below them. Free.",
    "Live flight tracking, live cameras, live satellites — one free globe does all three.",
  ],
  satellites: [
    "Watch satellites orbit overhead in real time on a free 3D globe, alongside 36,000+ live cameras.",
    "There's a free globe where you can watch satellites pass over your house. In real time. Right now.",
    "Satellite orbits, live flights, and 36,000+ street cameras — all on one free 3D map.",
  ],
  OSINT: [
    "Go Pro and unlock the AI analyst, satellite basemap, global search, and the OSINT toolkit. Weekly, monthly, or annual plans.",
    "The free globe is the hook — Pro is the full intel station: AI analyst, satellite view, OSINT tools.",
    "Pro tier = AI analyst + satellite basemap + OSINT toolkit. The free map alone is worth the click.",
  ],
};
const CTAS: Record<Tone, string[]> = {
  hype: ["Link in bio — go look at the world 👆", "Tap the link and thank me later"],
  professional: ["Explore the free globe here: {LINK}", "See the free tier and Pro plans: {LINK}"],
  funny: ["link in bio, don't blame me when it's 4am", "go touch some (virtual) grass: {LINK}"],
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

type Challenge = { id: string; metric: string; completedAt: string | null };

export default function ResourcesClient() {
  const [link, setLink] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [tutorial, setTutorial] = useState<Challenge | null>(null);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [tone, setTone] = useState<Tone>("hype");
  const [feature, setFeature] = useState<Feature>("CCTV");
  const [variants, setVariants] = useState<string[]>([]);

  useEffect(() => {
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
  }, []);

  const withLink = (s: string) => (link ? s.split("{LINK}").join(link) : s);

  const banners = useMemo(() => {
    const snippet = (alt: string) =>
      `<a href="${link ?? "{YOUR_LINK}"}" target="_blank" rel="noopener sponsored"><img src="https://osiris-lime.vercel.app/og-image.png" alt="${alt}" width="600" style="max-width:100%;border-radius:12px" /></a>`;
    return [
      {
        alt: "WorldEye — see the planet live",
        el: (
          <div className="rounded-xl overflow-hidden border border-cyan-400/30 p-6 md:p-8 text-center"
            style={{ background: "radial-gradient(600px 200px at 50% 0%, #0a2a55 0%, #050b18 70%)", boxShadow: "0 0 30px rgba(0,150,255,.25)" }}>
            <div className="font-mono text-[10px] tracking-[0.3em] text-cyan-300 mb-2">WORLDEYE</div>
            <div className="text-2xl md:text-3xl font-black text-white tracking-tight">SEE THE PLANET LIVE</div>
            <div className="text-sm text-slate-300 mt-2">36,000+ live cameras · Free 3D globe</div>
            <div className="mt-4 inline-block px-5 py-2 rounded-lg font-mono text-sm font-bold text-[#04121f]"
              style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>Explore free →</div>
          </div>
        ),
      },
      {
        alt: "WorldEye — 36,000+ live cameras",
        el: (
          <div className="rounded-xl overflow-hidden border border-white/15 p-6 md:p-8"
            style={{ background: "#04070f" }}>
            <div className="grid grid-cols-6 gap-1.5 mb-4 opacity-70">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-video rounded bg-gradient-to-br from-[#0a2a55] to-[#04101f] border border-cyan-400/20"
                  style={{ boxShadow: "inset 0 0 12px rgba(0,150,255,.15)" }} />
              ))}
            </div>
            <div className="text-xl md:text-2xl font-black text-white">36,000+ LIVE CAMERAS</div>
            <div className="text-sm text-slate-400 mt-1">One globe. Every street. Free.</div>
          </div>
        ),
      },
      {
        alt: "WorldEye Pro — AI analyst and satellite view",
        el: (
          <div className="rounded-xl overflow-hidden border border-violet-400/30 p-6 md:p-8 text-center"
            style={{ background: "linear-gradient(135deg, #0b1030 0%, #12082b 60%, #05070f 100%)", boxShadow: "0 0 30px rgba(167,139,250,.2)" }}>
            <div className="font-mono text-[10px] tracking-[0.3em] text-violet-300 mb-2">WORLDEYE PRO</div>
            <div className="text-2xl md:text-3xl font-black text-white tracking-tight">GO PRO</div>
            <div className="text-sm text-slate-300 mt-2">AI analyst · Satellite view · OSINT toolkit</div>
            <div className="text-xs font-mono text-slate-400 mt-1">Weekly · Monthly · Annual plans</div>
          </div>
        ),
      },
      {
        alt: "WorldEye — the world, live",
        el: (
          <div className="rounded-xl overflow-hidden border border-white/15 p-8 md:p-10 text-center bg-black">
            <div className="text-3xl md:text-4xl font-black tracking-tight text-white">THE WORLD, <span className="text-[#0096FF]">LIVE.</span></div>
            <div className="font-mono text-xs text-slate-400 mt-3 tracking-[0.25em]">WORLDEYE</div>
          </div>
        ),
      },
    ].map((b) => ({ ...b, html: snippet(b.alt) }));
  }, [link]);

  const generate = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const v = [0, 1, 2].map(
      () =>
        `${pick(HOOKS[tone])}\n\n${pick(BODIES[feature])}\n\n${pick(CTAS[tone])}\n\n#ad — I earn a commission if you subscribe through my link.`
    );
    setVariants(v);
  };

  const completeTutorial = async () => {
    if (!tutorial) return;
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

  return (
    <div className="space-y-10">
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
        <SectionTitle kicker="Creatives" title="Banner gallery"
          right={<span className="text-xs font-mono text-slate-500">screenshot-ready · copy the HTML to embed</span>} />
        <div className="grid md:grid-cols-2 gap-4">
          {banners.map((b, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              {b.el}
              <div className="mt-3 flex justify-end">
                <CopyButton text={b.html} label="Copy HTML" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Captions */}
      <section>
        <SectionTitle kicker="Copy-paste" title="Caption templates" />
        <div className="grid md:grid-cols-2 gap-4">
          {CAPTIONS.map((c) => (
            <div key={c.platform} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: c.color }}>{c.platform}</span>
                <CopyButton text={withLink(c.text)} label="Copy caption" />
              </div>
              <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">{withLink(c.text)}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — Video scripts */}
      <section>
        <SectionTitle kicker="Reels / TikTok" title="Video scripts" />
        <div className="grid md:grid-cols-2 gap-4">
          {SCRIPTS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
              <div className="flex items-center justify-between mb-3 gap-3">
                <span className="text-sm font-bold text-white">{s.title}</span>
                <CopyButton text={s.lines.join("\n")} label="Copy script" />
              </div>
              <ul className="space-y-2">
                {s.lines.map((l, i) => (
                  <li key={i} className="text-sm text-slate-300 leading-relaxed">
                    <span className="font-mono text-cyan-400 text-xs mr-2">▸</span>{l}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 5 — Emails */}
      <section>
        <SectionTitle kicker="Outreach" title="Email templates" />
        <div className="grid md:grid-cols-2 gap-4">
          {EMAILS.map((e, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
              <div className="flex items-center justify-between mb-3 gap-3">
                <span className="text-sm font-bold text-white truncate">Subject: {e.subject}</span>
                <CopyButton text={`Subject: ${e.subject}\n\n${withLink(e.text)}`} label="Copy email" />
              </div>
              <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">{withLink(e.text)}</pre>
            </div>
          ))}
        </div>
      </section>

      {/* 6 — Template caption mixer */}
      <section>
        <SectionTitle kicker="Generator" title="Caption mixer"
          right={<span className="text-xs font-mono text-amber-300/80">template-based — not AI</span>} />
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5">
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-2">Tone</div>
              <div className="flex gap-2">
                {(["hype", "professional", "funny"] as Tone[]).map((t) => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-mono capitalize border transition-all ${tone === t ? "border-cyan-400/60 text-cyan-300 bg-cyan-400/10" : "border-white/15 text-slate-400 hover:bg-white/5"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase mb-2">Feature</div>
              <div className="flex gap-2 flex-wrap">
                {(["CCTV", "flights", "satellites", "OSINT"] as Feature[]).map((f) => (
                  <button key={f} onClick={() => setFeature(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-mono border transition-all ${feature === f ? "border-cyan-400/60 text-cyan-300 bg-cyan-400/10" : "border-white/15 text-slate-400 hover:bg-white/5"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={generate}
                className="px-5 py-2 rounded-xl font-mono text-sm font-bold text-[#04121f]"
                style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" }}>
                Mix 3 variants
              </button>
            </div>
          </div>
          {variants.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-3">
              {variants.map((v, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed mb-3">{withLink(v)}</pre>
                  <CopyButton text={withLink(v)} label="Copy" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Pick a tone and a feature, then mix three caption variants. Every variant includes the #ad disclosure.</p>
          )}
        </div>
      </section>

      {/* 7 — Tutorial checklist */}
      <section>
        <SectionTitle kicker="Start here" title="Promo tutorial" />
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
                    ✓ Tutorial complete — XP awarded
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
          Stick to what&apos;s real: 36,000+ live cameras, a free globe with no signup, Pro unlocks the AI analyst,
          satellite view, global search, and the OSINT toolkit on weekly, monthly, or annual plans. Never promise
          income, never imply recruitment alone earns anything, and always disclose your affiliate link with #ad.
        </p>
      </div>
    </div>
  );
}
