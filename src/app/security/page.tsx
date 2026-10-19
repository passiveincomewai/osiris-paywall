import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Globe,
  KeyRound,
  CreditCard,
  Database,
  Radio,
  Mail,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Security — How WorldEye Protects You",
  description:
    "How WorldEye keeps you safe: no account needed to use the map, your AI API key stays in your browser, payments handled by Stripe, and responsible disclosure.",
  alternates: { canonical: "/security" },
  openGraph: {
    title: "WorldEye Security",
    description:
      "No account needed, your AI key never leaves your browser, payments via Stripe. How WorldEye protects you.",
    type: "website",
    url: "/security",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "WorldEye Security",
  description:
    "How WorldEye protects you — in plain language, with no inflated claims.",
  url: "https://worldeye.app/security",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does WorldEye sell my data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. WorldEye does not sell data, run ads, or use third-party trackers on its pages. Revenue comes from Pro subscriptions, not from user data.",
      },
    },
    {
      "@type": "Question",
      name: "Does WorldEye see my AI API key?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Your OI assistant API key is stored in your browser's local storage and sent only to your chosen AI provider. It never touches WorldEye's servers.",
      },
    },
    {
      "@type": "Question",
      name: "Does WorldEye store my credit card?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. All payments are processed by Stripe. Card numbers are entered on Stripe's checkout pages — WorldEye never sees, handles, or stores them.",
      },
    },
    {
      "@type": "Question",
      name: "How do I report a security vulnerability?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Report it responsibly through the contact page with as much detail as you can share, and give the team a chance to fix it before any public disclosure.",
      },
    },
  ],
};

const SECURITY_FAQS = [
  {
    q: "Does WorldEye sell my data?",
    a: "No. No data sales, no ads, no third-party trackers. Revenue comes from Pro subscriptions.",
  },
  {
    q: "Does WorldEye see my AI API key?",
    a: "No. Your OI assistant key lives in your browser's local storage and goes only to your chosen AI provider — never to our servers.",
  },
  {
    q: "Does WorldEye store my credit card?",
    a: "No. Stripe processes all payments; card numbers never touch WorldEye's systems.",
  },
  {
    q: "How do I report a security vulnerability?",
    a: "Through the contact page, with as much detail as you can share. Please give us a chance to fix it before disclosing publicly.",
  },
];

const PRACTICES = [
  "Passwords are hashed with bcrypt and never stored — or logged — in plain text.",
  "All traffic runs over HTTPS. Authentication cookies are signed, httpOnly, and scoped to the session.",
  "Payments go exclusively through Stripe. Card numbers are entered on Stripe's checkout pages; we never see, handle, or store them.",
  "Your OI AI API key is stored in your browser's local storage and sent only to your chosen AI provider — never to WorldEye's servers.",
  "Public auth endpoints (signup, sign-in, password reset, email verification) are rate-limited, and sign-in never reveals whether an email is registered.",
  "Password-reset links expire after 1 hour and are burned on use; email-verification links expire after 24 hours.",
  "Subscription status travels in a signed session token, and the Stripe webhook is the sole write path for subscription state — checkout links and price changes can't be forged client-side.",
  "Admin dashboards are gated by an explicit allowlist of admin email addresses.",
  "We keep the stored data minimum: sign-in email, subscription status, and affiliate referral/payout records. No data sales, no ads, no third-party trackers on the marketing pages.",
];

const SECTIONS: {
  icon: typeof ShieldCheck;
  title: string;
  body: string[];
}[] = [
  {
    icon: Globe,
    title: "No account, nothing to leak",
    body: [
      "The live map — globe, flights, satellites, weather, earthquakes, wildfires, and 76,000+ public cameras — works with no account and no signup. There is no profile to breach, no password to steal, and no personal data collected just for looking around.",
    ],
  },
  {
    icon: KeyRound,
    title: "Your AI API key stays in your browser",
    body: [
      "The OI assistant runs on your own API key (OpenAI, Anthropic, Google, or OpenRouter). Your key is stored locally in your browser — WorldEye never sees it, never stores it, and never sends it to our servers. Your AI usage is billed directly by the provider, at cost.",
    ],
  },
  {
    icon: CreditCard,
    title: "Payments handled by Stripe",
    body: [
      "Pro subscriptions are processed by Stripe, the industry-standard payment processor. Card numbers go directly to Stripe — we never see, handle, or store your payment details.",
    ],
  },
  {
    icon: Database,
    title: "What we do store",
    body: [
      "If you subscribe to Pro or join the affiliate program, we store the minimum needed to run your account: your sign-in email, your subscription status, and (for affiliates) referral and payout records. That's it. We don't sell data, and we don't run ads.",
    ],
  },
  {
    icon: Radio,
    title: "Third-party data sources",
    body: [
      "Camera feeds, flight positions, satellite data, and news come from public third-party sources. We aggregate them; we don't control their availability or accuracy. Treat live feeds as informational, not safety-critical.",
    ],
  },
  {
    icon: Mail,
    title: "Responsible disclosure",
    body: [
      "Found a security issue? Please report it responsibly — give us a chance to fix it before disclosing publicly. Reach us through the contact page with as much detail as you can share.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100">
      <JsonLd data={jsonLd} />
      <JsonLd data={faqJsonLd} />
      <div className="max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">
            WORLDEYE
          </span>
        </div>

        {/* Hero */}
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Security
          </h1>
        </div>
        <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
          How WorldEye protects you — in plain language, with no inflated
          claims.
        </p>

        {/* Sections */}
        <div className="mt-12 space-y-4">
          {SECTIONS.map((s) => (
            <section
              key={s.title}
              className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-[#D4AF37]/12 border border-[#D4AF37]/25 flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-[#D4AF37]" />
                </span>
                <h2 className="text-lg md:text-xl font-bold text-white/90">
                  {s.title}
                </h2>
              </div>
              {s.body.map((p) => (
                <p
                  key={p.slice(0, 32)}
                  className="mt-3 text-sm md:text-base text-white/60 leading-relaxed"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        {/* Security practices */}
        <section className="mt-12 rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-9 h-9 rounded-xl bg-[#D4AF37]/12 border border-[#D4AF37]/25 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-[#D4AF37]" />
            </span>
            <h2 className="text-lg md:text-xl font-bold text-white/90">
              Concrete security practices
            </h2>
          </div>
          <ul className="space-y-3">
            {PRACTICES.map((p) => (
              <li key={p.slice(0, 40)} className="flex gap-3 text-sm md:text-base text-white/65 leading-relaxed">
                <span aria-hidden className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* Links */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/privacy"
            className="px-7 py-3 rounded-2xl border border-white/15 text-sm font-semibold text-white/70 hover:bg-white/5 transition"
          >
            Read the privacy policy
          </Link>
          <Link
            href="/contact"
            className="px-7 py-3 rounded-2xl bg-[#D4AF37] text-black font-bold text-sm hover:brightness-110 transition"
          >
            Report a security issue
          </Link>
        </div>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-lg md:text-xl font-bold text-white/90 mb-5">Security questions</h2>
          <div className="space-y-3">
            {SECURITY_FAQS.map((f) => (
              <div key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <h3 className="font-semibold text-white/90 text-sm md:text-base">{f.q}</h3>
                <p className="text-sm text-white/55 mt-1.5 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              label: "Privacy policy",
              desc: "What data WorldEye collects, why, and how long it is kept.",
              href: "/privacy",
            },
            {
              label: "About WorldEye",
              desc: "The principles behind the platform — free map, no data sales.",
              href: "/about",
            },
            {
              label: "FAQ",
              desc: "Common questions about accounts, Pro, and the free map.",
              href: "/faq",
            },
            {
              label: "Contact",
              desc: "Report a vulnerability or ask a security question.",
              href: "/contact",
            },
          ]}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
