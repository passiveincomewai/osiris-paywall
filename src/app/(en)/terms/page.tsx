import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The Terms of Service for WorldEye — subscriptions, billing, acceptable use, and the fine print for the live planetary intelligence map.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | WorldEye",
    description:
      "Subscriptions, billing, acceptable use and liability terms for the WorldEye live map.",
    url: "/terms",
    type: "website",
  },
};

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-white/90">
        <span className="text-[#D4AF37] font-mono mr-3">{n}.</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-white/55">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        <p className="text-xs font-semibold tracking-[0.25em] text-[#D4AF37] mb-4">LEGAL</p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-white/40 mt-3">Last updated October 2026.</p>
        <p className="text-sm text-white/40 mt-2 italic">
          This is a plain-language template, not legal advice. Have it reviewed by a
          qualified attorney before relying on it in your jurisdiction.
        </p>

        <Section n={1} title="The service">
          <p>
            WorldEye (&quot;we&quot;, &quot;us&quot;) provides a live planetary intelligence
            map at this website: an interactive 3D globe with free layers (flights,
            satellites, transit, weather, earthquakes, wildfires, street-level photos
            and public camera feeds, with basic search free for everyone) and
            optional paid Pro features (AI tooling, satellite basemap, the live
            traffic layer, advanced search filters and premium intel feeds). The
            free map requires no account and is available to
            everyone.
          </p>
          <p>
            By accessing the site — with or without an account — you agree to these
            terms. If you don&apos;t agree, please don&apos;t use the service.
          </p>
        </Section>

        <Section n={2} title="Accounts">
          <p>
            Browsing the free map needs no account. Paid Pro subscriptions and some
            features (such as saving settings or affiliate participation) require an
            account, created via a supported sign-in provider. You&apos;re responsible
            for activity under your account and for keeping your sign-in credentials
            secure.
          </p>
          <p>
            You must be at least 13 years old (or the minimum age in your jurisdiction)
            to create an account.
          </p>
        </Section>

        <Section n={3} title="Subscriptions, free trials & billing">
          <p>
            Pro is billed on a recurring subscription: <strong className="text-white/80">weekly
            at $7.99</strong>, <strong className="text-white/80">monthly at $13.99</strong>,
            or <strong className="text-white/80">VIP Pro, billed annually at $74.99</strong>, plus any
            applicable taxes. Prices are in USD unless stated otherwise at checkout.
          </p>
          <p>
            Some plans include a free trial — 3 days on the weekly plan, 10 days on the
            monthly plan and 10 days on the VIP Pro plan. Your payment method is collected up front but isn&apos;t charged
            until the trial ends. Cancel before the trial ends and you pay nothing.
          </p>
          <p>
            When a trial or billing period ends, your subscription renews automatically
            at the then-current price until you cancel. Billing is handled securely by
            our payment processor (Stripe); we don&apos;t store your card details.
          </p>
        </Section>

        <Section n={4} title="Cancellation & refunds">
          <p>
            You can cancel anytime, in one click, from your account — no retention calls,
            no dark patterns. Cancellation stops future renewals; your Pro access
            continues until the end of the period you&apos;ve already paid for.
          </p>
          <p>
            Your first charge is covered by a <strong className="text-white/80">7-day
            money-back guarantee</strong>: email us at{" "}
            <a href="mailto:passiveincomewai@gmail.com" className="text-[#D4AF37] hover:underline">
              passiveincomewai@gmail.com
            </a>{" "}
            within 7 days of your first paid charge — the charge that ends a free
            trial, or your first charge if your plan had no trial — and we&apos;ll
            refund it in full to your original payment method, no questions asked.
            The guarantee covers your first charge only; renewal charges are not
            refundable under it.
          </p>
          <p>
            Apart from the guarantee above, and charges made in error, payments are
            generally non-refundable, because Pro is a digital service delivered
            immediately (including during free trials). If you believe you were
            charged in error, contact us at{" "}
            <a href="mailto:passiveincomewai@gmail.com" className="text-[#D4AF37] hover:underline">
              passiveincomewai@gmail.com
            </a>{" "}
            and we&apos;ll review it case by case.
          </p>
        </Section>

        <Section n={5} title="Acceptable use">
          <p>When using WorldEye, you agree not to:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Break the law or violate anyone&apos;s rights, including privacy rights.</li>
            <li>Attempt to disrupt, overload, scrape abusively, or reverse-engineer the service.</li>
            <li>Use camera feeds or map data to stalk, harass, or surveil identifiable individuals.</li>
            <li>Resell, redistribute, or repackage the service or its data feeds without written permission.</li>
            <li>Circumvent access controls, paywalls, or usage limits.</li>
          </ul>
          <p>
            We may suspend or terminate accounts that violate these terms, with or
            without notice, where reasonably necessary to protect the service or others.
          </p>
        </Section>

        <Section n={6} title="Third-party data & camera feeds">
          <p>
            Much of what WorldEye displays comes from third parties: public camera
            operators, flight data networks, satellite trackers, weather services and
            open data feeds. We aggregate and visualize this data but don&apos;t own or
            control it.
          </p>
          <p>
            Availability, accuracy and timeliness of third-party feeds are not
            guaranteed — cameras go offline, feeds move, and data can be delayed or
            incomplete. Nothing on the map should be relied on for safety-critical,
            medical, legal or financial decisions; always check official sources for
            emergencies, road closures and weather warnings.
          </p>
        </Section>

        <Section n={7} title="Intellectual property">
          <p>
            The WorldEye name, logo, site design and original content are our property
            or used under license, and are protected by intellectual property laws. The
            underlying map engine is open-source software used under its own license
            terms.
          </p>
          <p>
            You&apos;re welcome to share screenshots and links for personal or editorial
            use with attribution. Anything beyond that — commercial redistribution,
            white-labeling, API reselling — needs our prior written permission.
          </p>
        </Section>

        <Section n={8} title="Disclaimers & limitation of liability">
          <p>
            The service is provided &quot;as is&quot; and &quot;as available&quot;,
            without warranties of any kind, express or implied — including warranties of
            merchantability, fitness for a particular purpose, accuracy, or
            uninterrupted availability.
          </p>
          <p>
            To the maximum extent permitted by law, we won&apos;t be liable for indirect,
            incidental, consequential or punitive damages, or for loss of profits, data
            or goodwill. Our total liability for any claim is limited to the amount you
            paid us in the 12 months before the claim (or $10 if you paid nothing).
          </p>
        </Section>

        <Section n={9} title="Termination">
          <p>
            You can stop using WorldEye at any time and delete your account on request.
            We may suspend or terminate your access if you materially breach these terms
            or if required by law. Sections that by their nature should survive
            (intellectual property, disclaimers, limitation of liability) continue after
            termination.
          </p>
        </Section>

        <Section n={10} title="Changes to these terms">
          <p>
            We may update these terms as the service evolves. Material changes will be
            flagged by updating the &quot;Last updated&quot; date above and, where
            reasonable, by notice on the site. Continued use after changes take effect
            means you accept the updated terms.
          </p>
        </Section>

        <Section n={11} title="Contact">
          <p>
            Questions about these terms? Reach us at{" "}
            <a href="mailto:passiveincomewai@gmail.com" className="text-[#D4AF37] hover:underline">
              passiveincomewai@gmail.com
            </a>
            . Related policies: <Link href="/privacy" className="text-[#D4AF37] hover:underline">Privacy Policy</Link>.
          </p>
        </Section>
      </div>
      <SiteFooter />
    </main>
  );
}
