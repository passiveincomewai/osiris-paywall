import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, CreditCard, Users, ArrowRight, Megaphone } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import ContactForm from "@/components/contact/ContactForm";

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
  {
    q: "How do I claim the 7-day money-back guarantee?",
    a: "Email us from the address on your account within 7 days of your first charge and say you want a guarantee refund — that is the whole process. Note it applies to the first charge of your first paid plan, and a refund doesn't cancel the subscription by itself; if you don't want to continue, cancel as well so it doesn't renew.",
  },
  {
    q: "A camera feed is dead, wrong or mislabeled — can I report it?",
    a: "Please do. Send the camera's name or location and what looks wrong (offline, wrong place, duplicated). The directory is playback-verified, and reports like yours are one of the ways dead and mislabeled feeds get found and fixed.",
  },
  {
    q: "I forgot my password or can't sign in — what do I do?",
    a: "Use the forgot-password link on the sign-in page first: it emails you a reset link that stays valid for 1 hour. If you signed up with Google, the Continue with Google button on the same page is your way back in. Only email us if both routes fail — and write from the address on the account if you can.",
  },
  {
    q: "How do I cancel Pro, or close my account entirely?",
    a: "You can cancel a subscription yourself from the Manage Subscription page in your account settings — it stays active until the end of the paid period and simply doesn't renew. Remember that a guarantee refund and a cancellation are separate steps. If you want the account itself removed, email us from the account address and we'll handle it.",
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
  {
    icon: Megaphone,
    title: "Partnerships & press",
    body: "Camera partnerships, embeds and media inquiries — start the conversation below.",
    href: "/contact#partnerships",
    cta: "See partnership notes",
  },
];

const TOPICS = [
  {
    title: "Account & sign-in help",
    body: "Locked out, a verification email that never arrived, or a reset link that expired. Most of these fix themselves — try the forgot-password flow first (links stay valid for 1 hour), then write to us if you're still stuck.",
  },
  {
    title: "Billing, trials & the guarantee",
    body: "Questions about the weekly ($7.99), monthly ($13.99) or VIP Pro annual ($74.99) plans, free trials (1 day on weekly and monthly, 3 days on annual), receipts, or claiming the 7-day money-back guarantee on your first charge. This inbox is where guarantee claims are made.",
  },
  {
    title: "Camera & data reports",
    body: "A feed that's offline, mislabeled, duplicated or in the wrong place — or a flight, satellite or weather layer showing something odd. Tell us which camera or layer and what you saw; reports feed directly into the verification pass.",
  },
  {
    title: "Partnerships",
    body: "You run a resort, newsroom, tourism site, weather page or community that could use live camera views, or you have another collaboration in mind. Tell us what you run and what you'd want to show your audience.",
  },
  {
    title: "Press",
    body: "Writing about live data, open intelligence or WorldEye itself? The About page has the background and the numbers (74,229 cameras, 105 countries, a free globe with no signup). For anything else, email us.",
  },
  {
    title: "Security reports",
    body: "Found a vulnerability or something that looks wrong with account or payment security? We want to know. Read the security page for what we protect and how, then report it here with as much detail as you can share.",
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

        {/* Contact form */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Send us a <span className="text-[#D4AF37]">message</span>
          </h2>
          <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto leading-relaxed">
            Prefer not to open your mail app? Use the form — it lands in the
            same inbox.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </section>

        {/* What to write about */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">What to <span className="text-[#D4AF37]">write about</span></h2>
          <p className="text-white/50 text-center mt-4 max-w-2xl mx-auto leading-relaxed">
            One inbox reads everything, but a clear subject line routes your
            message to the right pair of eyes faster. Here is what lands here
            most often — and what to include for each.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOPICS.map((t) => (
              <div key={t.title} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="font-semibold text-white/90">{t.title}</h3>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </section>

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

        {/* How to get a useful answer fast */}
        <section className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">How to get a useful answer, <span className="text-[#D4AF37]">fast</span></h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
            <p>
              WorldEye support is a small team reading real email — no ticket
              bots, no script. A few details in your first message can save a
              whole round of back-and-forth:
            </p>
            <ul className="space-y-3 text-sm md:text-base">
              <li className="flex gap-3"><span aria-hidden className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0" /><span><strong className="text-white/85">Write from your account email.</strong> For anything billing- or account-related, the address on the account is how we find you in Stripe and in the account system. Requests from a different address have to be verified first.</span></li>
              <li className="flex gap-3"><span aria-hidden className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0" /><span><strong className="text-white/85">For billing, name the plan and the date.</strong> Weekly, monthly or annual, plus roughly when the charge happened, lets us pull up the exact subscription instead of guessing.</span></li>
              <li className="flex gap-3"><span aria-hidden className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0" /><span><strong className="text-white/85">For a broken layer, say what, where and when.</strong> Which layer (cameras, flights, traffic, weather), your browser and device, and when it started. Live layers depend on third-party feeds; those three facts tell us whether the feed itself is down.</span></li>
              <li className="flex gap-3"><span aria-hidden className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0" /><span><strong className="text-white/85">For a camera report, name the camera.</strong> The camera&apos;s name or location as shown on the map, and what looks wrong — offline, wrong place, duplicated, mislabeled.</span></li>
              <li className="flex gap-3"><span aria-hidden className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#D4AF37]/70 shrink-0" /><span><strong className="text-white/85">One issue per email helps.</strong> Not a rule — but a single clear thread per problem gets each one solved without anything getting lost.</span></li>
            </ul>
            <p>
              And if you&apos;re claiming the 7-day money-back guarantee, the
              whole process is: email from your account address within 7 days
              of your first charge and say so. If you don&apos;t want the plan
              to continue afterwards, cancel it as well — a refund on its own
              doesn&apos;t stop a subscription from renewing.
            </p>
          </div>
        </section>

        {/* Partnerships & press */}
        <section id="partnerships" className="mt-16 md:mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">Partnerships &amp; <span className="text-[#D4AF37]">press</span></h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed">
            <p>
              Two kinds of partnership run through this inbox. The first is the{" "}
              <Link href="/affiliates" className="text-[#D4AF37] hover:underline">affiliate program</Link>:
              open to everyone, free to join, with recurring commissions of
              15–30% by rank, a 30-day attribution window and payouts from a
              $25 balance. Creators with 25,000 or more followers can also
              apply there for free Pro. If your question is about joining,
              ranks or payouts, the affiliate page answers most of it — and
              this inbox handles the rest.
            </p>
            <p>
              The second is camera partnerships: we&apos;re in conversation
              with ski resorts, newsrooms, tourism boards and weather and
              traffic sites about putting live camera views in front of their
              audiences. If you run a site or a broadcast and want to talk
              about what that could look like, write and tell us what you run,
              where your audience is, and which views you&apos;d want to show.
              We&apos;ll be straight with you about what exists today and
              what&apos;s still being built.
            </p>
            <p>
              For press: WorldEye is a free live 3D globe — 74,229 public
              cameras across 105 countries, plus live flights, satellites,
              weather, earthquakes and transit, with no signup to look around.
              The <Link href="/about" className="text-[#D4AF37] hover:underline">About page</Link>{" "}
              covers the story and the principles; email us for anything
              beyond that.
            </p>
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
