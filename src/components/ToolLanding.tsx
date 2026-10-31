import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Intro,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Faq,
  type RelatedLink,
} from "@/components/directory-page";
import EmailCaptureCard from "@/components/EmailCaptureCard";

/**
 * Shared landing-page assembly for RECON tool pages (see
 * ~/workspace/recon-tool-pages/REPORT.md §3 for the anatomy). Each tool page
 * supplies its own unique content + interactive block; this component keeps
 * the structure, honesty furniture and conversion path identical across the
 * family so no page can drift into overclaiming.
 */
/** Tool slugs whose readers are tracker-adjacent (R60, Wave 3). */
const TRACKER_ADJACENT_TOOL_SLUGS = new Set(["self-track"]);

export interface ToolLandingConfig {
  slug: string;
  name: string;
  eyebrow: string;
  icon: LucideIcon;
  h1: string;
  lede: string;
  description: string;
  /** true only when the tool genuinely runs free with no WorldEye plan gate. */
  freeTool: boolean;
  /** Where the tool lives in the app, e.g. "RECON board → Domain & Web → WHOIS". */
  appPath: string;
  honestyTitle: string;
  honesty: string[];
  intro: string[];
  steps: string[];
  faqTitle: string;
  faqs: Faq[];
  related: RelatedLink[];
  children: ReactNode;
}

export function toolMetadata(cfg: ToolLandingConfig) {
  return {
    title: cfg.h1,
    description: cfg.description,
    alternates: { canonical: `${BASE}/tools/${cfg.slug}` },
    openGraph: {
      title: cfg.h1,
      description: cfg.description,
      url: `/tools/${cfg.slug}`,
      type: "website" as const,
    },
  };
}

export default function ToolLanding(cfg: ToolLandingConfig) {
  const Icon = cfg.icon;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `WorldEye ${cfg.name}`,
    description: cfg.description,
    url: `${BASE}/tools/${cfg.slug}`,
    applicationCategory: "SecurityApplication",
    operatingSystem: "Any",
    ...(cfg.freeTool
      ? { offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }
      : {}),
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={cfg.faqs} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Tools", href: "/tools" },
          { label: cfg.name },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Icon className="w-3.5 h-3.5" /> {cfg.eyebrow}
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{cfg.h1}</h1>
        <p className="mt-4 text-white/55">{cfg.lede}</p>
      </div>

      {cfg.children}

      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-5 w-5 text-[#D4AF37]" /> {cfg.honestyTitle}
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/65">
          {cfg.honesty.map((line) => (
            <li key={line.slice(0, 32)}>{line}</li>
          ))}
        </ul>
      </div>

      <Intro paragraphs={cfg.intro} />
      <HowTo title="How it works" steps={cfg.steps} />

      <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-6 text-center">
        <h2 className="text-xl font-semibold">Run {cfg.name} in WorldEye</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
          {cfg.freeTool ? (
            <>
              {cfg.name} is one of the free tools in WorldEye&apos;s RECON board — find it at{" "}
              {cfg.appPath}. A free account also saves your work across the board; the board&apos;s
              Pro modules are included with WorldEye Pro.
            </>
          ) : (
            <>
              {cfg.name} runs live in WorldEye&apos;s RECON board — {cfg.appPath} — and is included
              with WorldEye Pro. Create a free account to explore the board and its free tools,
              and upgrade when you need the Pro modules.
            </>
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/"
            className="rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e5c65a]"
          >
            Open the globe
          </a>
          <a
            href="/signup"
            className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:border-white/40"
          >
            Create a free account
          </a>
          {!cfg.freeTool && (
            <a
              href="/pricing"
              className="rounded-lg border border-[#D4AF37]/40 px-5 py-2.5 text-sm font-semibold text-[#D4AF37] transition hover:border-[#D4AF37]/70"
            >
              See WorldEye Pro
            </a>
          )}
        </div>
      </div>

      <FaqSection title={cfg.faqTitle} faqs={cfg.faqs} />
      <RelatedLinks title="Keep exploring" links={cfg.related} />
      {/* R60 (site-audit Wave 3): reciprocal tool → tracker links, only
          for tracker-adjacent tools. Today that is Self Track alone —
          it puts the reader on the same globe the trackers draw, so
          the satellite/ISS/flight trackers are its genuine next step.
          Every other tool keeps exactly its own related list. */}
      {TRACKER_ADJACENT_TOOL_SLUGS.has(cfg.slug) && (
        <RelatedLinks
          title="Live trackers on the globe"
          links={[
            {
              label: "Satellite tracker",
              desc: "The ISS, Starlink and thousands of satellites, with real orbit paths — live on the free globe.",
              href: "/satellite-tracker",
            },
            {
              label: "Space station tracker",
              desc: "Where the ISS is right now — live position, altitude and speed as it orbits.",
              href: "/space-station-tracker",
            },
            {
              label: "Flight tracker",
              desc: "Live aircraft on the same globe — position, altitude, speed and routes from live ADS-B data.",
              href: "/live-flight-tracker",
            },
          ]}
        />
      )}
      <div className="mt-12">
        <EmailCaptureCard placement="page" variant="inline" />
      </div>
      <CtaRow backHref="/tools" backLabel="All WorldEye tools" />
    </PageShell>
  );
}
