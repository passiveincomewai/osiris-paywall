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
import { Plane } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Track a Live Flight — WorldEye Tutorial",
  description:
    "Track any flight live on the WorldEye globe: turn on the free aviation layers, click an aircraft for its model, altitude, speed and registration, watch it with the telemetry chase camera, and share a link to the exact plane. Step by step, with the real buttons.",
  alternates: { canonical: `${BASE}/tutorials/track-a-live-flight` },
  openGraph: {
    title: "How to Track a Live Flight — WorldEye Tutorial",
    description:
      "The aviation layers are free. Find a plane, open its live details, follow it, and share it — in six steps.",
    url: "/tutorials/track-a-live-flight",
    type: "article",
  },
};

const STEPS = [
  {
    name: "Open the globe and turn on flights",
    text: "Open worldeye.app and open the LAYERS & STATS panel. Under AVIATION, switch on the flight layers — Commercial, Private, Private Jets and Military. The aviation layers are free: no account and no plan needed.",
  },
  {
    name: "Find your flight on the map",
    text: "Aircraft appear as live icons moving across the globe. Zoom into the region your flight is crossing and watch for it — the icons are real aircraft broadcasting their position right now.",
  },
  {
    name: "Click the aircraft",
    text: "Click any aircraft icon to open its popup: MODEL, ALT (altitude), SPEED, HDG (heading), REG (registration) and POS (position), read straight from the live feed.",
  },
  {
    name: "Watch the flight",
    text: "In the popup, choose + WATCH THIS AIRCRAFT. A watch card opens with the flight's callsign, the aircraft model, registration and operator, its live altitude in feet and speed in knots, the squawk code, and the route — origin to destination, labelled scheduled or landed.",
  },
  {
    name: "Follow it live",
    text: "Use Centre on this aircraft to jump the globe straight to it, or Follow this aircraft — telemetry chase camera to ride along as it moves and its numbers update. Stop watching ends the watch when you are done.",
  },
  {
    name: "Share the flight",
    text: "Choose 🔗 SHARE THIS FLIGHT in the popup — or Share on the watch card — to copy a link in the form worldeye.app/?flight=<code>. Anyone who opens it lands on the same live aircraft.",
  },
];

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to track a live flight on WorldEye",
  description:
    "Turn on the free aviation layers, find an aircraft on the globe, open its live details, watch and follow it, and share a link to the exact plane.",
  step: STEPS.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: s.text,
  })),
};

const INTRO = [
  "WorldEye's globe carries live air traffic alongside its cameras, and flight tracking is one of the things that costs nothing: the aviation layers carry no premium lock, so every step in this guide works on a free visit, signed out, exactly as written.",
  "You will find a plane on the map, open the live numbers behind it — model, altitude, speed, heading, registration — and then go one better than a static lookup: the watch card follows the aircraft as it flies, and the follow camera rides with it. At the end you can copy a share link that drops anyone else onto the same aircraft.",
];

const FAQS = [
  {
    q: "Is flight tracking on WorldEye free?",
    a: "Yes. The aviation layers — Commercial, Private, Private Jets and Military — carry no premium flag in the layers panel, and the watch card and share links work without an account or a plan.",
  },
  {
    q: "What do the popup fields mean?",
    a: "MODEL is the aircraft type, ALT its altitude, SPEED its ground speed, HDG its heading, REG its registration (tail number) and POS its current position. The watch card spells the same data out in full — altitude in feet, speed in knots — and adds the operator and squawk code.",
  },
  {
    q: "What does “scheduled” or “landed” next to the route mean?",
    a: "The watch card shows the flight's origin and destination with the flight's state as the feed reports it — scheduled before departure, landed after arrival — so you can tell at a glance whether the plane you are watching is still to fly or already down.",
  },
  {
    q: "Why can't I see a particular flight?",
    a: "Check the right layer is on: a business jet sits under Private Jets, not Commercial. Some aircraft also broadcast limited position data or none at all, and coverage is thinner over oceans and remote regions — if a plane is not broadcasting, no tracker can show it.",
  },
  {
    q: "How does the share link work?",
    a: "The link encodes the aircraft's unique code (its ICAO24 hex) as worldeye.app/?flight=<code>. Opening it loads the globe centred on that aircraft with its watch card — the recipient tracks the same live plane, not a screenshot.",
  },
];

export default function TrackFlightTutorialPage() {
  return (
    <PageShell>
      <JsonLd data={howToJsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Tutorials", href: "/tutorials" },
          { label: "Track a live flight" },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Plane className="w-3.5 h-3.5" /> TUTORIAL · FREE
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Track a live flight</h1>
        <p className="mt-4 text-white/55">
          Find any aircraft on the globe, open its live altitude, speed and registration, follow it
          with the chase camera — and share the exact plane with anyone.
        </p>
      </div>

      <Intro paragraphs={INTRO} />

      <HowTo title="Step by step" steps={STEPS.map((s) => s.text)} />
      <FaqSection title="Flight tracking questions" faqs={FAQS} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Live flight tracker", href: "/live-flight-tracker" },
          { label: "Tutorial: check traffic on your route", href: "/tutorials/check-traffic-on-your-route" },
          { label: "Tutorial: search cameras like a pro", href: "/tutorials/search-cameras-like-a-pro" },
          { label: "All tutorials", href: "/tutorials" },
        ]}
      />
      <CtaRow backHref="/tutorials" backLabel="All tutorials" />
    </PageShell>
  );
}
