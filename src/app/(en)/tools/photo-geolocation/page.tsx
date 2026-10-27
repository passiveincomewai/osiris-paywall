import type { Metadata } from "next";
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
import PhotoGeolocationTool from "@/components/PhotoGeolocationTool";
import { Crosshair, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Location Finder — Photo Geolocation Tool (Free Beta)",
  description:
    "WorldEye's free AI location finder: upload a photo and the tool checks its embedded GPS metadata (EXIF) first, then reads the visible clues — signs, landmarks, plates — matches named places against OpenStreetMap, and ranks each candidate with its evidence and confidence. Processed in memory, never stored, no reverse image search.",
  alternates: { canonical: `${BASE}/tools/photo-geolocation` },
  openGraph: {
    title: "AI Location Finder — Photo Geolocation Tool (Free Beta)",
    description:
      "Free beta AI location finder: upload a photo and get ranked candidate locations from its metadata and visible clues, with the evidence shown. Your photo is never stored.",
    url: "/tools/photo-geolocation",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "WorldEye AI Location Finder — Photo Geolocation Tool (Beta)",
  description:
    "A free beta AI location finder that estimates where a photo was taken from embedded GPS metadata and visible scene clues, ranking candidate places with evidence and an uncertainty radius.",
  url: `${BASE}/tools/photo-geolocation`,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const INTRO = [
  "Drop in a photo and this AI location finder works the way a careful human would. First it reads the file itself: many camera and phone photos carry GPS coordinates in their EXIF metadata, and when they do, that is the strongest evidence there is. Then it studies the scene for clues — readable signs and place names, named landmarks, licence-plate styles, the side of the road traffic drives on, vegetation and architecture — and matches the named places against OpenStreetMap.",
  "What you get back is not a confident-sounding guess. Every candidate is ranked by the evidence behind it, shown with the reasons for and against, a plain-language confidence level and an uncertainty radius. Sometimes the honest answer is \u201Cwe couldn't determine this one\u201D — when that happens the tool says so, shows the clues it did establish, and tells you what would help. It never invents a location.",
  "This is a beta, and it has real limits. It does not run reverse image searches, it does not compare your photo against street-level imagery, and photos whose metadata was stripped by a messaging or social app — most copies you have been sent — are much harder to place than originals from the camera.",
];

const STEPS = [
  "Choose or drop a photo (JPEG, PNG or WebP, up to 10 MB). It is processed in memory and discarded when the analysis finishes — never stored.",
  "The tool reads the photo's EXIF metadata, including any embedded GPS coordinates.",
  "A visual pass extracts clues only — text, landmarks, plates, road layout, scene type. It does not decide the location.",
  "Named landmarks and place names are matched against OpenStreetMap, and every match is scored on its evidence.",
  "You get ranked candidates with confidence, an uncertainty radius and the evidence for and against — or an honest \u201Ccouldn't determine\u201D.",
  "Point results link onward: live cameras near the spot, and an \u201CExplore location in 3D\u201D jump onto the WorldEye globe.",
];

const FAQS = [
  {
    q: "How does photo geolocation work here?",
    a: "In layers. GPS coordinates embedded in the photo file (EXIF) come first — they are part of the file itself. Without them, the tool extracts visible clues (signage text, named landmarks, plate styles, driving side, architecture, vegetation), looks the named places up in OpenStreetMap, and ranks the matches by how much independent evidence supports each one. The ranking is deterministic: the same clues always produce the same order, and the evidence is shown so you can judge it yourself.",
  },
  {
    q: "Is my photo stored or shared?",
    a: "No. Your photo is processed in memory on the server and discarded when the analysis finishes. It is not saved to disk or a database, not used for training, and never sent to a reverse-image search or any third-party photo service. The only things that leave the server are text clues (for example a landmark name) sent to OpenStreetMap for place lookup, and — when visual analysis is enabled — the image itself, sent once to the AI provider that powers the clue pass. Nothing about your photo is kept afterwards.",
  },
  {
    q: "Why couldn't it determine my photo?",
    a: "Most often because the file has been through an app that strips metadata — WhatsApp, Instagram, Facebook and screenshots all remove GPS — and the scene itself shows no readable sign, landmark or place name. A photo of a beach, a forest or a generic street can be genuinely unplaceable from one frame. The original file straight from the camera or phone gives the tool far more to work with.",
  },
  {
    q: "How accurate is it?",
    a: "Every result carries its own uncertainty radius, and that radius is the honest answer: \u201Cwithin about 250 m\u201D means exactly that, and a wide radius means the match is broad. GPS found in the file is usually the strongest result; landmark and place-name matches vary with how distinctive the place is. This is a beta and matches can be wrong — which is why the evidence for and against each candidate is always shown. Results for homes and private property are deliberately shown as a general area only.",
  },
  {
    q: "Why is my result an area instead of a point?",
    a: "Two privacy rules. No result is ever displayed tighter than a 250 m radius. And when a photo looks like a private residence or private property, the exact point is suppressed entirely and only the general area is shown. That applies even when the underlying evidence is precise — other people's homes are not a puzzle to publish.",
  },
  {
    q: "Does it identify people in photos?",
    a: "No. The tool does not perform face recognition or identify individuals, and people in a photo are never used as clues.",
  },
  {
    q: "What does it cost?",
    a: "Nothing — it is a free beta with no signup. To keep it sustainable there is a limit of 3 analyses per day per visitor, and the visual clue pass has a daily budget; when that budget is used up the tool keeps working in metadata-only mode and tells you so.",
  },
];

export default function PhotoGeolocationPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Tools" },
          { label: "Photo Geolocation (Beta)" },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Crosshair className="w-3.5 h-3.5" /> FREE TOOL · BETA
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          AI Location Finder
        </h1>
        <p className="mt-4 text-white/55">
          Upload a photo to the photo geolocation tool. It reads the photo&apos;s metadata,
          studies the visible clues, and ranks the places it could be — with the evidence for
          and against each one, and an honest &ldquo;couldn&apos;t determine&rdquo; when the
          evidence is not there.
        </p>
      </div>

      <PhotoGeolocationTool />

      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-5 w-5 text-[#D4AF37]" /> Your photo stays yours
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/65">
          <li>Processed in memory and discarded when the analysis finishes — never stored, on any disk, anywhere.</li>
          <li>Never sent to a reverse-image search or any photo-matching third party.</li>
          <li>Place lookups send text clues only (a landmark or place name) to OpenStreetMap — never your image.</li>
          <li>No face recognition, ever. Results for homes are shown as a general area only, and no result is displayed tighter than 250 m.</li>
        </ul>
      </div>

      <Intro paragraphs={INTRO} />
      <HowTo title="How it works" steps={STEPS} />
      <FaqSection title="Photo geolocation questions" faqs={FAQS} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Where was this photo taken? The full guide", href: "/where-was-this-photo-taken" },
          { label: "Photo Location Finder — for your own travel photos", href: "/photo-location-finder" },
          { label: "Random Camera Roulette — guess the country from a live camera", href: "/random" },
          { label: "Camera Distance Finder — how far is that camera from you?", href: "/tools/camera-distance" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "The WorldEye globe — flights, cameras, satellites and more", href: "/" },
        ]}
      />
      <CtaRow backHref="/" backLabel="Back to the globe" />
    </PageShell>
  );
}
