import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Intro,
  HowTo,
  FaqSection,
  FaqJsonLd,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import { Crosshair, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Where Was This Photo Taken? How to Find a Photo's Location",
  description:
    "How to find where a photo was taken: check the EXIF GPS hidden in the file, understand why apps strip it, and read the clues in the scene when they do — or let WorldEye's free tool do it with the evidence shown.",
  alternates: { canonical: `${BASE}/where-was-this-photo-taken` },
  openGraph: {
    title: "Where Was This Photo Taken? How to Find a Photo's Location",
    description:
      "EXIF GPS, stripped metadata, and scene clues — the honest methods for placing a photo, plus a free tool that ranks the matches with evidence.",
    url: "/where-was-this-photo-taken",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Where Was This Photo Taken? How to Find a Photo's Location",
  description:
    "A guide to finding where a photo was taken — embedded EXIF GPS, why social and messaging apps strip location metadata, and how scene clues place a photo when the metadata is gone.",
  url: `${BASE}/where-was-this-photo-taken`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const INTRO = [
  "Almost every photo carries the answer to \u201Cwhere was this taken?\u201D in one of two places: hidden inside the file itself, or visible in the scene. The file comes first. Most phones and many cameras write GPS coordinates into a photo's EXIF metadata at the moment it is taken — no app, no account, no detective work required. If those coordinates survive, placing the photo is a thirty-second job.",
  "The catch is that they usually don't survive. The moment a photo passes through WhatsApp, Instagram, Facebook or most other apps, the location metadata is stripped out — deliberately, for privacy. What reaches you is a clean file with no coordinates at all, and that is the version of the problem most people actually face: a photo with nothing in it but the picture itself.",
  "That second problem is solvable too, just differently. Investigators place metadata-free photos by reading the scene — the words on a sign, the style of a licence plate, which side of the road the traffic is on — and testing each clue against map data. It is slower, it is sometimes impossible, and an honest tool will tell you when it is. Below is how each method works, what each one can really deliver, and a free tool that runs the whole sequence for you and shows its evidence.",
];

const STEPS = [
  "Start with the original file. A photo straight from the phone or camera that took it may carry GPS; a copy that arrived through a messaging or social app almost certainly does not.",
  "Check the file's EXIF metadata. On a phone, open the photo in the gallery and look for a map or location line. On a computer, open the file's properties/details and look for GPS latitude and longitude.",
  "If coordinates are there, you are done — paste them into any map. That is the strongest evidence a photo can carry.",
  "If the metadata is gone, read the scene instead: readable signs and place names, named landmarks, licence-plate styles, driving side, road markings, vegetation and architecture.",
  "Test the named places against a map. A sign naming a real place is a lead, not a conclusion — check that the other clues agree with it.",
  "Or run the photo through the free Photo Geolocation tool: it performs the EXIF check and the clue analysis, matches named places against OpenStreetMap, and ranks the candidates with the evidence for and against each one.",
];

const FAQS = [
  {
    q: "Can you find the location of any photo?",
    a: "No — and any tool that promises that is not being straight with you. A photo with intact GPS metadata can almost always be placed. A photo with stripped metadata and no readable sign, landmark or place name in the scene may be genuinely unplaceable from a single frame: one beach looks much like another. The honest outcomes are a ranked match with its evidence shown, or a clear \u201Ccouldn't determine\u201D — never an invented location.",
  },
  {
    q: "How do I check whether a photo has GPS in it?",
    a: "Use the original file if you have it. On most phones, opening the photo and swiping up (or opening its details) shows a map when location was recorded. On Windows, right-click the file, open Properties, then the Details tab, and look for GPS latitude/longitude. On a Mac, open the photo in Preview and check the Inspector's GPS tab. If those are empty, the file carries no coordinates — the scene itself is all there is to work with.",
  },
  {
    q: "Why did the location disappear when the photo was sent to me?",
    a: "Because the app removed it on purpose. WhatsApp, Instagram, Facebook, Messenger and most social and messaging apps strip EXIF metadata — including GPS — when a photo is uploaded or forwarded, so that locations are not shared by accident. Screenshots never contain GPS in the first place. Email is the common exception: a photo sent as a file attachment, rather than pasted into the message, often keeps its original metadata.",
  },
  {
    q: "What if the photo is a screenshot?",
    a: "A screenshot is a picture of a screen, so it has no camera metadata at all. Everything depends on what is visible in the frame — signs, landmarks, distinctive buildings. If the screenshot shows a named place, it can still be placed from the clues; if it shows a generic street or landscape, it usually cannot, and an honest tool will say so.",
  },
  {
    q: "How accurate is the answer?",
    a: "GPS read from the file is as accurate as the phone's fix when the photo was taken — often within a few metres, and the tool reports it with its uncertainty radius. Clue-based matches are broader: every result carries a radius (never displayed tighter than 250 m), a confidence level and the evidence behind it, so you can see whether you are looking at a firm match or a best-supported possibility. Photos of homes or private property are deliberately returned as a general area only.",
  },
  {
    q: "Is the photo geolocation tool free?",
    a: "Yes — it is a free beta with no signup. There is a limit of 3 analyses per day per visitor to keep it sustainable, and your photo is processed in memory and never stored, so there is nothing to delete afterwards.",
  },
];

export default function WhereWasThisPhotoTakenPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Photo Geolocation", href: "/tools/photo-geolocation" },
          { label: "Where Was This Photo Taken?" },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Crosshair className="w-3.5 h-3.5" /> PHOTO GEOLOCATION GUIDE
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          Where was this photo taken?
        </h1>
        <p className="mt-4 text-white/55">
          The answer is either hidden in the file or visible in the scene. Here is how to check
          both — and a free tool that does it for you, with the evidence on show.
        </p>
      </div>

      <Intro paragraphs={INTRO} />

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-5">First, look inside the file: EXIF GPS</h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            EXIF is the block of technical data a camera or phone writes into an image file:
            the device model, the time the shutter fired, lens settings — and, if location
            services were on, the GPS coordinates of where the device was standing. Those
            coordinates are part of the file itself. They travel with it when the file is
            copied untouched, and they are the single strongest piece of location evidence a
            photo can offer.
          </p>
          <p>
            Checking takes seconds. Most phone galleries show a small map on the photo&apos;s
            details screen when a location was recorded. On a desktop, the file&apos;s
            properties panel lists GPS latitude and longitude when they exist. If you find
            coordinates, the question is answered — everything else on this page is for when
            you don&apos;t.
          </p>
          <p>
            One caution: EXIF data can be edited after the fact, so coordinates in a file are
            strong evidence, not absolute proof. If the answer matters — for a publication, a
            dispute, a purchase — treat the GPS as a claim to corroborate against the visible
            scene, not as the final word.
          </p>
        </div>
      </section>

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Why most photos you receive have no location in them</h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            If a photo was forwarded to you, posted to a feed, or sent through a chat app, its
            metadata was almost certainly removed along the way. The major platforms strip
            EXIF data on upload as a privacy protection — a sensible default that also removes
            the GPS from every birthday photo and holiday snap that passes through them. The
            image looks identical; the file underneath has been cleaned out.
          </p>
          <p>
            Screenshots are emptier still: they never passed through a camera, so they contain
            no location data whatsoever. And photos exported from editing apps may or may not
            keep their metadata, depending on the app and its settings. The practical rule is
            simple: the closer your copy is to the original file from the device that took it,
            the more likely it still knows where it has been. If you need the metadata, ask
            for the photo as a file attachment — email attachments usually survive intact.
          </p>
        </div>
      </section>

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-5">When the metadata is gone: reading the scene</h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            With no coordinates to read, the picture itself becomes the evidence. Trained
            investigators work through the same categories of clue every time:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong className="text-white/85">Words.</strong> Shop signs, street names, billboards, vehicle livery, a legible landmark name — text is the fastest route from a scene to a searchable place name, and the language itself already narrows the map.</li>
            <li><strong className="text-white/85">Landmarks.</strong> A named or distinctive building, bridge, monument or mountain profile can anchor the whole photo.</li>
            <li><strong className="text-white/85">Road evidence.</strong> Licence-plate colours and formats, which side of the road traffic drives on, road markings and sign shapes each point at a country or region.</li>
            <li><strong className="text-white/85">Scene and setting.</strong> Vegetation, architecture, terrain and light rarely name a place alone, but they confirm or contradict the stronger clues.</li>
          </ul>
          <p>
            The method only works if the clues are tested rather than collected. A name on a
            sign becomes a candidate; the candidate earns its ranking when the independent
            clues agree — and loses it when one points somewhere else entirely. A single
            strong contradiction outweighs a pile of weak agreements.
          </p>
        </div>
      </section>

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The methods, compared honestly</h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            <strong className="text-white/85">Check the EXIF yourself.</strong> Free, instant,
            and exact when the coordinates survived. Useless when they didn&apos;t — which, for
            any photo that reached you through an app, is most of the time.
          </p>
          <p>
            <strong className="text-white/85">Reverse image search.</strong> Can find another
            copy of the same photo online, sometimes with a caption that names the place. It
            finds copies, not locations: a miscaptioned viral photo returns the wrong caption
            with total confidence. It also means uploading the photo to third-party search
            services. WorldEye&apos;s tool does not do this — your photo is never sent to a
            reverse-image search or any photo-matching service.
          </p>
          <p>
            <strong className="text-white/85">Work the clues by hand.</strong> The investigator
            method above, done manually against maps and street-level imagery. Powerful in
            skilled hands, slow, and hard to audit afterwards — the reasoning lives in one
            person&apos;s head.
          </p>
          <p>
            <strong className="text-white/85">The WorldEye Photo Geolocation tool.</strong>{" "}
            Runs the sequence automatically: EXIF GPS first, then a visual pass that extracts
            clues only — it never names the answer itself — then matches the named places
            against OpenStreetMap and ranks every candidate with the evidence for and against,
            a confidence level and an uncertainty radius. What it cannot do, it says plainly:
            no reverse image search, no comparison against street-level imagery, no result
            tighter than 250 m, and an honest &ldquo;couldn&apos;t determine&rdquo; when the
            evidence is not there.
          </p>
        </div>
      </section>

      <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-6 md:p-8 text-center">
        <h2 className="text-xl md:text-2xl font-bold">Try it on a photo now</h2>
        <p className="mt-3 text-white/60 leading-relaxed">
          Upload a photo and get ranked candidate locations with the evidence for and against
          each one — or an honest &ldquo;couldn&apos;t determine&rdquo;. Free beta, no signup,
          and your photo is processed in memory and never stored.
        </p>
        <Link
          href="/tools/photo-geolocation"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
        >
          <Crosshair className="w-4 h-4" /> Open the Photo Geolocation tool
        </Link>
        <p className="mt-4 text-xs text-white/40">
          Free beta · 3 analyses a day · Results include live cameras near the spot
        </p>
      </div>

      <HowTo title="How to find where a photo was taken" steps={STEPS} />

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold mb-5">
          <ShieldCheck className="h-5 w-5 text-[#D4AF37]" /> The limits are deliberate
        </h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            Two privacy rules shape every result. No location is ever displayed tighter than
            a 250 m radius, and when a photo looks like a private home or private property,
            the exact point is suppressed and only the general area is shown. The tool works
            on public places; it does not identify people, and it never performs face
            recognition. Finding where a landscape or landmark photo was taken is a fair
            puzzle — pinpointing somebody&apos;s house is not, and the tool is built so it
            cannot be used that way.
          </p>
          <p>
            Found the place? WorldEye can take you there: every result links to{" "}
            <Link href="/live-webcams" className="text-[#D4AF37] hover:underline">
              live webcams
            </Link>{" "}
            near the spot and an &ldquo;Explore location in 3D&rdquo; jump onto the globe, so
            you can see the place as it looks right now.
          </p>
        </div>
      </section>

      <FaqSection title="Finding a photo's location — questions" faqs={FAQS} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Photo Geolocation tool (free beta)", href: "/tools/photo-geolocation" },
          { label: "Photo Location Finder — for your own travel photos", href: "/photo-location-finder" },
          { label: "Verify a photo's location — for journalists and fact-checkers", href: "/verify-photo-location" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "What is OSINT? The beginner's guide", href: "/blog/what-is-osint" },
          { label: "Using live cameras to plan travel", href: "/blog/using-live-cameras-to-plan-travel" },
        ]}
      />
      <CtaRow backHref="/tools/photo-geolocation" backLabel="Open the tool" />
    </PageShell>
  );
}
