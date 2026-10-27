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
import { Compass, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Photo Location Finder — Find Where Your Own Photos Were Taken",
  description:
    "A free photo location finder for travellers and creators: rediscover where your own photos were taken, rebuild a trip from your camera roll, and caption places correctly. Your photos are processed in memory and never stored.",
  alternates: { canonical: `${BASE}/photo-location-finder` },
  openGraph: {
    title: "Photo Location Finder — Find Where Your Own Photos Were Taken",
    description:
      "Forgotten viewpoint, unnamed viewpoint, lost trip stop? Run the original photo and get ranked locations with the evidence shown. Free beta, photos never stored.",
    url: "/photo-location-finder",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Photo Location Finder — Find Where Your Own Photos Were Taken",
  description:
    "A guide and free tool for finding the locations of your own photos: embedded GPS in originals, clue-based matching for exported and shared copies, and rebuilding a trip's map from a camera roll — with uploads never stored.",
  url: `${BASE}/photo-location-finder`,
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const INTRO = [
  "Every traveller has them: the perfect viewpoint whose name you never caught, the village you passed through once and can't find on a map, the waterfall a friend photographed that you now want to visit yourself. The photos remember being there — what they don't always remember, in any form you can read, is where \u201Cthere\u201D was.",
  "A photo location finder closes that gap. Run the original file and the tool first checks whether the photo still carries its GPS coordinates, as most originals from a phone do. When it doesn't — exports, downloads, photos sent by a friend — it works from the scene itself: readable signs, named landmarks, plate styles, the side of the road, matched against OpenStreetMap and ranked by the evidence behind each candidate.",
  "And because these are your photographs, the privacy terms matter as much as the results. Photos you run here are processed in memory and discarded when the analysis finishes — never stored, never used for training, never sent to a reverse-image search. Rediscovering your own trip should not mean handing your camera roll to anyone.",
];

const STEPS = [
  "Pick the photo and use the most original copy you have — the file from your phone or camera, not a copy that came back through a chat or social app.",
  "Open the Photo Geolocation tool and drop the photo in (JPEG, PNG or WebP, up to 10 MB). No signup, and nothing is stored.",
  "If the file carries GPS, you get the location straight from the photo itself, with its uncertainty radius.",
  "If it doesn't, the tool reads the scene for clues and ranks the matching places, each with the evidence for and against it.",
  "Follow the result onward: open the spot in 3D on the WorldEye globe, or check the live cameras near it to see the place as it looks today.",
  "Work through a trip a few photos at a time — the free beta allows 3 analyses a day, which is plenty for the shots whose locations actually escaped you.",
];

const FAQS = [
  {
    q: "Will it work on old photos?",
    a: "Often, yes. If the original file from an old phone or camera still has its EXIF GPS — and originals usually do, however old they are — the location comes straight from the file. Older digital cameras without GPS, scanned prints and film photos have no metadata to read, so everything depends on the scene: a readable sign or a distinctive landmark can still place them, while a generic landscape usually can't.",
  },
  {
    q: "My camera has no GPS. Can it still find my photo locations?",
    a: "It can try, through the clues. The tool extracts visible evidence — signage text, named landmarks, licence-plate styles, driving side, architecture, vegetation — and matches named places against OpenStreetMap. Distinctive places (a named viewpoint, a famous bridge, a signed trailhead) place well; an anonymous stretch of coastline may not place at all, and the tool will tell you so rather than guess.",
  },
  {
    q: "Do you keep or store my photos?",
    a: "No. Your photo is processed in memory on the server and discarded when the analysis finishes. It is not saved to disk or a database, not used for training, and never sent to a reverse-image search or any third-party photo service. Text clues — a landmark name, for example — are sent to OpenStreetMap for place lookup, and when visual analysis is enabled the image is sent once to the AI provider that powers the clue pass. Nothing about your photo is kept afterwards.",
  },
  {
    q: "Why only 3 analyses a day?",
    a: "The finder is a free beta with no signup, and each analysis costs real compute. The daily limit of 3 per visitor keeps it sustainable for everyone. For rebuilding a trip, that's usually enough: most of your photos will already show their location in your phone's gallery — save the analyses for the ones that don't.",
  },
  {
    q: "Can it find the location of a photo I downloaded from Instagram?",
    a: "Only from the scene, and often not at all. Instagram strips location metadata from every upload, so a downloaded copy carries no GPS. If the frame shows a readable sign or a well-known landmark, the clue analysis may place it; a cropped, filtered shot of a beach or a café usually can't be placed reliably, and the tool will say \u201Ccouldn't determine\u201D instead of inventing a spot. Results are also shown at area level — never tighter than a 250 m radius.",
  },
  {
    q: "What can I do with a location once I've found it?",
    a: "Each result links onward: an \u201CExplore location in 3D\u201D jump puts the spot on the WorldEye globe, and the tool lists live cameras near it, so you can see the place as it looks right now — handy for checking the light, the weather or the crowds before a return trip, and for captioning the place correctly when you share the photo.",
  },
];

export default function PhotoLocationFinderPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Photo Geolocation", href: "/tools/photo-geolocation" },
          { label: "Photo Location Finder" },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Compass className="w-3.5 h-3.5" /> FOR TRAVELLERS &amp; CREATORS
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          Photo Location Finder
        </h1>
        <p className="mt-4 text-white/55">
          The viewpoint you never named, the village you can&apos;t find again, the spot in a
          friend&apos;s photo you want to stand in yourself — run the photo, get the place,
          with the evidence shown.
        </p>
      </div>

      <Intro paragraphs={INTRO} />

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Rediscover the places in your camera roll</h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            Start with the easy wins. Photos still on the phone that took them usually know
            exactly where they were taken — your gallery app can show you a map. The finder
            earns its keep on the harder half of every camera roll:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong className="text-white/85">Photos from a real camera.</strong> Most dedicated cameras have no GPS, so the file knows the lens and the settings but not the place. The signs, landmarks and road evidence in the frame are what place it.</li>
            <li><strong className="text-white/85">Exports and downloads.</strong> The shot you pulled from a shared album, a cloud export or an old hard drive may have lost its metadata on the way. The clue analysis works from what is visible.</li>
            <li><strong className="text-white/85">Somebody else&apos;s photo of a place you want.</strong> A friend&apos;s summit shot, a creator&apos;s unnamed viewpoint. If the place is a public spot with readable clues, the finder can often name it — so you can go there yourself.</li>
            <li><strong className="text-white/85">The pre-phone archive.</strong> Scanned prints and digitised film carry no metadata at all. A distinctive, named place in the frame can still be matched; a generic hillside honestly cannot.</li>
          </ul>
        </div>
      </section>

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-5">Rebuild a trip from your photos</h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            A road trip leaves a trail of photos and a foggy memory of the order you visited
            things in. Run the anchor shots — the ones whose locations escaped you — and each
            confirmed result can be opened on the WorldEye globe with the{" "}
            <em>Explore location in 3D</em> handoff. Plotted together, the found places give
            you back the shape of the route: where you turned inland, which town that lunch
            stop actually was, the name of the pass you crossed in the rain.
          </p>
          <p>
            Every result also lists{" "}
            <Link href="/live-webcams" className="text-[#D4AF37] hover:underline">
              live webcams
            </Link>{" "}
            near the spot. Before a return trip, that is the practical payoff: check the
            beach as it looks this morning, the snow on the pass, the queue at the viewpoint —
            the same trick as{" "}
            <Link href="/blog/using-live-cameras-to-plan-travel" className="text-[#D4AF37] hover:underline">
              using live cameras to plan travel
            </Link>
            , applied to places your own photos led you back to.
          </p>
        </div>
      </section>

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold mb-5">For creators: caption the right place</h2>
        <div className="space-y-4 text-white/70 leading-relaxed">
          <p>
            A wrong location in a caption is a small error that travels far — followers save
            it, other creators repeat it, and the mislabeled spot becomes harder to correct
            than it was to name. Running a hero shot through the finder before you post is a
            cheap accuracy check: confirm the viewpoint&apos;s actual name, the town it
            belongs to, and the side of the border it sits on.
          </p>
          <p>
            The evidence view helps here too. Rather than a bare pin, you see <em>why</em> a
            place matched — the sign it read, the landmark it recognised — so you can judge
            the match before you publish it, and fall back to a broader caption
            (&ldquo;the north coast&rdquo;) when the evidence only supports an area. Results
            are never shown tighter than a 250 m radius anyway, which is a sensible default
            grain for anything you share publicly.
          </p>
        </div>
      </section>

      <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-6 md:p-8 text-center">
        <h2 className="text-xl md:text-2xl font-bold">Find where that photo was taken</h2>
        <p className="mt-3 text-white/60 leading-relaxed">
          Drop in a photo from your own collection and get ranked candidate locations with
          the evidence for and against each — or an honest &ldquo;couldn&apos;t
          determine&rdquo;. Free beta, no signup.
        </p>
        <Link
          href="/tools/photo-geolocation"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
        >
          <Compass className="w-4 h-4" /> Open the Photo Location Finder
        </Link>
        <p className="mt-4 text-xs text-white/40">
          Free beta · 3 analyses a day · Your photos are never stored
        </p>
      </div>

      <HowTo title="How to find a photo's location" steps={STEPS} />

      <section className="mt-12 max-w-3xl mx-auto">
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold mb-5">
          <ShieldCheck className="h-5 w-5 text-[#D4AF37]" /> Your photos stay yours
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-white/70 leading-relaxed">
          <li>Processed in memory and discarded when the analysis finishes — never stored, on any disk, anywhere.</li>
          <li>Never sent to a reverse-image search or any photo-matching third party.</li>
          <li>Place lookups send text clues only (a landmark or place name) to OpenStreetMap — never your image.</li>
          <li>No face recognition, ever. Results for homes are shown as a general area only, and no result is displayed tighter than 250 m.</li>
        </ul>
        <p className="mt-4 text-white/70 leading-relaxed">
          Those last two rules are worth understanding if you are placing photos of your own
          travels: the finder is built for public places — viewpoints, landmarks, towns,
          trailheads. It will not hand you a pinpoint for a private home, including your own,
          and it shows your results as areas rather than exact pins. For trip archaeology and
          honest captions, an area with evidence is what you actually need. If the question
          you are asking is the general one —{" "}
          <Link href="/where-was-this-photo-taken" className="text-[#D4AF37] hover:underline">
            where was this photo taken
          </Link>{" "}
          — that guide covers the metadata side in more depth.
        </p>
      </section>

      <FaqSection title="Photo location finder — questions" faqs={FAQS} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Photo Geolocation tool (free beta)", href: "/tools/photo-geolocation" },
          { label: "Where was this photo taken? The full guide", href: "/where-was-this-photo-taken" },
          { label: "Verify a photo's location — for journalists and fact-checkers", href: "/verify-photo-location" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Using live cameras to plan travel", href: "/blog/using-live-cameras-to-plan-travel" },
          { label: "Live cameras around the world", href: "/blog/world-live-cameras" },
        ]}
      />
      <CtaRow backHref="/tools/photo-geolocation" backLabel="Open the tool" />
    </PageShell>
  );
}
