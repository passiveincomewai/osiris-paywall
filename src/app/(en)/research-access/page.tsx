import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Database,
  FlaskConical,
  GraduationCap,
  KeyRound,
  Mail,
  Quote,
  Scale,
  ShieldCheck,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import DonateInlineCard from "@/components/donate/DonateInlineCard";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/RelatedLinks";

export const metadata: Metadata = {
  title: "Research & Education Access — WorldEye Camera Data",
  description:
    "Documented access to WorldEye's public-camera metadata and geographic data for universities, educators and researchers: the catalogue, the Enterprise feed and API, the source-terms framework, and how to request access.",
  alternates: { canonical: "https://worldeye.app/research-access" },
  openGraph: {
    title: "WorldEye for Research & Education",
    description:
      "Public-camera metadata and geographic data for universities and researchers — real access routes, the rights framework, and how to cite WorldEye data.",
    type: "website",
    url: "https://worldeye.app/research-access",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Research & Education Access — WorldEye Camera Data",
  description:
    "Documented access routes to WorldEye's public-camera metadata for universities, educators and researchers, under the per-source rights framework.",
  url: "https://worldeye.app/research-access",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const FIELDS: Array<[string, string]> = [
  ["id", "The camera's stable catalogue identifier."],
  ["name", "The camera's name as listed by its source."],
  ["city / country", "Where the camera is located."],
  ["lat / lng", "The camera's geographic coordinates."],
  [
    "streamUrl / streamType",
    "The live stream URL and its kind (jpg, hls, iframe, mjpeg or mp4). Null when the camera is snapshot-only.",
  ],
  [
    "snapshotUrl",
    "A current-still URL served by WorldEye's frame route. Null for stream-only cameras.",
  ],
  [
    "attribution",
    "The operating agency to credit for the camera — for example, “Alberta 511 via WorldEye”.",
  ],
  ["source", "The catalogue source label the camera's rights verdict was taken from."],
];

const REQUEST_OUTLINE = [
  "Your institution and department or programme",
  "What you are studying or teaching, in a sentence or two",
  "The data you need — regions or subjects, and whether you need metadata, live streams, or both",
  "How the data would be used: teaching, publication, or internal research",
  "Your timeframe",
];

const FAQS = [
  {
    q: "Is there a free API for researchers?",
    a: "No. WorldEye does not publish a free or self-serve API tier. Programmatic access — the data feed and the REST API — is part of the Enterprise camera feed, because every camera it carries has to pass the rights registry first. The WorldEye website itself is free for everyone, including classroom use, with no account needed.",
  },
  {
    q: "Can I download the whole camera dataset?",
    a: "There is no public bulk download. Dataset access is provided as collections you build in the Enterprise dashboard and read through the embed player, the JSON feed, or the API. If a project needs something those routes do not cover, ask in your request — requests are reviewed individually, and anything supplied is limited to rights-cleared records under the sources' terms.",
  },
  {
    q: "Which cameras may I republish or redistribute?",
    a: "Only the cameras the rights registry clears for redistribution. The feed enforces this for you: cleared cameras ship with their attribution, and every pick that does not ship is returned in an excluded list with the reason. Cameras sourced from Windy Webcams are never cleared for redistribution, and sources whose terms have not been reviewed are held by default.",
  },
  {
    q: "Is there an education discount or a special research tier?",
    a: "No education tier or discount is published, and access is not automatic. Research and education requests are reviewed individually against the same access routes described on this page — contact us with the outline above and we will confirm what we can offer for your project.",
  },
  {
    q: "Can my students use WorldEye in class?",
    a: "Yes. The public site — the live 3D globe, cameras, flights, satellites and weather — is free to use in teaching with no signup. Our educators' page collects classroom uses and lesson starters.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function ResearchAccessPage() {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-white relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      <JsonLd data={faqJsonLd} />

      <div className="relative max-w-5xl mx-auto px-5 py-10 md:py-14">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/use-cases/educators"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> WorldEye for Educators
          </Link>
          <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center">
            <img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" />
          </Link>
        </div>

        {/* Hero */}
        <p className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-[#00E5FF] border border-[#00E5FF]/30 rounded-full px-4 py-1.5">
          <GraduationCap className="w-3.5 h-3.5" /> RESEARCH &amp; EDUCATION
        </p>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-5">
          WorldEye data for research and teaching
        </h1>
        <p className="text-white/55 mt-4 max-w-2xl leading-relaxed">
          WorldEye indexes 74,229 public cameras around the world. This page documents the
          real routes to that catalogue's metadata and geographic data for universities,
          educators and researchers — what exists, the terms it travels under, and how to
          request access. Nothing here is self-serve that is not described as such, and no
          route on this page bypasses the rights of the agencies that operate the cameras.
        </p>

        {/* What's available */}
        <section className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Database className="w-7 h-7 text-[#00E5FF]" /> What is available
          </h2>

          <div className="mt-8 space-y-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <h3 className="font-semibold text-white/90 text-lg">The public catalogue — free on the web</h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed max-w-3xl">
                Every camera in the catalogue is browsable on the{" "}
                <Link href="/" className="text-[#00E5FF] hover:underline">live globe</Link>, in the{" "}
                <Link href="/cameras/countries" className="text-[#00E5FF] hover:underline">country directory</Link>{" "}
                and in the{" "}
                <Link href="/live-camera-index" className="text-[#00E5FF] hover:underline">live camera index</Link>.
                Each camera carries public metadata: its name, city and country, its geographic
                coordinates, and the source that operates it. For teaching, the site is free to
                use in class with no account — see{" "}
                <Link href="/use-cases/educators" className="text-[#00E5FF] hover:underline">
                  WorldEye for Educators
                </Link>
                .
              </p>
            </div>

            <div className="rounded-3xl border border-[#00E5FF]/25 bg-gradient-to-b from-[#00E5FF]/[0.06] to-white/[0.02] p-6 md:p-8">
              <h3 className="font-semibold text-white/90 text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#00E5FF]" /> The camera feed and API — Enterprise routes
              </h3>
              <p className="text-sm text-white/55 mt-2 leading-relaxed max-w-3xl">
                Programmatic access is the{" "}
                <Link href="/enterprise" className="text-[#00E5FF] hover:underline">Enterprise camera feed</Link>.
                You build collections of cameras in the Enterprise dashboard — searching the
                catalogue by name, city or country, with each camera's rights verdict shown
                before you add it — and read them through three doors, all returning the same
                rights-filtered payload:
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "An embeddable live player (/embed/<token>) that renders a collection as a camera wall on your own site, with per-camera agency attribution.",
                  "A private JSON data feed (GET /api/feed/<token>) — the feed token is the credential, and regenerating it revokes the old one everywhere at once.",
                  "A REST API (GET /api/v1/collections/<id>/cameras) authenticated with an API key (Authorization: Bearer wek_…). A key reads only its owner's collections, and a revoked key stops working immediately.",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-white/70">
                    <span className="w-5 h-5 rounded-full bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center shrink-0 mt-px">
                      <Check className="w-3 h-3 text-[#00E5FF]" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-white/55 mt-4 leading-relaxed max-w-3xl">
                Research and education access is arranged through these same routes — there is
                no separate research API. Access follows the collection owner's Enterprise
                subscription: if it lapses, its feeds and API keys stop until it is renewed.
              </p>

              <h4 className="font-semibold text-white/85 mt-8">Metadata in every payload</h4>
              <p className="text-sm text-white/55 mt-2 leading-relaxed max-w-3xl">
                Each response carries the collection's name, a generation timestamp, a count,
                and one record per camera with these fields:
              </p>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <tbody>
                    {FIELDS.map(([field, desc]) => (
                      <tr key={field} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-2.5 font-mono text-[#00E5FF]/90 whitespace-nowrap align-top">{field}</td>
                        <td className="px-4 py-2.5 text-white/60">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-white/55 mt-4 leading-relaxed max-w-3xl">
                Cameras that fail the rights check are never silently dropped: the payload
                returns them in an <span className="font-mono text-white/75">excluded</span>{" "}
                list, each with its id, name and the reason it did not ship.
              </p>
            </div>
          </div>
        </section>

        {/* Terms framework */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Scale className="w-7 h-7 text-[#00E5FF]" /> The terms framework
          </h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
            <p>
              <span className="font-semibold text-white/85">The source's terms govern.</span>{" "}
              WorldEye does not own the cameras. Each camera belongs to the agency or operator
              listed as its source, and that source's licence and terms decide what may be
              done with its feed and metadata. WorldEye's own grant never widens a source's
              terms.
            </p>
            <p>
              <span className="font-semibold text-white/85">Eligibility is decided per camera.</span>{" "}
              A rights registry records a redistribution verdict for every source — most
              government traveller-information feeds (state and provincial DOTs, national road
              authorities, federal sources) are cleared on their open-data posture; some
              sources carry their own licence terms on top, such as Finland's Fintraffic,
              whose Digitraffic data is CC BY 4.0 with attribution to Fintraffic/Digitraffic
              required. The verdict is evaluated live each time a payload is built, so a
              source whose posture changes leaves every feed, embed and API response at once.
            </p>
            <p>
              <span className="font-semibold text-white/85">Default is excluded.</span>{" "}
              A source with no clearance on file — a commercial webcam network, an unreviewed
              scrape, a third-party broadcast — stays out of every payload until its terms
              have been reviewed. Cameras sourced from Windy Webcams are structurally
              excluded: Windy's terms grant no commercial redistribution.
            </p>
            <p className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00E5FF]/80 shrink-0 mt-1" />
              <span>
                <span className="font-semibold text-white/85">Attribution is required.</span>{" "}
                Every camera in a payload carries its attribution string (for example,
                “Alberta 511 via WorldEye”), and every response states: “Camera data via
                WorldEye. Credit each camera's listed source.” Republication — in a paper, a
                dashboard or a dataset — must keep each camera's source credited.
              </span>
            </p>
          </div>
        </section>

        {/* How to request */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Mail className="w-7 h-7 text-[#00E5FF]" /> How to request access
          </h2>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 max-w-3xl">
            <p className="text-sm text-white/60 leading-relaxed">
              Send it through the{" "}
              <Link href="/contact?topic=research" className="text-[#00E5FF] hover:underline font-semibold">
                contact form
              </Link>{" "}
              — choose <span className="text-white/85 font-medium">“Research access”</span> as
              the topic — and include these in your message:
            </p>
            <ul className="mt-4 space-y-2">
              {REQUEST_OUTLINE.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-white/70">
                  <span className="w-5 h-5 rounded-full bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center shrink-0 mt-px">
                    <Check className="w-3 h-3 text-[#00E5FF]" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-sm text-white/45 mt-5 leading-relaxed">
              Prefer email? Write to{" "}
              <a href="mailto:contact@worldeye.app" className="text-[#00E5FF] hover:underline">
                contact@worldeye.app
              </a>{" "}
              with the same outline — the contact form above is the faster route.
            </p>
            <p className="text-sm text-white/45 mt-5 leading-relaxed">
              Requests are reviewed individually. Submitting a request does not guarantee
              access, and no education pricing, quota or response time is published — what we
              can offer for a project is confirmed in our reply, and any arrangement uses the
              Enterprise routes and the terms framework above.
            </p>
          </div>
        </section>

        {/* Citation */}
        <section className="mt-16 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Quote className="w-7 h-7 text-[#00E5FF]" /> Citing WorldEye data
          </h2>
          <div className="mt-6 space-y-4 text-white/60 leading-relaxed max-w-3xl">
            <p>
              If WorldEye data appears in a paper, thesis, article or dataset, cite the
              catalogue and the access date, and keep each camera's listed source credited —
              the source agencies are the data's originators. A reference in this form works:
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 font-mono text-[13px] leading-relaxed text-white/75">
              WorldEye. <em>WorldEye Live Camera Catalogue</em> — public-camera metadata and
              geographic data. Accessed [date]. https://worldeye.app — camera data © their
              listed sources; credit each camera's listed source.
            </div>
            <p>
              For a specific collection or feed, cite the collection name alongside the
              catalogue. How the catalogue is built — indexing, deduplication, feed checks,
              coordinates and the removal of outdated cameras — is documented on the{" "}
              <Link href="/methodology" className="text-[#00E5FF] hover:underline">
                camera-data methodology page
              </Link>
              , which is the page to point methods sections and reviewers at.
            </p>
            <p className="flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-[#00E5FF]/80 shrink-0 mt-1" />
              <span>
                Studying the catalogue itself — coverage, gaps, source mix — is welcome
                research use of the public site. If your design needs the underlying metadata
                at scale, request access first rather than scraping: the feed exists so the
                sources' terms travel with the data.
              </span>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16 md:mt-20 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <FlaskConical className="w-7 h-7 text-[#00E5FF]" /> Research access FAQs
          </h2>
          <div className="mt-6 space-y-6">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-white/90">{f.q}</h3>
                <p className="text-sm text-white/55 mt-1.5 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              label: "Enterprise Camera Feed",
              desc: "Collections, the embed player, the data feed and API keys — the access routes in full.",
              href: "/enterprise",
            },
            {
              label: "WorldEye for Educators",
              desc: "Classroom uses of the free public site, with lesson starters for geography and earth science.",
              href: "/use-cases/educators",
            },
            {
              label: "Live Camera Index",
              desc: "The published index of the camera network, country by country.",
              href: "/live-camera-index",
            },
            {
              label: "Contact",
              desc: "Reach the WorldEye team — the same route used for research-access requests.",
              href: "/contact",
            },
          ]}
        />
        {/* Support WorldEye — inline card. */}
        <div className="mt-14">
          <DonateInlineCard source="research_access" />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
