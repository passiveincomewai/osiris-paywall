import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircleQuestion } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";
import FaqAccordion, { type Faq } from "./FaqClient";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | WorldEye",
  description:
    "Answers about WorldEye: is the map free, do you need an account, what Pro includes, trials and billing, cameras, flight tracking, privacy and account help.",
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
      {
        q: "How is WorldEye different from Google Earth?",
        a: "Google Earth is a map of the recorded past; WorldEye is a map of right now. We don't do historical imagery or 3D buildings — we fuse live streams: aircraft, satellites, weather, earthquakes, wildfires and 36,000+ public cameras, all updating in real time on one globe.",
      },
      {
        q: "Does WorldEye work in my country?",
        a: "Yes. WorldEye is a website — open it in any modern browser, anywhere in the world. Every layer is global; only camera density varies by region, since it depends on what each place publishes.",
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
      {
        q: "How do I update my payment method or get receipts?",
        a: "Everything billing-related runs through Stripe's secure customer portal: update your card, download invoices and receipts, or switch plans. For anything the portal can't do, write to us from your account email.",
      },
      {
        q: "Do you offer refunds?",
        a: "If Pro didn't work for you, write to us within a few days of being charged and we'll make it right on a case-by-case basis. The free trials exist precisely so you can evaluate before paying anything.",
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
  {
    title: "Account & privacy",
    faqs: [
      {
        q: "What data does WorldEye collect?",
        a: "For anonymous visitors: essentially nothing tied to you — no account, no tracking profile. If you subscribe to Pro or join the affiliate program, we store your sign-in email, subscription status, and (for affiliates) referral and payout records. Full details are in the privacy policy.",
      },
      {
        q: "Do you sell my data or show ads?",
        a: "No. No data sales, no ad network, no sponsored results anywhere on the site. Revenue comes from Pro subscriptions — that's the whole business model.",
      },
      {
        q: "How do I delete my account?",
        a: "Email us from your account address and we'll delete your account and its associated data. Payment records that Stripe must retain for legal reasons stay with Stripe, not us.",
      },
      {
        q: "I forgot my password — how do I reset it?",
        a: "Use the 'Forgot password' link on the sign-in page. We'll email you a reset link that expires after 1 hour and is burned once used. For security, sign-in never reveals whether an email is registered.",
      },
    ],
  },
  {
    title: "Cameras & availability",
    faqs: [
      {
        q: "Why is a camera offline?",
        a: "Every feed is operated by a third party — a city, a transport agency, a resort, a business — streaming from their own servers. Feeds go dark when the source goes down and come back when the source does. The catalog refreshes as sources change, so the count shifts over time.",
      },
      {
        q: "Can I request a camera be added or removed?",
        a: "If you operate a public camera feed and want it included — or you own a feed listed here and want it removed — contact us with the details and we'll take care of it.",
      },
    ],
  },
];

// Plain-text mirror of GROUPS for the FAQPage JSON-LD schema (links stripped).
const FAQ_SCHEMA: { q: string; a: string }[] = [
  {
    q: "Is the map really free?",
    a: "Yes. The 3D globe, live flight tracking, 36,000+ public cameras, satellites, earthquakes, wildfires and weather are free forever — no account, no credit card. Pro unlocks the intelligence-grade tools on top of it.",
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
  {
    q: "How is WorldEye different from Google Earth?",
    a: "Google Earth is a map of the recorded past; WorldEye is a map of right now. We don't do historical imagery or 3D buildings — we fuse live streams: aircraft, satellites, weather, earthquakes, wildfires and 36,000+ public cameras, all updating in real time on one globe.",
  },
  {
    q: "Does WorldEye work in my country?",
    a: "Yes. WorldEye is a website — open it in any modern browser, anywhere in the world. Every layer is global; only camera density varies by region, since it depends on what each place publishes.",
  },
  {
    q: "What does Pro include?",
    a: "The OI AI assistant (runs on your own API key), satellite imagery view, global search and filters, the OSINT toolkit (nmap, DNS, WHOIS, SSL analysis), and premium intel feeds — cyber threats, GDELT events, maritime tracking and live news. Plus every future Pro layer at no extra cost.",
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
  {
    q: "How do I update my payment method or get receipts?",
    a: "Everything billing-related runs through Stripe's secure customer portal: update your card, download invoices and receipts, or switch plans. For anything the portal can't do, write to us from your account email.",
  },
  {
    q: "Do you offer refunds?",
    a: "If Pro didn't work for you, write to us within a few days of being charged and we'll make it right on a case-by-case basis. The free trials exist precisely so you can evaluate before paying anything.",
  },
  {
    q: "How do the cameras work?",
    a: "WorldEye aggregates publicly available camera feeds from around the world — traffic, city streets, landmarks, nature — into one browsable layer on the map. They're third-party public sources, so individual feeds can go offline; coverage varies by region. Free for everyone.",
  },
  {
    q: "How accurate is the flight tracking?",
    a: "Positions come from ADS-B broadcasts that aircraft transmit continuously, so live coverage is genuinely real-time where receiver networks have coverage. Over oceans and remote areas, updates can be sparser.",
  },
  {
    q: "What are the intel feeds?",
    a: "Pro-only data layers: cyber threat activity, GDELT global event data, maritime vessel tracking, conflict zones and a live news feed — all plotted on the globe. The technical reference is in the documentation.",
  },
  {
    q: "What data does WorldEye collect?",
    a: "For anonymous visitors: essentially nothing tied to you — no account, no tracking profile. If you subscribe to Pro or join the affiliate program, we store your sign-in email, subscription status, and (for affiliates) referral and payout records. Full details are in the privacy policy.",
  },
  {
    q: "Do you sell my data or show ads?",
    a: "No. No data sales, no ad network, no sponsored results anywhere on the site. Revenue comes from Pro subscriptions — that's the whole business model.",
  },
  {
    q: "How do I delete my account?",
    a: "Email us from your account address and we'll delete your account and its associated data. Payment records that Stripe must retain for legal reasons stay with Stripe, not us.",
  },
  {
    q: "I forgot my password — how do I reset it?",
    a: "Use the 'Forgot password' link on the sign-in page. We'll email you a reset link that expires after 1 hour and is burned once used. For security, sign-in never reveals whether an email is registered.",
  },
  {
    q: "Why is a camera offline?",
    a: "Every feed is operated by a third party — a city, a transport agency, a resort, a business — streaming from their own servers. Feeds go dark when the source goes down and come back when the source does. The catalog refreshes as sources change, so the count shifts over time.",
  },
  {
    q: "Can I request a camera be added or removed?",
    a: "If you operate a public camera feed and want it included — or you own a feed listed here and want it removed — contact us with the details and we'll take care of it.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  name: "WorldEye Frequently Asked Questions",
  url: "https://worldeye.app/faq",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  mainEntity: FAQ_SCHEMA.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
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

        <RelatedLinks
          links={[
            {
              label: "Features",
              desc: "The full tour — free forever layers and the Pro intelligence toolkit.",
              href: "/features",
            },
            {
              label: "Contact",
              desc: "Still stuck? Questions, feedback or partnership ideas — write to us.",
              href: "/contact",
            },
            {
              label: "Changelog",
              desc: "What's new on WorldEye — updates and launches as they ship.",
              href: "/changelog",
            },
            {
              label: "Security",
              desc: "How WorldEye protects you — in plain language, with no inflated claims.",
              href: "/security",
            },
          ]}
        />
      </div>

      <SiteFooter />
    </main>
  );
}
