import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  formatDate,
  JsonLd,
  FaqJsonLd,
  Breadcrumb,
  Hero,
  HowTo,
  FaqSection,
  RelatedLinks,
  CtaRow,
  PageShell,
  type Faq,
} from "@/components/directory-page";
import { ORGANIZATION_ID, WEBSITE_ID } from "@/lib/seo/entity-schema";
import indexJson from "@/data/live-camera-index.json";
import cameraCountriesJson from "@/data/camera-countries.json";

/**
 * Camera Data Methodology — how the catalogue behind the globe is built.
 *
 * Every factual claim on this page is implemented in the codebase it
 * describes; the claim→source map lives in the build report
 * (~/workspace/worldeye-methodology/REPORT.md). Every number rendered
 * here is read from the same generated data files the rest of the site
 * renders from — src/data/live-camera-index.json (the dated October
 * 2026 measurement) and src/data/camera-countries.json (the generated
 * country index) — so this page cannot drift from the instruments it
 * explains. Do not hand-edit figures; re-run the generators.
 */

interface IndexData {
  edition: string;
  generatedAt: string;
  snapshot: { records: number; uniqueCameras: number; regions: number | null };
  totals: {
    served: number;
    servedCountries: number;
    indexedRecords: number;
    indexedAttributed: number;
    indexedCountries: number;
    indexedUnattributed: number;
    droppedNearDuplicates: number;
    distinctSources: number;
  };
}

const D = indexJson as unknown as IndexData;
const T = D.totals;
const CATALOGUE = cameraCountriesJson as unknown as {
  generatedAt: string;
  catalogueTotal: number;
  attributedTotal: number;
  unattributed: number;
  droppedNearDuplicates: number;
};

/* The owner's published served-camera figure — the same headline
   constant /live-webcams and /random render. It is a published figure,
   not a live measurement; the dated measurement is the Live Camera
   Index below. */
const HEADLINE = 74229;

const fmt = (n: number) => n.toLocaleString("en-US");
const snapshotDate = formatDate(D.generatedAt);
const catalogueDate = formatDate(CATALOGUE.generatedAt);
const REVISED = "October 27, 2026";
const duplicateRecords = D.snapshot.records - D.snapshot.uniqueCameras;

export const metadata: Metadata = {
  title: "Camera Data Methodology — How WorldEye Builds Its Camera Network",
  description:
    "How WorldEye discovers and indexes public cameras, removes duplicates, verifies feeds, sources coordinates, retires dead cameras — and exactly what its published camera counts measure.",
  alternates: { canonical: `${BASE}/methodology` },
  openGraph: {
    title: "Camera Data Methodology | WorldEye",
    description:
      "The method behind WorldEye's public camera network: discovery, deduplication, feed verification, coordinates, removals — and what the counts actually count.",
    url: `${BASE}/methodology`,
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Camera Data Methodology — How WorldEye Builds Its Camera Network",
  description:
    "How WorldEye discovers and indexes public cameras, removes duplicates, verifies feeds, sources coordinates, retires dead cameras — and exactly what its published camera counts measure.",
  url: `${BASE}/methodology`,
  datePublished: "2026-10-27",
  dateModified: "2026-10-27",
  isPartOf: { "@id": WEBSITE_ID },
  about: { "@id": ORGANIZATION_ID },
};

const FAQS: Faq[] = [
  {
    q: "Does WorldEye operate these cameras?",
    a: "No. Every camera belongs to its publisher — a transport department, river or aviation agency, city open-data portal, resort, harbour or webcam directory. WorldEye assembles the feeds those publishers make public into one catalogue and one map; it does not own, aim or control the cameras.",
  },
  {
    q: "How does WorldEye know a camera is live?",
    a: "In two stages. Before a harvested camera enters the catalogue, its feed is probed: images must answer with a real image (checked by content type and file signature, not just a success code) and streams must return a valid playlist. After that, the catalogue is re-collected from publishers roughly every 30 minutes, and frames are pulled live from the publisher when you open a camera — WorldEye does not serve archived frames as if they were live. A feed can still go offline between checks; presence in the catalogue means it passed verification at the last check, not a guarantee it is streaming this second.",
  },
  {
    q: "Why do different WorldEye pages show different camera totals?",
    a: `Because they are different instruments measured on different dates. The headline figure (${fmt(HEADLINE)}) is the published served-camera count. The Live Camera Index measured ${fmt(T.served)} served cameras in a snapshot of the live catalogue on ${snapshotDate}, while the generated country index behind the country pages holds ${fmt(T.indexedRecords)} unique records (built ${catalogueDate}). A live assembly changes as publishers add, move and retire feeds, so served totals move in both directions between measurements.`,
  },
  {
    q: "How are duplicate cameras removed?",
    a: "By camera ID first — the same camera arriving through two regional collections is merged. Records are then checked for near-duplicates: the same camera under a spelling- or punctuation-variant name at effectively the same spot (within about 100 metres) is dropped and counted, never silently absorbed. At harvest time, records are also matched by feed URL and by location — within 10 metres is the same camera whatever the name says; within 120 metres with a substantially matching name is a duplicate, while a nearby camera with a different name is kept as the distinct camera it is.",
  },
  {
    q: "How do I report a camera that is wrong, dead or misplaced?",
    a: "Through the contact page — every camera in the catalogue names its publishing source, which makes reports checkable against the publisher's own data. Reports are reviewed against the source; where the publisher's data is wrong the record follows the publisher, and where our assembly is wrong we fix the assembly.",
  },
  {
    q: "Can I cite WorldEye's camera counts?",
    a: "Yes — cite the Live Camera Index, which publishes its figures with a downloadable dataset and an edition date. The headline figure is a published count, not a dated measurement; the index is the instrument designed to be cited.",
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl md:text-2xl font-bold mb-5">{children}</h2>;
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 text-white/70 leading-relaxed">{children}</div>;
}

const DEFINITIONS: Array<{ term: string; body: React.ReactNode }> = [
  {
    term: "Publisher (publishing network)",
    body: "The agency or operator that owns a camera and publishes its feed: a state or national transport department, a river or aviation agency, a city open-data portal, a resort or harbour, or a public webcam directory. The publisher's name travels with every record as its source label and attribution.",
  },
  {
    term: "Catalogue record",
    body: "One entry in WorldEye's assembled catalogue: a single camera view, carrying the publisher-given name, city and country, coordinates, a feed, stream or publisher-page address, and the source label. A physical station with several views contributes one record per view — Finland's Fintraffic network, for example, publishes 1–7 preset views per station, each with its own still.",
  },
  {
    term: "Served camera",
    body: (
      <>
        A unique camera — records merged by camera ID — in the catalogue the live globe serves at a
        given moment. In the {D.edition} snapshot ({snapshotDate}) the catalogue API returned{" "}
        {fmt(D.snapshot.records)} records, which merged to {fmt(D.snapshot.uniqueCameras)} served
        cameras: {fmt(duplicateRecords)} records were the same cameras arriving through more than
        one regional collection.
      </>
    ),
  },
  {
    term: "Indexed catalogue",
    body: (
      <>
        The generated, dated snapshot of the catalogue that country and city pages are built from,
        and that published datasets are drawn from. The current build ({catalogueDate}) holds{" "}
        {fmt(CATALOGUE.catalogueTotal)} unique records: {fmt(CATALOGUE.attributedTotal)} attributed
        to {T.indexedCountries} countries, {CATALOGUE.unattributed} counted as unattributed rather
        than force-assigned, and {fmt(CATALOGUE.droppedNearDuplicates)} near-duplicates dropped —
        the three figures reconcile exactly against the total, and a build that does not reconcile
        fails rather than publishing.
      </>
    ),
  },
  {
    term: "Headline count — 74,229",
    body: "The network figure WorldEye publishes as its headline: the owner's published served-camera count from October 2026. It is a published figure, not a live measurement — the catalogue moves between assemblies as publishers add, move and retire feeds, so dated measurements differ from it in both directions. The Live Camera Index is the dated measurement of record.",
  },
  {
    term: "Placeholder",
    body: "A standby or “camera offline” image a publisher serves in place of a real frame. Placeholders are detected by byte fingerprint — if three or more cameras serve identical bytes, that is one placeholder, not three working cameras — and a placeholder verdict keeps a harvested record out of the verified set.",
  },
];

export default function MethodologyPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Camera Data Methodology" },
        ]}
      />
      <Hero
        h1="How WorldEye builds its camera network"
        sub="The method behind the map: where the cameras come from, how duplicates and dead feeds are removed, where the coordinates come from — and exactly what the published counts count."
      />
      <p className="text-center text-xs text-white/30 mt-4">
        Methodology last revised {REVISED}. Network figures: Live Camera Index, {D.edition} edition
        (snapshot {snapshotDate}); country index built {catalogueDate}.
      </p>

      <div className="mt-10 space-y-4 text-white/70 leading-relaxed max-w-3xl mx-auto">
        <p>
          WorldEye does not operate cameras. It assembles the public feeds published by{" "}
          {T.distinctSources} publishing networks — transport departments, river and aviation
          agencies, city open-data portals and public webcam directories — into a single catalogue
          that the globe, the country and city pages, and the published datasets all draw from. This
          page documents how that catalogue is built and maintained, in terms precise enough to
          check: every stage below is a mechanism in the running system, and the numbers are read
          from the same generated data files the site itself renders.
        </p>
        <p>
          Two ideas run through the whole method. First, the catalogue is the population every
          WorldEye figure measures — a count is only ever a count of what the loaders collect, and
          this page says which collection, merged how, as of what date. Second, removals and
          corrections are designed to be visible rather than silent: duplicates dropped at build
          time are counted, sources that stop answering are flagged rather than quietly zeroed, and
          each published total reconciles against its parts.
        </p>
      </div>

      <HowTo
        title="The pipeline at a glance"
        steps={[
          "Discover — server-side loaders collect camera lists from publishers' public feeds and APIs into regional collections; a separate harvest imports licensing-cleared records from the OpenCCTV dataset.",
          "Normalise — every record is validated (a working feed address, usable coordinates) and its country name canonicalised; a multi-view station becomes one record per view.",
          "Deduplicate — records are merged by camera ID, then checked for near-duplicates: the same camera under a variant name at the same spot.",
          "Verify — harvested feeds are probed before they enter the catalogue (a real image or a valid stream, not a placeholder); the live catalogue is then re-collected from publishers on a roughly 30-minute cycle.",
          "Serve — the globe receives the assembled catalogue, not the publishers directly; frames are pulled live from the publisher when a camera is opened.",
          "Re-measure — the generated country index and the Live Camera Index are dated snapshots of the catalogue, re-issued as it changes, with figures that reconcile against their parts.",
        ]}
      />

      <section className="mt-12">
        <SectionTitle>1 · Where the cameras come from</SectionTitle>
        <Prose>
          <p>
            <strong className="text-white">Regional collections, collected on the server.</strong>{" "}
            The catalogue is assembled server-side from regional collections —{" "}
            {D.snapshot.regions ?? "dozens"} of them in the {D.edition} snapshot — each maintained by
            a loader for a country, a US state network, or a source family. A loader polls the
            publisher's own list endpoint or public API (Finland's loader, for example, reads
            Fintraffic's official Digitraffic station list — one request per refresh, not one per
            station) and maps what it publishes into catalogue records. The globe never queries
            publishers directly; it serves the assembled catalogue, which is what makes a single,
            checkable population possible.
          </p>
          <p>
            <strong className="text-white">Three intake paths.</strong> Most cameras arrive through
            direct integrations with the publishing agency or network. A second path is the OpenCCTV
            harvest: an offline generation process that imports records from the OpenCCTV dataset —
            but only from source families whose licensing has been reviewed and cleared. Families
            are registered as cleared, conditional (held out unless spot-checked and explicitly
            enabled for a run) or excluded (never imported, and not force-enableable); feeds hosted
            by Windy are refused under any family, because its catalogue terms do not clear. A third
            path collects webcams their operators broadcast publicly — resorts, harbours, beaches
            and similar — as their own collections.
          </p>
          <p>
            <strong className="text-white">What a record carries.</strong> Each record keeps the
            publisher's camera id (namespaced by provider, so regenerating a source reproduces the
            same ids), its name, city and country as published, its coordinates, at least one way to
            view it — a snapshot feed, a stream, or a link to the publisher's own page — and its
            source label. The source label is the attribution: it names the publisher on the camera
            and in the datasets, and registry entries map sources to their required attribution and
            terms (Fintraffic's data, for instance, is CC BY 4.0 and is labelled accordingly).
          </p>
          <p>
            <strong className="text-white">Inclusion is not a redistribution licence.</strong> A
            separate rights gate decides, camera by camera, whether a record may be carried on the
            surfaces that hand cameras to third parties — the enterprise feed and embed. The
            verdict is computed from the source label: a harvested camera passes only when its
            family's registry verdict is “clear” (conditional families are held out, excluded
            families never pass); a direct agency source passes only where a clearance basis is on
            file; and any source with no basis on file is excluded by default, with the reason
            recorded. Windy-sourced cameras are excluded whatever label they arrive under, because
            Windy's terms grant no commercial redistribution. Where a camera does pass, the payload
            attributes it to its operating agency.
          </p>
          <p>
            <strong className="text-white">What never gets in.</strong> Records are skipped — with
            the reason recorded, not silently dropped — when they are inactive or missing an id,
            lack a usable feed address, use a non-web pseudo-URL, carry an unknown feed type, point
            at a known offline-placeholder path, or have invalid coordinates. A snapshot source
            that records that adding a refresh parameter breaks its URLs is also refused, because
            its stills would break on first refresh.
          </p>
        </Prose>
      </section>

      <section className="mt-12">
        <SectionTitle>2 · Coordinates and place names</SectionTitle>
        <Prose>
          <p>
            <strong className="text-white">Coordinates are the publisher's own.</strong> A camera
            sits where its publishing source says it sits: loaders map the latitude and longitude
            from the publisher's data, and WorldEye does not geocode addresses into camera
            positions. (Finland's integration states the rule in terms: coordinates are the API's
            own geometry, never geocoded.)
          </p>
          <p>
            <strong className="text-white">Validation, not correction.</strong> Incoming
            coordinates must be finite numbers inside the valid ranges (latitude −90 to 90,
            longitude −180 to 180); the null-island point (0, 0) is rejected outright. Some loaders
            additionally apply the source's own geographic bounding box to drop stray or
            placeholder coordinates a feed may carry. WorldEye validates coordinates — it does not
            move cameras to where they look better, so a publisher's misplaced record stays
            misplaced until the publisher fixes it; that is one of the limitations listed below, and
            one reason corrections are solicited.
          </p>
          <p>
            <strong className="text-white">Country names are canonicalised.</strong> Publishers
            label countries inconsistently — codes and variants (US, UK, JP…) alongside full names.
            A normalisation table maps these to canonical country names. The table is not a single
            shared file — the runtime catalogue, the country-page generator and the Live Camera
            Index each carry a copy, and the copies are kept in agreement, so the three measure the
            same countries. Values that name no
            country are counted as <em>unattributed</em> — {CATALOGUE.unattributed} records in the
            current index — rather than force-assigned to a plausible-looking country.
          </p>
          <p>
            <strong className="text-white">One record per view.</strong> Where a single physical
            station publishes several views, each view is its own record with its own still —
            Fintraffic stations carry 1–7 presets. Counts on this site are therefore counts of
            camera views as published, which is the unit a visitor can actually open.
          </p>
        </Prose>
      </section>

      <section className="mt-12">
        <SectionTitle>3 · How duplicates are removed</SectionTitle>
        <Prose>
          <p>
            The same physical camera reaches the catalogue by several roads: two regional
            collections can overlap, two publishers can carry the same feed, and one camera can be
            reported under spelling- or punctuation-variant names. Deduplication runs at three
            levels.
          </p>
          <p>
            <strong className="text-white">By ID, everywhere.</strong> Whenever collections are
            combined — the union that builds the country index, the snapshot that measures the
            served count, and the map client's own merge — records are keyed by camera ID and the
            same ID is kept once. This is why raw record counts exceed unique cameras: the{" "}
            {D.edition} snapshot's {fmt(D.snapshot.records)} records merged to{" "}
            {fmt(D.snapshot.uniqueCameras)} served cameras.
          </p>
          <p>
            <strong className="text-white">Near-duplicates at build time.</strong> The country
            index runs a second pass: the same normalised name at effectively the same spot —
            within about 100 metres — is the same camera reported twice, and the later record is
            dropped. Dropped near-duplicates are counted ({fmt(CATALOGUE.droppedNearDuplicates)} in
            the current build) and enter the index's reconciliation, so a page's stated count is
            exactly the number of cameras its grid can show.
          </p>
          <p>
            <strong className="text-white">Harvest matching, in order.</strong> A harvested record
            is classified against the served catalogue and against everything already accepted from
            the harvest, using matchers in a fixed order: identical catalogue ID; identical feed
            URL (full form, then host-and-path with query differences forgiven); same location —
            within 10 metres, whatever the names say; and geographic-plus-name — within 120 metres
            with name-token containment of at least 0.5. A record within 120 metres whose name does{" "}
            <em>not</em> match is classified <em>near-distinct</em>: an intersection legitimately
            has several cameras, and it is kept as the distinct camera it is — reported separately,
            never merged into its neighbour.
          </p>
        </Prose>
      </section>

      <section className="mt-12">
        <SectionTitle>4 · How feeds are checked</SectionTitle>
        <Prose>
          <p>
            <strong className="text-white">A probe before a harvested camera gets in.</strong>{" "}
            Verification for the harvest happens at generation time, because probing tens of
            thousands of feeds cannot run inside a web request. The probe fingerprints each feed
            with a small range request — roughly the first 2 KB, not a full frame. A snapshot feed
            passes only with an HTTP 200/206 response <em>and</em> an image content type or image
            file signature; a stream passes only if its playlist begins with the HLS marker{" "}
            <code className="text-white/85">#EXTM3U</code> and lists segments or variants; a
            publisher page passes on reachability. Identical first bytes served by three or more different cameras mark the
            feed a placeholder — one standby image, not three working cameras — and placeholders do
            not enter the verified set. Probes time out at 8 seconds, verdicts are cached, dead
            verdicts are re-probed after 24 hours, and live verdicts after 7 days. A "dead" verdict
            is a floor, not a certainty: some hosts refuse datacenter requests while serving
            browsers fine, and the harvest reports say so.
          </p>
          <p>
            <strong className="text-white">Continuous re-collection at runtime.</strong> The live
            catalogue is not a static list: each regional collection is cached for 30 minutes and
            then re-collected from its publisher, so additions, moves and retirements flow in
            continuously. When you open a camera, its frame is fetched from the publisher at view
            time — WorldEye keeps no archive of frames to re-serve as live.
          </p>
          <p>
            <strong className="text-white">Failures are absorbed, then flagged.</strong> If a
            publisher fetch fails, the catalogue keeps serving that source's last good index rather
            than dropping its cameras to zero; a source that times out or answers empty is rested
            for 5 minutes before the next attempt so a down upstream cannot stall the refresh for
            everyone else. Behind the scenes, every fetch outcome is recorded, and a health rollup
            classifies each source — healthy, degraded, down, or not yet observed. Its sharpest rule is the
            silent-absence rule: a source known to publish cameras that currently serves zero is
            treated as <em>down</em> — never as "healthy at zero" — because that is exactly how a
            broken sub-source once hid inside a green region for months.
          </p>
        </Prose>
      </section>

      <section className="mt-12">
        <SectionTitle>5 · How outdated cameras leave</SectionTitle>
        <Prose>
          <p>
            <strong className="text-white">Retirement flows from the publisher.</strong> Because the
            live catalogue is re-collected from publishers on the refresh cycle, a camera a
            publisher retires leaves the catalogue at the next refresh — nothing is pinned forever.
            Publishers also mark cameras out of service in their own data, and loaders honour those
            marks at collection time: Fintraffic stations the API marks removed, and presets it
            marks out of collection, are skipped rather than served.
          </p>
          <p>
            <strong className="text-white">Generated sources change only on a reviewed sync.</strong>{" "}
            The OpenCCTV harvest is regenerated offline and committed, and the sync is gated: a run
            whose accounting does not reconcile writes nothing; a run that would shrink the
            regenerated set by more than 5% is refused unless a human explicitly allows the shrink,
            so a probing outage can never wipe the harvest; a run that grows it by more than 50% is
            refused the same way. Within the harvest, a dead-feed verdict is not permanent: it is
            re-probed after 24 hours, and a record leaves the harvest when a generation is built on
            a current dead verdict — and returns if a later re-probe finds the feed alive again.
          </p>
          <p>
            <strong className="text-white">Snapshots keep their dates.</strong> The country index
            and the Live Camera Index are not silently rewritten: each is a dated snapshot
            (currently {catalogueDate} and {snapshotDate}), re-issued when the catalogue changes,
            with its dataset kept available so any figure can be checked against the edition that
            published it.
          </p>
        </Prose>
      </section>

      <section className="mt-12">
        <SectionTitle>6 · The numbers, defined</SectionTitle>
        <Prose>
          <p>
            WorldEye publishes three numbers that are easy to confuse, because they are three
            different instruments. These are the definitions the site uses; the{" "}
            <Link href="/live-camera-index" className="text-[#D4AF37] hover:underline">
              Live Camera Index
            </Link>{" "}
            is the dated measurement of record, and the{" "}
            <Link href="/cameras/countries" className="text-[#D4AF37] hover:underline">
              country directory
            </Link>{" "}
            renders the indexed catalogue.
          </p>
        </Prose>
        <div className="mt-6 space-y-3">
          {DEFINITIONS.map((d) => (
            <div
              key={d.term}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
            >
              <h3 className="font-semibold text-sm text-white">{d.term}</h3>
              <div className="text-sm text-white/60 leading-relaxed mt-1">{d.body}</div>
            </div>
          ))}
        </div>
        <Prose>
          <p>
            Read together: the indexed catalogue ({fmt(CATALOGUE.catalogueTotal)} unique records) is
            the fullest picture of what the loaders index, built as a union across assemblies. A
            single live assembly rarely carries all of it at once — some collections are always
            mid-refresh — while the served snapshot ({fmt(T.served)} unique cameras on{" "}
            {snapshotDate}) reflects what the globe actually held that day, drawn from{" "}
            {T.servedCountries} countries. The headline {fmt(HEADLINE)} is the published figure for
            the network. None of the three is "the real number" in isolation; each is the answer to
            a different, stated question.
          </p>
        </Prose>
      </section>

      <section className="mt-12">
        <SectionTitle>Limitations</SectionTitle>
        <ul className="list-disc pl-5 space-y-2 text-white/70 leading-relaxed">
          <li>
            This is a methodology for the cameras WorldEye's loaders collect — not a census of
            every public camera on Earth. Cameras no loader reaches are not counted, in either
            direction.
          </li>
          <li>
            Feeds go offline without notice. A camera in the catalogue was present when its
            collection was last assembled and passed the checks described above; no edition of any
            index can guarantee it is streaming at the moment you read it.
          </li>
          <li>
            Names, places and coordinates originate with publishers and their aggregators.
            Normalisation corrects country codes and known variants, but a mislabelled source
            record can misplace a camera until the publisher corrects it.
          </li>
          <li>
            Probe verdicts are a floor: hosts that refuse automated requests can be marked dead
            while serving browsers normally, so some live cameras are excluded by verification
            rather than included on trust.
          </li>
          <li>
            City figures in the published datasets come from the generated city index, assembled
            from a different union at a different time than the country table — treat city and
            country tables as separate instruments, not one sum.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <SectionTitle>Corrections and questions</SectionTitle>
        <Prose>
          <p>
            Every camera in the catalogue names its publishing source, which makes errors
            checkable: a wrong name, place or coordinate can be compared against the publisher's
            own data, and a dead feed against the publisher's current list. If you find a camera
            that is misplaced, mislabelled, no longer operating, or listed where it should not be,
            report it through the{" "}
            <Link href="/contact" className="text-[#D4AF37] hover:underline">
              contact page
            </Link>{" "}
            — the team replies within 1–2 business days. Reports are reviewed against the source:
            where the publisher's data is wrong, the record follows the publisher; where our
            assembly is wrong, we fix the assembly — a duplicate rule, a normalisation gap, a
            loader's mapping — rather than hiding a single record. Publishers and camera operators
            who want a listing corrected, attributed differently, or removed are welcome to use the
            same route.
          </p>
        </Prose>
      </section>

      <FaqSection title="Methodology questions" faqs={FAQS} />

      <RelatedLinks
        title="The instruments this page describes"
        links={[
          { label: "Live Camera Index — the dated measurement", href: "/live-camera-index" },
          { label: "Cameras by country", href: "/cameras/countries" },
          { label: "Live webcams", href: "/live-webcams" },
          { label: "About WorldEye", href: "/about" },
          { label: "Contact", href: "/contact" },
        ]}
      />

      <CtaRow backHref="/about" backLabel="About WorldEye" />
    </PageShell>
  );
}
