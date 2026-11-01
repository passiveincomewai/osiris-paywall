import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ChartColumn,
  Check,
  Earth,
  Globe,
  KeyRound,
  Layers,
  MonitorPlay,
  Mountain,
  Newspaper,
  Palette,
  TreePalm,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { ORGANIZATION_ID } from "@/lib/seo/entity-schema";
import WhiteLabelDemoForm from "./WhiteLabelDemoForm";

// ── WorldEye White Label (pilot) ────────────────────────────────────────
// Demand-validation page for an UPCOMING offering. The honesty rules for
// this page are strict: White Label is an early-access pilot, not a
// launched product — no availability, customer, testimonial, deployment
// or SLA claims anywhere. The examples below are labelled illustrative
// scenarios, never case studies. Indicative prices are labelled
// indicative wherever they appear and stay out of the structured data.
// What IS real today, and worded as such: the camera network, the 3D
// globe, and the Enterprise feed (collections, embeddable player,
// private JSON data feed, API keys — /enterprise), which the pilot
// builds on.

export const metadata: Metadata = {
  title: "White Label Live Cameras — Branded Webcam Platform",
  description:
    "Your own branded live camera platform, powered by WorldEye's 74,229-camera network — your logo, domain and curated collections. Now in pilot: request early access.",
  alternates: { canonical: "/white-label" },
  openGraph: {
    title: "WorldEye White Label — your branded live camera platform",
    description:
      "The WorldEye camera network and 3D globe under your brand and domain. Early-access pilot for resorts, tourism boards, media and enterprise.",
    type: "website",
    url: "/white-label",
  },
};

const PILOT_INCLUDES = [
  {
    icon: Palette,
    title: "Your brand, front and centre",
    body: "Your logo, colours and name across the whole portal — your audience never needs to know WorldEye is underneath. Branding is configured with you during the pilot.",
  },
  {
    icon: Globe,
    title: "Your domain",
    body: "Run the portal on your own custom domain, or a subdomain of your site, so it feels like a product you built — because for your visitors, it is yours.",
  },
  {
    icon: Layers,
    title: "Curated camera collections",
    body: "Collections built around your properties, your region or your coverage area, drawn from WorldEye's catalogue of 74,229 public cameras — only cameras whose source terms clear them for redistribution.",
  },
  {
    icon: Earth,
    title: "The interactive 3D globe",
    body: "The same live 3D globe your audience would use on worldeye.app, scoped to your collections and your places.",
  },
  {
    icon: MonitorPlay,
    title: "Embeddable live players",
    body: "Live camera players for your existing website and apps — the same embed technology WorldEye Enterprise customers use today, pointed at your curated collections.",
  },
  {
    icon: ChartColumn,
    title: "Portal analytics",
    body: "Viewing analytics for your portal, so your team can see which places and cameras your audience actually watches.",
  },
  {
    icon: KeyRound,
    title: "API and data feed access",
    body: "For your developers: the key-gated camera feed and private JSON data feed behind WorldEye Enterprise, so your own products can build on the same collections.",
  },
];

/* Illustrative scenarios — labelled as examples on the page itself.
   These are NOT customers and must never be worded as case studies. */
const EXAMPLES = [
  {
    icon: Mountain,
    tag: "Example scenario — ski",
    title: "A ski resort group",
    body: "Runs its slope, lift and village cameras under its own brand and domain: a “live conditions” portal linked from its website and app, so guests check the mountain on the resort's own pages before they drive up.",
  },
  {
    icon: TreePalm,
    tag: "Example scenario — tourism",
    title: "A regional tourism board",
    body: "Launches a branded live-views portal for the region — beaches, harbours, old towns and viewpoints — and embeds the same live views across its member businesses' sites.",
  },
  {
    icon: Newspaper,
    tag: "Example scenario — media",
    title: "A media company",
    body: "Powers a branded live-camera desk: curated local traffic, weather and harbour cameras on its news site, ready to surface on air and online when something happens.",
  },
];

const TIERS = [
  {
    name: "Pilot",
    price: "from $249/mo",
    blurb: "One brand, one portal — the fastest way to validate White Label with your audience.",
    points: [
      "Single brand and portal",
      "One curated collection (your property or region)",
      "Your logo and colours",
      "Custom domain or subdomain",
      "Embeddable players for your site",
      "Portal viewing analytics",
    ],
  },
  {
    name: "Growth",
    price: "from $799/mo",
    blurb: "For organisations whose cameras span properties, towns or a whole region.",
    points: [
      "Multiple properties or regions",
      "Custom domain",
      "Larger curated collections",
      "Analytics across your whole network",
      "API and data feed access for your developers",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    blurb: "Scoped individually — multi-brand, integrations and volume.",
    points: [
      "SSO and enterprise integrations",
      "Multi-brand or high-volume scope",
      "Scoped quote after a scoping call",
    ],
  },
];

const STEPS = [
  {
    n: "1",
    title: "Request a demo",
    body: "Tell us about your organisation and what you want to show, using the form below. Every serious request gets a personal reply.",
  },
  {
    n: "2",
    title: "Scoping call + pilot quote",
    body: "We map your properties and the cameras that cover them, agree the collection and the branding, and quote your pilot from the indicative bands.",
  },
  {
    n: "3",
    title: "Your pilot portal is configured",
    body: "During the pilot phase we configure your branded portal and collection by hand, with you — there is no self-serve provisioning yet, and we won't pretend otherwise.",
  },
  {
    n: "4",
    title: "Launch and measure",
    body: "Your portal goes live on your domain. You watch the analytics, and together we learn what your audience actually uses — that evidence shapes what gets built next.",
  },
];

const FAQS = [
  {
    q: "Is WorldEye White Label available now?",
    a: "Not as a self-serve product. White Label is in a limited early-access pilot: a small cohort of organisations, onboarded one at a time, with portals configured by hand. Request a demo below to be considered for the pilot.",
  },
  {
    q: "What does a pilot include?",
    a: "A branded portal on your domain or subdomain with your logo and colours, a curated camera collection for your properties or region, the interactive 3D globe scoped to your collection, embeddable players for your existing site, portal analytics, and — on Growth and Enterprise scope — API and data feed access for your developers.",
  },
  {
    q: "Where do the cameras come from?",
    a: "From WorldEye's existing public-camera network — the same catalogue behind worldeye.app. Only cameras whose source terms allow redistribution can appear on a White Label portal; that is about 96% of the catalogue, and some sources are excluded entirely. Cameras on your own properties can be added where the rights allow.",
  },
  {
    q: "How does pricing work?",
    a: "The bands on this page are indicative: Pilot from $249/month, Growth from $799/month, Enterprise custom. Every pilot is scoped individually — properties, collection size and scale all move the number — and the final price is set in the pilot agreement before anything is built.",
  },
  {
    q: "How long does a pilot take to launch?",
    a: "It is agreed on the scoping call and depends on the size of your collection and your domain setup. Because pilot portals are configured manually, we onboard a small number at a time rather than promising instant provisioning.",
  },
  {
    q: "How is this different from WorldEye Enterprise?",
    a: "Enterprise ($999/year) is live today and self-serve: it gives your team collections, an embeddable player, a private data feed and API keys to build with yourselves. White Label is the next step — a complete audience-facing portal under your brand and domain — and is currently pilot-only.",
  },
];

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "WorldEye White Label",
  serviceType: "White label live camera platform",
  url: "https://worldeye.app/white-label",
  description:
    "A branded live camera platform powered by WorldEye: an organisation's own logo, domain and curated camera collections over WorldEye's network of 74,229 public cameras and its interactive 3D globe. Available as a limited early-access pilot.",
  provider: { "@id": ORGANIZATION_ID },
  areaServed: "Worldwide",
  audience: {
    "@type": "BusinessAudience",
    audienceType:
      "Ski resorts, tourism organisations, media companies and enterprises",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: "https://worldeye.app/white-label",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function WhiteLabelPage() {
  return (
    <div className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {/* Ambient gold glow, as on /pricing */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#D4AF37]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-14">
        {/* Hero */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.18em] text-[#D4AF37]">
            EARLY ACCESS — PILOT PROGRAMME
          </p>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-5 leading-[1.08]">
            Your own live-camera platform.{" "}
            <span className="text-[#D4AF37]">Your brand.</span> Our network.
          </h1>
          <p className="text-white/55 mt-5 text-lg leading-relaxed">
            WorldEye White Label puts the WorldEye network — 74,229 public
            cameras and the interactive 3D globe — behind your name, your
            colours and your domain. It is launching as a limited pilot for
            ski resorts, tourism organisations, media companies and
            enterprises.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#request-demo"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-[15px] hover:brightness-110 active:scale-[0.99] transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Request a demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center px-7 py-3.5 rounded-2xl border border-white/15 text-white/80 font-semibold text-[15px] hover:text-white hover:border-white/30 transition"
            >
              See indicative pricing
            </Link>
          </div>
          <p className="text-xs text-white/35 mt-4">
            Pilot places are limited and onboarded one at a time — this is
            early access, not a launched self-serve product.
          </p>
        </div>

        {/* Demo generator — an illustrative preview, built by the visitor */}
        <div className="mt-12 rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.07] to-transparent p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#D4AF37]">
              NEW — DEMO GENERATOR
            </p>
            <h2 className="mt-2 text-xl font-bold text-white/90">
              See it with your name on it first
            </h2>
            <p className="mt-1.5 text-sm text-white/55 leading-relaxed max-w-2xl">
              Build an illustrative preview of your portal in about a minute:
              your organisation&apos;s name and logo over real, current cameras
              near your location, on a shareable link. A concept preview of
              the pilot — not a live product.
            </p>
          </div>
          <Link
            href="/white-label/demo"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-sm hover:brightness-110 active:scale-[0.99] transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
          >
            Build my preview <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* What a pilot includes */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            What a White Label pilot includes
          </h2>
          <p className="text-white/50 mt-3 max-w-2xl leading-relaxed">
            A pilot portal is scoped to include the pieces below, configured
            with you. The network, the globe and the embed technology are the
            same ones running on worldeye.app today.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PILOT_INCLUDES.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
              >
                <f.icon className="w-6 h-6 text-[#D4AF37]" />
                <h3 className="mt-3.5 font-semibold text-white/90">{f.title}</h3>
                <p className="mt-1.5 text-sm text-white/55 leading-relaxed">{f.body}</p>
              </div>
            ))}
            <div className="rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.07] to-transparent p-6 flex flex-col justify-center">
              <h3 className="font-semibold text-white/90">Already live today: the feed</h3>
              <p className="mt-1.5 text-sm text-white/55 leading-relaxed">
                Teams who only need the data can start now with{" "}
                <Link href="/enterprise" className="text-[#D4AF37] hover:underline">
                  WorldEye Enterprise
                </Link>{" "}
                — collections, embeddable player, data feed and API keys,
                self-serve at $999/year. White Label builds the branded
                portal on top of it.
              </p>
            </div>
          </div>
        </div>

        {/* Examples — illustrative scenarios, never case studies */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            What it could look like
          </h2>
          <p className="text-white/50 mt-3 max-w-2xl leading-relaxed">
            White Label is in pilot, so there are no customer case studies to
            show you — and we won&apos;t invent any. These are illustrative
            scenarios of what a pilot portal is for.
          </p>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {EXAMPLES.map((x) => (
              <div
                key={x.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <x.icon className="w-6 h-6 text-[#D4AF37]" />
                  <span className="text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">
                    {x.tag}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold text-white/90">{x.title}</h3>
                <p className="mt-1.5 text-sm text-white/55 leading-relaxed">{x.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Indicative pricing */}
        <div className="mt-20" id="pricing">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Indicative pricing
          </h2>
          <p className="text-white/50 mt-3 max-w-2xl leading-relaxed">
            Pilot bands, published so you can judge fit before we talk. Every
            pilot is scoped individually, and the final price is set in the
            pilot agreement — these are starting points, not a checkout page.
          </p>
          <div className="mt-8 grid md:grid-cols-3 gap-5 items-stretch">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 flex flex-col"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-lg text-white/90">{t.name}</h3>
                  <span className="text-[10px] font-bold tracking-[0.14em] text-[#D4AF37] border border-[#D4AF37]/40 bg-[#D4AF37]/10 rounded-full px-2.5 py-1">
                    INDICATIVE
                  </span>
                </div>
                <p className="mt-3 text-3xl font-black tracking-tight">{t.price}</p>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">{t.blurb}</p>
                <ul className="mt-5 space-y-2.5">
                  {t.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-white/75">
                      <span className="w-5 h-5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0 mt-px">
                        <Check className="w-3 h-3 text-[#D4AF37]" />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link
                  href="#request-demo"
                  className="mt-auto pt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#D4AF37] hover:underline"
                >
                  Request a demo <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/35 mt-5">
            Indicative pricing only — final pricing is set in the pilot
            agreement after a scoping call. No payment is taken on this page.
          </p>
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">How the pilot works</h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <span className="text-2xl font-black text-[#D4AF37]">{s.n}</span>
                <h3 className="mt-3 font-semibold text-white/90">{s.title}</h3>
                <p className="mt-1.5 text-sm text-white/55 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">White Label questions</h2>
          <div className="mt-8 space-y-6">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-white/90">{f.q}</h3>
                <p className="mt-1.5 text-sm text-white/55 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Demo request */}
        <div className="mt-20" id="request-demo">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Request a White Label demo</h2>
            <p className="text-white/50 mt-3 leading-relaxed">
              Tell us about your organisation and what you&apos;d put on your
              portal. We&apos;ll come back with honest next steps — whether a
              pilot fits, what it would include, and what it would cost.
            </p>
          </div>
          <div className="mt-8 max-w-3xl">
            <WhiteLabelDemoForm />
          </div>
          <p className="text-sm text-white/40 mt-8">
            Prefer to start with the data only?{" "}
            <Link href="/enterprise" className="text-[#D4AF37] hover:underline">
              WorldEye Enterprise
            </Link>{" "}
            is live today at $999/year — and you can{" "}
            <Link href="/pricing" className="text-[#D4AF37] hover:underline">
              compare all plans
            </Link>{" "}
            first.
          </p>
          <p className="text-sm text-white/40 mt-4">
            Looking for a different kind of collaboration — a data partnership, a
            co-branded experience, an integration? See{" "}
            <Link href="/partners" className="text-[#D4AF37] hover:underline">
              strategic partnerships
            </Link>
            .
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
