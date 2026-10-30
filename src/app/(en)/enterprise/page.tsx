import Link from "next/link";
import {
  Check,
  Code2,
  KeyRound,
  Layers,
  Lock,
  MonitorPlay,
  ShieldCheck,
} from "lucide-react";
import { enterpriseAccess } from "@/lib/enterprise/access";
import {
  ENTERPRISE_OFFER_FEATURES,
  ENTERPRISE_GUARANTEE_LINE,
  ENTERPRISE_SUPPORT_LINE,
} from "@/lib/enterprise/offer";
import JsonLd from "@/components/JsonLd";
import EnterpriseClient from "./EnterpriseClient";

export const metadata = {
  title: "Enterprise Camera Feed API & Embed",
  description:
    "License the WorldEye camera catalogue for your own platform: build custom collections from 74,229 live cameras, publish them with an embeddable player or a private JSON data feed, and use API keys onto the same data — every camera rights-cleared by source. $999/year.",
  alternates: { canonical: "https://worldeye.app/enterprise" },
};

export const dynamic = "force-dynamic";

function OfferList() {
  return (
    <ul className="mt-5 space-y-2">
      {ENTERPRISE_OFFER_FEATURES.map((f) => (
        <li key={f} className="flex items-center gap-2.5 text-sm text-white/85">
          <span className="w-5 h-5 rounded-full bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-[#00E5FF]" />
          </span>
          {f}
        </li>
      ))}
    </ul>
  );
}

/* The ways the feed reaches a customer's platform — shipped
   capabilities only, matching lib/enterprise/offer and the dashboard. */
const DELIVERY_WAYS = [
  {
    icon: Layers,
    title: "Custom camera collections",
    body: "Build your own sets from the WorldEye catalogue — a city's traffic cameras, a region's ski and beach cams, a network of ports — and keep them current from one dashboard instead of negotiating with every camera operator yourself.",
  },
  {
    icon: MonitorPlay,
    title: "Embeddable live player",
    body: "Drop a live camera player into your own website. Your collections publish through the player as you edit them, so the cameras on your pages are the cameras in your feed — never a stale copy.",
  },
  {
    icon: Code2,
    title: "Private JSON data feed",
    body: "Prefer to render cameras your own way? Your collections are also available as a private JSON data feed your platform can import and build on.",
  },
  {
    icon: KeyRound,
    title: "API keys, if you want them",
    body: "The same collections and feed are reachable with API keys you create and manage yourself — optional, for teams whose platforms call the data directly.",
  },
];

const FAQS = [
  {
    q: "What is the WorldEye Enterprise camera feed?",
    a: "It is a licence to build on the WorldEye catalogue itself. Instead of sending your audience to worldeye.app, you build custom camera collections from the catalogue and publish them on your own site or platform: through an embeddable live player, a private JSON data feed of your collections, and — if you want it — API keys onto the same data.",
  },
  {
    q: "How much does Enterprise cost, and is there a free trial?",
    a: "Enterprise is $999/year, billed annually. Unlike the Pro plans it has no free trial; your first charge is covered by a 7-day money-back guarantee — email us within 7 days of the charge for a full refund, no questions asked.",
  },
  {
    q: "Which cameras can I publish on my own site?",
    a: "Only the cameras each source's terms allow to be redistributed. Every camera in the catalogue carries a per-source rights verdict, and the embed, feed and API enforce it: around 96% of the catalogue is eligible, and some sources — Windy webcams among them — are excluded entirely, so nothing your organisation publishes outruns the rights behind it.",
  },
  {
    q: "How do I get started?",
    a: "Subscribe to Enterprise on the pricing page, sign in, and open the enterprise dashboard on this page: build your first collection, then take the embed, the feed or an API key from the same place. Integration help is included — we help you wire the embed or feed into your platform.",
  },
  {
    q: "What does my team get besides the feed?",
    a: "Everything in Pro, for your whole team, plus priority customer support. The self-serve dashboard is the whole product surface: collections, the embed, the data feed and your keys.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: "https://worldeye.app/enterprise",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default async function EnterprisePage() {
  const a = await enterpriseAccess();
  return (
    <div className="docs-root min-h-screen bg-[#05070d] text-white">
      <JsonLd data={faqJsonLd} />
      <div className="max-w-5xl mx-auto px-5 py-10 md:py-14">
        <p className="text-xs font-bold tracking-[0.25em] text-[#00E5FF]">ENTERPRISE</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2">
          Your cameras, on your platform
        </h1>
        <p className="text-white/55 mt-3 max-w-2xl leading-relaxed">
          Build collections from the WorldEye catalogue and publish them three ways: an
          embeddable live player for your website, a private data feed your platform can
          import, and — if you want it — API keys onto the same data.
        </p>

        {!a.ok ? (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <p className="flex items-center gap-2 text-white/85 font-medium">
              <Lock className="w-4 h-4 text-[#00E5FF]" /> Sign in to open your enterprise dashboard.
            </p>
            <OfferList />
            <Link
              href="/signin"
              className="inline-block mt-6 px-6 py-3 rounded-2xl bg-[#00E5FF] text-black font-bold text-sm hover:brightness-110 transition"
            >
              Sign in
            </Link>
            <p className="text-xs text-white/40 mt-4">{ENTERPRISE_SUPPORT_LINE}</p>
          </div>
        ) : !a.enterprise ? (
          <div className="mt-10 rounded-3xl border border-[#00E5FF]/25 bg-gradient-to-b from-[#00E5FF]/[0.06] to-white/[0.02] p-6 md:p-8">
            <p className="text-white/85 font-medium">
              The camera feed is part of the Enterprise plan ($999/year).
            </p>
            <OfferList />
            <Link
              href="/pricing"
              className="inline-block mt-6 px-6 py-3 rounded-2xl bg-[#00E5FF] text-black font-bold text-sm hover:brightness-110 transition"
            >
              Get Enterprise
            </Link>
            <p className="flex items-start gap-2 text-xs text-white/50 mt-5 max-w-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]/80 shrink-0 mt-px" />
              <span>{ENTERPRISE_GUARANTEE_LINE}</span>
            </p>
            <p className="text-xs text-white/40 mt-3">{ENTERPRISE_SUPPORT_LINE}</p>
          </div>
        ) : (
          <EnterpriseClient />
        )}

        {/* What the feed includes — rendered for every visitor, so the
            product is legible without an account. */}
        <div className="mt-16">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            What the Enterprise feed includes
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {DELIVERY_WAYS.map((d) => (
              <div
                key={d.title}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-7"
              >
                <d.icon className="w-7 h-7 text-[#00E5FF]" />
                <h3 className="mt-4 font-semibold text-white/90 text-lg">{d.title}</h3>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rights */}
        <div className="mt-16 rounded-3xl border border-white/10 bg-white/[0.02] p-7 md:p-9">
          <h2 className="flex items-center gap-2.5 text-xl md:text-2xl font-bold tracking-tight">
            <ShieldCheck className="w-6 h-6 text-[#00E5FF]" /> Rights-cleared by source
          </h2>
          <p className="mt-3 text-white/60 leading-relaxed max-w-3xl">
            A public camera is not automatically a camera you may republish. WorldEye
            tracks the redistribution terms of every source in the catalogue, and the
            Enterprise embed, feed and API only ever serve the cameras those terms
            clear — around 96% of the catalogue. Cameras from sources that do not
            allow redistribution, Windy webcams included, never reach your site. The{" "}
            <Link href="/partners" className="text-[#00E5FF] hover:underline">
              partners &amp; data sources directory
            </Link>{" "}
            lists where the catalogue comes from.
          </p>
        </div>

        {/* Price facts */}
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/60">
          <span>
            <span className="text-white font-semibold">$999/year</span> — billed annually
          </span>
          <span>No free trial on Enterprise</span>
          <span>7-day money-back guarantee on your first charge</span>
          <span>
            <Link href="/pricing" className="text-[#00E5FF] hover:underline">
              Compare all plans →
            </Link>
          </span>
        </div>

        {/* White Label — the branded-portal pilot built on this feed */}
        <div className="mt-16 rounded-3xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent p-7 md:p-8 max-w-3xl">
          <h2 className="text-xl font-bold tracking-tight">
            Want the whole platform under your brand?
          </h2>
          <p className="text-white/55 mt-2.5 text-sm leading-relaxed">
            WorldEye White Label takes the collections and feeds above and
            puts them behind your logo, your colours and your domain as a
            complete audience-facing portal. It is in an early-access pilot
            for resorts, tourism boards, media companies and enterprises —
            with indicative pricing and demo requests open now.
          </p>
          <Link
            href="/white-label"
            className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-2xl border border-[#D4AF37]/40 text-[#D4AF37] font-semibold text-sm hover:bg-[#D4AF37]/10 transition"
          >
            Explore WorldEye White Label →
          </Link>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Enterprise questions
          </h2>
          <div className="mt-8 space-y-6">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-white/90">{f.q}</h3>
                <p className="mt-1.5 text-sm text-white/55 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-10">{ENTERPRISE_SUPPORT_LINE}</p>
        </div>
      </div>
    </div>
  );
}
