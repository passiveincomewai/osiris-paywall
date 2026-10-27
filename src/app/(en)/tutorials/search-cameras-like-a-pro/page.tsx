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
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Search Cameras Like a Pro — WorldEye Tutorial",
  description:
    "Search WorldEye's 74,229 cameras by place, address or coordinates: how the free camera-open ladder works (5 anonymous, 10 with email, 15 with a free account), what the result type labels mean, and how the Pro filters narrow the catalogue. Plus the free directory pages most people miss.",
  alternates: { canonical: `${BASE}/tutorials/search-cameras-like-a-pro` },
  openGraph: {
    title: "How to Search Cameras Like a Pro — WorldEye Tutorial",
    description:
      "Ctrl+F, one box for places, cameras, addresses and coordinates — and a ladder of free opens that goes further than you think.",
    url: "/tutorials/search-cameras-like-a-pro",
    type: "article",
  },
};

const STEPS = [
  {
    name: "Open search",
    text: "Press Ctrl+F (⌘F on a Mac) anywhere on the globe, or open Search & Route. One search box covers everything.",
  },
  {
    name: "Search places, cameras, addresses or coordinates",
    text: "The box invites you to “Search places, cameras, addresses or coordinates” — and means it. Place results fly the globe straight there; camera matches are listed for the area, up to 6 shown at a time, so the list stays readable instead of endless.",
  },
  {
    name: "Spend your free opens wisely — the ladder",
    text: "Opening a camera is metered on a ladder, and it is generous: 5 camera opens as an anonymous visitor, 5 more when you leave an email (10 in total), and 5 more with a free account (15 in total). Only after all fifteen does WorldEye suggest Pro. Searching itself never uses an open — only opening a camera does.",
  },
  {
    name: "Read the result labels before you open",
    text: "Every camera result is labelled by how it plays: Live video, Live snapshot, Live embed or At source. Check the label first — if you want moving pictures, open a Live video; if a refreshing still is fine, a Live snapshot spends the same open on a lighter feed.",
  },
  {
    name: "Filter like a pro (Pro)",
    text: "Above the results sits a filters row: a country selector, a type selector and a Live feeds only toggle. Filters are a Pro feature — for free visitors they sit locked with a PRO badge rather than silently doing nothing. One rule worth knowing: “Filters narrow camera results — places are never filtered.” Your city will always be findable.",
  },
  {
    name: "Browse the directories — free, and underused",
    text: "Every directory page — countries, cities, airports, beaches, traffic and more — carries its own search box and a browsable explorer of that slice of the catalogue. Browsing and searching there is free and uses no camera opens, which makes it the best way to survey an area before you spend opens on the cameras that matter.",
  },
];

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to search WorldEye cameras like a pro",
  description:
    "Search places, cameras, addresses and coordinates from one box, stretch the free camera-open ladder (5 anonymous, 10 with email, 15 with a free account), read the result type labels, and narrow results with the Pro filters.",
  step: STEPS.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: s.text,
  })),
};

const INTRO = [
  "WorldEye's catalogue runs to 74,229 cameras, which makes search the skill that decides whether the site feels like a toy or a tool. The good news: one box searches places, cameras, addresses and raw coordinates together, and the free allowance for opening cameras is a three-rung ladder that goes much further than most visitors realise.",
  "This guide covers the ladder honestly (5 opens anonymously, 10 with an email, 15 with a free account — then, and only then, a Pro suggestion), the result labels that tell you what kind of feed you are about to open, and the filters row — a Pro feature, locked rather than hidden for everyone else. It finishes with the directory pages, the free browsing route most people never find.",
];

const FAQS = [
  {
    q: "How many cameras can I open for free?",
    a: "Fifteen, on the ladder: 5 opens as an anonymous visitor, 5 more after leaving an email, and 5 more with a free account. After the fifteenth open WorldEye suggests Pro; searching, browsing directories and flying the globe never consume opens.",
  },
  {
    q: "Why do I only see 6 camera results?",
    a: "Camera matches are capped at 6 shown at a time so the list stays scannable. Narrow the query — a more specific place name — or use the Pro filters (country, type, live feeds only) to cut the catalogue down before results are listed.",
  },
  {
    q: "Are the search filters free?",
    a: "No — the filters row is a Pro feature. For free visitors the country selector, type selector and Live feeds only toggle are visible but locked with a PRO badge, so you can see exactly what the upgrade adds. Filters only ever narrow camera results; places are never filtered.",
  },
  {
    q: "What do Live video, Live snapshot, Live embed and At source mean?",
    a: "They describe how the feed plays when you open it. Live video is a moving stream; Live snapshot is a still image that refreshes; Live embed plays through the provider's own player; At source opens the feed at its origin. The label is on the result, before you spend an open.",
  },
  {
    q: "Can I search by coordinates?",
    a: "Yes — the search box accepts coordinates as well as place names and addresses. Pasting a latitude and longitude flies the globe to that exact spot and lists the cameras around it.",
  },
];

export default function SearchProTutorialPage() {
  return (
    <PageShell>
      <JsonLd data={howToJsonLd} />
      <FaqJsonLd faqs={FAQS} />
      <Breadcrumb
        trail={[
          { label: "Home", href: "/" },
          { label: "Tutorials", href: "/tutorials" },
          { label: "Search cameras like a pro" },
        ]}
      />

      <div className="mt-8 text-center max-w-3xl mx-auto">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
          <Search className="w-3.5 h-3.5" /> TUTORIAL · SEARCH FREE
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Search cameras like a pro</h1>
        <p className="mt-4 text-white/55">
          One box, 74,229 cameras — and a ladder of fifteen free opens hiding in plain sight.
        </p>
      </div>

      <Intro paragraphs={INTRO} />

      <figure className="mt-10 max-w-3xl mx-auto">
        <img
          src="/images/tutorials/search-cameras-like-a-pro-panel.webp"
          alt="The Search & Route panel on the WorldEye globe showing results for Tokyo"
          loading="lazy"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.02]"
        />
        <figcaption className="text-xs text-white/40 mt-2 text-center">
          The Search &amp; Route panel at work: one query — “Tokyo” — places and cameras together.
        </figcaption>
      </figure>

      <HowTo title="Step by step" steps={STEPS.map((s) => s.text)} />
      <FaqSection title="Camera search questions" faqs={FAQS} />
      <RelatedLinks
        title="Keep exploring"
        links={[
          { label: "Live webcams worldwide", href: "/live-webcams" },
          { label: "Browse the camera directory", href: "/cameras" },
          { label: "Tutorial: record a live camera", href: "/tutorials/record-a-live-camera" },
          { label: "Tutorial: track a live flight", href: "/tutorials/track-a-live-flight" },
          { label: "All tutorials", href: "/tutorials" },
        ]}
      />
      <CtaRow backHref="/tutorials" backLabel="All tutorials" />
    </PageShell>
  );
}
