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
import CameraDistanceTool from "@/components/CameraDistanceTool";
import EmailCaptureCard from "@/components/EmailCaptureCard";
import { Ruler, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Camera Distance Finder — How Far Is That Camera?",
  description:
    "Pick any two live cameras in the WorldEye index — or one camera and your own location — and get the straight-line distance between them in kilometres and miles, the direction, and a globe view centred between them. Free, no signup.",
  alternates: { canonical: `${BASE}/tools/camera-distance` },
  openGraph: {
    title: "Camera Distance Finder — How Far Is That Camera?",
    description:
      "The distance between any two public cameras on Earth, as the crow flies — or between a camera and you. Free, no signup.",
    url: "/tools/camera-distance",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "WorldEye Camera Distance Finder",
  description:
    "A free tool that measures the great-circle distance between any two cameras in the WorldEye index, or between a camera and the visitor's own location, with the direction in plain words and a globe view of the pair.",
  url: `${BASE}/tools/camera-distance`,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const INTRO = [
  "WorldEye's index holds tens of thousands of public cameras, and they are interesting in pairs. How far is the beach cam you watch every morning from the one outside your office? Is the ski camera in the next valley over, or in the next country? Pick any two cameras — by name, street, landmark or place — and this tool measures the gap between them on the spot.",
  "The picks come from the same catalogue the country and city pages are built from, so every result is a real listed camera at its real coordinates. Cameras that share a name — and every country has a Main Street — are never merged: each result shows the place beside the name, and you pick the one you meant. You can also measure from yourself: one camera plus your own location, read in your browser and never sent anywhere.",
  "Every distance here is a straight line — \u201Cas the crow flies\u201D — measured over the surface of the Earth, and the page says so next to every number. That is the honest figure for comparing cameras; it is not a driving distance, and no road route is implied. Alongside the distance you get the direction in plain words (the second camera is north-east of the first, say) and a link that opens the WorldEye globe centred between the pair.",
];

const STEPS = [
  "Search the first picker for a camera — try a landmark, a street name, a beach, or just a city — and choose it from the results. The place beside each name tells same-named cameras apart.",
  "Do the same in the second picker, or press \u201CUse my location instead\u201D in either picker to measure from where you are standing.",
  "The distance appears immediately, in kilometres and miles, with the direction from the first pick to the second in plain words.",
  "Open the pair on the globe: the link centres the 3D globe between the two cameras and frames as much of the gap as one view allows. Each camera also gets its own globe link for long hauls.",
];

const FAQS = [
  {
    q: "Is this a driving distance?",
    a: "No — and the result says so. Every figure is the straight-line (great-circle) distance between the two points, as the crow flies. Roads wind, coastlines bend and borders intervene, so a drive between the same two cameras will always be longer. For road distance, use the route view on the globe instead.",
  },
  {
    q: "Which cameras can I pick?",
    a: "Any camera in the WorldEye directory index that carries usable coordinates — the same catalogue the country, city and beach pages are built from. If a camera has no recorded position it cannot be picked, because a distance needs two points. Search works by camera name, street, landmark, city and country.",
  },
  {
    q: "Two cameras have exactly the same name. Which one did I get?",
    a: "Whichever one you chose: results are never collapsed by name. Each search result shows the camera's listed place beside its name — \u201CMain Street, Springfield, United States\u201D versus \u201CMain Street, Franklin, United States\u201D — and the picked camera shows its place and coordinates, so you can check you have the right one before reading the distance.",
  },
  {
    q: "What happens to my location if I use it?",
    a: "Nothing leaves your browser. The \u201Cuse my location\u201D pick is read from your device's location prompt, used for the on-screen calculation, and never sent to WorldEye's servers or stored anywhere. Decline the prompt and the tool simply keeps working with two camera picks.",
  },
  {
    q: "How is the distance calculated?",
    a: "With the haversine formula over a spherical Earth (mean radius 6,371 km) — the standard great-circle measure. Against surveyed city-pair references it agrees to well under a percent at these scales; the direction shown is the initial bearing, the direction you would set off in along the great circle, named on the 16-wind compass.",
  },
  {
    q: "What does it cost?",
    a: "Nothing — it is a free tool with no signup, like the other WorldEye tools.",
  },
];

export default function CameraDistancePage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Tools" },
          { label: "Camera Distance Finder" },
        ]}
      />

      {/* The working tool comes first (Jameson, 2026-10-31): usable on
          load with no scrolling; headline and explanatory sections
          follow below it, unchanged. */}
      <CameraDistanceTool />

      <div className="mt-10 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Ruler className="w-3.5 h-3.5" /> FREE TOOL
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          How far is that camera from you?
        </h1>
        <p className="mt-4 text-white/55">
          Pick any two cameras in the WorldEye index — or one camera and your own location — and get
          the straight-line distance between them, the direction in plain words, and a globe view
          centred on the pair.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-5 w-5 text-[#D4AF37]" /> Measured honestly
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/65">
          <li>Every distance is a straight line over the Earth&apos;s surface — never dressed up as a road or travel distance.</li>
          <li>Both picks are real cameras from the WorldEye directory at their listed coordinates; same-named cameras are told apart by place, never merged.</li>
          <li>Your own location, if you use it, is read in your browser only — it is never sent to or kept by WorldEye.</li>
        </ul>
      </div>

      <Intro paragraphs={INTRO} />
      <HowTo title="How it works" steps={STEPS} />
      <FaqSection title="Camera distance questions" faqs={FAQS} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Photo Geolocation (Beta) — find where a photo was taken", href: "/tools/photo-geolocation" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "The WorldEye globe — flights, cameras, satellites and more", href: "/" },
        ]}
      />
      {/* Newsletter — end-of-page capture (the one list) */}
      <div className="mt-12">
        <EmailCaptureCard placement="page" variant="inline" />
      </div>
      <CtaRow backHref="/" backLabel="Back to the globe" />
    </PageShell>
  );
}
