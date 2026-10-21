// Rich shared renderer for the /alternatives/* pages.
// Structure (sections, table, FAQ, schema) is shared; ALL copy lives in each
// page's own data object — nothing here writes a sentence about a competitor.
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Globe,
  ListChecks,
  Scale,
  Sparkles,
  SwitchCamera,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  IntentShell,
  IntentBreadcrumbs,
  HeroCtas,
  MidCta,
  webPageLd,
} from "@/components/SeoIntentLayout";
import RelatedLinks from "@/components/RelatedLinks";

export type AltFaq = { q: string; a: string };
export type AltRow = { feature: string; competitor: string; worldEye: string };
export type AltPoint = { title: string; body: string };
export type AltChip = { icon: LucideIcon; label: string; href: string };

export type AltData = {
  name: string;
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  kicker: string;
  heroIcon: LucideIcon;
  heroTitle: ReactNode;
  heroLede: ReactNode;
  updatedNote: string;
  aboutIcon: LucideIcon;
  aboutHeading: string;
  about: ReactNode[];
  strengths: AltPoint[];
  gapsIcon: LucideIcon;
  gapsHeading: string;
  gaps: ReactNode[];
  worldEyeHeading: string;
  worldEye: ReactNode[];
  worldEyePoints: AltPoint[];
  chips?: AltChip[];
  tableHeading: string;
  tableIntro?: string;
  rows: AltRow[];
  pricingHeading?: string;
  pricing?: ReactNode[];
  stepsHeading: string;
  steps: AltPoint[];
  verdictHeading: string;
  verdicts: { q: string; a: string }[];
  faqHeading: string;
  faqs: AltFaq[];
  midCta: { heading: string; body: string };
  ctaHeading: ReactNode;
  ctaBody: string;
  related: { label: string; desc: string; href: string }[];
};

export function altMetadata(d: AltData): Metadata {
  return {
    title: d.title,
    description: d.description,
    alternates: { canonical: d.path },
    openGraph: {
      title: d.ogTitle ?? `${d.title} | WorldEye`,
      description: d.ogDescription ?? d.description,
      url: d.path,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: d.ogTitle ?? `${d.title} | WorldEye`,
      description: d.ogDescription ?? d.description,
    },
  };
}

function faqPageLd(faqs: AltFaq[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export default function AlternativePage({ data: d }: { data: AltData }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [webPageLd(d.title, d.description, d.path), faqPageLd(d.faqs)],
  };
  const HeroIcon = d.heroIcon;
  const AboutIcon = d.aboutIcon;
  const GapsIcon = d.gapsIcon;

  return (
    <IntentShell jsonLd={jsonLd}>
      <IntentBreadcrumbs
        trail={[
          { label: "Alternatives", href: "/compare" },
          { label: `${d.name} Alternatives` },
        ]}
      />

      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#0096FF] border border-[#0096FF]/30 rounded-full px-4 py-1.5 mb-6">
          <HeroIcon className="w-3.5 h-3.5" /> {d.kicker}
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
          {d.heroTitle}
        </h1>
        <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
          {d.heroLede}
        </p>
        <p className="mt-6 inline-flex items-center gap-2 text-xs text-white/40 border border-white/10 rounded-full px-4 py-1.5">
          <CalendarCheck className="w-3.5 h-3.5 text-[#0096FF]" />
          Last updated: October 20, 2026
        </p>
        <p className="mt-3 text-xs text-white/35 max-w-xl mx-auto leading-relaxed">
          {d.updatedNote}
        </p>
        <HeroCtas />
      </div>

      {/* What the competitor is */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <AboutIcon className="w-7 h-7 text-[#0096FF] shrink-0" />
          {d.aboutHeading}
        </h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          {d.about.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <h3 className="text-lg font-semibold text-white/90 mt-10 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#0096FF]" /> Where {d.name} genuinely shines
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {d.strengths.map((s) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="font-semibold text-white/90 flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-1" /> {s.title}
              </p>
              <p className="text-sm text-white/50 leading-relaxed mt-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gaps */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <GapsIcon className="w-7 h-7 text-[#0096FF] shrink-0" />
          {d.gapsHeading}
        </h2>
        <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
          {d.gaps.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {/* WorldEye as the alternative */}
      <section className="mt-16 max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Globe className="w-7 h-7 text-[#0096FF] shrink-0" />
          {d.worldEyeHeading}
        </h2>
        <div className="mt-5 space-y-4 text-white/60 leading-relaxed">
          {d.worldEye.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-8 space-y-4">
          {d.worldEyePoints.map((pt) => (
            <div key={pt.title} className="flex gap-3">
              <Check className="w-5 h-5 text-[#0096FF] shrink-0 mt-0.5" />
              <p className="text-white/60 leading-relaxed">
                <span className="text-white/85 font-semibold">{pt.title}.</span>{" "}
                {pt.body}
              </p>
            </div>
          ))}
        </div>
        {d.chips && d.chips.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-8">
            {d.chips.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 hover:border-[#0096FF]/40 transition"
              >
                <c.icon className="w-4 h-4 text-[#0096FF]" /> {c.label}
              </Link>
            ))}
          </div>
        )}
      </section>

      <MidCta heading={d.midCta.heading} body={d.midCta.body} />

      {/* Comparison table */}
      <section className="mt-20 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Scale className="w-7 h-7 text-[#0096FF] shrink-0" />
          {d.tableHeading}
        </h2>
        {d.tableIntro && (
          <p className="text-white/55 mt-4 leading-relaxed max-w-3xl">{d.tableIntro}</p>
        )}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-white/[0.05] text-left">
                <th className="p-4 font-semibold text-white/85 w-[26%]">Feature</th>
                <th className="p-4 font-semibold text-white/85 w-[37%]">{d.name}</th>
                <th className="p-4 font-semibold text-[#0096FF] w-[37%]">WorldEye</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr key={r.feature} className={i % 2 ? "bg-white/[0.02]" : ""}>
                  <td className="p-4 font-medium text-white/80 align-top">{r.feature}</td>
                  <td className="p-4 text-white/55 leading-relaxed align-top">{r.competitor}</td>
                  <td className="p-4 text-white/70 leading-relaxed align-top">{r.worldEye}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      {d.pricing && d.pricingHeading && (
        <section className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Wallet className="w-7 h-7 text-[#0096FF] shrink-0" />
            {d.pricingHeading}
          </h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
            {d.pricing.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {/* Switching */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <SwitchCamera className="w-7 h-7 text-[#0096FF] shrink-0" />
          {d.stepsHeading}
        </h2>
        <ol className="mt-8 space-y-5">
          {d.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0096FF]/10 border border-[#0096FF]/25 text-sm font-bold text-[#0096FF] shrink-0">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-white/90">{s.title}</p>
                <p className="text-white/55 leading-relaxed mt-1">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Verdict */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <ListChecks className="w-7 h-7 text-[#0096FF] shrink-0" />
          {d.verdictHeading}
        </h2>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {d.verdicts.map((c) => (
            <div key={c.q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="font-semibold text-white/90 mb-2">{c.q}</p>
              <p className="text-sm text-white/50 leading-relaxed">{c.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">{d.faqHeading}</h2>
        <div className="mt-8 space-y-8">
          {d.faqs.map((f) => (
            <div key={f.q}>
              <h3 className="text-lg font-semibold text-white/90">{f.q}</h3>
              <p className="text-white/55 leading-relaxed mt-2">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-20 max-w-2xl mx-auto text-center rounded-3xl border border-[#0096FF]/30 bg-gradient-to-b from-[#0096FF]/[0.10] to-transparent p-10">
        <h2 className="text-2xl md:text-3xl font-bold">{d.ctaHeading}</h2>
        <p className="text-white/55 mt-3 mb-8">{d.ctaBody}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#0096FF] text-white font-bold hover:bg-[#0077d6] transition"
          >
            Explore WorldEye <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-block px-8 py-4 rounded-2xl border border-white/15 text-white/85 font-semibold hover:border-[#0096FF]/50 hover:bg-white/5 transition"
          >
            See WorldEye pricing
          </Link>
        </div>
      </div>

      <RelatedLinks links={d.related} />
    </IntentShell>
  );
}
