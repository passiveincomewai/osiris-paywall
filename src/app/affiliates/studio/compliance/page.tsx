// Studio compliance: FTC disclosure rules for affiliate posts, summarized
// from §6 of the affiliate terms (src/app/affiliates/terms) — wording here
// matches the terms; the terms page is the binding document.
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getStudioGate } from "@/lib/studio/access";
import { SectionTitle } from "@/components/affiliate/ui";
import StudioUpgradeScreen from "../StudioUpgradeScreen";
import ComplianceCopy from "./ComplianceCopy";

export const metadata = { title: "Disclosure & Compliance — Marketing Studio" };

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const btnGhost =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm border border-white/15 text-slate-200 hover:border-cyan-400/60 transition-colors";

/** The disclosure example quoted verbatim from the affiliate terms §6. */
const DISCLOSURE_SNIPPET = "I may earn a commission if you subscribe through my link.";
const SHORT_DISCLOSURE = "#ad";

const PLATFORM_NOTES: { platform: string; notes: string[] }[] = [
  {
    platform: "Instagram",
    notes: [
      "Put #ad at the start of the caption — not buried in a block of hashtags.",
      "Use Instagram's branded-content tools (the “Paid partnership” label) as well as the caption disclosure.",
    ],
  },
  {
    platform: "TikTok",
    notes: [
      "Turn on the branded content toggle for the post before publishing.",
      "Add #ad in the caption — the toggle alone isn't a substitute for a visible disclosure.",
    ],
  },
  {
    platform: "YouTube",
    notes: [
      "Check the “Includes paid promotion” declaration when uploading.",
      "Put #ad in the description, and say it out loud in the video when the promotion is spoken about.",
    ],
  },
  {
    platform: "X",
    notes: ["Include #ad in the post itself — disclosures in a linked page or thread reply don't count."],
  },
];

const DOS = [
  "Disclose clearly and conspicuously, before your audience has to click “more”.",
  "Use the required caption snippet and hashtags on campaign posts, word for word.",
  "Describe WorldEye honestly: 76,000+ public cameras, flights, weather and more on one 3D globe — free to explore, Pro for the advanced layers.",
  "Use your own tracked link so your clicks and signups are attributed to you.",
];

const DONTS = [
  "Generate fake, automated, or incentivized clicks or signups.",
  "Create duplicate or impersonating accounts.",
  "Engage in cookie stuffing, ad hijacking, or trademark bidding on WorldEye brand terms without written permission.",
  "Make false, misleading, or unsubstantiated claims about WorldEye or its products.",
  "Send unsolicited commercial messages (spam) in violation of applicable law.",
  "Buy followers, likes, or engagement to dress up a post or an application.",
];

export default async function StudioCompliancePage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin?callbackUrl=/affiliates/studio/compliance");
  const userId = session.user.id;
  if (userId) {
    const { outcome } = await getStudioGate(userId);
    if (outcome === "membership_required" || outcome === "inactive") {
      return <StudioUpgradeScreen />;
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Disclosure &amp; Compliance</h1>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
          Where required by law — including FTC guidelines in the United States and equivalent regulations
          elsewhere — affiliates must clearly and conspicuously disclose their affiliate relationship in any
          promotional content. This page summarizes §6 of the affiliate terms; the terms are the binding rules.
        </p>
      </div>

      <section className={card}>
        <SectionTitle kicker="Copy & paste" title="Required disclosure snippet" />
        <blockquote className="rounded-xl border border-cyan-400/30 bg-black/30 px-4 py-3 text-base text-white">
          “{DISCLOSURE_SNIPPET}”
        </blockquote>
        <div className="mt-3 flex flex-wrap gap-2">
          <ComplianceCopy text={DISCLOSURE_SNIPPET} label="Copy disclosure" />
          <ComplianceCopy text={SHORT_DISCLOSURE} label="Copy short version (#ad)" />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          The short version is just <span className="font-mono text-slate-300">#ad</span> — fine for tight formats,
          but the full sentence is the safer default everywhere it fits.
        </p>
      </section>

      <section className={card}>
        <SectionTitle kicker="By platform" title="Platform notes" />
        <div className="space-y-4">
          {PLATFORM_NOTES.map((p) => (
            <div key={p.platform}>
              <div className="text-sm font-bold text-white mb-1">{p.platform}</div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300 leading-relaxed">
                {p.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className={card}>
          <SectionTitle kicker="Do" title="Always" />
          <ul className="space-y-2 text-sm text-slate-300 leading-relaxed">
            {DOS.map((d) => (
              <li key={d} className="flex gap-2">
                <span className="text-emerald-300 shrink-0">✓</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={card}>
          <SectionTitle kicker="Don't" title="Prohibited conduct (§6)" />
          <ul className="space-y-2 text-sm text-slate-300 leading-relaxed">
            {DONTS.map((d) => (
              <li key={d} className="flex gap-2">
                <span className="text-red-300 shrink-0">✕</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="text-sm text-slate-400">
        Full rules:{" "}
        <Link href="/affiliates/terms" className={btnGhost}>
          Read the affiliate terms →
        </Link>
      </p>
    </div>
  );
}
