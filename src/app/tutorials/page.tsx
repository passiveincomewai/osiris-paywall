import type { Metadata } from "next";
import Link from "next/link";
import {
  BASE,
  JsonLd,
  Breadcrumb,
  Intro,
  RelatedLinks,
  CtaRow,
  PageShell,
} from "@/components/directory-page";
import { BookOpen, Camera, Plane, Route, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Tutorials — Learn WorldEye Step by Step",
  description:
    "Step-by-step WorldEye tutorials: track a live flight, check traffic cameras on your route, record a live camera or make a timelapse, and search 74,229 cameras like a pro. Every step uses the real buttons and panels, and says plainly which steps are free and which need a plan.",
  alternates: { canonical: `${BASE}/tutorials` },
  openGraph: {
    title: "Tutorials — Learn WorldEye Step by Step",
    description:
      "Four hands-on guides to the live globe: flights, route traffic cameras, recording and timelapse, and pro-level camera search.",
    url: "/tutorials",
    type: "website",
  },
};

const TUTORIALS = [
  {
    href: "/tutorials/track-a-live-flight",
    icon: "plane",
    title: "Track a live flight",
    summary:
      "Turn on the aviation layers, find any aircraft on the globe, open its live details, watch it with the telemetry chase camera, and share a link that lands on the same plane.",
    tag: "Free — no account needed",
  },
  {
    href: "/tutorials/check-traffic-on-your-route",
    icon: "route",
    title: "Check traffic on your route",
    summary:
      "Plan a route with Directions, read its badges and avoid options, and count the live cameras along your line — then open the corridor feeds to see the road before you drive it.",
    tag: "Route planner free · corridor feeds are Pro",
  },
  {
    href: "/tutorials/record-a-live-camera",
    icon: "camera",
    title: "Record a live camera — clips & timelapse",
    summary:
      "Press REC inside any camera viewer, record up to 20 cameras at once, and turn snapshot cameras into timelapses. The tiers are stated at every step — no surprises.",
    tag: "Recording is Pro · timelapse is VIP Pro",
  },
  {
    href: "/tutorials/search-cameras-like-a-pro",
    icon: "search",
    title: "Search cameras like a pro",
    summary:
      "Search places, cameras, addresses and coordinates, read the result types, stretch your free camera opens as far as they go, and narrow the catalogue with the Pro filters.",
    tag: "Search free · filters are Pro",
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "WorldEye tutorials",
  itemListElement: TUTORIALS.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: t.title,
    url: `${BASE}${t.href}`,
  })),
};

const INTRO = [
  "These four guides walk the real product, button by button. Every label quoted in them — every panel name, button and message — is the one the live site shows, and each guide states its tier honestly at the step where it matters: what is free is called free, and what needs a plan is named before you reach for it, not after.",
  "New here? Start with the flight tracker — it is completely free and shows off the globe at its best. Driving somewhere? The route guide counts the cameras on your exact line before you leave. The recording and search guides go deeper, into the Pro and VIP Pro tools.",
];

const ICONS = {
  plane: <Plane className="w-5 h-5 text-[#D4AF37]" />,
  route: <Route className="w-5 h-5 text-[#D4AF37]" />,
  camera: <Camera className="w-5 h-5 text-[#D4AF37]" />,
  search: <Search className="w-5 h-5 text-[#D4AF37]" />,
};

export default function TutorialsHubPage() {
  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Tutorials" },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <BookOpen className="w-3.5 h-3.5" /> STEP-BY-STEP GUIDES
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">WorldEye tutorials</h1>
        <p className="mt-4 text-white/55">
          Four hands-on guides to the live globe — flights, route traffic, recording, and search —
          written against the real interface, with the free and paid steps labelled as you go.
        </p>
      </div>

      <Intro paragraphs={INTRO} />

      <section className="mt-12">
        <h2 className="text-xl md:text-2xl font-bold mb-5">The guides</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {TUTORIALS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.05] hover:border-white/20 transition"
            >
              <div className="flex items-center gap-3 mb-3">
                {ICONS[t.icon]}
                <h3 className="font-bold text-lg group-hover:text-[#D4AF37] transition">{t.title}</h3>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{t.summary}</p>
              <p className="mt-4 text-xs font-semibold tracking-wide text-[#00E5FF]">{t.tag}</p>
            </Link>
          ))}
        </div>
      </section>

      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Photo Geolocation (Beta) — where was this photo taken?", href: "/tools/photo-geolocation" },
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "WorldEye features", href: "/features" },
          { label: "Plans and pricing", href: "/pricing" },
        ]}
      />
      <CtaRow backHref="/" backLabel="Back to the globe" />
    </PageShell>
  );
}
