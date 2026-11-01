// /partners — Strategic Partnerships. The open invitation: who WorldEye
// wants to build with (16 categories), what could be built together, a
// searchable directory of opportunities WorldEye is ACTIVELY SEEKING,
// and the application form (stored in PartnershipApplication, managed in
// /admin/partnerships, owner notified by email).
//
// Honesty contract for this page: it names NO existing partners, logos,
// testimonials, deals, traffic or revenue figures, and promises NO
// outcomes — opportunities describe what we seek, benefits describe
// potential, and commercial structures (including any revenue sharing)
// are possibilities discussed per partnership, never terms offered here.
// The camera-source directory that used to live at this URL moved intact
// to /camera-sources (attribution + counting methodology preserved) and
// is linked prominently below.
import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  FaqJsonLd,
  Breadcrumb,
  Hero,
  StatRow,
  FaqSection,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Faq,
} from "@/components/directory-page";
import { PARTNERSHIP_TYPES } from "@/lib/partners";
import PartnersDirectory from "./PartnersDirectory";
import PartnershipForm from "./PartnershipForm";

export const metadata: Metadata = {
  title: "Partner With WorldEye — Strategic Partnerships",
  description:
    "Partner with WorldEye: business partnerships, API partnerships, camera partnerships, media partnerships, white-label partnerships and technology collaborations. Explore open opportunities and propose a partnership.",
  alternates: { canonical: `${BASE}/partners` },
  openGraph: {
    title: "Partner With WorldEye — Let's Build Something Bigger Together",
    description:
      "WorldEye is looking for strategic partners: platforms, camera networks, data providers, creators, media, travel brands and builders. Explore the opportunities and propose a collaboration.",
    url: `${BASE}/partners`,
    siteName: "WorldEye",
    type: "website",
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: "WorldEye — the live camera globe" }],
  },
};

const TYPE_OPTIONS = PARTNERSHIP_TYPES.map((t) => ({ value: t.value as string, label: t.label as string }));

const BENEFITS: { title: string; body: string }[] = [
  {
    title: "A live global camera network",
    body: "Partners build on a working product: a live globe of 74,229 cameras across 109 countries, plus flight, ship, satellite and weather tracking layers — real infrastructure, not a concept deck.",
  },
  {
    title: "An audience that explores the world",
    body: "WorldEye's visitors come to watch places live — ski resorts, harbours, cities, volcanoes, storms. Partnerships put your product, content or cameras in front of that curiosity, in context.",
  },
  {
    title: "A public API and embed system, live today",
    body: "Technical partnerships don't wait on a roadmap: the read-only public API (self-serve keys, rights-cleared cameras) and the embed player are live, documented and ready to integrate.",
  },
  {
    title: "Rights-first, always",
    body: "Every camera carries redistribution terms in our rights registry, and partner-facing surfaces only ever serve cameras those terms clear. Your content is never shared beyond the terms you set.",
  },
  {
    title: "Co-branded experiences",
    body: "From destination showcases to event camera walls, we can build joint experiences that carry both brands — designed together, credited honestly, launched when they're real.",
  },
  {
    title: "Commercial structures designed with you",
    body: "Licensing, data exchange, joint offers and — where a partnership creates shared revenue — revenue-sharing arrangements are all possibilities. The structure is designed per partnership, in the open, before anything launches.",
  },
];

interface CategorySection {
  value: string;
  title: string;
  who: string;
  build: string[];
}

const CATEGORIES: CategorySection[] = [
  {
    value: "website-app-owners",
    title: "Website & App Owners",
    who: "You run a travel, weather, local-guide, conditions or place-based site or app with readers who care about what a place looks like right now.",
    build: [
      "Live camera pages or sections built on redistribution-eligible cameras, credited to their sources",
      "Embedded live views inside your existing destination, trail, beach or city content",
      "Co-branded pages that send your readers to the live globe — and globe visitors to you",
    ],
  },
  {
    value: "saas-founders",
    title: "SaaS & Technology Founders",
    who: "You build software — dashboards, logistics, weather, property, tourism or operations tools — where a live visual would make your data hit harder.",
    build: [
      "Camera views embedded in your product via the embed player or the public API",
      "Joint offers or bundles for overlapping audiences, designed together",
      "Shared product development where our roadmaps genuinely intersect",
    ],
  },
  {
    value: "osint-platforms",
    title: "OSINT & Intelligence Platforms",
    who: "You build open-source intelligence tools, dashboards or communities. WorldEye itself grew out of an open-source intel platform — this is home turf.",
    build: [
      "Cross-linking between live camera views and your analysis layers",
      "Integrations that put the right live view one click from an investigation",
      "Joint content and community projects for the OSINT audience",
    ],
  },
  {
    value: "camera-networks",
    title: "Live Camera & Streaming Networks",
    who: "You operate cameras — a network, an agency, a DOT-style publisher, a harbour, airport, venue or resort — and you set the terms for how they're used.",
    build: [
      "Governed listing of your feeds on the globe, under your stated terms, with clear attribution",
      "Control over redistribution: eligible cameras can power embeds and the API; restricted ones stay view-only or unlisted, as you direct",
      "A global audience for cameras that currently sit on a page few people find",
    ],
  },
  {
    value: "data-providers",
    title: "API & Data Providers",
    who: "You hold weather, snow, marine, flight, event, air-quality or other place-data that would sit naturally next to a live view.",
    build: [
      "Data integrations that enrich camera and tracker pages with your feeds",
      "Data exchanges — your data in WorldEye, WorldEye's rights-cleared catalogue or API in your product",
      "Licensing arrangements scoped together, feed by feed",
    ],
  },
  {
    value: "developers-oss",
    title: "Developers & Open-Source Projects",
    who: "You build with APIs, maps, video or open data — as an independent developer, a team, or an open-source project.",
    build: [
      "Apps and tools built on the live public API (self-serve keys, read-only, rights-cleared)",
      "Open-source collaboration on camera tooling, formats and data-quality fixes",
      "Showcase possibilities for projects that do something genuinely new with live views",
    ],
  },
  {
    value: "ai-companies",
    title: "AI Companies",
    who: "You build AI assistants, agents or vision products that deal with the physical world and need real, current visual context.",
    build: [
      "Place answers grounded in live views — rights-cleared camera metadata and snapshots via the API",
      "Scoped research collaboration on live public imagery, inside the rights registry's limits",
      "Integration partnerships where your product and the globe strengthen each other",
    ],
  },
  {
    value: "media-publishers",
    title: "Media & News Publishers",
    who: "You publish news, weather or features and cover events people want to watch as they happen — storms, eruptions, races, launches, seasons turning.",
    build: [
      "Live camera embeds inside coverage, only where source terms clear redistribution, always attributed",
      "Co-branded event camera walls — marathons, parades, festivals, celestial events",
      "Enterprise feed routes for publishers with larger or commercial needs",
    ],
  },
  {
    value: "travel-tourism-ski",
    title: "Travel, Tourism & Ski Resorts",
    who: "You market a place — a destination, tourism board, resort, ski area or attraction — and your visitors check the view before they come.",
    build: [
      "Branded live-view showcases of your destination, embeddable on your own site",
      "Ski and mountain partnerships: live views next to conditions content all season",
      "Deeper branding through the white-label pilot programme (early access — see /white-label)",
    ],
  },
  {
    value: "creators-communities",
    title: "Content Creators & Communities",
    who: "You make videos, streams or community content about geography, weather, aviation, cameras, places or the live web.",
    build: [
      "Co-created features, live sessions and content built around live views",
      "Early looks at new WorldEye features for your audience",
      "Paid promotion runs separately through the affiliate program — this route is for building together",
    ],
  },
  {
    value: "seo-publishers",
    title: "SEO & Content Publishers",
    who: "You build content businesses on search, data and genuinely useful pages — and you know thin content when you see it.",
    build: [
      "Original data studies produced together from the camera network, methodology published",
      "Linkable research and tools your audience actually cites",
      "Content collaborations with a live product behind them, not a landing page",
    ],
  },
  {
    value: "marketing-agencies",
    title: "Marketing Agencies",
    who: "You run campaigns for travel, weather, events, place or destination clients and need live, visual, credible material.",
    build: [
      "Live camera content and co-branded experiences inside client campaigns",
      "WorldEye placements and integrations scoped per client",
      "Honest claims only — if a campaign idea needs a capability that isn't live, we'll say so",
    ],
  },
  {
    value: "enterprise-gov",
    title: "Enterprise & Government Technology",
    who: "You evaluate visual context for operations, situational awareness or public information — and you need rights, terms and security reviewed up front.",
    build: [
      "Scoped pilots on the Enterprise feed and embed platform (rights-cleared cameras only)",
      "Evaluations with the terms, limits and data handling stated before anything is signed",
      "A direct line to the people who built the platform during the pilot",
    ],
  },
  {
    value: "education-research",
    title: "Education & Research Organizations",
    who: "You teach or study geography, weather, earth science, transport or media — and live views make the subject real for students and researchers.",
    build: [
      "Research and education access routes matched to your programme",
      "Classroom and study materials built around live views",
      "Research collaboration on the network itself — coverage, events, change over time",
    ],
  },
  {
    value: "investors-advisors",
    title: "Investors & Strategic Advisors",
    who: "You know live data, geospatial, OSINT or creator distribution, and you can sharpen strategy or open the right doors.",
    build: [
      "A direct conversation about where WorldEye is going and what it needs next",
      "Introductions to partners, operators and talent in your network",
      "This is an invitation to talk — not a fundraising announcement, and nothing here is an offer of securities",
    ],
  },
  {
    value: "startups-entrepreneurs",
    title: "Startups & Independent Entrepreneurs",
    who: "You're building something new and a live global camera network belongs in it — even if none of the categories above describe you.",
    build: [
      "An open call: propose the collaboration you actually have in mind",
      "Structures designed together — integration, content, data, distribution or something none of us has named yet",
      "A real reading of your proposal by the team, whatever stage you're at",
    ],
  },
];

const BUILD_TOGETHER: { title: string; body: string; href: string; linkLabel: string }[] = [
  {
    title: "API partnerships",
    body: "Build on the public API: self-serve keys, read-only access to the rights-cleared camera catalogue — metadata and snapshots/links. It's live and documented.",
    href: "/developers",
    linkLabel: "Explore the developer API",
  },
  {
    title: "Cross-platform integrations",
    body: "Your tool and WorldEye side by side: cross-linked layers, embedded views, shared workflows between products that look at the same world.",
    href: "/features",
    linkLabel: "See what WorldEye does",
  },
  {
    title: "Co-branded experiences",
    body: "Destination showcases, event camera walls and joint pages that carry both brands — designed together and credited honestly.",
    href: "/embed-camera",
    linkLabel: "See the embed system",
  },
  {
    title: "Joint marketing campaigns",
    body: "Launches, seasonal pushes and content campaigns to both audiences — travel, weather, ski, events and place marketing especially.",
    href: "/affiliates",
    linkLabel: "Or earn via the affiliate program",
  },
  {
    title: "White-label projects",
    body: "Your brand over a WorldEye-powered live-view experience. White label is currently an early-access pilot — indicative, scoped per prospect, never promised as a finished product.",
    href: "/white-label",
    linkLabel: "Read about the white-label pilot",
  },
  {
    title: "Shared product development",
    body: "Where roadmaps genuinely intersect — a layer, a dataset, a tool — we can design and build it together rather than in parallel.",
    href: "/about",
    linkLabel: "About WorldEye",
  },
];

const FAQS: Faq[] = [
  {
    q: "Who can apply for a partnership?",
    a: "Anyone building something real — companies, platforms, camera operators, creators, publishers, researchers and independent builders, at any size. The sixteen categories on this page describe who we most often build with, and the application form has a catch-all category because the best proposals don't always fit a list. What matters is a genuine overlap: something you bring, something WorldEye brings, and an audience that benefits.",
  },
  {
    q: "How does the application review process work?",
    a: "Submit the form on this page. Your application is stored in our partnership CRM and the WorldEye team is notified immediately. Every application is read by a person. If there's a potential fit — or we need one more detail — we reply to the email you gave to start a conversation. We can't write a long reply to every proposal; if you don't hear back, the fit isn't there right now, and you're welcome to apply again as your project grows.",
  },
  {
    q: "What partnership structures are possible?",
    a: "The structures this page is set up to explore include integrations, embeds, data exchanges and licensing, co-branded experiences, joint marketing, bundled offers, scoped pilots and shared product development. There is no standard package: the structure is proposed together, scoped to what each side actually brings, and agreed in writing before anything launches.",
  },
  {
    q: "Do you offer revenue sharing?",
    a: "Revenue sharing is a possibility where a partnership creates shared revenue — for example joint offers or co-branded experiences that sell. It is discussed and agreed per partnership, in writing, before launch. This page doesn't quote rates or terms because there is no standard arrangement to quote: what each side contributes differs too much. The affiliate program is the one published, self-serve revenue route — open to everyone on stated terms — and it's linked from this page.",
  },
  {
    q: "Can we integrate with WorldEye technically?",
    a: "Yes — the technical routes are live. The public API offers read-only access to the rights-cleared camera catalogue with self-serve keys (metadata and snapshots/links; it never restreams other operators' video, and there are no write endpoints). The embed player puts eligible cameras on your pages with WorldEye attribution. Enterprise offers a key-gated feed API and embed platform for larger needs. Partnership conversations can extend these routes — but anything beyond them would be scoped and built as part of the partnership, not promised here.",
  },
  {
    q: "Our cameras already appear in WorldEye's source directory. Are we partners?",
    a: "No — being listed is not a partnership, and the directory says so itself. The camera sources directory (now at /camera-sources) catalogues where the cameras on the globe come from, with attribution and counting methodology. A partnership is a separate, explicit agreement. If your cameras are listed and you'd like to talk about terms, attribution or a closer collaboration, apply here or write to contact@worldeye.app.",
  },
  {
    q: "Is white label available now?",
    a: "White label is an early-access pilot, not a finished product: a small number of scoped pilots, with indicative pricing labelled as indicative and examples labelled as scenarios. If you want a branded live-view experience, apply here or use the demo generator on the white-label page to show us your use case — pilot places are chosen from real proposals.",
  },
  {
    q: "What does WorldEye bring to a partnership?",
    a: "A live product: a globe of 74,229 cameras across 109 countries, flight/ship/satellite/weather tracking, a public API and embed system, and an audience that comes to watch the world live. Also a rights-first approach — partner-facing surfaces only ever serve cameras whose terms clear them — and a small team that reads its own partnership inbox.",
  },
  {
    q: "Will you announce our partnership?",
    a: "Only when it's real. We don't list partners, logos or testimonials for agreements that don't exist, and this page deliberately names none. If we build something together, announcing it — accurately, with both sides' approval — is part of the launch.",
  },
  {
    q: "Can we be exclusive, or buy placement?",
    a: "Exclusivity is not a standard offering; anything like it would have to be scoped, justified and agreed explicitly. Placement in WorldEye's rankings and directories isn't for sale — the camera directory reflects the catalogue, not sponsorship. Partnerships here are about building things that make both products better.",
  },
];

export default function PartnersPage() {
  return (
    <PageShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Partner With WorldEye — Strategic Partnerships",
          url: `${BASE}/partners`,
          description:
            "WorldEye is looking for strategic partners: platforms, camera networks, data providers, creators, media, travel brands and builders. Explore open partnership opportunities and propose a collaboration.",
          isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
        }}
      />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: "Partners" }]} />

      <Hero
        h1="Let's Build Something Bigger Together"
        sub="WorldEye is a live window on the planet — 74,229 cameras, tracking layers and a public API — and it gets better every time somebody builds with it. This page is an open invitation: to founders, platforms, camera networks, data providers, creators, publishers and builders of every size. If our audiences, data or technology overlap, we want to hear your idea."
      />

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href="#apply"
          className="rounded-full bg-[#D4AF37] px-7 py-3 font-semibold text-black transition hover:bg-[#e5c65c]"
        >
          Propose a Partnership
        </a>
        <a
          href="#opportunities"
          className="rounded-full border border-white/20 px-7 py-3 font-semibold text-white/85 transition hover:bg-white/5"
        >
          Explore Opportunities
        </a>
      </div>

      <StatRow
        stats={[
          { value: "74,229", label: "Live cameras on the globe" },
          { value: "109", label: "Countries with cameras" },
          { value: "269", label: "Publishing sources in the directory" },
        ]}
      />

      <section className="mt-12 space-y-4 text-white/65 leading-relaxed">
        <p>
          WorldEye was built by connecting things that already existed — public cameras, open
          data, tracking feeds — into one live view of the Earth. Partnerships are how it grows
          next: a camera network reaching a global audience, a data feed making a ski page
          genuinely useful, a publisher embedding a live eruption inside its coverage, a
          developer building something we haven&apos;t imagined on the API.
        </p>
        <p>
          One thing this page is not: a wall of logos. It names no existing partners and promises
          no results, because partnerships are announced when they exist — not before. What it
          does list, openly, is what we&apos;re looking for. If you see your project in it, the
          application form below is read by the team that builds WorldEye.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Why partner with WorldEye</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-semibold text-white/90">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Who we&apos;re looking for</h2>
        <p className="text-white/55 leading-relaxed mb-6">
          Sixteen kinds of partners — and a standing invitation to anyone who doesn&apos;t fit
          the list. Find your category for the shape of a collaboration, or skip straight to the{" "}
          <a href="#opportunities" className="text-[#D4AF37] hover:underline">
            opportunities directory
          </a>
          .
        </p>
        <div className="space-y-5">
          {CATEGORIES.map((c) => (
            <article
              key={c.value}
              id={`partner-${c.value}`}
              className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 scroll-mt-24"
            >
              <h3 className="font-semibold text-white/90">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{c.who}</p>
              <p className="mt-3 text-sm font-medium text-white/70">What we could build together:</p>
              <ul className="mt-1.5 space-y-1.5">
                {c.build.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-white/55">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">What can we build together?</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {BUILD_TOGETHER.map((b) => (
            <div key={b.title} className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-semibold text-white/90">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{b.body}</p>
              <Link href={b.href} className="mt-3 inline-block text-sm font-medium text-[#D4AF37] hover:underline">
                {b.linkLabel} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section id="opportunities" className="mt-12 scroll-mt-24">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Partnership opportunities</h2>
        <p className="text-white/55 leading-relaxed mb-6">
          These are openings we are <strong className="text-white/75">actively looking to fill</strong> —
          collaborations we want to form, described so you can recognise the fit. They are not
          existing partnerships and no organisation is implied by any listing. Search them, filter
          by category, and if one matches what you&apos;re building, tell us — the button on each
          opening starts the application form with the details pre-filled.
        </p>
        <PartnersDirectory types={TYPE_OPTIONS} />
      </section>

      <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-lg font-semibold text-white/90">Looking for our camera sources?</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          The directory of where WorldEye&apos;s cameras come from — per-source counts, attribution
          and the full counting methodology — used to live on this page. It hasn&apos;t gone
          anywhere: it now has its own home, unchanged, at{" "}
          <Link href="/camera-sources" className="text-[#D4AF37] hover:underline">
            Camera Sources &amp; Data Directory
          </Link>
          . Being listed there is a catalogue fact, not a partnership — partnerships start here.
        </p>
      </section>

      <FaqSection title="Partnership questions" faqs={FAQS} />

      <section id="apply" className="mt-12 scroll-mt-24">
        <h2 className="text-xl md:text-2xl font-bold mb-3">Propose a partnership</h2>
        <p className="text-white/55 leading-relaxed mb-6">
          Tell us who you are, what you bring, what you&apos;re looking for and the collaboration
          you have in mind. Concrete beats polished — a short, specific proposal gets a faster
          read than a deck. Every field marked * is required; audience size is optional and only
          helps us understand scale.
        </p>
        <PartnershipForm types={TYPE_OPTIONS} />
      </section>

      <RelatedLinks
        title="Other routes into WorldEye"
        links={[
          { label: "Developer API", href: "/developers" },
          { label: "Enterprise", href: "/enterprise" },
          { label: "White-Label Pilot", href: "/white-label" },
          { label: "Affiliate Program", href: "/affiliates" },
          { label: "Research Access", href: "/research-access" },
          { label: "Camera Sources", href: "/camera-sources" },
          { label: "About WorldEye", href: "/about" },
        ]}
      />

      <CtaRow backHref="/" backLabel="Back to the live map" />
    </PageShell>
  );
}
