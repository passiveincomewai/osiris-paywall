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
} from "@/lib/enterprise/offer";
import JsonLd from "@/components/JsonLd";
import SiteFooter from "@/components/SiteFooter";
import MicroLabel from "@/components/design/MicroLabel";
import Button from "@/components/design/Button";
import EnterpriseClient from "./EnterpriseClient";

export const metadata = {
  title: "Enterprise Camera Feed API & Embed",
  description:
    "License the WorldEye camera catalogue for your own platform: build custom collections from 74,229 live cameras, publish them with an embeddable player or a private JSON data feed, and use API keys onto the same data — every camera rights-cleared by source. $999/year.",
  alternates: { canonical: "https://worldeye.app/enterprise" },
};

export const dynamic = "force-dynamic";

const ACCENT = { color: "var(--we-blue-strong)" } as const;

/* The direct purchase route: the same on-site checkout every other buy
   surface uses (lib/billing/trial-checkout's checkoutPagePath) with the
   Enterprise plan preselected — $999/year, billed annually, no trial.
   /pricing sells Enterprise only through its in-page checkout sheet,
   which takes no preselected plan from the URL, so this is the shortest
   honest path from this page to paying. */
const ENTERPRISE_CHECKOUT_HREF = "/checkout?plan=enterprise";

/* The lead path: the contact form is the channel — no raw email address
   is printed on this page. /contact does not preselect a topic from the
   query string (ContactForm defaults to "general"), so link the plain
   form and name the topic in the link text. */
function EnterpriseContactLine() {
  return (
    <>
      Questions or integration help?{" "}
      <Link href="/contact" className="hover:underline" style={ACCENT}>
        Talk to us about Enterprise
      </Link>
    </>
  );
}

function OfferList() {
  return (
    <ul className="mt-5 space-y-2">
      {ENTERPRISE_OFFER_FEATURES.map((f) => (
        <li
          key={f}
          className="flex items-center gap-2.5"
          style={{ color: "var(--we-text-2)", fontSize: "var(--we-size-small)" }}
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "var(--we-ink-3)",
              border: "1px solid var(--we-line-3)",
            }}
          >
            <Check className="w-3 h-3" style={ACCENT} />
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
    a: "Use the Get Enterprise button on this page — it takes you straight to checkout for the $999/year plan — then sign in and open the enterprise dashboard on this page: build your first collection, then take the embed, the feed or an API key from the same place. Integration help is included — we help you wire the embed or feed into your platform.",
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

const panelStyle = {
  background: "var(--we-ink-2)",
  border: "1px solid var(--we-line-2)",
  borderRadius: "var(--we-radius-3)",
} as const;

const sectionTitleStyle = {
  color: "var(--we-text-1)",
  fontSize: "var(--we-size-title)",
  lineHeight: "var(--we-leading-display)",
  fontWeight: 560,
  margin: 0,
} as const;

const bodyTextStyle = {
  color: "var(--we-text-2)",
  fontSize: "var(--we-size-small)",
  lineHeight: "var(--we-leading-body)",
} as const;

export default async function EnterprisePage() {
  const a = await enterpriseAccess();
  return (
    <div
      className="docs-root min-h-screen"
      style={{ background: "var(--we-ink-0)", color: "var(--we-text-1)" }}
    >
      <JsonLd data={faqJsonLd} />
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: "var(--we-wide)",
          paddingLeft: "var(--we-gutter)",
          paddingRight: "var(--we-gutter)",
          paddingTop: "var(--we-section-y)",
          paddingBottom: "var(--we-section-y)",
        }}
      >
        <MicroLabel>ENTERPRISE</MicroLabel>
        <h1
          className="font-[family-name:var(--we-font-display)]"
          style={{
            color: "var(--we-text-1)",
            fontSize: "var(--we-size-display-2)",
            lineHeight: "var(--we-leading-display)",
            fontWeight: 560,
            marginTop: "var(--we-space-4)",
          }}
        >
          Your cameras, on your platform
        </h1>
        <p
          style={{
            color: "var(--we-text-2)",
            fontSize: "var(--we-size-lede)",
            lineHeight: "var(--we-leading-body)",
            marginTop: "var(--we-space-4)",
            maxWidth: "var(--we-measure)",
          }}
        >
          Build collections from the WorldEye catalogue and publish them three ways: an
          embeddable live player for your website, a private data feed your platform can
          import, and — if you want it — API keys onto the same data.
        </p>

        {/* Buy + lead paths, in the hero for every visitor who does not
            already hold Enterprise (subscribers get their dashboard
            below instead): the buy button goes straight to checkout
            with the Enterprise plan preselected; the quiet link is the
            sales conversation, through the contact form. */}
        {!(a.ok && a.enterprise) && (
          <div
            className="flex flex-wrap items-center gap-x-5 gap-y-3"
            style={{ marginTop: "var(--we-space-6)" }}
          >
            <Button href={ENTERPRISE_CHECKOUT_HREF}>Get Enterprise — $999/year</Button>
            <Button variant="quiet" href="/contact">
              Talk to us about Enterprise
            </Button>
          </div>
        )}

        {!a.ok ? (
          <div className="mt-10 p-6 md:p-8" style={panelStyle}>
            <p
              className="flex items-center gap-2 font-medium"
              style={{ color: "var(--we-text-1)" }}
            >
              <Lock className="w-4 h-4" style={ACCENT} /> Sign in to open your enterprise dashboard.
            </p>
            <OfferList />
            <div style={{ marginTop: "var(--we-space-6)" }}>
              <Button href="/signin">Sign in</Button>
            </div>
            <p
              className="mt-4"
              style={{ color: "var(--we-text-2)", fontSize: "var(--we-size-small)" }}
            >
              <EnterpriseContactLine />
            </p>
          </div>
        ) : !a.enterprise ? (
          <div
            className="mt-10 p-6 md:p-8"
            style={{ ...panelStyle, border: "1px solid var(--we-line-3)" }}
          >
            <p className="font-medium" style={{ color: "var(--we-text-1)" }}>
              The camera feed is part of the Enterprise plan ($999/year).
            </p>
            <OfferList />
            <div style={{ marginTop: "var(--we-space-6)" }}>
              <Button href={ENTERPRISE_CHECKOUT_HREF}>Get Enterprise — $999/year</Button>
            </div>
            <p
              className="flex items-start gap-2 mt-5 max-w-xl"
              style={{ color: "var(--we-text-2)", fontSize: "var(--we-size-small)" }}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px" style={ACCENT} />
              <span>{ENTERPRISE_GUARANTEE_LINE}</span>
            </p>
            <p
              className="mt-3"
              style={{ color: "var(--we-text-2)", fontSize: "var(--we-size-small)" }}
            >
              <EnterpriseContactLine />
            </p>
          </div>
        ) : (
          <EnterpriseClient />
        )}

        {/* Rights */}
        <div className="mt-16 p-7 md:p-9" style={panelStyle}>
          <h2
            className="flex items-center gap-2.5 font-[family-name:var(--we-font-display)]"
            style={sectionTitleStyle}
          >
            <ShieldCheck className="w-6 h-6" style={ACCENT} /> Rights-cleared by source
          </h2>
          <p
            className="mt-3 max-w-3xl"
            style={{ ...bodyTextStyle, fontSize: "var(--we-size-body)" }}
          >
            A public camera is not automatically a camera you may republish. WorldEye
            tracks the redistribution terms of every source in the catalogue, and the
            Enterprise embed, feed and API only ever serve the cameras those terms
            clear — around 96% of the catalogue. Cameras from sources that do not
            allow redistribution, Windy webcams included, never reach your site. The{" "}
            <Link href="/camera-sources" className="hover:underline" style={ACCENT}>
              partners &amp; data sources directory
            </Link>{" "}
            lists where the catalogue comes from.
          </p>
        </div>

        {/* What the feed includes — rendered for every visitor, so the
            product is legible without an account. */}
        <div className="mt-16">
          <h2 className="font-[family-name:var(--we-font-display)]" style={sectionTitleStyle}>
            What the Enterprise feed includes
          </h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {DELIVERY_WAYS.map((d) => (
              <div key={d.title} className="p-7" style={panelStyle}>
                <d.icon className="w-7 h-7" style={ACCENT} />
                <h3
                  className="mt-4 font-semibold text-lg"
                  style={{ color: "var(--we-text-1)" }}
                >
                  {d.title}
                </h3>
                <p className="mt-2" style={bodyTextStyle}>
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Price facts */}
        <div
          className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3"
          style={{ color: "var(--we-text-2)", fontSize: "var(--we-size-small)" }}
        >
          {!(a.ok && a.enterprise) && (
            <Button href={ENTERPRISE_CHECKOUT_HREF}>Get Enterprise — $999/year</Button>
          )}
          <span>
            <span className="font-semibold" style={{ color: "var(--we-text-1)" }}>
              $999/year
            </span>{" "}
            — billed annually
          </span>
          <span>No free trial on Enterprise</span>
          <span>7-day money-back guarantee on your first charge</span>
          <span>
            <Link href="/pricing" className="hover:underline" style={ACCENT}>
              Compare all plans →
            </Link>
          </span>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl">
          <h2 className="font-[family-name:var(--we-font-display)]" style={sectionTitleStyle}>
            Enterprise questions
          </h2>
          <div className="mt-8 space-y-6">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold" style={{ color: "var(--we-text-1)" }}>
                  {f.q}
                </h3>
                <p className="mt-1.5" style={bodyTextStyle}>
                  {f.a}
                </p>
              </div>
            ))}
          </div>
          <p
            className="mt-10"
            style={{ color: "var(--we-text-2)", fontSize: "var(--we-size-small)" }}
          >
            <EnterpriseContactLine />
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
