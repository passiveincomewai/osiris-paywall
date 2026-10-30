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
        <p className="text-sm text-white/40 mt-3">Last updated 29 October 2026.</p>
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
            optional paid features (such as AI tooling, the live traffic layer,
            camera alerts and recording, advanced search filters and premium intel
            feeds). The satellite basemap is free for everyone; the imagery it shows
            is dated survey imagery assembled from past passes, not a live feed. The
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
            Browsing the free map needs no account. Paid subscriptions and some
            features (such as saving settings or affiliate participation) require an
            account, created with an email address and password, by continuing
            with Google, or — where offered — by an emailed sign-in link. You&apos;re responsible
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
            Paid plans are billed on a recurring subscription. The main tiers —
            <strong className="text-white/80">Lite</strong>, <strong className="text-white/80">Pro</strong> and{" "}
            <strong className="text-white/80">Ultra</strong> — are each billed weekly, monthly or annually
            (the annual Pro plan is branded VIP Pro), and two standalone plans,{" "}
            <strong className="text-white/80">Powder Pass</strong> and <strong className="text-white/80">WorldEye
            Ambient</strong>, are billed monthly at $4.99. The current price of every plan is shown on the
            pricing page and again at checkout before you pay; prices are in USD unless stated otherwise at
            checkout, plus any applicable taxes.
          </p>
          <p>
            Most plans include a free trial, set by the billing period: 3 days on weekly plans, 10 days on
            monthly and annual plans (the standalone monthly plans include a 10-day trial). Enterprise plans
            have no free trial. Your payment method is collected up front but isn&apos;t charged
            until the trial ends. Cancel before the trial ends and you pay nothing.
          </p>
          <p>
            Promotional codes can be entered at checkout and apply exactly as described when the code is
            issued — for example, our standing welcome code <strong className="text-white/80">WELCOME50</strong>{" "}
            takes 50% off your first payment, once per customer.
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
            no dark patterns. Cancellation stops future renewals; your paid access
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
            generally non-refundable, because the paid service is delivered
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
            incomplete. Satellite imagery in particular is dated imagery from past
            passes, shown with its capture era where the source provides one; it is
            never a live view. Nothing on the map should be relied on for safety-critical,
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
            You can stop using WorldEye at any time. You can also schedule your
            account for deletion from your account settings: deletion takes effect
            on the date shown when you schedule it, and you can cancel the schedule
            any time before then. We may suspend or terminate your access if you materially breach these terms
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
