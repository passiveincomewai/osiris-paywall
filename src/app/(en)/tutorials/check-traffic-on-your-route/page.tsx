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
import { Route } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Check Traffic Cameras on Your Route — WorldEye Tutorial",
  description:
    "Plan a route on the WorldEye globe and see the drive before you take it: the route planner and the camera count along your line are free, and the live corridor feeds are Pro. Step by step — Directions, route badges, avoid options, and the Cameras on this route panel explained.",
  alternates: { canonical: `${BASE}/tutorials/check-traffic-on-your-route` },
  openGraph: {
    title: "How to Check Traffic Cameras on Your Route — WorldEye Tutorial",
    description:
      "Set a start and destination, read the route, and count the live cameras within 1.5 km of your line — free. Opening the feeds is Pro.",
    url: "/tutorials/check-traffic-on-your-route",
    type: "article",
  },
};

const STEPS = [
  {
    name: "Open Search & Route",
    text: "On the globe, open Search & Route — find places and plan routes. On mobile it is the SEARCH & ROUTE tab along the bottom.",
  },
  {
    name: "Set your start and destination",
    text: "Open Directions. Fill in Choose a start — or tap Start from my location — then Choose a destination. Driving with stops? Add them in between as Stop 1, Stop 2 and so on.",
  },
  {
    name: "Read the route",
    text: "The route is drawn on the globe with a Fastest badge where it applies, plus Toll, Motorway and Ferry badges for what the drive involves. Use the Avoid options to reroute around tolls, motorways or ferries you would rather skip.",
  },
  {
    name: "Count the cameras on this route",
    text: "The Cameras on this route panel counts the catalogue's cameras within 1.5 km of your line. The count is free for everyone. Where the catalogue has nothing nearby, the panel says so plainly: “No cameras along this route — the catalogue has none within 1.5 km of the line.”",
  },
  {
    name: "Watch the drive itself (Pro)",
    text: "Opening the live feeds for the drive is a Pro feature — the panel tells free visitors exactly that: “Live feeds for the drive are a Pro feature.” On Pro (the Weekly Pass or the Monthly plan), the corridor cameras open right there in the panel, so you can eyeball the actual road — the pass, the bridge, the interchange — before you leave.",
  },
  {
    name: "Optional: the Traffic layer (Pro)",
    text: "For the wider picture, the Traffic layer in LAYERS & STATS adds simulated vehicles on real roads and a congestion overlay at city zoom. It is a premium layer too — locked layers show “Weekly Pass required — start a free trial”, so you always know where you stand before you tap.",
  },
];

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to check traffic cameras on your route with WorldEye",
  description:
    "Plan a route with Directions, read its badges and avoid options, count the cameras within 1.5 km of the line for free, and open the live corridor feeds on Pro.",
  step: STEPS.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: s.text,
  })),
};

const INTRO = [
  "A route planner that only draws a line is half the tool. WorldEye's globe keeps its live camera catalogue underneath the map, so once your route is drawn it can answer the question you actually have before a drive: what does the road look like right now?",
  "This guide is honest about the split. Planning the route and counting the cameras along it are free for everyone. Watching those corridor cameras live is a Pro feature, and the separate Traffic layer (simulated vehicles and a congestion overlay) is premium too — both are labelled at the step where they appear.",
];

const FAQS = [
  {
    q: "Is route planning free?",
    a: "Yes. Directions, the route badges, the Avoid options and the Cameras on this route count all work without a plan. What Pro adds is opening the live feeds along the corridor, and the Traffic layer's simulated vehicles and congestion overlay.",
  },
  {
    q: "How close does a camera have to be to count?",
    a: "Within 1.5 km of the route line. The panel counts catalogue cameras inside that corridor; a camera further away — even a useful one — is not counted, which keeps the number honest about your actual drive.",
  },
  {
    q: "Does the free route view show live congestion?",
    a: "No — and it does not pretend to. The free view shows your route and the real cameras along it. Congestion colouring comes from the premium Traffic layer, which combines simulated vehicles on real roads with a congestion overlay at city zoom. The live camera feeds themselves, on Pro, show you the genuine road conditions with your own eyes.",
  },
  {
    q: "Why does my route show no cameras?",
    a: "Because the catalogue genuinely has none within 1.5 km of that line — common on rural and remote routes. The panel states it outright rather than padding the count with distant cameras. Try the directory pages for the towns along the way; coverage is densest on motorways and in cities.",
  },
  {
    q: "Which plan unlocks the corridor feeds?",
    a: "Pro — that is the Weekly Pass or the Monthly plan. The Annual plan (VIP Pro) includes everything Pro does. Locked layers and panels say which pass is required before you commit to anything.",
  },
];

export default function RouteTrafficTutorialPage() {
  return (
    <PageShell>
      <JsonLd data={howToJsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Tutorials", href: "/tutorials" },
          { label: "Check traffic on your route" },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Route className="w-3.5 h-3.5" /> TUTORIAL · PLANNER FREE
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Check traffic on your route</h1>
        <p className="mt-4 text-white/55">
          Draw your drive, count the live cameras along the line for free — and, on Pro, watch the
          road itself before you leave.
        </p>
      </div>

      <Intro paragraphs={INTRO} />

      <HowTo title="Step by step" steps={STEPS.map((s) => s.text)} />
      <FaqSection title="Route traffic questions" faqs={FAQS} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Live traffic cameras", href: "/live-traffic-cameras" },
          { label: "Tutorial: track a live flight", href: "/tutorials/track-a-live-flight" },
          { label: "Tutorial: record a live camera", href: "/tutorials/record-a-live-camera" },
          { label: "Plans and pricing", href: "/pricing" },
          { label: "All tutorials", href: "/tutorials" },
        ]}
      />
      <CtaRow backHref="/tutorials" backLabel="All tutorials" />
    </PageShell>
  );
}
