import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import FaqAccordion, { type Faq } from "./FaqClient";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | WorldEye",
  description:
    "Answers about WorldEye: is the map free, do you need an account, what Pro includes, how trials and billing work, and how the cameras, flight tracking and intel feeds work.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently Asked Questions | WorldEye",
    description:
      "Is the map free? What does Pro include? How do trials work? All answered.",
    url: "/faq",
    type: "website",
  },
};

const p = (href: string, label: string) => (
  <Link href={href} className="text-[#D4AF37] hover:underline">
    {label}
  </Link>
);

const GROUPS: { title: string; faqs: Faq[] }[] = [
  {
    title: "General",
    faqs: [
      {
        q: "Is the map really free?",
        a: (
          <>
            Yes. The 3D globe, live flight tracking, 36,000+ public cameras,
            satellites, earthquakes, wildfires and weather are free forever — no
            account, no credit card. Pro unlocks the intelligence-grade tools on
            top of it. See {p("/pricing", "pricing")} for the full breakdown.
          </>
        ),
      },
      {
        q: "Do I need an account?",
        a: "No. Just open the site and you're looking at the planet. Accounts only exist for Pro subscribers (billing) and affiliates — never as a gate in front of the map.",
      },
      {
        q: "Which browsers are supported?",
        a: "Any modern browser: Chrome, Edge, Firefox and Safari, on desktop and mobile. The site is fully usable on phones — just open it in your mobile browser.",
      },
      {
        q: "Is there a mobile app?",
        a: "Not yet. The website is mobile-optimized and works well in phone browsers, which is where most people use it today. A native app is on the roadmap.",
      },
    ],
  },
  {
    title: "Pro & billing",
    faqs: [
      {
        q: "What does Pro include?",
        a: (
          <>
            The OI AI assistant (runs on your own API key), satellite imagery
            view, global search and filters, the OSINT toolkit (nmap, DNS,
            WHOIS, SSL analysis), and premium intel feeds — cyber threats, GDELT
            events, maritime tracking and live news. Plus every future Pro layer
            at no extra cost. Full list on the {p("/pricing", "pricing page")}.
          </>
        ),
      },
      {
        q: "How do the free trials work?",
        a: "Weekly plans start with 1 free day, annual plans with 3 free days. Your card is collected at signup but never charged during the trial — cancel before it ends and you pay nothing.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Anytime, in one click. Your Pro access runs until the end of the period you've paid for, then simply stops. No retention calls, no dark patterns.",
      },
      {
        q: "What payment methods do you accept?",
        a: "Major credit and debit cards through Stripe's secure checkout. Weekly is $3.99, monthly $9.99, annual $59.99.",
      },
      {
        q: "Do I need my own OpenAI key for the AI assistant?",
        a: "Yes. OI runs on your own API key (OpenAI, Anthropic, Google or OpenRouter), so usage is billed directly by the provider at cost — never marked up. Your key stays in your browser; we never see it.",
      },
    ],
  },
  {
    title: "Features",
    faqs: [
      {
        q: "How do the cameras work?",
        a: (
          <>
            WorldEye aggregates publicly available camera feeds from around the
            world — traffic, city streets, landmarks, nature — into one browsable
            layer on the map. They&apos;re third-party public sources, so
            individual feeds can go offline; coverage varies by region. Free for
            everyone. See the {p("/cameras", "live cameras page")} for more.
          </>
        ),
      },
      {
        q: "How accurate is the flight tracking?",
        a: "Positions come from ADS-B broadcasts that aircraft transmit continuously, so live coverage is genuinely real-time where receiver networks have coverage. Over oceans and remote areas, updates can be sparser.",
      },
      {
        q: "What are the intel feeds?",
        a: (
          <>
            Pro-only data layers: cyber threat activity, GDELT global event
            data, maritime vessel tracking, conflict zones and a live news feed —
            all plotted on the globe. The technical reference is in the{" "}
            {p("/docs", "documentation")}.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <MessageCircleQuestion className="w-3.5 h-3.5" /> HELP CENTER
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Frequently asked <span className="text-[#D4AF37]">questions</span>
          </h1>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Straight answers about the free map, Pro, billing and features.
          </p>
        </div>

        <FaqAccordion groups={GROUPS} />

        {/* Contact CTA */}
        <div className="mt-16 text-center rounded-3xl border border-white/10 bg-white/[0.02] p-10">
          <h2 className="text-xl md:text-2xl font-bold">Still stuck?</h2>
          <p className="text-white/55 mt-2 mb-6 text-sm">
            Check the documentation or get in touch — we reply within 1–2 business days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/docs"
              className="px-6 py-3 rounded-2xl border border-white/15 text-sm font-semibold text-white/70 hover:bg-white/5 transition"
            >
              Read the docs
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
