import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, CreditCard, Users, ArrowRight } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Contact WorldEye",
  description:
    "Get in touch with the WorldEye team — support, billing questions, press and partnerships. Email us anytime; we typically reply within 1–2 business days.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact WorldEye",
    description:
      "Questions, feedback or partnership ideas — reach the WorldEye team by email. We reply within 1–2 business days.",
    type: "website",
    url: "/contact",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Contact WorldEye",
  description:
    "Get in touch with the WorldEye team — support, billing questions, press and partnerships.",
  url: "https://worldeye.app/contact",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const SUPPORT_FAQS = [
  {
    q: "How fast will I get a reply?",
    a: "We typically reply within 1–2 business days. WorldEye is run by a small independent team, so complex technical issues can take a little longer — but every message gets read.",
  },
  {
    q: "I'm having a billing problem — what should I include?",
    a: "Write from the email address on your account and include your plan (weekly, monthly or annual) and the date of the charge. That lets us find your subscription in Stripe immediately.",
  },
  {
    q: "A camera, flight or satellite layer isn't working — what now?",
    a: "First try a hard refresh — most layers depend on live third-party feeds that can hiccup. If it's still down, tell us which layer, your browser, and roughly when it started; we'll check whether the feed itself is offline.",
  },
  {
    q: "Do you offer phone or live-chat support?",
    a: "No — email only for now. It keeps support personal and lets the whole team see and answer your message instead of a chatbot.",
  },
];

const EMAIL = "passiveincomewai@gmail.com";

const CARDS = [
  {
    icon: CreditCard,
    title: "Billing questions",
    body: "Plans, trials, cancellations and receipts — everything about Pro billing.",
    href: "/pricing",
    cta: "See pricing",
  },
  {
    icon: Users,
    title: "Affiliate program",
    body: "Earn recurring commissions sharing WorldEye. Ranks, missions and payouts.",
    href: "/affiliates",
    cta: "Become an affiliate",
  },
];

export default function ContactPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20 blur-[120px] bg-[#D4AF37]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] rounded-full opacity-10 blur-[100px] bg-[#00E5FF]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <img
            src="/worldeye-eye.png"
            alt="WorldEye"
            width={600}
            height={432}
            className="h-14 md:h-16 w-auto mx-auto mb-6"
            style={{ filter: "drop-shadow(0 0 18px rgba(0,150,255,0.45))" }}
          />
          <h1 className="text-3xl md:text-6xl font-bold tracking-tight">
            Talk to <span className="text-[#D4AF37]">us</span>.
          </h1>
          <p className="text-white/55 mt-4 md:mt-5 text-base md:text-lg leading-relaxed px-1">
            Questions, feedback, press or partnership ideas — the inbox is open.
            We typically reply within 1–2 business days.
          </p>
        </div>

        {/* Email CTA */}
        <div className="mt-10 md:mt-12 max-w-xl mx-auto rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 md:p-10 text-center">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 mb-5">
            <Mail className="w-6 h-6 text-[#D4AF37]" />
          </span>
          <h2 className="text-xl font-bold">Email the team</h2>
          <a
            href={`mailto:${EMAIL}`}
            className="mt-3 inline-block text-lg md:text-xl font-semibold text-[#00E5FF] hover:underline break-all"
          >
            {EMAIL}
          </a>
          <p className="text-sm text-white/45 mt-4">
            For billing issues, include the email address on your account so we
            can find your subscription quickly.
          </p>
          <a
            href={`mailto:${EMAIL}?subject=${encodeURIComponent("WorldEye — question")}`}
            className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Write to us <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Shortcut cards */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">Might be faster</h2>
          <div className="mt-8 grid sm:grid-cols-3 gap-5">
            {CARDS.map((c) => (
              <Link
                key={c.title}
                href={c.href}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 hover:border-[#D4AF37]/40 hover:bg-white/[0.04] transition group"
              >
                <c.icon className="w-7 h-7 text-[#D4AF37] mb-4" />
                <h3 className="font-semibold text-white/90 text-lg">{c.title}</h3>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">{c.body}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D4AF37] mt-4">
                  {c.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Support FAQ */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Before you <span className="text-[#D4AF37]">write</span>
          </h2>
          <div className="space-y-3">
            {SUPPORT_FAQS.map((f) => (
              <details
                key={f.q}
                className="group border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-white/90">{f.q}</span>
                  <span aria-hidden className="text-[#D4AF37] shrink-0 transition-transform group-open:rotate-180 text-lg leading-none">▾</span>
                </summary>
                <p className="px-6 pb-5 text-sm text-white/60 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-12 text-center text-sm text-white/40">
          Prefer to explore first? <Link href="/" className="text-[#D4AF37] hover:underline">Open the live map</Link> or
          see what&apos;s included in <Link href="/pricing" className="text-[#D4AF37] hover:underline">Pro</Link>.
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
